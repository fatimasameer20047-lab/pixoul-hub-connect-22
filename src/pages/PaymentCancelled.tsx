import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function PaymentCancelled() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const type = searchParams.get('type');

  const handleReturn = () => {
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
          <CardTitle className="flex items-center gap-2 text-center justify-center text-destructive">
            <XCircle className="h-6 w-6" />
            Payment Cancelled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Your payment was cancelled. No charges were made.
          </p>
          <Button className="w-full" onClick={handleReturn}>
            Return
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
