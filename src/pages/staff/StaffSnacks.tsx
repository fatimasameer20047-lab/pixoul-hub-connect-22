import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Coffee, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SnackItem {
  id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
  pinned: boolean;
  image_url?: string;
}

export default function StaffSnacks() {
  const [items, setItems] = useState<SnackItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', category: 'Food' });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newItemPhoto, setNewItemPhoto] = useState<File | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const newItemFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
    const { data, error } = await supabase
      .from('snacks')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      toast({ title: "Error loading snacks", description: error.message, variant: "destructive" });
    } else {
      setItems(data || []);
    }
  };

  const toggleAvailability = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const { error } = await supabase
      .from('snacks')
      .update({ available: !item.available })
      .eq('id', id);

    if (error) {
      toast({ title: "Error updating availability", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Availability updated" });
      fetchSnacks();
    }
  };

  const togglePinned = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const { error } = await supabase
      .from('snacks')
      .update({ pinned: !item.pinned })
      .eq('id', id);

    if (error) {
      toast({ title: "Error updating pinned status", description: error.message, variant: "destructive" });
    } else {
      toast({ title: item.pinned ? "Removed from Most Popular" : "Added to Most Popular" });
      fetchSnacks();
    }
  };

  const startEditPrice = (item: SnackItem) => {
    setEditingItem(item.id);
    setEditPrice(item.price.toString());
  };

  const savePrice = async (id: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price <= 0) {
      toast({ title: "Invalid price", description: "Please enter a valid price", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('snacks')
      .update({ price })
      .eq('id', id);

    if (error) {
      toast({ title: "Error updating price", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Price updated" });
      setEditingItem(null);
      fetchSnacks();
    }
  };

  const deleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await supabase
      .from('snacks')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error deleting item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item deleted" });
      fetchSnacks();
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('snacks')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('snacks')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({ title: "Error uploading photo", description: error.message, variant: "destructive" });
      return null;
    }
  };

  const handleNewItemPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewItemPhoto(e.target.files[0]);
      toast({ title: "Photo selected", description: "Photo will be uploaded when you add the item" });
    }
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setUploadingPhoto(true);
    let imageUrl = null;

    if (newItemPhoto) {
      imageUrl = await uploadPhoto(newItemPhoto);
      if (!imageUrl) {
        setUploadingPhoto(false);
        return;
      }
    }

    const { error } = await supabase
      .from('snacks')
      .insert({
        name: newItem.name,
        price: parseFloat(newItem.price),
        category: newItem.category as 'Food' | 'Drinks' | 'Sweets',
        available: true,
        image_url: imageUrl,
      });

    setUploadingPhoto(false);

    if (error) {
      toast({ title: "Error adding item", description: error.message, variant: "destructive" });
    } else {
      setNewItem({ name: '', price: '', category: 'Beverages' });
      setNewItemPhoto(null);
      setShowAddForm(false);
      toast({ title: "Item added successfully" });
      fetchSnacks();
    }
  };

  const handleChangePhoto = async (itemId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingPhoto(true);
      const imageUrl = await uploadPhoto(file);
      
      if (imageUrl) {
        const { error } = await supabase
          .from('snacks')
          .update({ image_url: imageUrl })
          .eq('id', itemId);

        if (error) {
          toast({ title: "Error updating photo", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Photo updated successfully" });
          fetchSnacks();
        }
      }
      
      setUploadingPhoto(false);
    };

    input.click();
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
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Drinks">Drinks</SelectItem>
                    <SelectItem value="Sweets">Sweets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <input
                  ref={newItemFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleNewItemPhotoSelect}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => newItemFileInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {newItemPhoto ? newItemPhoto.name : 'Upload Photo'}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddItem} disabled={uploadingPhoto}>
                {uploadingPhoto ? 'Uploading...' : 'Add Item'}
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            {item.image_url && (
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
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
              {editingItem === item.id ? (
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    placeholder="Price"
                  />
                  <Button onClick={() => savePrice(item.id)}>Save</Button>
                  <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">${item.price.toFixed(2)}</div>
                  <Button variant="ghost" size="sm" onClick={() => startEditPrice(item)}>Edit</Button>
                </div>
              )}
              
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.pinned}
                    onCheckedChange={() => togglePinned(item.id)}
                  />
                  <Label>Most Popular</Label>
                </div>
                <Badge variant={item.pinned ? 'default' : 'outline'}>
                  {item.pinned ? 'Pinned' : 'Not Pinned'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleChangePhoto(item.id)}
                  disabled={uploadingPhoto}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Photo
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => deleteItem(item.id, item.name)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
