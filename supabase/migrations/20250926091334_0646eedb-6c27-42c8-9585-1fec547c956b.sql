-- Make gallery bucket public
UPDATE storage.buckets SET public = true WHERE id = 'gallery';

-- Add caption field to gallery_items
ALTER TABLE gallery_items ADD COLUMN IF NOT EXISTS caption TEXT DEFAULT '';

-- Create photo_likes table
CREATE TABLE IF NOT EXISTS photo_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(photo_id, user_id)
);

-- Create photo_comments table
CREATE TABLE IF NOT EXISTS photo_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES gallery_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for photo_likes
CREATE POLICY "Users can view all likes" ON photo_likes FOR SELECT USING (true);
CREATE POLICY "Users can like photos" ON photo_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike their own likes" ON photo_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for photo_comments
CREATE POLICY "Users can view all comments" ON photo_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON photo_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON photo_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Photo owners can delete comments on their photos" ON photo_comments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM gallery_items 
    WHERE gallery_items.id = photo_comments.photo_id 
    AND gallery_items.user_id = auth.uid()
  )
);

-- Add realtime for likes and comments
ALTER PUBLICATION supabase_realtime ADD TABLE photo_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE photo_comments;