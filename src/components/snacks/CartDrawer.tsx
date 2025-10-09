import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { useNavigate } from 'react-router-dom';

export function CartDrawer() {
  const { cart, itemCount, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  if (!cart) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {itemCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your Cart ({itemCount} items)</SheetTitle>
        </SheetHeader>
        
        {cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mb-4" />
            <p>Your cart is empty</p>
          </div>
        ) : (
          <div className="flex flex-col h-full mt-6">
            <div className="flex-1 overflow-y-auto space-y-4 pb-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-card rounded-lg border">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="font-semibold">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formatPriceAEDUSD(item.unit_price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.qty - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center">{item.qty}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.id, item.qty + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 ml-auto"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPriceAEDUSD(item.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="sticky bottom-0 bg-background border-t pt-4 pb-6 space-y-2 z-50">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatPriceAEDUSD(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax (5%)</span>
                <span>{formatPriceAEDUSD(cart.tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatPriceAEDUSD(cart.total)}</span>
              </div>
              <Button
                className="w-full mt-4"
                size="lg"
                onClick={() => navigate('/checkout')}
                disabled={cart.items.length === 0}
              >
                Checkout
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
