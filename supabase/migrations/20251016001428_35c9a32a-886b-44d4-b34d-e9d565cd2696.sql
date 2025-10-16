-- Seed default staff role assignments (only if they don't exist)
INSERT INTO public.staff_role_assignments (role, assigned_email)
VALUES 
  ('booking', 'sara@staffportal.com'),
  ('events_programs', 'ahmed@staffportal.com'),
  ('snacks', 'farah@staffportal.com'),
  ('gallery', 'ali@staffportal.com'),
  ('guides', 'noor@staffportal.com'),
  ('support', 'mohamed@staffportal.com')
ON CONFLICT (role) DO NOTHING;