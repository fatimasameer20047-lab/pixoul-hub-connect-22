import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!cart || cart.items.length === 0) {
      navigate('/snacks');
    }
  }, [user, cart, navigate]);

  const createOrder = async () => {
    if (!cart || !user) return;

    try {
      setCreating(true);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          cart_id: cart.id,
          subtotal: cart.subtotal,
          tax: cart.tax,
          fees: cart.fees,
          tip: cart.tip,
          total: cart.total,
          payment_status: 'unpaid',
          payment_method: 'card',
          fulfillment: 'pickup',
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        qty: item.qty,
        unit_price: item.unit_price,
        line_total: item.line_total
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderId(order.id);
      setShowCheckout(true);
    } catch (error) {
      console.error('Order creation error:', error);
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleCheckoutSuccess = () => {
    clearCart();
  };

  if (!cart) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.qty}</p>
                </div>
                <p className="font-medium">{formatPriceAEDUSD(item.line_total)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPriceAEDUSD(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (5%)</span>
              <span>{formatPriceAEDUSD(cart.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPriceAEDUSD(cart.total)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={createOrder}
            disabled={creating || !cart.items.length}
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Order...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </Button>
        </CardContent>
      </Card>

      {orderId && (
        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          type="order"
          referenceId={orderId}
          amount={cart.total}
          itemName="Food & Drinks Order"
          description={`Order with ${cart.items.length} items`}
          onSuccess={handleCheckoutSuccess}
        />
      )}
    </div>
  );
}
