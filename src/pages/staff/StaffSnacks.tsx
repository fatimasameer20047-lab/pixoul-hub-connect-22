import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Coffee, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SnackItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  image_url?: string;
}

export default function StaffSnacks() {
  const [items, setItems] = useState<SnackItem[]>([
    { id: '1', name: 'Coffee', price: 3.50, category: 'Beverages', available: true },
    { id: '2', name: 'Tea', price: 2.50, category: 'Beverages', available: true },
    { id: '3', name: 'Sandwich', price: 8.50, category: 'Food', available: true },
    { id: '4', name: 'Cookies', price: 2.00, category: 'Snacks', available: false },
    { id: '5', name: 'Water', price: 1.50, category: 'Beverages', available: true },
  ]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Beverages' });
  const { toast } = useToast();

  const toggleAvailability = (id: string) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, available: !item.available } : item
    ));
    toast({ title: "Availability updated" });
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.price) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const item: SnackItem = {
      id: Date.now().toString(),
      name: newItem.name,
      price: parseFloat(newItem.price),
      category: newItem.category,
      available: true,
    };

    setItems([...items, item]);
    setNewItem({ name: '', price: '', category: 'Beverages' });
    setShowAddForm(false);
    toast({ title: "Item added successfully" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Snacks Management</h1>
          <p className="text-muted-foreground">Add and manage snacks and drinks</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Item</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Item Name</Label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., Cappuccino"
                />
              </div>
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="e.g., 4.50"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={newItem.category} onValueChange={(value) => setNewItem({ ...newItem, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beverages">Beverages</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Snacks">Snacks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <Button variant="outline" className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddItem}>Add Item</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coffee className="h-5 w-5" />
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                </div>
                <Badge variant="outline">{item.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">${item.price.toFixed(2)}</div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.available}
                    onCheckedChange={() => toggleAvailability(item.id)}
                  />
                  <Label>
                    {item.available ? 'Available' : 'Out of Stock'}
                  </Label>
                </div>
                <Badge variant={item.available ? 'default' : 'secondary'}>
                  {item.available ? 'In Stock' : 'Unavailable'}
                </Badge>
              </div>

              <Button variant="outline" className="w-full">
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
