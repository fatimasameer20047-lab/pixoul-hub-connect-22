-- Add room/location metadata tracking for carts and orders
ALTER TABLE public.carts
  ADD COLUMN IF NOT EXISTS room_location text,
  ADD COLUMN IF NOT EXISTS room_details text,
  ADD COLUMN IF NOT EXISTS inside_pixoul_confirmed boolean NOT NULL DEFAULT false;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS room_location text,
  ADD COLUMN IF NOT EXISTS room_details text,
  ADD COLUMN IF NOT EXISTS inside_pixoul_confirmed boolean NOT NULL DEFAULT false;
