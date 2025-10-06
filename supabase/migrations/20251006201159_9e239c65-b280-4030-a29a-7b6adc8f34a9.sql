-- Fix pixoul-posts storage policies to work with authenticated staff users
DROP POLICY IF EXISTS "Public read pixoul posts" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff upload" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff update" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff delete" ON storage.objects;

-- Public read for pixoul-posts bucket
CREATE POLICY "Public read pixoul posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pixoul-posts');

-- Authenticated users with @staffportal.com email can upload
CREATE POLICY "Staff can upload pixoul posts"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND auth.role() = 'authenticated'
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@staffportal.com'
  );

-- Authenticated staff can update
CREATE POLICY "Staff can update pixoul posts"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pixoul-posts' 
    AND auth.role() = 'authenticated'
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@staffportal.com'
  )
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND auth.role() = 'authenticated'
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@staffportal.com'
  );

-- Authenticated staff can delete
CREATE POLICY "Staff can delete pixoul posts"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pixoul-posts' 
    AND auth.role() = 'authenticated'
    AND (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@staffportal.com'
  );