-- Create gallery storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery', 'gallery', false);

-- Create gallery_items table
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Create policies for gallery_items
CREATE POLICY "Users can view their own gallery items" 
ON public.gallery_items 
FOR SELECT 
USING (auth.uid()::text = user_id::text OR visibility = 'public');

CREATE POLICY "Users can create their own gallery items" 
ON public.gallery_items 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own gallery items" 
ON public.gallery_items 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own gallery items" 
ON public.gallery_items 
FOR DELETE 
USING (auth.uid()::text = user_id::text);

-- Create storage policies for gallery bucket
CREATE POLICY "Users can view their own gallery files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gallery' AND (auth.uid()::text = (storage.foldername(name))[1] OR 
  EXISTS (SELECT 1 FROM public.gallery_items WHERE url LIKE '%' || name AND visibility = 'public')));

CREATE POLICY "Users can upload their own gallery files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own gallery files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own gallery files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'gallery' AND auth.uid()::text = (storage.foldername(name))[1]);