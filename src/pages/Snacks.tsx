import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coffee, Sandwich, Cookie, Droplets } from 'lucide-react';

const menuItems = [
  { name: 'Coffee', price: '$3.50', category: 'Beverages', icon: Coffee, available: true },
  { name: 'Tea', price: '$2.50', category: 'Beverages', icon: Coffee, available: true },
  { name: 'Sandwich', price: '$8.50', category: 'Food', icon: Sandwich, available: true },
  { name: 'Cookies', price: '$2.00', category: 'Snacks', icon: Cookie, available: false },
  { name: 'Water', price: '$1.50', category: 'Beverages', icon: Droplets, available: true },
];

export default function Snacks() {
  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Snacks & Drinks</h1>
        <p className="text-muted-foreground">
          Order refreshments for your stay
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {menuItems.map((item) => (
          <Card key={item.name} className={!item.available ? 'opacity-50' : ''}>
            <CardHeader className="flex flex-row items-center space-y-0 pb-2">
              <item.icon className="h-6 w-6 text-muted-foreground" />
              <div className="ml-4 flex-1">
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription>{item.category}</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{item.price}</div>
                <Badge variant={item.available ? 'default' : 'secondary'}>
                  {item.available ? 'Available' : 'Out of Stock'}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}