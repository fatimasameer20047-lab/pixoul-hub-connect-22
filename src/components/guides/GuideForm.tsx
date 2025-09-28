import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Guide {
  id?: string;
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

interface GuideFormProps {
  guide?: Guide;
  onBack: () => void;
  onSuccess: () => void;
}

export function GuideForm({ guide, onBack, onSuccess }: GuideFormProps) {
  const [formData, setFormData] = useState({
    title: guide?.title || '',
    game_name: guide?.game_name || '',
    category: guide?.category || '',
    age_rating: guide?.age_rating || '',
    intensity_level: guide?.intensity_level || '' as 'low' | 'medium' | 'high' | '',
    duration_minutes: guide?.duration_minutes?.toString() || '',
    overview: guide?.overview || '',
    setup_instructions: guide?.setup_instructions || '',
    how_to_play: guide?.how_to_play || '',
    tips_and_scoring: guide?.tips_and_scoring || '',
    qr_code_data: guide?.qr_code_data || '',
    tags: guide?.tags?.join(', ') || '',
    is_published: guide?.is_published ?? true,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const guideData = {
        title: formData.title,
        game_name: formData.game_name,
        category: formData.category || null,
        age_rating: formData.age_rating || null,
        intensity_level: formData.intensity_level || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        overview: formData.overview,
        setup_instructions: formData.setup_instructions,
        how_to_play: formData.how_to_play,
        tips_and_scoring: formData.tips_and_scoring || null,
        qr_code_data: formData.qr_code_data || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
        is_published: formData.is_published,
      };

      let error;
      if (guide?.id) {
        // Update existing guide
        const { error: updateError } = await supabase
          .from('guides')
          .update(guideData)
          .eq('id', guide.id);
        error = updateError;
      } else {
        // Create new guide
        const { error: insertError } = await supabase
          .from('guides')
          .insert(guideData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: guide?.id ? "Guide updated!" : "Guide created!",
        description: guide?.id ? "The guide has been updated successfully." : "The guide has been created successfully.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving guide",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Guides
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {guide?.id ? 'Edit Guide' : 'Create New Guide'}
          </CardTitle>
          <p className="text-muted-foreground">
            {guide?.id ? 'Update the guide details below' : 'Fill out the details to create a new VR game guide'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter guide title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Game Name *</Label>
                <Input
                  value={formData.game_name}
                  onChange={(e) => handleInputChange('game_name', e.target.value)}
                  placeholder="Enter VR game name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="e.g., Action, Adventure, Puzzle"
                />
              </div>

              <div className="space-y-2">
                <Label>Age Rating</Label>
                <Select value={formData.age_rating} onValueChange={(value) => handleInputChange('age_rating', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="E">E - Everyone</SelectItem>
                    <SelectItem value="E10+">E10+ - Everyone 10+</SelectItem>
                    <SelectItem value="T">T - Teen</SelectItem>
                    <SelectItem value="M">M - Mature</SelectItem>
                    <SelectItem value="18+">18+ - Adults Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Intensity Level</Label>
                <Select 
                  value={formData.intensity_level} 
                  onValueChange={(value: 'low' | 'medium' | 'high') => handleInputChange('intensity_level', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select intensity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-green-500" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-red-500" />
                        High
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                  placeholder="e.g., 30"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) => handleInputChange('tags', e.target.value)}
                  placeholder="e.g., multiplayer, beginner, competitive"
                />
                <p className="text-xs text-muted-foreground">Separate tags with commas</p>
              </div>

              <div className="space-y-2">
                <Label>QR Code Data</Label>
                <Input
                  value={formData.qr_code_data}
                  onChange={(e) => handleInputChange('qr_code_data', e.target.value)}
                  placeholder="URL or text for QR code"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Overview *</Label>
              <Textarea
                value={formData.overview}
                onChange={(e) => handleInputChange('overview', e.target.value)}
                placeholder="Brief overview of the game and what players can expect..."
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Setup Instructions *</Label>
              <Textarea
                value={formData.setup_instructions}
                onChange={(e) => handleInputChange('setup_instructions', e.target.value)}
                placeholder="Detailed instructions for setting up the game..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>How to Play *</Label>
              <Textarea
                value={formData.how_to_play}
                onChange={(e) => handleInputChange('how_to_play', e.target.value)}
                placeholder="Step-by-step gameplay instructions..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Tips and Scoring</Label>
              <Textarea
                value={formData.tips_and_scoring}
                onChange={(e) => handleInputChange('tips_and_scoring', e.target.value)}
                placeholder="Helpful tips, strategies, and scoring information..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_published"
                checked={formData.is_published}
                onChange={(e) => handleInputChange('is_published', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="is_published">Publish guide (make it visible to users)</Label>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                !formData.title || 
                !formData.game_name || 
                !formData.overview || 
                !formData.setup_instructions || 
                !formData.how_to_play ||
                isSubmitting
              }
            >
              {isSubmitting ? (guide?.id ? 'Updating...' : 'Creating...') : (guide?.id ? 'Update Guide' : 'Create Guide')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}