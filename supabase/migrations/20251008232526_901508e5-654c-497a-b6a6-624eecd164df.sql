-- Add pinned column to snacks table
ALTER TABLE public.snacks ADD COLUMN pinned boolean NOT NULL DEFAULT false;

-- Update existing categories to new names
UPDATE public.snacks SET category = 'Drinks' WHERE category = 'Beverages';
UPDATE public.snacks SET category = 'Sweets' WHERE category = 'Snacks';

-- Create enum for categories
CREATE TYPE public.snack_category AS ENUM ('Food', 'Drinks', 'Sweets');

-- Alter the category column to use the enum type
ALTER TABLE public.snacks ALTER COLUMN category TYPE public.snack_category USING category::public.snack_category;