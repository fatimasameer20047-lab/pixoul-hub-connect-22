-- Fix storage policies to properly check email
-- First drop existing policies
DROP POLICY IF EXISTS "Public read pixoul posts" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff upload" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff update" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff delete" ON storage.objects;

-- Public read for pixoul-posts bucket
CREATE POLICY "Public read pixoul posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pixoul-posts');

-- Pixoul staff can upload (check email from auth.users)
CREATE POLICY "Pixoul staff upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'pixoulgaming@staffportal.com'
  );

-- Pixoul staff can update
CREATE POLICY "Pixoul staff update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pixoul-posts' 
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'pixoulgaming@staffportal.com'
  )
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'pixoulgaming@staffportal.com'
  );

-- Pixoul staff can delete
CREATE POLICY "Pixoul staff delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pixoul-posts' 
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) = 'pixoulgaming@staffportal.com'
  );