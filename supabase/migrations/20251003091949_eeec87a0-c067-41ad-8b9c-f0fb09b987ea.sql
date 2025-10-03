-- Create pixoul_posts table
CREATE TABLE public.pixoul_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  type TEXT NOT NULL CHECK (type IN ('event', 'program', 'announcement', 'post')),
  title TEXT,
  caption TEXT NOT NULL,
  media_urls TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Enable RLS
ALTER TABLE public.pixoul_posts ENABLE ROW LEVEL SECURITY;

-- Policy: Only pixoulgaming@staffportal.com can manage Pixoul posts
CREATE POLICY "Pixoul staff can manage posts"
ON public.pixoul_posts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'pixoulgaming@staffportal.com'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.email = 'pixoulgaming@staffportal.com'
  )
);

-- Policy: Everyone can view published posts
CREATE POLICY "Published posts are viewable by everyone"
ON public.pixoul_posts
FOR SELECT
USING (status = 'published');

-- Trigger to update updated_at
CREATE TRIGGER update_pixoul_posts_updated_at
BEFORE UPDATE ON public.pixoul_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();