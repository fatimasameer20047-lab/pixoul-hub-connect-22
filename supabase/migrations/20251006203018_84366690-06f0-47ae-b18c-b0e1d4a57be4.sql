-- Create a security definer function to check if user is pixoul staff
CREATE OR REPLACE FUNCTION public.is_pixoul_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND email = 'pixoulgaming@staffportal.com'
  );
$$;

-- Drop existing pixoul-posts storage policies
DROP POLICY IF EXISTS "Public read pixoul posts" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload pixoul posts" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update pixoul posts" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete pixoul posts" ON storage.objects;

-- Create new policies using the security definer function
CREATE POLICY "Public read pixoul posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pixoul-posts');

CREATE POLICY "Pixoul staff can upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND public.is_pixoul_staff()
  );

CREATE POLICY "Pixoul staff can update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pixoul-posts' 
    AND public.is_pixoul_staff()
  )
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND public.is_pixoul_staff()
  );

CREATE POLICY "Pixoul staff can delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pixoul-posts' 
    AND public.is_pixoul_staff()
  );