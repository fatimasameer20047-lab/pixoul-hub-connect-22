-- Dedicated RPCs for events staff notifications (event_registration)

CREATE OR REPLACE FUNCTION public.events_staff_list_notifications(
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  recipient_role text,
  kind text,
  is_read boolean,
  title text,
  body text,
  link_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Disable RLS within this function
  PERFORM set_config('row_security', 'off', true);

  RETURN QUERY
  SELECT
    n.id,
    n.created_at,
    n.recipient_role,
    COALESCE(n.kind, n.type) AS kind,
    n.is_read,
    n.title,
    n.body,
    n.link_path
  FROM public.notifications n
  WHERE n.recipient_role = 'events_programs'
    AND COALESCE(n.kind, n.type) = 'event_registration'
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.events_staff_unread_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unread integer;
BEGIN
  PERFORM set_config('row_security', 'off', true);

  SELECT COUNT(*) INTO unread
  FROM public.notifications n
  WHERE n.recipient_role = 'events_programs'
    AND COALESCE(n.kind, n.type) = 'event_registration'
    AND n.is_read = false;

  RETURN unread;
END;
$$;

REVOKE ALL ON FUNCTION public.events_staff_list_notifications(int, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.events_staff_unread_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.events_staff_list_notifications(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.events_staff_unread_count() TO authenticated;
