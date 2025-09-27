-- Fix function search path security issues
CREATE OR REPLACE FUNCTION public.update_photo_like_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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