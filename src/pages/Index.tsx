import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  Users, 
  Heart, 
  MessageCircle, 
  Camera, 
  ArrowRight, 
  Zap, 
  CalendarPlus, 
  Utensils, 
  MapPin, 
  BookOpen, 
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/gallery/UserAvatar';
import { InlineCommentForm } from '@/components/gallery/InlineCommentForm';
import PhotoDetail from '@/components/gallery/PhotoDetail';

interface Announcement {
  id: string;
  title: string;
  excerpt: string | null;
  created_at: string;
}

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
  max_participants: number | null;
  current_participants: number;
  price: number;
  image_url: string | null;
  instructor: string | null;
  location: string | null;
}

interface CommunityPhoto {
  id: string;
  url: string;
  caption: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  user_id: string;
  author_name: string;
  avatar_color: string;
  user_has_liked: boolean;
}

const quickActions = [
  {
    title: 'Booking',
    description: 'Book your gaming sessions',
    icon: Calendar,
    href: '/booking'
  },
  {
    title: 'Events & Sign-Ups',
    description: 'Join upcoming events',
    icon: CalendarPlus,
    href: '/events'
  },
  {
    title: 'Snacks',
    description: 'Order refreshments',
    icon: Utensils,
    href: '/snacks'
  },
  {
    title: 'Gallery',
    description: 'Share your moments',
    icon: Camera,
    href: '/gallery'
  },
  {
    title: 'Guides',
    description: 'Game guides & tips',
    icon: BookOpen,
    href: '/guides'
  },
  {
    title: 'Support',
    description: 'Get help & assistance',
    icon: HelpCircle,
    href: '/support'
  }
];

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [communityPhotos, setCommunityPhotos] = useState<CommunityPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCommentPhoto, setActiveCommentPhoto] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<CommunityPhoto | null>(null);
  const [isPhotoDetailOpen, setIsPhotoDetailOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchAnnouncements(),
        fetchEvents(),
        fetchCommunityPhotos()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, excerpt, created_at')
        .eq('pinned', true)
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(4);
      
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('events_programs')
        .select('*')
        .gte('event_date', today)
        .eq('is_active', true)
        .order('event_date', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchCommunityPhotos = async () => {
    try {
      // First get the public gallery items (limit for home page)
      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (galleryError) throw galleryError;
      
      if (!galleryData || galleryData.length === 0) {
        setCommunityPhotos([]);
        return;
      }
      
      // Get user profiles
      const userIds = [...new Set(galleryData.map(item => item.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, name, avatar_color')
        .in('user_id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Get likes for current user
      const { data: likesData, error: likesError } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .in('photo_id', galleryData.map(item => item.id))
        .eq('user_id', user?.id || '');
        
      if (likesError) throw likesError;
      
      // Create profile lookup
      const profileLookup = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Create likes lookup
      const likesLookup = new Set((likesData || []).map(like => like.photo_id));
      
      const photosWithAuthors = galleryData.map(item => {
        const profile = profileLookup[item.user_id];
        const authorName = profile?.full_name || profile?.name || 
          (item.user_id ? `user${item.user_id.slice(-4)}` : 'Anonymous');
        
        return {
          id: item.id,
          url: item.url,
          caption: item.caption || '',
          created_at: item.created_at,
          like_count: item.like_count || 0,
          comment_count: item.comment_count || 0,
          user_id: item.user_id,
          author_name: authorName,
          avatar_color: profile?.avatar_color || '#6366F1',
          user_has_liked: likesLookup.has(item.id)
        };
      });
      
      setCommunityPhotos(photosWithAuthors);
    } catch (error) {
      console.error('Error fetching community photos:', error);
    }
  };

  const handleLike = async (photoId: string) => {
    if (!user) return;
    
    try {
      const photo = communityPhotos.find(p => p.id === photoId);
      if (!photo) return;
      
      const isLiked = photo.user_has_liked;
      
      // Optimistic update
      setCommunityPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { 
              ...p, 
              user_has_liked: !isLiked,
              like_count: p.like_count + (isLiked ? -1 : 1)
            }
          : p
      ));
      
      if (isLiked) {
        const { error } = await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('photo_likes')
          .insert({ photo_id: photoId, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      // Revert optimistic update
      setCommunityPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { 
              ...p, 
              user_has_liked: !p.user_has_liked,
              like_count: p.like_count + (p.user_has_liked ? 1 : -1)
            }
          : p
      ));
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async (photoId: string, commentText: string) => {
    if (!user || !commentText.trim()) return;
    
    setIsSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photoId,
          user_id: user.id,
          text: commentText.trim()
        });
      
      if (error) throw error;
      
      // Update comment count optimistically
      setCommunityPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, comment_count: p.comment_count + 1 }
          : p
      ));
      
      setActiveCommentPhoto(null);
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Hero Skeleton */}
        <section className="relative h-[60vh] md:h-[85vh] lg:h-[90vh] flex items-center justify-center bg-muted">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
        </section>

        <div className="container mx-auto px-6 py-8 space-y-12">
          {/* Quick Actions Skeleton */}
          <section>
            <Skeleton className="h-8 w-40 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 text-center space-y-3">
                    <Skeleton className="h-8 w-8 mx-auto" />
                    <Skeleton className="h-5 w-24 mx-auto" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Announcements Skeleton */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Events Skeleton */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Community Skeleton */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="aspect-square w-full" />
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section 
        className="relative h-[60vh] md:h-[85vh] lg:h-[90vh] bg-cover bg-center flex items-center justify-center"
        style={{ backgroundImage: 'url(/pixoul-hero.jpg)' }}
      >
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 text-center text-white px-6 max-w-4xl">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-lg">
            Pixoul Hub
          </h1>
          <p className="text-lg md:text-2xl lg:text-3xl opacity-90 drop-shadow-md">
            Your Ultimate Gaming Destination
          </p>
        </div>
      </section>

      <div className="container mx-auto px-6 py-8 space-y-12">
        {/* Quick Actions */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Card 
                  key={action.title}
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-105 focus-within:ring-2 focus-within:ring-primary"
                  onClick={() => navigate(action.href)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(action.href);
                    }
                  }}
                  aria-label={`Navigate to ${action.title}: ${action.description}`}
                >
                  <CardContent className="p-6 text-center">
                    <Icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold mb-1">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Pinned Announcements */}
        {announcements.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Pinned Announcements</h2>
              <Button variant="outline" onClick={() => navigate('/announcements')}>
                View All <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {announcements.map((announcement) => (
                <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 line-clamp-2">{announcement.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {announcement.excerpt ? 
                        announcement.excerpt.length > 120 
                          ? announcement.excerpt.slice(0, 120) + '...'
                          : announcement.excerpt
                        : 'No preview available'
                      }
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </span>
                      <Button size="sm" variant="outline">Read More</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Events & Programs */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Events & Programs</h2>
            <Button variant="outline" onClick={() => navigate('/events')}>
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          {events.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming events at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  {event.image_url && (
                    <div className="aspect-video overflow-hidden">
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-2 line-clamp-1">{event.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                        {new Date(event.event_date).toLocaleDateString()} at {event.start_time}
                      </div>
                      {event.max_participants && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="h-4 w-4 mr-2 flex-shrink-0" />
                          {Math.max(0, event.max_participants - event.current_participants)} spots left
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Badge variant={event.price > 0 ? 'secondary' : 'outline'} className="w-fit">
                          {event.price > 0 ? `${event.price} AED` : 'Free'}
                        </Badge>
                        {event.price > 0 && (
                          <span className="text-xs text-muted-foreground mt-1">
                            ~${(event.price / 3.67).toFixed(0)} USD
                          </span>
                        )}
                      </div>
                      <Button size="sm">Join</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Community */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Community</h2>
            <Button variant="outline" onClick={() => navigate('/gallery?tab=community')}>
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          {communityPhotos.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No community photos yet. Be the first to share!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {communityPhotos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div 
                    className="aspect-square bg-muted overflow-hidden cursor-pointer"
                    onClick={() => {
                      setSelectedPhoto(photo);
                      setIsPhotoDetailOpen(true);
                    }}
                  >
                    <img 
                      src={photo.url} 
                      alt={photo.caption || "Community photo"} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-2">
                      <UserAvatar 
                        name={photo.author_name} 
                        size="sm"
                        color={photo.avatar_color}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{photo.author_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {photo.caption && (
                      <p className="text-sm mb-3 line-clamp-2">{photo.caption}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(photo.id);
                          }}
                          disabled={!user}
                        >
                          <Heart className={`h-4 w-4 ${photo.user_has_liked ? 'fill-current text-red-500' : ''}`} />
                          <span className={photo.user_has_liked ? 'text-red-500' : ''}>{photo.like_count}</span>
                        </button>
                        <button
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveCommentPhoto(activeCommentPhoto === photo.id ? null : photo.id);
                          }}
                          disabled={!user}
                        >
                          <MessageCircle className="h-4 w-4" />
                          {photo.comment_count}
                        </button>
                      </div>
                    </div>
                    {activeCommentPhoto === photo.id && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <InlineCommentForm
                          onSubmit={(comment) => handleAddComment(photo.id, comment)}
                          onCancel={() => setActiveCommentPhoto(null)}
                          isSubmitting={isSubmittingComment}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Photo Detail Modal */}
      <PhotoDetail
        photo={selectedPhoto ? {
          id: selectedPhoto.id,
          url: selectedPhoto.url,
          caption: selectedPhoto.caption,
          visibility: 'public' as const,
          created_at: selectedPhoto.created_at,
          user_id: selectedPhoto.user_id
        } : null}
        isOpen={isPhotoDetailOpen}
        onClose={() => {
          setIsPhotoDetailOpen(false);
          setSelectedPhoto(null);
          // Refresh community photos to get updated counts
          fetchCommunityPhotos();
        }}
      />
    </div>
  );
};

export default Index;