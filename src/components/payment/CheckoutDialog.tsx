import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatPriceAEDUSD } from '@/lib/price-formatter';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'order' | 'booking' | 'event' | 'party';
  referenceId: string;
  amount: number;
  itemName: string;
  description?: string;
  onSuccess?: () => void;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  type,
  referenceId,
  amount,
  itemName,
  description,
  onSuccess
}: CheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const subtotal = amount;
  const vat = amount * 0.05;
  const total = subtotal + vat;

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          type,
          referenceId,
          amount,
          metadata: {
            itemName,
            description
          }
        }
      });

      if (error) throw error;

      // Open Stripe Checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
        
        toast({
          title: "Checkout opened",
          description: "Complete your payment in the new tab",
        });
        
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPriceAEDUSD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>VAT (5%)</span>
              <span>{formatPriceAEDUSD(vat)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span>{formatPriceAEDUSD(total)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              You will be redirected to Stripe Checkout to complete your payment securely.
            </p>
            <p className="text-sm text-muted-foreground">
              Accepted payment methods: Credit/Debit Cards, Apple Pay
            </p>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleCheckout}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay {formatPriceAEDUSD(total)}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
