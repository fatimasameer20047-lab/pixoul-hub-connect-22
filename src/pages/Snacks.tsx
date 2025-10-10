import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Coffee, Sandwich, Cookie, Droplets, Plus, Minus, Utensils, Wine, Candy } from 'lucide-react';
import { CartDrawer } from '@/components/snacks/CartDrawer';
import { useCart } from '@/hooks/use-cart';
import { supabase } from '@/integrations/supabase/client';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { ImageViewer } from '@/components/ui/image-viewer';

interface SnackItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  pinned: boolean;
  image_url?: string;
}

const iconMap: Record<string, typeof Coffee> = {
  Food: Utensils,
  Drinks: Droplets,
  Sweets: Candy,
};

export default function Snacks() {
  const [menuItems, setMenuItems] = useState<SnackItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const { addToCart } = useCart();

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
    const Icon = iconMap[item.category] || Coffee;
    return (
      <Card key={item.id}>
        {item.image_url && (
          <div 
            className="aspect-video w-full overflow-hidden cursor-pointer"
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
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.category}</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatPriceAEDUSD(item.price)}</div>
              {item.pinned && (
                <Badge variant="default">Most Popular</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              disabled={(quantities[item.id] || 1) <= 1}
              onClick={() => setQuantities({ ...quantities, [item.id]: Math.max(1, (quantities[item.id] || 1) - 1) })}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center">{quantities[item.id] || 1}</span>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setQuantities({ ...quantities, [item.id]: (quantities[item.id] || 1) + 1 })}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              className="flex-1 ml-2"
              onClick={() => addToCart(item, quantities[item.id] || 1)}
            >
              Add to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Snacks & Drinks</h1>
          <p className="text-muted-foreground">
            Order refreshments for your stay
          </p>
        </div>
        <CartDrawer />
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="All">All</TabsTrigger>
          <TabsTrigger value="Food">Food</TabsTrigger>
          <TabsTrigger value="Drinks">Drinks</TabsTrigger>
          <TabsTrigger value="Sweets">Sweets</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 auto-fill-grid">
        {filteredItems.map(renderItemCard)}
      </div>

      <ImageViewer
        images={viewerImages}
        open={showViewer}
        onOpenChange={setShowViewer}
      />
    </div>
  );
}