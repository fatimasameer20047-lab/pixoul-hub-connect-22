import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImageViewer } from '@/components/ui/image-viewer';

interface PartyGalleryItem {
  id: string;
  category: 'birthday' | 'other';
  caption: string;
  images: string[];
  created_at: string;
}

export default function PartyGallery() {
  const [searchParams] = useSearchParams();
  const category = searchParams.get('category') as 'birthday' | 'other' || 'birthday';
  const [items, setItems] = useState<PartyGalleryItem[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, [category]);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from('party_gallery')
      .select('*')
      .eq('category', category)
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

  const handleImageClick = (item: PartyGalleryItem, imageIndex: number) => {
    setSelectedImages(item.images);
    setViewerIndex(imageIndex);
    setShowViewer(true);
  };

  const title = category === 'birthday' ? 'Birthday Parties' : 'Other Events';

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => window.history.back()}
        className="mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Booking
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          {title}
        </h1>
        <p className="text-muted-foreground">
          Browse past events at Pixoul Hub
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No events to display yet</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div 
                className="aspect-video w-full overflow-hidden cursor-pointer"
                onClick={() => handleImageClick(item, 0)}
              >
                <img 
                  src={item.images[0]} 
                  alt={item.caption}
                  className="w-full h-full object-cover hover:scale-105 transition-transform"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg">{item.caption}</h3>
                {item.images.length > 1 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    +{item.images.length - 1} more photos
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ImageViewer
        images={selectedImages}
        initialIndex={viewerIndex}
        open={showViewer}
        onOpenChange={setShowViewer}
      />
    </div>
  );
}
