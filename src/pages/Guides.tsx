import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, Users, Zap, BookOpen, QrCode, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GuideDetail } from '@/components/guides/GuideDetail';
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

export default function Guides() {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [filteredGuides, setFilteredGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
  const [showGuideForm, setShowGuideForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [ageFilter, setAgeFilter] = useState('all');
  const [intensityFilter, setIntensityFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchGuides();
  }, []);

  useEffect(() => {
    filterGuides();
  }, [guides, searchTerm, categoryFilter, ageFilter, intensityFilter]);

  const fetchGuides = async () => {
    try {
      const { data, error } = await supabase
        .from('guides')
        .select('*')
        .eq('is_published', true)
        .order('title');

      if (error) throw error;
      setGuides((data || []).map(guide => ({
        ...guide,
        intensity_level: guide.intensity_level as 'low' | 'medium' | 'high'
      })));
    } catch (error: any) {
      toast({
        title: "Error loading guides",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterGuides = () => {
    let filtered = guides;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(guide => 
        guide.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.game_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guide.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(guide => guide.category === categoryFilter);
    }

    // Age filter
    if (ageFilter !== 'all') {
      filtered = filtered.filter(guide => guide.age_rating === ageFilter);
    }

    // Intensity filter
    if (intensityFilter !== 'all') {
      filtered = filtered.filter(guide => guide.intensity_level === intensityFilter);
    }

    setFilteredGuides(filtered);
  };

  const getAvailableCategories = () => {
    const categories = guides
      .map(guide => guide.category)
      .filter((category, index, self) => category && self.indexOf(category) === index);
    return categories;
  };

  const getAvailableAgeRatings = () => {
    const ratings = guides
      .map(guide => guide.age_rating)
      .filter((rating, index, self) => rating && self.indexOf(rating) === index);
    return ratings;
  };

  const getIntensityIcon = (level?: string) => {
    switch (level) {
      case 'low': return <Zap className="h-4 w-4 text-green-500" />;
      case 'medium': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'high': return <Zap className="h-4 w-4 text-red-500" />;
      default: return <Zap className="h-4 w-4 text-gray-400" />;
    }
  };

  const getIntensityColor = (level?: string) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  if (selectedGuide) {
    return (
      <GuideDetail 
        guide={selectedGuide} 
        onBack={() => setSelectedGuide(null)}
      />
    );
  }

  if (showGuideForm) {
    return (
      <GuideForm
        onBack={() => setShowGuideForm(false)}
        onSuccess={() => {
          setShowGuideForm(false);
          fetchGuides();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              VR Game Guides
            </h1>
            <p className="text-muted-foreground">
              Master your favorite VR games with our comprehensive how-to guides
            </p>
          </div>
          <Button
            onClick={() => setShowGuideForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Guide
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search games or guides..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {getAvailableCategories().map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ageFilter} onValueChange={setAgeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Age Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ages</SelectItem>
                {getAvailableAgeRatings().map(rating => (
                  <SelectItem key={rating} value={rating}>
                    {rating}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={intensityFilter} onValueChange={setIntensityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Intensity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intensities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setAgeFilter('all');
                setIntensityFilter('all');
              }}
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Guides Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuides.map((guide) => (
          <Card 
            key={guide.id} 
            className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer"
            onClick={() => setSelectedGuide(guide)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="line-clamp-1 mb-1">{guide.title}</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">{guide.game_name}</p>
                </div>
                {guide.qr_code_data && (
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              
              <div className="flex flex-wrap gap-2">
                {guide.category && (
                  <Badge variant="secondary">{guide.category}</Badge>
                )}
                {guide.age_rating && (
                  <Badge variant="outline">{guide.age_rating}</Badge>
                )}
                {guide.intensity_level && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getIntensityIcon(guide.intensity_level)}
                    {guide.intensity_level}
                  </Badge>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {guide.overview}
              </p>

              <div className="space-y-2">
                {guide.duration_minutes && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4" />
                    ~{guide.duration_minutes} minutes
                  </div>
                )}
                
                {guide.intensity_level && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span>Intensity:</span>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`w-2 h-2 rounded-full ${
                              level <= (guide.intensity_level === 'low' ? 1 : guide.intensity_level === 'medium' ? 2 : 3)
                                ? getIntensityColor(guide.intensity_level)
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {guide.tags && guide.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {guide.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {guide.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{guide.tags.length - 3} more
                    </Badge>
                  )}
                </div>
              )}

              <Button className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                Read Guide
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredGuides.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No guides found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or check back later for new guides.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}