-- Add foreign key constraint from room_bookings to profiles
-- This allows Supabase to properly join the tables
ALTER TABLE public.room_bookings
DROP CONSTRAINT IF EXISTS room_bookings_user_id_fkey;

ALTER TABLE public.room_bookings
ADD CONSTRAINT room_bookings_user_id_profiles_fkey
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint from party_requests to profiles
ALTER TABLE public.party_requests
DROP CONSTRAINT IF EXISTS party_requests_user_id_fkey;

ALTER TABLE public.party_requests
ADD CONSTRAINT party_requests_user_id_profiles_fkey
FOREIGN KEY (user_id) 
REFERENCES public.profiles(user_id) 
ON DELETE CASCADE;

-- Enable realtime for room_bookings table
ALTER TABLE public.room_bookings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_bookings;

-- Enable realtime for party_requests table
ALTER TABLE public.party_requests REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_requests;