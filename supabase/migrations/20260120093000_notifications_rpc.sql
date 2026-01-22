-- RPC helpers to return staff notifications with SECURITY DEFINER bypassing RLS, while still enforcing staff role checks

CREATE OR REPLACE FUNCTION public.staff_list_notifications(
  p_kind text DEFAULT NULL,
  p_limit int DEFAULT 50
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
DECLARE
  has_access boolean;
BEGIN
  -- Staff access: events_programs role or admin email
  has_access := is_staff_with_role(auth.uid(), 'events_programs') OR (auth.jwt() ->> 'email' = 'admin@staffportal.com');
  IF NOT has_access THEN
    RAISE EXCEPTION 'permission denied for staff notifications';
  END IF;

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
    AND (p_kind IS NULL OR COALESCE(n.kind, n.type) = p_kind)
  ORDER BY n.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_unread_count(
  p_kind text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_access boolean;
  unread_count integer;
BEGIN
  has_access := is_staff_with_role(auth.uid(), 'events_programs') OR (auth.jwt() ->> 'email' = 'admin@staffportal.com');
  IF NOT has_access THEN
    RAISE EXCEPTION 'permission denied for staff notifications';
  END IF;

  SELECT COUNT(*) INTO unread_count
  FROM public.notifications n
  WHERE n.recipient_role = 'events_programs'
    AND n.is_read = false
    AND (p_kind IS NULL OR COALESCE(n.kind, n.type) = p_kind);

  RETURN unread_count;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_list_notifications(text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_unread_count(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_list_notifications(text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_unread_count(text) TO authenticated;
