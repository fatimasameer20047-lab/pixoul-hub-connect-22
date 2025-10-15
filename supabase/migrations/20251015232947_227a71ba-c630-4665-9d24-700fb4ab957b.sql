-- Add unique constraint on role column to enable proper upserts
ALTER TABLE staff_role_assignments
DROP CONSTRAINT IF EXISTS staff_role_assignments_role_key;

ALTER TABLE staff_role_assignments
ADD CONSTRAINT staff_role_assignments_role_key UNIQUE (role);