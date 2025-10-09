import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

interface PixoulPost {
  id: string;
  type: 'event' | 'program' | 'announcement' | 'post';
  title: string | null;
  caption: string;
  images: string[];
  created_at: string;
  pinned: boolean;
  published: boolean;
  event_date?: string;
  start_time?: string;
}

interface EventProgram {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  image_url?: string;
  event_date: string;
  start_time: string;
  created_at: string;
  is_active: boolean;
}

export function FromPixoulRow() {
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Fetch Pixoul posts
      const { data: postsData, error: postsError } = await supabase
        .from('pixoul_posts')
        .select('*')
        .eq('published', true)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);

      if (postsError) throw postsError;

      // Fetch active events/programs
      const { data: eventsData, error: eventsError } = await supabase
        .from('events_programs')
        .select('*')
        .eq('is_active', true)
        .gte('event_date', new Date().toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(4);

      if (eventsError) throw eventsError;

      // Convert events to PixoulPost format
      const eventPosts: PixoulPost[] = (eventsData || []).map(event => ({
        id: event.id,
        type: event.type as 'event' | 'program',
        title: event.title,
        caption: event.description,
        images: event.image_url ? [event.image_url] : [],
        created_at: event.created_at,
        pinned: false,
        published: true,
        event_date: event.event_date,
        start_time: event.start_time,
      }));

      // Combine and sort by date
      const combined = [...(postsData as PixoulPost[] || []), ...eventPosts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 12);

      setPosts(combined);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'event': return 'default';
      case 'program': return 'secondary';
      case 'announcement': return 'destructive';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <section className="py-8 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">From Pixoul</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="min-w-[280px] overflow-hidden">
                <Skeleton className="h-40 w-full" />
                <div className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <section className="py-8 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">From Pixoul</h2>
          <Link to="/from-pixoul" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {posts.map((post) => (
            <Card 
              key={post.id} 
              className="min-w-[320px] max-w-[320px] overflow-hidden hover:shadow-lg transition-shadow cursor-pointer flex-shrink-0"
            >
              {post.images && post.images.length > 0 ? (
                <div className="relative aspect-video">
                  <img
                    src={post.images[0]}
                    alt={post.title || post.caption}
                    className="w-full h-full object-cover"
                  />
                  {post.pinned && (
                    <Badge className="absolute top-2 right-2" variant="destructive">
                      Pinned
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="bg-muted aspect-video flex items-center justify-center relative">
                  <p className="text-muted-foreground text-sm">No image</p>
                  {post.pinned && (
                    <Badge className="absolute top-2 right-2" variant="destructive">
                      Pinned
                    </Badge>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Pixoul</Badge>
                  <Badge variant={getTypeBadgeColor(post.type)} className="capitalize">
                    {post.type}
                  </Badge>
                </div>
                {post.title && (
                  <h3 className="font-semibold mb-1 line-clamp-1">{post.title}</h3>
                )}
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {post.caption}
                </p>
                {post.event_date && post.start_time && (
                  <p className="text-xs font-medium text-primary mb-1">
                    {new Date(post.event_date).toLocaleDateString()} at {post.start_time}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
