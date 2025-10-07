-- Add new columns to snacks table for ordering system
ALTER TABLE public.snacks
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS stock_qty integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS prep_time_min integer DEFAULT 5;

-- Create carts table
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'submitted')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  fees numeric(10,2) NOT NULL DEFAULT 0,
  tip numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_or_session CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.snacks(id) ON DELETE RESTRICT,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  line_total numeric(10,2) NOT NULL,
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_id uuid REFERENCES public.carts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  subtotal numeric(10,2) NOT NULL,
  tax numeric(10,2) NOT NULL,
  fees numeric(10,2) NOT NULL,
  tip numeric(10,2) NOT NULL,
  total numeric(10,2) NOT NULL,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refund_pending', 'refunded')),
  payment_method text NOT NULL DEFAULT 'counter' CHECK (payment_method IN ('counter', 'card')),
  fulfillment text NOT NULL DEFAULT 'pickup' CHECK (fulfillment = 'pickup'),
  notes text,
  estimated_ready_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.snacks(id) ON DELETE RESTRICT,
  name text NOT NULL,
  unit_price numeric(10,2) NOT NULL,
  qty integer NOT NULL CHECK (qty > 0),
  line_total numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for carts
CREATE POLICY "Users can view their own carts"
  ON public.carts FOR SELECT
  USING (auth.uid() = user_id OR session_id = current_setting('app.session_id', true));

CREATE POLICY "Users can create their own carts"
  ON public.carts FOR INSERT
  WITH CHECK (auth.uid() = user_id OR session_id IS NOT NULL);

CREATE POLICY "Users can update their own active carts"
  ON public.carts FOR UPDATE
  USING (auth.uid() = user_id AND status = 'active');

CREATE POLICY "Users can delete their own active carts"
  ON public.carts FOR DELETE
  USING (auth.uid() = user_id AND status = 'active');

-- RLS Policies for cart_items
CREATE POLICY "Users can view their own cart items"
  ON public.cart_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND (carts.user_id = auth.uid() OR carts.session_id = current_setting('app.session_id', true))
  ));

CREATE POLICY "Users can manage their own cart items"
  ON public.cart_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.carts
    WHERE carts.id = cart_items.cart_id
    AND carts.user_id = auth.uid()
    AND carts.status = 'active'
  ));

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Snacks staff can view all orders"
  ON public.orders FOR SELECT
  USING (is_staff_with_role(auth.uid(), 'snacks'));

CREATE POLICY "Snacks staff can update orders"
  ON public.orders FOR UPDATE
  USING (is_staff_with_role(auth.uid(), 'snacks'));

-- RLS Policies for order_items
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Snacks staff can view all order items"
  ON public.order_items FOR SELECT
  USING (is_staff_with_role(auth.uid(), 'snacks'));

-- Create indexes for performance
CREATE INDEX idx_carts_user_id ON public.carts(user_id);
CREATE INDEX idx_carts_status ON public.carts(status);
CREATE INDEX idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- Trigger to update updated_at on carts
CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON public.carts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to update updated_at on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();