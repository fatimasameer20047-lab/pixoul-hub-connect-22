-- Fix storage policies to use JWT token instead of querying auth.users
DROP POLICY IF EXISTS "Public read pixoul posts" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff upload" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff update" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff delete" ON storage.objects;

-- Public read for pixoul-posts bucket
CREATE POLICY "Public read pixoul posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pixoul-posts');

-- Pixoul staff can upload - use JWT email claim
CREATE POLICY "Pixoul staff upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND (auth.jwt() ->> 'email') = 'pixoulgaming@staffportal.com'
  );

-- Pixoul staff can update
CREATE POLICY "Pixoul staff update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pixoul-posts' 
    AND (auth.jwt() ->> 'email') = 'pixoulgaming@staffportal.com'
  )
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND (auth.jwt() ->> 'email') = 'pixoulgaming@staffportal.com'
  );

-- Pixoul staff can delete
CREATE POLICY "Pixoul staff delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pixoul-posts' 
    AND (auth.jwt() ->> 'email') = 'pixoulgaming@staffportal.com'
  );