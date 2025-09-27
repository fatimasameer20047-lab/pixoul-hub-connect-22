-- Add missing columns to existing tables
ALTER TABLE public.gallery_items ADD COLUMN IF NOT EXISTS like_count integer DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color text DEFAULT '#6366F1';

-- Update the handle_new_user function to use full_name from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile for customer users with full_name from metadata
  INSERT INTO public.profiles (user_id, name, full_name, avatar_color)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', 'User'),
    '#' || substr(md5(new.id::text), 1, 6) -- Generate a hex color from user ID
  );
  
  -- Assign customer role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'customer');
  
  RETURN new;
END;
$$;

-- Function to update like counts when likes are added/removed
CREATE OR REPLACE FUNCTION public.update_photo_like_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.gallery_items 
    SET like_count = like_count + 1 
    WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.gallery_items 
    SET like_count = like_count - 1 
    WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers to automatically update like counts
DROP TRIGGER IF EXISTS update_like_count_on_insert ON public.photo_likes;
DROP TRIGGER IF EXISTS update_like_count_on_delete ON public.photo_likes;

CREATE TRIGGER update_like_count_on_insert
  AFTER INSERT ON public.photo_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_photo_like_count();

CREATE TRIGGER update_like_count_on_delete
  AFTER DELETE ON public.photo_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_photo_like_count();

-- Add unique constraint on photo_likes if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'photo_likes_photo_id_user_id_key') THEN
    ALTER TABLE public.photo_likes ADD CONSTRAINT photo_likes_photo_id_user_id_key UNIQUE (photo_id, user_id);
  END IF;
END $$;