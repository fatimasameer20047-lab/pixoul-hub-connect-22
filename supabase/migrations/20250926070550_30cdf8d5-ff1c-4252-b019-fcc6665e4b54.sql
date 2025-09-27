-- Add image_url column to rooms table if it doesn't exist
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create rooms storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rooms', 'rooms', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for rooms bucket
CREATE POLICY "Room images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'rooms');

-- Clear existing rooms data and insert new inventory
DELETE FROM public.rooms;

INSERT INTO public.rooms (name, type, capacity, hourly_rate, description, amenities, image_url) VALUES
('PC Room 1', 'standard', 8, 80, 'High-performance gaming PCs with premium peripherals', ARRAY['High-end Gaming PCs', 'Gaming Headsets', 'Mechanical Keyboards', 'Gaming Mice', 'Air Conditioning'], '/rooms/pc-room-1.jpg'),
('PC Room 2', 'standard', 8, 80, 'State-of-the-art gaming setup for competitive play', ARRAY['High-end Gaming PCs', 'Gaming Headsets', 'Mechanical Keyboards', 'Gaming Mice', 'Air Conditioning'], '/rooms/pc-room-2.jpg'),
('PC Room 3', 'standard', 8, 80, 'Modern gaming environment with latest hardware', ARRAY['High-end Gaming PCs', 'Gaming Headsets', 'Mechanical Keyboards', 'Gaming Mice', 'Air Conditioning'], '/rooms/pc-room-3.jpg'),
('PC Room 4', 'standard', 8, 80, 'Premium gaming experience with top-tier equipment', ARRAY['High-end Gaming PCs', 'Gaming Headsets', 'Mechanical Keyboards', 'Gaming Mice', 'Air Conditioning'], '/rooms/pc-room-4.jpg'),
('VIP Room 1', 'vip', 6, 120, 'Exclusive VIP gaming experience with luxury amenities', ARRAY['Premium Gaming PCs', 'Noise Canceling Headsets', 'RGB Lighting', 'Private Lounge Area', 'Refreshments'], '/rooms/vip-room-1.jpg'),
('VIP Room 2', 'vip', 6, 120, 'Luxury private gaming space for premium experiences', ARRAY['Premium Gaming PCs', 'Noise Canceling Headsets', 'RGB Lighting', 'Private Lounge Area', 'Refreshments'], NULL),
('Social Gaming Room', 'social', 12, 100, 'Large social space for group gaming and events', ARRAY['Console Gaming', 'Large Screen TVs', 'Comfortable Seating', 'Social Gaming Setup', 'Event Space'], '/rooms/social-gaming-room.jpg'),
('Event Hall', 'event', 50, 200, 'Spacious event hall perfect for large gatherings and tournaments', ARRAY['Large Event Space', 'Professional AV Equipment', 'Stage Area', 'Flexible Seating', 'Catering Support'], '/rooms/event-hall.jpg');

-- Add school_name column to party_requests if it doesn't exist (age already exists)
ALTER TABLE public.party_requests ADD COLUMN IF NOT EXISTS school_name TEXT;