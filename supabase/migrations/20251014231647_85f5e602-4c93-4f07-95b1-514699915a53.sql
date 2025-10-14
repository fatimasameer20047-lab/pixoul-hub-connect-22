-- Fix RLS policy on staff_role_assignments to allow staff members to read their assignments
-- The existing policy queries auth.users which may not be accessible in RLS context
-- Using JWT email claim is more reliable

DROP POLICY IF EXISTS "Staff can view role assignments" ON public.staff_role_assignments;

CREATE POLICY "Staff can view role assignments"
ON public.staff_role_assignments
FOR SELECT
TO authenticated
USING (
  (auth.jwt() ->> 'email'::text) LIKE '%@staffportal.com'
);