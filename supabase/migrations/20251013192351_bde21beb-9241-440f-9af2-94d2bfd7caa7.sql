-- Create staff_role_assignments table to track which email is assigned to each role
CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE CHECK (role IN ('booking', 'events_programs', 'snacks', 'gallery', 'guides', 'support')),
  assigned_email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;

-- Admin can manage all assignments
CREATE POLICY "Admin can manage staff role assignments"
ON public.staff_role_assignments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email = 'admin@staffportal.com'
  )
);

-- All staff can view assignments
CREATE POLICY "Staff can view role assignments"
ON public.staff_role_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND email LIKE '%@staffportal.com'
  )
);

-- Seed initial role assignments
INSERT INTO public.staff_role_assignments (role, assigned_email) VALUES
  ('booking', 'sara@staffportal.com'),
  ('events_programs', 'ahmed@staffportal.com'),
  ('snacks', 'farah@staffportal.com'),
  ('gallery', 'ali@staffportal.com'),
  ('guides', 'noor@staffportal.com'),
  ('support', 'mohamed@staffportal.com')
ON CONFLICT (role) DO NOTHING;

-- Trigger to update updated_at
CREATE TRIGGER update_staff_role_assignments_updated_at
BEFORE UPDATE ON public.staff_role_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();