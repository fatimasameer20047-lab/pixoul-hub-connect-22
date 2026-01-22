import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { useStaff } from '@/contexts/StaffContext';
import { Loader2, Mail, Phone, User, Users, UtensilsCrossed } from 'lucide-react';

type OrderRow = {
  id: string;
  user_id: string;
  status: string;
  total: number;
  created_at: string;
  payment_status: string;
  payment_method?: string;
  room_location: string | null;
  room_details: string | null;
  inside_pixoul_confirmed: boolean;
  fulfillment: string;
  notes: string | null;
  order_number?: number | null;
  customer_name?: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_username?: string | null;
};

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

const statusVariants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'New', variant: 'destructive' },
  preparing: { label: 'Preparing', variant: 'default' },
  ready: { label: 'Ready', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export default function StaffOrders() {
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canManageSnacks } = useStaff();

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orderId || null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<{
    full_name?: string | null;
    username?: string | null;
    email?: string | null;
    phone_number?: string | null;
  } | null>(null);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const selectedCustomer = useMemo(
    () => ({
      name: selectedProfile?.full_name || selectedOrder?.customer_name || '—',
      username: selectedProfile?.username || selectedOrder?.customer_username || '—',
      email: selectedProfile?.email || selectedOrder?.customer_email || '—',
      phone: selectedProfile?.phone_number || selectedOrder?.customer_phone || '—',
    }),
    [selectedOrder, selectedProfile]
  );

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    if (orderId) {
      setSelectedOrderId(orderId);
    }
  }, [orderId]);

  useEffect(() => {
    if (!selectedOrderId) {
      setItems([]);
      setSelectedProfile(null);
      return;
    }
    fetchItems(selectedOrderId);
    fetchProfile(selectedOrderId);
  }, [selectedOrderId]);

  useEffect(() => {
    const channel = supabase
      .channel('orders-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, user_id, status, total, created_at, payment_status, payment_method, room_location, room_details, inside_pixoul_confirmed, fulfillment, notes, order_number')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: 'Error loading orders', description: error.message, variant: 'destructive' });
      setOrders([]);
    } else {
      const ordersData = (data as OrderRow[]) || [];
      const userIds = Array.from(new Set(ordersData.map((o) => o.user_id).filter(Boolean)));

      let profileMap: Record<string, { name?: string; phone?: string | null; username?: string | null; email?: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, full_name, username, email, phone_number')
          .in('user_id', userIds);

        profileMap = (profiles || []).reduce<Record<string, { name?: string; phone?: string | null; username?: string | null; email?: string | null }>>((acc, profile) => {
          if (profile.user_id) acc[profile.user_id] = { name: profile.full_name || profile.name, phone: (profile as any).phone_number, username: (profile as any).username, email: (profile as any).email };
          return acc;
        }, {});
      }

      setOrders(
        ordersData.map((order) => ({
          ...order,
          customer_name: profileMap[order.user_id]?.name || 'Customer',
          customer_phone: profileMap[order.user_id]?.phone || null,
          customer_email: profileMap[order.user_id]?.email || null,
          customer_username: profileMap[order.user_id]?.username || null,
        }))
      );
    }
    setLoadingOrders(false);
  };

  const fetchItems = async (orderIdValue: string) => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('order_items')
      .select('id, name, qty, unit_price, line_total')
      .eq('order_id', orderIdValue);

    if (error) {
      toast({ title: 'Error loading items', description: error.message, variant: 'destructive' });
      setItems([]);
    } else {
      setItems((data as OrderItem[]) || []);
    }
    setLoadingItems(false);
  };

  const fetchProfile = async (orderIdValue: string) => {
    const order = orders.find(o => o.id === orderIdValue);
    if (!order?.user_id) {
      setSelectedProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, username, email, phone_number')
      .eq('user_id', order.user_id)
      .maybeSingle();
    if (!error) {
      setSelectedProfile(data);
    } else {
      setSelectedProfile(null);
    }
  };

  const updateStatus = async (status: 'preparing' | 'ready' | 'completed') => {
    if (!selectedOrderId) return;
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', selectedOrderId);

    if (error) {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Status updated' });
      fetchOrders();
    }
    setUpdating(false);
  };

  const formatOrderLabel = (order?: OrderRow | null) => {
    if (!order) return 'Order';
    return order.order_number ? `Order #${order.order_number}` : `Order #${order.id.slice(0, 8)}`;
  };

  if (!canManageSnacks) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            You do not have access to manage orders.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">New snack & drink orders placed by customers</p>
        </div>
        <Badge variant="outline">
          <UtensilsCrossed className="h-4 w-4 mr-1" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Incoming orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingOrders && (
              <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading orders...
              </div>
            )}
            {!loadingOrders && orders.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No orders yet.</div>
            )}
            <ScrollArea className="h-[520px]">
              <div className="space-y-2 p-4">
                {orders.map((order) => {
                  const variant = statusVariants[order.status]?.variant || 'outline';
                  const label = statusVariants[order.status]?.label || order.status;
                  return (
                    <button
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        navigate(`/staff/orders/${order.id}`);
                      }}
                      className={`w-full text-left border rounded-lg p-3 hover:bg-muted/60 transition ${
                        selectedOrderId === order.id ? 'border-primary bg-muted' : 'border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{formatOrderLabel(order)}</div>
                        <Badge variant={variant}>{label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.customer_name || 'Customer'}
                      </div>
                      {order.customer_phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {order.customer_phone}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        AED {order.total?.toFixed(2)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Order details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedOrder && (
              <div className="text-sm text-muted-foreground">
                Select an order to view details.
              </div>
            )}

            {selectedOrder && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{formatOrderLabel(selectedOrder)}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium text-foreground">Full Name:</span>
                        <span className="text-foreground">{selectedCustomer.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span className="font-medium text-foreground">Username:</span>
                        <span className="text-foreground">{selectedCustomer.username}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium text-foreground">Email:</span>
                        <span className="text-foreground">{selectedCustomer.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span className="font-medium text-foreground">Phone:</span>
                        <span className="text-foreground">{selectedCustomer.phone}</span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Placed {formatDistanceToNow(new Date(selectedOrder.created_at), { addSuffix: true })}
                    </div>
                  </div>
                  <Badge variant={statusVariants[selectedOrder.status]?.variant || 'outline'}>
                    {statusVariants[selectedOrder.status]?.label || selectedOrder.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="text-xl font-semibold">AED {selectedOrder.total.toFixed(2)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Payment</div>
                    <div className="font-semibold">
                      {selectedOrder.payment_method === 'cash'
                        ? 'Cash - unpaid'
                        : selectedOrder.payment_status}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Fulfillment</div>
                    <div className="font-semibold capitalize">{selectedOrder.fulfillment}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Location</div>
                    <div className="font-semibold">
                      {selectedOrder.room_location || 'Not provided'}
                      {selectedOrder.room_details ? ` – ${selectedOrder.room_details}` : ''}
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Customer notes</div>
                    <div className="text-sm">{selectedOrder.notes}</div>
                  </div>
                )}

                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">Items</div>
                    {loadingItems && <Loader2 className="h-4 w-4 animate-spin" />}
                  </div>
                  {items.length === 0 && !loadingItems && (
                    <p className="text-sm text-muted-foreground">No items yet (awaiting payment capture).</p>
                  )}
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">Qty: {item.qty}</div>
                        </div>
                        <div className="font-semibold">AED {item.line_total.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="default"
                    onClick={() => updateStatus('preparing')}
                    disabled={updating || selectedOrder.status === 'preparing'}
                  >
                    Mark preparing
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => updateStatus('ready')}
                    disabled={updating || selectedOrder.status === 'ready'}
                  >
                    Mark ready
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => updateStatus('completed')}
                    disabled={updating || selectedOrder.status === 'completed'}
                  >
                    Mark completed
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

