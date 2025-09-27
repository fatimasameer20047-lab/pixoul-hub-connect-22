-- Add foreign key constraint to gallery_items for better relationship support
ALTER TABLE public.gallery_items 
ADD CONSTRAINT gallery_items_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;