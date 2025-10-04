-- Drop existing policies
DROP POLICY IF EXISTS "read_published_or_own" ON public.pixoul_posts;
DROP POLICY IF EXISTS "pixoul_manage_own" ON public.pixoul_posts;

-- Alter table: replace status with published boolean
ALTER TABLE public.pixoul_posts 
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS published_at,
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION public.update_pixoul_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_pixoul_posts_updated_at_trigger ON public.pixoul_posts;
CREATE TRIGGER update_pixoul_posts_updated_at_trigger
  BEFORE UPDATE ON public.pixoul_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pixoul_posts_updated_at();

-- RLS Policies: Simple, no auth.users queries
CREATE POLICY "read_published_pixoul_posts"
  ON public.pixoul_posts
  FOR SELECT
  USING (published = true);

CREATE POLICY "pixoul_can_insert"
  ON public.pixoul_posts
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  );

CREATE POLICY "pixoul_can_update"
  ON public.pixoul_posts
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  )
  WITH CHECK (
    auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  );

CREATE POLICY "pixoul_can_delete"
  ON public.pixoul_posts
  FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  );

-- Storage bucket policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('pixoul-posts', 'pixoul-posts', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff upload" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff update" ON storage.objects;
DROP POLICY IF EXISTS "Pixoul staff delete" ON storage.objects;

-- Storage policies for pixoul-posts bucket
CREATE POLICY "Public read pixoul posts"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'pixoul-posts');

CREATE POLICY "Pixoul staff upload"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  );

CREATE POLICY "Pixoul staff update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'pixoul-posts' 
    AND auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  )
  WITH CHECK (
    bucket_id = 'pixoul-posts' 
    AND auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  );

CREATE POLICY "Pixoul staff delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'pixoul-posts' 
    AND auth.jwt() ->> 'email' = 'pixoulgaming@staffportal.com'
  );