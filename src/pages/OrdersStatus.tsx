import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, MapPin, UtensilsCrossed } from 'lucide-react';
import { formatPriceAED } from '@/lib/price-formatter';

type OrderItem = {
  name: string;
  qty: number;
  unit_price: number;
};

type OrderRow = {
  id: string;
  status: string;
  payment_status?: string;
  room_location: string | null;
  room_details: string | null;
  inside_pixoul_confirmed: boolean;
  order_items?: OrderItem[];
  total?: number;
  order_number?: number | null;
};

const statusLabel: Record<string, string> = {
  new: 'Preparing',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  new: 'default',
  preparing: 'default',
  ready: 'secondary',
  completed: 'outline',
  cancelled: 'destructive',
};

export default function OrdersStatus() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(false);

  const userId = user?.id || null;

  const fetchOrders = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, payment_status, room_location, room_details, inside_pixoul_confirmed, total, order_number, order_items(name, qty, unit_price)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as OrderRow[]);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchOrders]);

  if (!userId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Please sign in to view your orders.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5" />
        <h1 className="text-xl font-semibold">My Orders</h1>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading your orders...
        </div>
      )}

      {!loading && orders.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No orders yet. Place a snacks order to track it here.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const statusKey = order.status || 'new';
          const label = statusLabel[statusKey] || statusKey;
          const variant = statusVariant[statusKey] || 'outline';
          const orderLabel = order.order_number ? `Order #${order.order_number}` : `Order #${order.id.slice(0, 8)}`;
          const isPaid = (order.payment_status || '').toLowerCase() === 'paid';
          const location = order.room_location || 'Location not specified';
          const detail = order.room_details ? ` – ${order.room_details}` : '';

          return (
            <Card key={order.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <CardTitle className="text-base font-semibold">
                    {location}
                    {detail}
                  </CardTitle>
                </div>
                <Badge variant={variant}>{label}</Badge>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                <p className="text-xs text-muted-foreground">{orderLabel}</p>
                <ScrollArea className="max-h-60 pr-2">
                  <div className="space-y-2">
                    {(order.order_items || []).map((item, idx) => (
                      <div key={`${order.id}-${idx}`} className="flex items-center justify-between rounded-lg border p-2">
                        <div>
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Price</p>
                          <p className="text-sm font-semibold">
                            {formatPriceAED(item.unit_price * item.qty)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(!order.order_items || order.order_items.length === 0) && (
                      <p className="text-xs text-muted-foreground">
                        {isPaid ? 'Items will appear once confirmed.' : 'Complete payment to confirm this order.'}
                      </p>
                    )}
                  </div>
                </ScrollArea>
                {typeof order.total === 'number' && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-2">
                    <p className="text-sm font-medium">Order total</p>
                    <p className="text-sm font-semibold">{formatPriceAED(order.total)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
