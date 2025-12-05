import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { useCart } from '@/hooks/use-cart';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Check, ShoppingCart } from 'lucide-react';

type PackageOption = {
  id: string;
  label: string;
  durationHours?: number;
  price: number;
};

type PackageItem = {
  id: string;
  name: string;
  description?: string;
  options: PackageOption[];
};

type PackageGroup = {
  id: string;
  title: string;
  subtitle: string;
  items: PackageItem[];
};

const packageGroups: PackageGroup[] = [
  {
    id: 'pc-gaming',
    title: 'PC Gaming',
    subtitle: 'Training, VIP, and Private rooms',
    items: [
      {
        id: 'training-room',
        name: 'Training Room',
        description: 'Flexible slots for practice sessions',
        options: [
          { id: 'training-1h', label: '1 Hour', durationHours: 1, price: 20 },
          { id: 'training-4h', label: '4 Hours', durationHours: 4, price: 60 },
          { id: 'training-6h', label: '6 Hours', durationHours: 6, price: 80 },
        ],
      },
      {
        id: 'vip-rooms',
        name: 'VIP Rooms',
        description: 'Premium setups with concierge support',
        options: [
          { id: 'vip-1h', label: '1 Hour', durationHours: 1, price: 30 },
          { id: 'vip-4h', label: '4 Hours', durationHours: 4, price: 95 },
          { id: 'vip-6h', label: '6 Hours', durationHours: 6, price: 140 },
        ],
      },
      {
        id: 'private-rooms',
        name: 'Private Rooms',
        description: 'Dedicated rooms for small squads',
        options: [
          { id: 'private-1h', label: '1 Hour', durationHours: 1, price: 40 },
          { id: 'private-3h', label: '3 Hours', durationHours: 3, price: 95 },
          { id: 'private-5h', label: '5 Hours', durationHours: 5, price: 140 },
        ],
      },
    ],
  },
  {
    id: 'social-gaming',
    title: 'Social Gaming Room',
    subtitle: 'Room + food bundles for your crew',
    items: [
      {
        id: 'social-package-1',
        name: 'Package 1',
        description: '1 hour in room + food for 5 pax',
        options: [{ id: 'social-1', label: '1 Hour', durationHours: 1, price: 300 }],
      },
      {
        id: 'social-package-2',
        name: 'Package 2',
        description: '1 hour in room + food for 10 pax',
        options: [{ id: 'social-2', label: '1 Hour', durationHours: 1, price: 675 }],
      },
      {
        id: 'social-package-3',
        name: 'Package 3',
        description: '1 hour in room + food for 15 pax',
        options: [{ id: 'social-3', label: '1 Hour', durationHours: 1, price: 1000 }],
      },
    ],
  },
];

export function PackagesOffersBooking() {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { addToCart, itemCount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSelect = async (item: PackageItem, option: PackageOption) => {
    if (!user) {
      toast({
        title: 'Please sign in to book packages',
        description: 'Log in to add packages to your booking cart.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setSelectedOptions((prev) => ({ ...prev, [item.id]: option.id }));
    await addToCart(
      {
        id: `pkg-${option.id}`,
        name: `${item.name} - ${option.label}`,
        price: option.price,
      },
      1
    );
  };

  return (
    <div id="packages-offers" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Packages &amp; Offers
          </h2>
          <p className="text-muted-foreground">Book bundles directly from the Booking page.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate('/checkout')}
          disabled={itemCount === 0}
        >
          <ShoppingCart className="h-4 w-4" />
          Go to Checkout
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {packageGroups.map((group) => (
          <Card
            key={group.id}
            className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 overflow-hidden"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{group.title}</span>
                <Badge variant="secondary">{group.subtitle}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 p-4 bg-muted/40 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    {selectedOptions[item.id] ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Selected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Choose option</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.options.map((option) => {
                      const isSelected = selectedOptions[item.id] === option.id;
                      return (
                        <Button
                          key={option.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="flex-1 min-w-[150px] justify-between"
                          onClick={() => handleSelect(item, option)}
                        >
                          <span>{option.label}</span>
                          <span className="font-semibold">{formatPriceAEDUSD(option.price)}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground bg-muted/30">
        <p>
          Packages are added to the existing cart and checkout flow. Each selection keeps the
          package name, duration, and price intact, so payment and receipts match what you chose.
        </p>
        <p className="mt-2">
          Need a custom bundle? Choose the closest option and leave details during checkout.
        </p>
      </div>
    </div>
  );
}

