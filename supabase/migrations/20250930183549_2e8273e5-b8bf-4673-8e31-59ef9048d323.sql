-- Create storage bucket for snacks
INSERT INTO storage.buckets (id, name, public) 
VALUES ('snacks', 'snacks', true);

-- Create RLS policies for snacks bucket
CREATE POLICY "Snacks images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'snacks');

CREATE POLICY "Snacks staff can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'snacks' AND 
  is_staff_with_role(auth.uid(), 'snacks')
);

CREATE POLICY "Snacks staff can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'snacks' AND 
  is_staff_with_role(auth.uid(), 'snacks')
);

CREATE POLICY "Snacks staff can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'snacks' AND 
  is_staff_with_role(auth.uid(), 'snacks')
);