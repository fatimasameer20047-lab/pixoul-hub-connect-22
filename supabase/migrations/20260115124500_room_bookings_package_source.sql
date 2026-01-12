-- Add source and package label metadata to room bookings for staff visibility
ALTER TABLE public.room_bookings
ADD COLUMN IF NOT EXISTS booking_source text DEFAULT 'room' CHECK (booking_source IN ('room', 'package'));

ALTER TABLE public.room_bookings
ADD COLUMN IF NOT EXISTS package_label text;

-- Backfill booking_source for any rows missing the default
UPDATE public.room_bookings
SET booking_source = COALESCE(booking_source, 'room');
