-- Fix the admin RLS policy to use JWT email check instead of auth.users query
DROP POLICY IF EXISTS "Admin can manage staff role assignments" ON staff_role_assignments;

CREATE POLICY "Admin can manage staff role assignments"
ON staff_role_assignments
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'email'::text) = 'admin@staffportal.com')
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'admin@staffportal.com');