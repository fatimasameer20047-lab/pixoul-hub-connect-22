-- Gallery pending-approval notifications for staff bell

--------------------------------------------------------------------------------
-- Enum + table constraints
--------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'gallery_staff'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'gallery_staff';
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'kind'
  ) THEN
    ALTER TABLE public.notifications ADD COLUMN kind text;
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'kind'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'type'
  ) THEN
    UPDATE public.notifications SET kind = COALESCE(kind, "type");
  END IF;
END;
$$;

UPDATE public.notifications
SET kind = COALESCE(kind, 'chat')
WHERE kind IS NULL;

ALTER TABLE public.notifications
  ALTER COLUMN kind SET NOT NULL;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_chk,
  DROP CONSTRAINT IF EXISTS notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check
    CHECK (kind IN ('chat', 'order', 'booking_room', 'booking_package', 'booking_party', 'gallery_pending'));

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_recipient_role_chk,
  ADD CONSTRAINT notifications_recipient_role_chk
    CHECK (recipient_role IN ('customer', 'booking_staff', 'support_staff', 'orders_staff', 'gallery_staff'));

--------------------------------------------------------------------------------
-- RLS policies for gallery notifications
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Gallery staff can read notifications" ON public.notifications;
CREATE POLICY "Gallery staff can read notifications"
  ON public.notifications FOR SELECT
  USING (recipient_role = 'gallery_staff' AND (is_staff_with_role(auth.uid(), 'gallery') OR is_staff_with_role(auth.uid(), 'gallery_staff')));

DROP POLICY IF EXISTS "Gallery staff can mark notifications read" ON public.notifications;
CREATE POLICY "Gallery staff can mark notifications read"
  ON public.notifications FOR UPDATE
  USING (recipient_role = 'gallery_staff' AND (is_staff_with_role(auth.uid(), 'gallery') OR is_staff_with_role(auth.uid(), 'gallery_staff')))
  WITH CHECK (recipient_role = 'gallery_staff' AND (is_staff_with_role(auth.uid(), 'gallery') OR is_staff_with_role(auth.uid(), 'gallery_staff')) AND is_read = true);

--------------------------------------------------------------------------------
-- Trigger to notify on pending gallery submission
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_new_gallery_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  submitter text;
  snippet text;
  exists_unread boolean;
  link text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Only pending approvals (private + pending marker)
  IF COALESCE(NEW.visibility, '') <> 'private' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.comment_count, 0) <> -1 THEN
    RETURN NEW;
  END IF;

  link := '/staff/gallery?tab=pending&highlight=' || NEW.id::text;

  SELECT p.name
    INTO submitter
    FROM public.profiles p
   WHERE p.user_id = NEW.user_id
   LIMIT 1;

  snippet := left(
    coalesce(submitter, 'New submission') || ' · ' || coalesce(NEW.caption, ''),
    140
  );

  SELECT EXISTS (
    SELECT 1
      FROM public.notifications
     WHERE kind = 'gallery_pending'
       AND link_path = link
       AND is_read = false
  ) INTO exists_unread;

  IF exists_unread THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    recipient_role,
    kind,
    title,
    body,
    link_path
  )
  VALUES (
    'gallery_staff',
    'gallery_pending',
    'New gallery submission',
    NULLIF(snippet, ''),
    link
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_new_gallery_submission ON public.gallery_items;
CREATE TRIGGER trg_notify_on_new_gallery_submission
AFTER INSERT ON public.gallery_items
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_gallery_submission();
