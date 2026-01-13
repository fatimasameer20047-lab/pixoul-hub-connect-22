import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPriceAED } from '@/lib/price-formatter';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { isPackageMenuItem } from '@/lib/package-catalog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const ROOM_OPTIONS = [
  'TR1',
  'TR2',
  'TR3',
  'TR4',
  'Social Gaming Room',
  'VIP Lounge 1',
  'VIP Lounge 2',
  'Other',
] as const;

export default function Checkout() {
  const { cart, clearCart, updateCartDetails } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [roomLocation, setRoomLocation] = useState<string>(cart?.room_location || '');
  const [roomDetails, setRoomDetails] = useState<string>(cart?.room_details || '');
  const [insidePixoul, setInsidePixoul] = useState<boolean>(Boolean(cart?.inside_pixoul_confirmed));
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const showLocationQuestions = cart?.items.some((item) => !isPackageMenuItem(item.menu_item_id)) ?? false;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!cart || cart.items.length === 0) {
      navigate('/snacks');
    }
  }, [user, cart, navigate]);

  useEffect(() => {
    if (cart) {
      setRoomLocation(cart.room_location || '');
      setRoomDetails(cart.room_details || '');
      setInsidePixoul(Boolean(cart.inside_pixoul_confirmed));
    }
  }, [cart?.room_location, cart?.room_details, cart?.inside_pixoul_confirmed]);

  const handleRoomChange = (value: string) => {
    setRoomLocation(value);
    if (value !== 'Other') {
      setRoomDetails('');
      updateCartDetails({ room_location: value, room_details: null });
    } else {
      updateCartDetails({ room_location: value });
    }
  };

  const handleRoomDetailsChange = (value: string) => {
    setRoomDetails(value);
    if (roomLocation === 'Other') {
      updateCartDetails({ room_details: value });
    }
  };

  const handleInsidePixoulChange = (checked: boolean) => {
    setInsidePixoul(checked);
    updateCartDetails({ inside_pixoul_confirmed: checked });
  };

  const handleBackToCart = () => {
    navigate('/snacks', { state: { openCart: true } });
  };

  const createOrder = async () => {
    if (!cart || !user) return;
    const isCash = paymentMethod === 'cash';

    if (showLocationQuestions && !roomLocation) {
      toast({
        title: 'Select your room',
        description: 'Please let us know where you are inside Pixoul so we can deliver your snacks.',
        variant: 'destructive',
      });
      return;
    }

    const trimmedDetails = roomLocation === 'Other' ? roomDetails.trim() : null;

    if (showLocationQuestions && roomLocation === 'Other' && !trimmedDetails) {
      toast({
        title: 'Describe your location',
        description: 'Tell us where you are seated inside Pixoul.',
        variant: 'destructive',
      });
      return;
    }

    if (showLocationQuestions && !insidePixoul) {
      toast({
        title: 'Confirm you are inside Pixoul',
        description: 'Orders are served on-site only. Please confirm you are currently inside the venue.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreating(true);
      await updateCartDetails(
        showLocationQuestions
          ? {
              room_location: roomLocation,
              room_details: trimmedDetails,
              inside_pixoul_confirmed: insidePixoul,
            }
          : {
              room_location: null,
              room_details: null,
              inside_pixoul_confirmed: false,
            }
      );

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
          payment_method: paymentMethod,
          fulfillment: 'pickup',
          status: 'new',
          room_location: showLocationQuestions ? roomLocation : null,
          room_details: showLocationQuestions ? trimmedDetails : null,
          inside_pixoul_confirmed: showLocationQuestions ? insidePixoul : false,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (isCash) {
        const orderItems = (cart.items || []).map((item) => ({
          order_id: order.id,
          menu_item_id: item.menu_item_id,
          name: item.name,
          qty: item.qty,
          unit_price: item.unit_price,
          line_total: item.line_total,
        }));

        if (orderItems.length > 0) {
          const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
          if (itemsError) throw itemsError;
        }

        await supabase.from('carts').update({ status: 'completed' }).eq('id', cart.id);
        await clearCart();
        setShowCheckout(false);
        setOrderId(null);
        toast({
          title: 'Order placed',
          description: `Pay with cash when you pick up. ${order.order_number ? `Order #${order.order_number}` : `Order #${order.id.slice(0, 8)}`}`,
        });
        navigate('/snacks', { state: { openOrders: true } });
      } else {
        // Don't create order items yet - they'll be created by the webhook after payment
        setOrderId(order.id);
        setShowCheckout(true);
      }
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToCart} aria-label="Back to cart">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle>Checkout</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showLocationQuestions && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-location">Room / Location inside Pixoul</Label>
                <Select value={roomLocation || undefined} onValueChange={handleRoomChange}>
                  <SelectTrigger id="room-location" aria-label="Room or location">
                    <SelectValue placeholder="Choose your room or area" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {roomLocation === 'Other' && (
                <div className="space-y-2">
                  <Label htmlFor="room-details">Describe your location inside Pixoul</Label>
                  <Input
                    id="room-details"
                    value={roomDetails}
                    onChange={(event) => handleRoomDetailsChange(event.target.value)}
                    placeholder="Example: Near the VR arena entrance"
                  />
                </div>
              )}
              <div className="flex items-start gap-2">
                <Checkbox
                  id="inside-pixoul"
                  checked={insidePixoul}
                  onCheckedChange={(checked) => handleInsidePixoulChange(Boolean(checked))}
                />
                <Label htmlFor="inside-pixoul" className="text-sm font-normal leading-snug">
                  I confirm I am currently inside Pixoul Gaming (in-venue service only, no external delivery).
                </Label>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.qty}</p>
                </div>
                <p className="font-medium">{formatPriceAED(item.line_total)}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2 pt-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPriceAED(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (5%)</span>
              <span>{formatPriceAED(cart.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPriceAED(cart.total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Payment method</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod((value as 'card' | 'cash') || 'card')}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <RadioGroupItem value="card" id="pay-card" />
                <Label htmlFor="pay-card" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">Pay by Card</span>
                  <span className="text-xs text-muted-foreground">Proceed to secure payment</span>
                </Label>
              </div>
              <div className="flex items-start space-x-3 rounded-lg border p-3">
                <RadioGroupItem value="cash" id="pay-cash" />
                <Label htmlFor="pay-cash" className="flex flex-col gap-1 cursor-pointer">
                  <span className="font-medium">Pay by Cash</span>
                  <span className="text-xs text-muted-foreground">Pay on pickup at the counter</span>
                </Label>
              </div>
            </RadioGroup>
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
              paymentMethod === 'cash' ? 'Place Order' : 'Proceed to Payment'
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
