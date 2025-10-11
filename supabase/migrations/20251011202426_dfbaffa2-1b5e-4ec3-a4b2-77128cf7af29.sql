-- Fix search path security issue for update_saved_cards_updated_at function
DROP TRIGGER IF EXISTS update_saved_cards_updated_at ON saved_cards;
DROP FUNCTION IF EXISTS update_saved_cards_updated_at();

CREATE OR REPLACE FUNCTION update_saved_cards_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_saved_cards_updated_at
BEFORE UPDATE ON saved_cards
FOR EACH ROW
EXECUTE FUNCTION update_saved_cards_updated_at();