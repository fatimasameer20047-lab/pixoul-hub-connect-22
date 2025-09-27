-- Gallery and Media Tables
CREATE TABLE public.gallery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  is_private BOOLEAN NOT NULL DEFAULT true,
  is_shared_publicly BOOLEAN NOT NULL DEFAULT false,
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT NULL,
  rejection_reason TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gallery Comments
CREATE TABLE public.gallery_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Gallery Likes
CREATE TABLE public.gallery_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gallery_item_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gallery_item_id, user_id)
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Menu Categories and Items
CREATE TABLE public.menu_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  is_in_stock BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Orders
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10,2) NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('pickup', 'room')),
  delivery_location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'delivered', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Gallery Items Policies
CREATE POLICY "Users can create their own gallery items" 
ON public.gallery_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own private items" 
ON public.gallery_items 
FOR SELECT 
USING (auth.uid() = user_id OR (is_shared_publicly = true AND approval_status = 'approved'));

CREATE POLICY "Users can update their own items" 
ON public.gallery_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Gallery moderators can manage pending items" 
ON public.gallery_items 
FOR ALL 
USING (has_role(auth.uid(), 'gallery_moderator'::app_role));

-- Gallery Comments Policies
CREATE POLICY "Users can create comments on approved public items" 
ON public.gallery_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM gallery_items 
  WHERE id = gallery_item_id 
  AND is_shared_publicly = true 
  AND approval_status = 'approved'
));

CREATE POLICY "Anyone can view comments on approved items" 
ON public.gallery_comments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gallery_items 
  WHERE id = gallery_item_id 
  AND is_shared_publicly = true 
  AND approval_status = 'approved'
));

-- Gallery Likes Policies
CREATE POLICY "Users can like approved public items" 
ON public.gallery_likes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM gallery_items 
  WHERE id = gallery_item_id 
  AND is_shared_publicly = true 
  AND approval_status = 'approved'
));

CREATE POLICY "Users can view likes on approved items" 
ON public.gallery_likes 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gallery_items 
  WHERE id = gallery_item_id 
  AND is_shared_publicly = true 
  AND approval_status = 'approved'
));

-- Announcements Policies
CREATE POLICY "Everyone can view published announcements" 
ON public.announcements 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Announcements staff can manage announcements" 
ON public.announcements 
FOR ALL 
USING (has_role(auth.uid(), 'announcements'::app_role));

-- Menu Policies
CREATE POLICY "Everyone can view active menu categories" 
ON public.menu_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Everyone can view active menu items" 
ON public.menu_items 
FOR SELECT 
USING (is_active = true);

-- Orders Policies
CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Snacks staff can view and update all orders" 
ON public.orders 
FOR ALL 
USING (has_role(auth.uid(), 'snacks'::app_role));

-- Notifications Policies
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add foreign key constraints
ALTER TABLE gallery_comments ADD CONSTRAINT fk_gallery_comments_item 
FOREIGN KEY (gallery_item_id) REFERENCES gallery_items(id) ON DELETE CASCADE;

ALTER TABLE gallery_likes ADD CONSTRAINT fk_gallery_likes_item 
FOREIGN KEY (gallery_item_id) REFERENCES gallery_items(id) ON DELETE CASCADE;

ALTER TABLE menu_items ADD CONSTRAINT fk_menu_items_category 
FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE;

-- Add updated_at triggers
CREATE TRIGGER update_gallery_items_updated_at
BEFORE UPDATE ON public.gallery_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample menu categories
INSERT INTO public.menu_categories (name, description, display_order) VALUES
('Snacks', 'Light bites and quick snacks', 1),
('Drinks', 'Beverages and refreshments', 2),
('Combos', 'Value meal combinations', 3);

-- Insert sample menu items
INSERT INTO public.menu_items (category_id, name, description, price) VALUES
((SELECT id FROM menu_categories WHERE name = 'Snacks'), 'Nachos', 'Crispy tortilla chips with cheese', 8.99),
((SELECT id FROM menu_categories WHERE name = 'Snacks'), 'Chicken Wings', '6 pieces with your choice of sauce', 12.99),
((SELECT id FROM menu_categories WHERE name = 'Snacks'), 'Loaded Fries', 'Fries topped with cheese and bacon', 9.99),
((SELECT id FROM menu_categories WHERE name = 'Drinks'), 'Soda', 'Assorted soft drinks', 2.99),
((SELECT id FROM menu_categories WHERE name = 'Drinks'), 'Fresh Juice', 'Orange or apple juice', 4.99),
((SELECT id FROM menu_categories WHERE name = 'Drinks'), 'Coffee', 'Hot brewed coffee', 3.99),
((SELECT id FROM menu_categories WHERE name = 'Combos'), 'Game Night Special', 'Nachos + 2 Sodas', 13.99),
((SELECT id FROM menu_categories WHERE name = 'Combos'), 'Party Pack', 'Wings + Loaded Fries + 4 Drinks', 29.99);