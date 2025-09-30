import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee, Sandwich, Cookie, Droplets } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPriceAEDUSD } from '@/lib/price-formatter';

interface SnackItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  image_url?: string;
}

const iconMap: Record<string, typeof Coffee> = {
  Beverages: Droplets,
  Food: Sandwich,
  Snacks: Cookie,
};

export default function Snacks() {
  const [menuItems, setMenuItems] = useState<SnackItem[]>([]);

  useEffect(() => {
    fetchSnacks();
  }, []);

  const fetchSnacks = async () => {
    const { data } = await supabase
      .from('snacks')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (data) {
      setMenuItems(data);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Snacks & Drinks</h1>
        <p className="text-muted-foreground">
          Order refreshments for your stay
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => {
          const Icon = iconMap[item.category] || Coffee;
          return (
            <Card key={item.id} className={!item.available ? 'opacity-50' : ''}>
              <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                <Icon className="h-6 w-6 text-muted-foreground" />
                <div className="ml-4 flex-1">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <CardDescription>{item.category}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{formatPriceAEDUSD(item.price)}</div>
                  <Badge variant={item.available ? 'default' : 'secondary'}>
                    {item.available ? 'Available' : 'Out of Stock'}
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}