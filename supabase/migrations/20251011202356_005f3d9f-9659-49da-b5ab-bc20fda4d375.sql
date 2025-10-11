-- Add payment tracking fields to room_bookings
ALTER TABLE room_bookings
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS stripe_payment_id text;

-- Add payment tracking fields to event_registrations
ALTER TABLE event_registrations
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS stripe_payment_id text,
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0;

-- Add payment tracking fields to party_requests
ALTER TABLE party_requests
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS stripe_payment_id text,
ADD COLUMN IF NOT EXISTS ready_to_pay boolean DEFAULT false;

-- Create saved_cards table for storing customer payment methods
CREATE TABLE IF NOT EXISTS saved_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_payment_method_id text NOT NULL,
  card_brand text NOT NULL,
  card_last4 text NOT NULL,
  card_exp_month integer NOT NULL,
  card_exp_year integer NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on saved_cards
ALTER TABLE saved_cards ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_cards
CREATE POLICY "Users can view their own saved cards"
ON saved_cards FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved cards"
ON saved_cards FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved cards"
ON saved_cards FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved cards"
ON saved_cards FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_saved_cards_user_id ON saved_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_cards_stripe_customer_id ON saved_cards(stripe_customer_id);

-- Update room_bookings to only confirm after payment
UPDATE room_bookings SET status = 'pending' WHERE payment_status = 'unpaid' AND status = 'confirmed';

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_saved_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_cards_updated_at
BEFORE UPDATE ON saved_cards
FOR EACH ROW
EXECUTE FUNCTION update_saved_cards_updated_at();