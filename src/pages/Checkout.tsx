import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { isPackageMenuItem } from '@/lib/package-catalog';

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
          payment_method: 'card',
          fulfillment: 'pickup',
          status: 'new',
          room_location: showLocationQuestions ? roomLocation : null,
          room_details: showLocationQuestions ? trimmedDetails : null,
          inside_pixoul_confirmed: showLocationQuestions ? insidePixoul : false,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Don't create order items yet - they'll be created by the webhook after payment
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
