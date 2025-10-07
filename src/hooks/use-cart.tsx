import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CartItem {
  id: string;
  cart_id: string;
  menu_item_id: string;
  name: string;
  unit_price: number;
  qty: number;
  line_total: number;
  image_url?: string;
}

interface Cart {
  id: string;
  subtotal: number;
  tax: number;
  fees: number;
  tip: number;
  total: number;
  items: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  addToCart: (item: { id: string; name: string; price: number; image_url?: string }, quantity: number) => Promise<void>;
  updateQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  removeItem: (cartItemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);

  const fetchCart = async () => {
    if (!user) {
      setCart(null);
      return;
    }

    try {
      // Get or create active cart
      let { data: existingCart } = await supabase
        .from('carts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (!existingCart) {
        const { data: newCart } = await supabase
          .from('carts')
          .insert({ user_id: user.id })
          .select()
          .single();
        existingCart = newCart;
      }

      if (existingCart) {
        // Fetch cart items
        const { data: items } = await supabase
          .from('cart_items')
          .select('*')
          .eq('cart_id', existingCart.id);

        setCart({
          ...existingCart,
          items: items || [],
        });
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.line_total, 0);
    const tax = subtotal * 0.05; // 5% tax
    const fees = 0;
    const tip = 0;
    const total = subtotal + tax + fees + tip;
    return { subtotal, tax, fees, tip, total };
  };

  const addToCart = async (item: { id: string; name: string; price: number; image_url?: string }, quantity: number) => {
    if (!user || !cart) {
      toast({ title: 'Please sign in to add items to cart', variant: 'destructive' });
      return;
    }

    try {
      // Check if item already exists in cart
      const existingItem = cart.items.find(i => i.menu_item_id === item.id);

      if (existingItem) {
        const newQty = existingItem.qty + quantity;
        await updateQuantity(existingItem.id, newQty);
      } else {
        const line_total = item.price * quantity;
        
        const { error } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cart.id,
            menu_item_id: item.id,
            name: item.name,
            unit_price: item.price,
            qty: quantity,
            line_total,
            image_url: item.image_url,
          });

        if (error) throw error;
      }

      await refreshCart();
      toast({ title: `Added ${item.name} to cart` });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({ title: 'Failed to add item to cart', variant: 'destructive' });
    }
  };

  const updateQuantity = async (cartItemId: string, quantity: number) => {
    if (!cart) return;

    try {
      const item = cart.items.find(i => i.id === cartItemId);
      if (!item) return;

      if (quantity <= 0) {
        await removeItem(cartItemId);
        return;
      }

      const line_total = item.unit_price * quantity;

      const { error } = await supabase
        .from('cart_items')
        .update({ qty: quantity, line_total })
        .eq('id', cartItemId);

      if (error) throw error;

      await refreshCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({ title: 'Failed to update quantity', variant: 'destructive' });
    }
  };

  const removeItem = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      await refreshCart();
      toast({ title: 'Item removed from cart' });
    } catch (error) {
      console.error('Error removing item:', error);
      toast({ title: 'Failed to remove item', variant: 'destructive' });
    }
  };

  const clearCart = async () => {
    if (!cart) return;

    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id);

      if (error) throw error;

      await refreshCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const refreshCart = async () => {
    if (!cart) return;

    const { data: items } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cart.id);

    const totals = calculateTotals(items || []);

    await supabase
      .from('carts')
      .update(totals)
      .eq('id', cart.id);

    setCart({
      ...cart,
      ...totals,
      items: items || [],
    });
  };

  const itemCount = cart?.items.reduce((sum, item) => sum + item.qty, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        itemCount,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
