-- Create snacks table
CREATE TABLE IF NOT EXISTS public.snacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.snacks ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view snacks
CREATE POLICY "Snacks are viewable by everyone"
ON public.snacks
FOR SELECT
USING (true);

-- Allow snacks staff to manage snacks
CREATE POLICY "Snacks staff can manage snacks"
ON public.snacks
FOR ALL
USING (has_role(auth.uid(), 'snacks'::app_role));

-- Update rooms RLS to allow booking staff to manage
CREATE POLICY "Booking staff can manage rooms"
ON public.rooms
FOR ALL
USING (has_role(auth.uid(), 'booking'::app_role));

-- Update guides RLS to allow guides staff to manage
CREATE POLICY "Guides staff can manage guides"
ON public.guides
FOR ALL
USING (has_role(auth.uid(), 'guides'::app_role));

-- Update announcements RLS to allow guides staff to manage
CREATE POLICY "Guides staff can manage announcements"
ON public.announcements
FOR ALL
USING (has_role(auth.uid(), 'guides'::app_role));

-- Update gallery RLS to allow gallery staff to manage
CREATE POLICY "Gallery staff can manage all posts"
ON public.gallery_items
FOR ALL
USING (has_role(auth.uid(), 'gallery'::app_role));

-- Allow events staff to manage registrations
CREATE POLICY "Events staff can manage registrations"
ON public.event_registrations
FOR ALL
USING (has_role(auth.uid(), 'events_programs'::app_role));

-- Add trigger for updated_at on snacks
CREATE TRIGGER update_snacks_updated_at
BEFORE UPDATE ON public.snacks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert existing snack items
INSERT INTO public.snacks (name, price, category, available) VALUES
  ('Coffee', 3.50, 'Beverages', true),
  ('Tea', 2.50, 'Beverages', true),
  ('Sandwich', 8.50, 'Food', true),
  ('Cookies', 2.00, 'Snacks', false),
  ('Water', 1.50, 'Beverages', true)
ON CONFLICT DO NOTHING;