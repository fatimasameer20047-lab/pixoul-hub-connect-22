-- Create events storage bucket for event/program cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Allow Ahmed (events staff) to upload event images
CREATE POLICY "Events staff can upload event images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'events' 
  AND is_staff_with_role(auth.uid(), 'events_programs'::text)
);

-- Allow Ahmed to update event images
CREATE POLICY "Events staff can update event images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'events' 
  AND is_staff_with_role(auth.uid(), 'events_programs'::text)
);

-- Allow Ahmed to delete event images
CREATE POLICY "Events staff can delete event images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'events' 
  AND is_staff_with_role(auth.uid(), 'events_programs'::text)
);

-- Allow everyone to view event images (public bucket)
CREATE POLICY "Event images are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'events');