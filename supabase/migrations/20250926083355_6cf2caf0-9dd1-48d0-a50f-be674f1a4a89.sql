-- Fix security warning: Function Search Path Mutable
DROP FUNCTION IF EXISTS create_staff_user_with_role(TEXT, TEXT, TEXT, app_role);

CREATE OR REPLACE FUNCTION create_staff_user_with_role(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_role app_role
) RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- This function will be called from an edge function that has admin privileges
  -- For now, we just return a placeholder
  RETURN gen_random_uuid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;