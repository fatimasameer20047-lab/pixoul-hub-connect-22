-- Booking notifications for staff (reuses unified notifications table)

-- Expand type constraint to include booking notifications
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_chk,
  ADD CONSTRAINT notifications_type_chk
    CHECK (type IN ('chat', 'order', 'booking_room', 'booking_package', 'booking_party'));

--------------------------------------------------------------------------------
-- Helpers
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_new_room_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif_type text;
  notif_title text;
  notif_body text;
  tab text;
  exists_unread boolean;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  notif_type := CASE
    WHEN COALESCE(NEW.booking_source, '') = 'package' OR NEW.package_label IS NOT NULL THEN 'booking_package'
    ELSE 'booking_room'
  END;

  notif_title := CASE
    WHEN notif_type = 'booking_package' THEN 'New package booking received'
    ELSE 'New room booking received'
  END;

  tab := CASE
    WHEN notif_type = 'booking_package' THEN 'packages-offers'
    ELSE 'room-bookings'
  END;

  -- Avoid duplicate unread notifications for the same booking
  SELECT EXISTS (
    SELECT 1
      FROM public.notifications
     WHERE type = notif_type
       AND meta ->> 'booking_id' = NEW.id::text
       AND is_read = false
  ) INTO exists_unread;

  IF exists_unread THEN
    RETURN NEW;
  END IF;

  notif_body := concat_ws(' · ',
    COALESCE(NEW.package_label, NULL),
    NEW.booking_date::text,
    NEW.start_time
  );

  INSERT INTO public.notifications (
    recipient_role,
    type,
    title,
    body,
    link_path,
    meta
  )
  VALUES (
    'booking_staff',
    notif_type,
    notif_title,
    NULLIF(notif_body, ''),
    '/staff/bookings?tab=' || tab || '&highlight=' || NEW.id::text || '&type=' || notif_type,
    jsonb_build_object(
      'booking_id', NEW.id,
      'booking_type', notif_type,
      'booking_source', NEW.booking_source,
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_new_party_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  exists_unread boolean;
  notif_body text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicate unread notifications for the same party request
  SELECT EXISTS (
    SELECT 1
      FROM public.notifications
     WHERE type = 'booking_party'
       AND meta ->> 'party_request_id' = NEW.id::text
       AND is_read = false
  ) INTO exists_unread;

  IF exists_unread THEN
    RETURN NEW;
  END IF;

  notif_body := concat_ws(' · ',
    NEW.party_type,
    NEW.preferred_date::text,
    (NEW.guest_count::text || ' guests')
  );

  INSERT INTO public.notifications (
    recipient_role,
    type,
    title,
    body,
    link_path,
    meta
  )
  VALUES (
    'booking_staff',
    'booking_party',
    'New party request received',
    NULLIF(notif_body, ''),
    '/staff/bookings?tab=party-requests&highlight=' || NEW.id::text || '&type=booking_party',
    jsonb_build_object(
      'party_request_id', NEW.id,
      'booking_type', 'booking_party',
      'created_at', NEW.created_at
    )
  );

  RETURN NEW;
END;
$$;

--------------------------------------------------------------------------------
-- Triggers
--------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_notify_on_new_room_booking ON public.room_bookings;
CREATE TRIGGER trg_notify_on_new_room_booking
AFTER INSERT ON public.room_bookings
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_room_booking();

DROP TRIGGER IF EXISTS trg_notify_on_new_party_request ON public.party_requests;
CREATE TRIGGER trg_notify_on_new_party_request
AFTER INSERT ON public.party_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_party_request();
