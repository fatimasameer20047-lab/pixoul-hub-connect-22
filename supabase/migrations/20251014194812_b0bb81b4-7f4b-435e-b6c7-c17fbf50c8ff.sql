-- Insert default staff role assignments
-- This will map each role to its designated staff member email

INSERT INTO public.staff_role_assignments (role, assigned_email)
VALUES 
  ('booking', 'sara@staffportal.com'),
  ('events_programs', 'ahmed@staffportal.com'),
  ('snacks', 'farah@staffportal.com'),
  ('gallery', 'ali@staffportal.com'),
  ('guides', 'noor@staffportal.com'),
  ('support', 'mohamed@staffportal.com')
ON CONFLICT (role) 
DO UPDATE SET 
  assigned_email = EXCLUDED.assigned_email,
  updated_at = now();

-- Add unique constraint on role if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'staff_role_assignments_role_key'
  ) THEN
    ALTER TABLE public.staff_role_assignments 
    ADD CONSTRAINT staff_role_assignments_role_key UNIQUE (role);
  END IF;
END $$;