import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Minus } from 'lucide-react';
import { CartDrawer } from '@/components/snacks/CartDrawer';
import { useCart } from '@/hooks/use-cart';
import { supabase } from '@/integrations/supabase/client';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { ImageViewer } from '@/components/ui/image-viewer';
import { useLocation, useNavigate } from 'react-router-dom';
import OrdersStatus from './OrdersStatus';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface SnackItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  pinned: boolean;
  image_url?: string;
}

// MOBILE: Remove category glyphs to free space

export default function Snacks() {
  const [menuItems, setMenuItems] = useState<SnackItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const { addToCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const [openCartOnLoad] = useState(() => Boolean((location.state as { openCart?: boolean } | null)?.openCart));
  const [showOrders, setShowOrders] = useState(() => Boolean((location.state as { openOrders?: boolean } | null)?.openOrders));

  useEffect(() => {
    const state = location.state as { openCart?: boolean; openOrders?: boolean } | null;
    if (state?.openOrders) {
      setShowOrders(true);
    }
    if (state?.openCart || state?.openOrders) {
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  useEffect(() => {
    fetchSnacks();

    // Subscribe to real-time updates for snacks
    const snacksChannel = supabase
      .channel('snacks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'snacks'
        },
        () => {
          fetchSnacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(snacksChannel);
    };
  }, []);

  const fetchSnacks = async () => {
    const { data } = await supabase
      .from('snacks')
      .select('*')
      .eq('available', true)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (data) {
      setMenuItems(data);
    }
  };

  const filteredItems = selectedCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === selectedCategory);

  const renderItemCard = (item: SnackItem) => {
    return (
      <Card key={item.id}>
        {item.image_url && (
          <div 
            // MOBILE: Prefer square; slightly larger image area but within layout
            className="aspect-square w-full overflow-hidden cursor-pointer rounded-t-xl"
            onClick={() => {
              setViewerImages([item.image_url!]);
              setShowViewer(true);
            }}
          >
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform"
            />
          </div>
        )}
        <CardHeader className="py-3">
          {item.pinned ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base leading-tight">{item.name}</CardTitle>
                <Badge variant="default" className="text-[11px]">Most Popular</Badge>
              </div>
              <div className="text-sm font-semibold">{formatPriceAEDUSD(item.price)}</div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <CardTitle className="text-base leading-tight min-w-0">{item.name}</CardTitle>
              <div className="text-sm font-semibold whitespace-nowrap">{formatPriceAEDUSD(item.price)}</div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* MOBILE: Stack controls; larger touch targets */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="outline"
                disabled={(quantities[item.id] || 1) <= 1}
                onClick={() => setQuantities({ ...quantities, [item.id]: Math.max(1, (quantities[item.id] || 1) - 1) })}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center select-none">{quantities[item.id] || 1}</span>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setQuantities({ ...quantities, [item.id]: (quantities[item.id] || 1) + 1 })}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              className="w-full sm:flex-1"
              onClick={() => addToCart(item, quantities[item.id] || 1)}
            >
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // MOBILE: One‑row list item layout for non‑popular items (image on the right)
  const renderListItem = (item: SnackItem) => {
    return (
      <li key={item.id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-card/50 border border-border/50">
        <div className="flex-1 min-w-0 space-y-2 text-left">
          <div className="space-y-1 min-w-0">
            <h3 className="font-medium text-base break-words">{item.name}</h3>
            <div className="text-sm font-semibold opacity-90">{formatPriceAEDUSD(item.price)}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={(quantities[item.id] || 1) <= 1}
              onClick={() => setQuantities({ ...quantities, [item.id]: Math.max(1, (quantities[item.id] || 1) - 1) })}
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center select-none">{quantities[item.id] || 1}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setQuantities({ ...quantities, [item.id]: (quantities[item.id] || 1) + 1 })}
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              className="ml-2"
              onClick={() => addToCart(item, quantities[item.id] || 1)}
            >
              Add to Cart
            </Button>
          </div>
        </div>
        {item.image_url && (
          <button
            type="button"
            className="shrink-0"
            onClick={() => {
              setViewerImages([item.image_url!]);
              setShowViewer(true);
            }}
          >
            <img
              src={item.image_url}
              alt={item.name}
              className="w-28 h-28 rounded-xl object-cover"
            />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-x-hidden">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Snacks & Drinks</h1>
          <p className="text-muted-foreground">
            Order refreshments for your stay
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowOrders(true)}>
            My Orders
          </Button>
          <CartDrawer openOnLoad={openCartOnLoad} />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Food">Food</TabsTrigger>
          <TabsTrigger value="Drinks">Drinks</TabsTrigger>
          <TabsTrigger value="Sweets">Sweets</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* MOBILE: Most Popular grid remains 2-up */}
      <div className="md:hidden space-y-4">
        {filteredItems.some(i => i.pinned) && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              {filteredItems.filter(i => i.pinned).map(renderItemCard)}
            </div>
          </div>
        )}
        {/* Regular items as one-per-row list with image on the right */}
        <ul className="flex flex-col gap-3">
          {filteredItems.filter(i => !i.pinned).map(renderListItem)}
        </ul>
      </div>

      {/* Desktop grid */}
      <div className="hidden md:grid gap-4 auto-fill-grid">
        {filteredItems.map(renderItemCard)}
      </div>

      <ImageViewer
        images={viewerImages}
        open={showViewer}
        onOpenChange={setShowViewer}
      />
      <Sheet open={showOrders} onOpenChange={setShowOrders}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>My Orders</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <OrdersStatus />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
