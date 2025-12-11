-- Seed hidden menu items for Packages & Offers so cart_items/order_items FK checks pass
-- These stay unavailable, so they won't appear in the Snacks & Drinks menu
INSERT INTO public.snacks (id, name, price, category, available, pinned, description, image_url, stock_qty, prep_time_min)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Training Room - 1 Hour', 20, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('11111111-1111-4111-8111-111111111114', 'Training Room - 4 Hours', 60, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('11111111-1111-4111-8111-111111111116', 'Training Room - 6 Hours', 80, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('22222222-2222-4222-8222-222222222221', 'VIP Room - 1 Hour', 30, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('22222222-2222-4222-8222-222222222224', 'VIP Room - 4 Hours', 95, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('22222222-2222-4222-8222-222222222226', 'VIP Room - 6 Hours', 140, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('33333333-3333-4333-8333-333333333331', 'Private Room - 1 Hour', 40, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('33333333-3333-4333-8333-333333333333', 'Private Room - 3 Hours', 95, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('33333333-3333-4333-8333-333333333335', 'Private Room - 5 Hours', 140, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('44444444-4444-4444-8444-444444444441', 'Social Package 1 - 1 Hour', 300, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('44444444-4444-4444-8444-444444444442', 'Social Package 2 - 1 Hour', 675, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0),
  ('44444444-4444-4444-8444-444444444443', 'Social Package 3 - 1 Hour', 1000, 'Food', false, false, 'Packages & Offers placeholder item', NULL, 1000, 0)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  available = EXCLUDED.available,
  pinned = EXCLUDED.pinned,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  stock_qty = EXCLUDED.stock_qty,
  prep_time_min = EXCLUDED.prep_time_min;
