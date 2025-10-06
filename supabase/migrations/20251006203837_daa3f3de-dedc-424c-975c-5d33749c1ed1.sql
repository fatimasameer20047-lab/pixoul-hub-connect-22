-- Drop old policies that directly query auth.users (causes RLS issues)
DROP POLICY IF EXISTS "Pixoul can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul can delete images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view Pixoul post images" ON storage.objects;

-- Keep only the new policies that use the is_pixoul_staff() function
-- These were created in the previous migration and are working correctly