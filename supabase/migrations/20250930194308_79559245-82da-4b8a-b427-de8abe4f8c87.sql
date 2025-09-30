-- Fix RLS policies for room_bookings to work with staff accounts
-- Drop the existing policy that uses has_role
DROP POLICY IF EXISTS "Booking staff can view all bookings" ON room_bookings;

-- Create new policy using is_staff_with_role which works with staff accounts
CREATE POLICY "Booking staff can view all bookings"
ON room_bookings
FOR ALL
USING (is_staff_with_role(auth.uid(), 'booking'::text));

-- Fix RLS policies for party_requests to work with staff accounts
-- Drop the existing policy that uses has_role
DROP POLICY IF EXISTS "Booking staff can view all party requests" ON party_requests;

-- Create new policy using is_staff_with_role which works with staff accounts
CREATE POLICY "Booking staff can view all party requests"
ON party_requests
FOR ALL
USING (is_staff_with_role(auth.uid(), 'booking'::text));