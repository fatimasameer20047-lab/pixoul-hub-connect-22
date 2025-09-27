import React from 'react';
import { ArrowLeft, Clock, Users, Zap, QrCode, Play, Settings, Target, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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

interface GuideDetailProps {
  guide: Guide;
  onBack: () => void;
}

export function GuideDetail({ guide, onBack }: GuideDetailProps) {
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{guide.title}</CardTitle>
                  <p className="text-lg text-muted-foreground font-medium mb-4">{guide.game_name}</p>
                  
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
                        {guide.intensity_level} intensity
                      </Badge>
                    )}
                  </div>
                </div>
                {guide.qr_code_data && (
                  <div className="text-center">
                    <QrCode className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">In-venue access</p>
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">{guide.overview}</p>
            </CardContent>
          </Card>

          {/* Setup Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {guide.setup_instructions}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* How to Play */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                How to Play
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {guide.how_to_play}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Tips and Scoring */}
          {guide.tips_and_scoring && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Tips & Scoring
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {guide.tips_and_scoring}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media Section */}
          {guide.media_urls && guide.media_urls.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Media & Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guide.media_urls.map((url, index) => (
                    <div key={index} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                      <p className="text-muted-foreground">Media {index + 1}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* QR Code Section */}
          {guide.qr_code_data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 p-6 rounded-lg text-center">
                  <QrCode className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Scan this QR code when you're at Pixoul Hub for quick access to this guide
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available on VR stations and gaming PCs
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Game Info */}
          <Card>
            <CardHeader>
              <CardTitle>Game Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {guide.duration_minutes && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>~{guide.duration_minutes} minutes</span>
                </div>
              )}
              
              {guide.intensity_level && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span>Intensity Level:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((level) => (
                        <div
                          key={level}
                          className={`w-3 h-3 rounded-full ${
                            level <= (guide.intensity_level === 'low' ? 1 : guide.intensity_level === 'medium' ? 2 : 3)
                              ? getIntensityColor(guide.intensity_level)
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm capitalize">{guide.intensity_level}</span>
                  </div>
                </div>
              )}

              {guide.age_rating && (
                <div className="text-sm">
                  <strong>Age Rating:</strong> {guide.age_rating}
                </div>
              )}

              {guide.category && (
                <div className="text-sm">
                  <strong>Category:</strong> {guide.category}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          {guide.tags && guide.tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {guide.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Having trouble with this game? Our staff is here to help!
              </p>
              <Button variant="outline" className="w-full" size="sm">
                Ask Staff for Help
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}