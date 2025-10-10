import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, X, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PartyGalleryItem {
  id: string;
  category: 'birthday' | 'other';
  caption: string;
  images: string[];
  created_at: string;
}

export function PartyGalleryManager() {
  const [items, setItems] = useState<PartyGalleryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PartyGalleryItem | null>(null);
  const [category, setCategory] = useState<'birthday' | 'other'>('birthday');
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('party_gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading gallery",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems((data || []).map(item => ({
        ...item,
        category: item.category as 'birthday' | 'other',
        images: item.images as unknown as string[]
      })));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 10) {
      toast({
        title: "Too many files",
        description: "Maximum 10 photos allowed",
        variant: "destructive",
      });
      return;
    }
    setSelectedFiles(files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const uploadedUrls: string[] = [];

      // Upload new photos
      for (const file of selectedFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('party-gallery')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('party-gallery')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      // Keep existing images if editing
      const allImages = editingItem 
        ? [...editingItem.images, ...uploadedUrls]
        : uploadedUrls;

      if (editingItem) {
        // Update existing
        const { error } = await supabase
          .from('party_gallery')
          .update({ 
            category, 
            caption,
            images: allImages
          })
          .eq('id', editingItem.id);

        if (error) throw error;

        toast({
          title: "Gallery updated",
          description: "Gallery item has been updated successfully.",
        });
      } else {
        // Create new
        const { error } = await supabase
          .from('party_gallery')
          .insert({ 
            category, 
            caption,
            images: uploadedUrls
          });

        if (error) throw error;

        toast({
          title: "Gallery created",
          description: "New gallery item has been added successfully.",
        });
      }

      // Reset form
      setCategory('birthday');
      setCaption('');
      setSelectedFiles([]);
      setEditingItem(null);
      setShowForm(false);
      fetchItems();
    } catch (error: any) {
      toast({
        title: "Operation failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: PartyGalleryItem) => {
    setEditingItem(item);
    setCategory(item.category);
    setCaption(item.caption);
    setSelectedFiles([]);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this gallery item?')) return;

    const { error } = await supabase
      .from('party_gallery')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Gallery deleted",
        description: "Gallery item has been removed.",
      });
      fetchItems();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Party Event Galleries</h2>
          <p className="text-muted-foreground">Manage past event photos for Birthday Parties and Other Events</p>
        </div>
        <Button onClick={() => {
          setEditingItem(null);
          setCategory('birthday');
          setCaption('');
          setSelectedFiles([]);
          setShowForm(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Gallery Item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id}>
            {item.images[0] && (
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={item.images[0]} 
                  alt={item.caption}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg line-clamp-1">{item.caption}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {item.category === 'birthday' ? 'Birthday' : 'Other'}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEdit(item)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit' : 'Add'} Gallery Item</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as 'birthday' | 'other')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday Parties</SelectItem>
                  <SelectItem value="other">Other Events</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption">Caption</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g., Ali's 9th Birthday Party"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Photos (1-10 images)</Label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="gallery-photos" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Click to upload</span> event photos
                    </p>
                  </div>
                  <input 
                    id="gallery-photos" 
                    type="file" 
                    className="hidden" 
                    multiple 
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              {selectedFiles.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedFiles.length} new photos selected
                </p>
              )}
              {editingItem && editingItem.images.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {editingItem.images.length} existing photos
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || (!editingItem && selectedFiles.length === 0)}>
                {isSubmitting ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
