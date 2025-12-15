-- Notifications infrastructure (unified for chat + orders)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  recipient_user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  recipient_role text NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_path text NOT NULL DEFAULT '',
  meta jsonb,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Keep role/type values tidy
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_recipient_role_chk
    CHECK (recipient_role IN ('customer', 'booking_staff', 'support_staff', 'orders_staff')),
  ADD CONSTRAINT notifications_type_chk
    CHECK (type IN ('chat', 'order'));

CREATE INDEX IF NOT EXISTS idx_notifications_role_read_created_at
  ON public.notifications (recipient_role, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created_at
  ON public.notifications (recipient_user_id, is_read, created_at DESC);

--------------------------------------------------------------------------------
-- RLS Policies
--------------------------------------------------------------------------------
-- Customers: their own notifications only
CREATE POLICY "Customers can read their notifications"
  ON public.notifications FOR SELECT
  USING (recipient_role = 'customer' AND recipient_user_id = auth.uid());

CREATE POLICY "Customers can mark their notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_role = 'customer' AND recipient_user_id = auth.uid())
  WITH CHECK (recipient_role = 'customer' AND recipient_user_id = auth.uid() AND is_read = true);

-- Booking staff
CREATE POLICY "Booking staff can read notifications"
  ON public.notifications FOR SELECT
  USING (recipient_role = 'booking_staff' AND is_staff_with_role(auth.uid(), 'booking'));

CREATE POLICY "Booking staff can mark notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_role = 'booking_staff' AND is_staff_with_role(auth.uid(), 'booking'))
  WITH CHECK (recipient_role = 'booking_staff' AND is_staff_with_role(auth.uid(), 'booking') AND is_read = true);

-- Support staff
CREATE POLICY "Support staff can read notifications"
  ON public.notifications FOR SELECT
  USING (recipient_role = 'support_staff' AND is_staff_with_role(auth.uid(), 'support'));

CREATE POLICY "Support staff can mark notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_role = 'support_staff' AND is_staff_with_role(auth.uid(), 'support'))
  WITH CHECK (recipient_role = 'support_staff' AND is_staff_with_role(auth.uid(), 'support') AND is_read = true);

-- Orders staff (mapped to snacks role in current system)
CREATE POLICY "Orders staff can read notifications"
  ON public.notifications FOR SELECT
  USING (recipient_role = 'orders_staff' AND (is_staff_with_role(auth.uid(), 'snacks') OR is_staff_with_role(auth.uid(), 'orders_staff')));

CREATE POLICY "Orders staff can mark notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_role = 'orders_staff' AND (is_staff_with_role(auth.uid(), 'snacks') OR is_staff_with_role(auth.uid(), 'orders_staff')))
  WITH CHECK (recipient_role = 'orders_staff' AND (is_staff_with_role(auth.uid(), 'snacks') OR is_staff_with_role(auth.uid(), 'orders_staff')) AND is_read = true);

--------------------------------------------------------------------------------
-- Notification creators
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv RECORD;
  recipient_role text;
  recipient_user uuid;
  link text;
  title text;
  body text;
BEGIN
  SELECT id, conversation_type, user_id
    INTO conv
    FROM public.chat_conversations
   WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Messages from staff -> notify the customer
  IF COALESCE(NEW.is_staff, false) THEN
    recipient_role := 'customer';
    recipient_user := conv.user_id;
    title := 'New message';
    body := CASE
      WHEN conv.conversation_type = 'support' THEN 'Support team replied'
      ELSE 'Booking team replied'
    END;
    link := CASE
      WHEN conv.conversation_type = 'support' THEN '/support?conversationId=' || conv.id
      ELSE '/booking/chat/' || conv.id
    END;
  ELSE
    -- Messages from customers -> notify appropriate staff
    IF conv.conversation_type = 'support' THEN
      recipient_role := 'support_staff';
      title := 'Customer sent a message';
      body := 'Support chat needs attention';
      link := '/staff/support?conversationId=' || conv.id;
    ELSIF conv.conversation_type IN ('room_booking', 'party_request') THEN
      recipient_role := 'booking_staff';
      title := 'Customer sent a message';
      body := 'Booking chat needs attention';
      link := '/staff/booking/messages/' || conv.id;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  IF recipient_user IS NOT NULL AND recipient_user = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_user_id,
    recipient_role,
    type,
    title,
    body,
    link_path,
    meta
  )
  VALUES (
    recipient_user,
    recipient_role,
    'chat',
    title,
    left(COALESCE(body || ': ', '') || COALESCE(NEW.message, ''), 200),
    link,
    jsonb_build_object(
      'conversation_id', conv.id,
      'conversation_type', conv.conversation_type,
      'message_id', NEW.id
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_unread boolean;
  short_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'new' THEN
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.status, '') = 'new' OR NEW.status <> 'new' THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Avoid flooding: skip if an unread order notification already exists for this order
  SELECT EXISTS (
    SELECT 1 FROM public.notifications
     WHERE type = 'order'
       AND meta ->> 'order_id' = NEW.id::text
       AND is_read = false
  ) INTO exists_unread;

  IF exists_unread THEN
    RETURN NEW;
  END IF;

  short_id := substring(NEW.id::text FROM 1 FOR 8);

  INSERT INTO public.notifications (
    recipient_role,
    type,
    title,
    body,
    link_path,
    meta
  )
  VALUES (
    'orders_staff',
    'order',
    'New order',
    'Order #' || short_id || ' placed',
    '/staff/orders/' || NEW.id::text,
    jsonb_build_object(
      'order_id', NEW.id,
      'status', NEW.status,
      'total', NEW.total
    )
  );

  RETURN NEW;
END;
$$;

--------------------------------------------------------------------------------
-- Triggers
--------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notify_on_chat_message ON public.chat_messages;
CREATE TRIGGER trg_notify_on_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_chat_message();

DROP TRIGGER IF EXISTS trg_notify_on_new_order ON public.orders;
CREATE TRIGGER trg_notify_on_new_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_order();
