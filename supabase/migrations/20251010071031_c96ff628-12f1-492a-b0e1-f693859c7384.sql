-- Create party_gallery table for Sara's event galleries
CREATE TABLE public.party_gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('birthday', 'other')),
  caption TEXT NOT NULL,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.party_gallery ENABLE ROW LEVEL SECURITY;

-- Everyone can view published galleries
CREATE POLICY "Party galleries are viewable by everyone"
  ON public.party_gallery
  FOR SELECT
  USING (true);

-- Only Sara (booking staff) can manage galleries
CREATE POLICY "Booking staff can manage party galleries"
  ON public.party_gallery
  FOR ALL
  USING (is_staff_with_role(auth.uid(), 'booking'));

-- Add trigger for updated_at
CREATE TRIGGER update_party_gallery_updated_at
  BEFORE UPDATE ON public.party_gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for party gallery images
INSERT INTO storage.buckets (id, name, public)
VALUES ('party-gallery', 'party-gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for party gallery images
CREATE POLICY "Party gallery images are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'party-gallery');

CREATE POLICY "Booking staff can upload party gallery images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'party-gallery' 
    AND is_staff_with_role(auth.uid(), 'booking')
  );

CREATE POLICY "Booking staff can update party gallery images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'party-gallery' 
    AND is_staff_with_role(auth.uid(), 'booking')
  );

CREATE POLICY "Booking staff can delete party gallery images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'party-gallery' 
    AND is_staff_with_role(auth.uid(), 'booking')
  );