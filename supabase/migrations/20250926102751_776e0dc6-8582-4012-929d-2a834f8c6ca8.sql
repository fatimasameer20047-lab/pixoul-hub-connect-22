-- Create announcements table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Create policy for reading announcements (drop if exists first)
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON public.announcements;
CREATE POLICY "Announcements are viewable by everyone"
ON public.announcements
FOR SELECT
USING (published = true);

-- Add comment_count column to gallery_items if it doesn't exist
ALTER TABLE public.gallery_items 
ADD COLUMN IF NOT EXISTS comment_count INTEGER NOT NULL DEFAULT 0;

-- Create trigger to update comment_count
CREATE OR REPLACE FUNCTION public.update_photo_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.gallery_items 
    SET comment_count = comment_count + 1 
    WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.gallery_items 
    SET comment_count = comment_count - 1 
    WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for comment count
DROP TRIGGER IF EXISTS update_gallery_comment_count_on_insert ON public.photo_comments;
DROP TRIGGER IF EXISTS update_gallery_comment_count_on_delete ON public.photo_comments;

CREATE TRIGGER update_gallery_comment_count_on_insert
AFTER INSERT ON public.photo_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_photo_comment_count();

CREATE TRIGGER update_gallery_comment_count_on_delete
AFTER DELETE ON public.photo_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_photo_comment_count();