import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GuideForm } from '@/components/guides/GuideForm';

interface Guide {
  id: string;
  title: string;
  game_name: string;
  category?: string;
  age_rating?: string;
  intensity_level?: 'low' | 'medium' | 'high';
  duration_minutes?: number;
  overview: string;
  setup_instructions: string;
  how_to_play: string;
  tips_and_scoring?: string;
  media_urls?: string[];
  qr_code_data?: string;
  tags?: string[];
  is_published: boolean;
}

export default function StaffGuides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [showGuideForm, setShowGuideForm] = useState(false);
  const [selectedGuide, setSelectedGuide] = useState<Guide | undefined>(undefined);
  const { toast } = useToast();

  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    const { data, error } = await supabase
      .from('guides')
      .select('*')
      .order('title');

    if (error) {
      toast({ title: "Error loading guides", description: error.message, variant: "destructive" });
    } else {
      setGuides(data as any || []);
    }
  };

  const deleteGuide = async (id: string) => {
    const { error } = await supabase
      .from('guides')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error deleting guide", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Guide deleted" });
      fetchGuides();
    }
  };

  return (
    <div className="p-6 space-y-6">
      {showGuideForm ? (
        <GuideForm
          guide={selectedGuide}
          onBack={() => {
            setShowGuideForm(false);
            setSelectedGuide(undefined);
          }}
          onSuccess={() => {
            setShowGuideForm(false);
            setSelectedGuide(undefined);
            fetchGuides();
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Guides Management</h1>
              <p className="text-muted-foreground">Create and manage VR game guides</p>
            </div>
            <Button onClick={() => setShowGuideForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Guide
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <Card key={guide.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg line-clamp-1">{guide.title}</CardTitle>
                    <Badge variant={guide.is_published ? 'default' : 'secondary'}>
                      {guide.is_published ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">{guide.game_name}</p>
                    {guide.category && (
                      <Badge variant="outline" className="mt-2">{guide.category}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setSelectedGuide(guide as any);
                        setShowGuideForm(true);
                      }}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteGuide(guide.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
