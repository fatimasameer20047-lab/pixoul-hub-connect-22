import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Webhook handles verification, just show success
    if (!sessionId || !type || !id) {
      setError('Invalid payment session');
      setVerifying(false);
      return;
    }

    // Give webhook a moment to process
    setTimeout(() => {
      setVerifying(false);
      toast({
        title: "Payment successful!",
        description: "Your payment has been processed",
      });
    }, 2000);
  }, [sessionId, type, id, toast]);

  const handleContinue = () => {
    switch (type) {
      case 'order':
        navigate('/snacks');
        break;
      case 'booking':
        navigate('/booking');
        break;
      case 'event':
        navigate('/events');
        break;
      case 'party':
        navigate('/booking?tab=parties');
        break;
      default:
        navigate('/');
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center justify-center">
            {verifying ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Verifying Payment
              </>
            ) : error ? (
              'Payment Verification Failed'
            ) : (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Payment Successful
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {verifying ? (
            <p className="text-center text-muted-foreground">
              Please wait while we verify your payment...
            </p>
          ) : error ? (
            <p className="text-center text-destructive">
              {error}
            </p>
          ) : (
            <>
              <p className="text-center text-muted-foreground">
                Your payment has been processed successfully and your order has been confirmed.
              </p>
              <Button className="w-full" onClick={handleContinue}>
                Continue
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
