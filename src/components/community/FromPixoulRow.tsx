import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

type PixoulChannel = 'from_pixoul' | 'packages_offers';

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
  channel: PixoulChannel;
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
        .select('id,type,title,caption,images,created_at,pinned,published,channel')
        .eq('published', true)
        .eq('channel', 'from_pixoul')
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
        channel: 'from_pixoul',
      }));

      // Combine and sort: pinned first, then by date desc
      const normalizedPosts = ((postsData as PixoulPost[] | null) || []).map(post => ({
        ...post,
        channel: post.channel ?? 'from_pixoul',
      }));
      const combined = [...normalizedPosts, ...eventPosts]
        .sort((a, b) => {
          const ap = a.pinned ? 1 : 0;
          const bp = b.pinned ? 1 : 0;
          if (ap !== bp) return bp - ap; // pinned first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
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

  console.log('[FromPixoulRow] render', {
    mode: import.meta.env.MODE,
    count: posts.length,
    channels: posts.slice(0, 3).map(post => post.channel),
  });

  if (isLoading) {
    return (
      <section className="py-9 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl font-bold">From Pixoul</h2>
          </div>
          <div className="flex gap-5 overflow-x-auto px-5 pb-5 max-w-[100svw] snap-x">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="w-80 sm:w-84 shrink-0 rounded-2xl shadow overflow-hidden snap-start">
                <Skeleton className="h-56 w-full" />
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
    <section className="py-9 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">From Pixoul</h2>
          <Link to="/from-pixoul?channel=from_pixoul" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        {/* MOBILE: Show exactly 2 cards in view by default; swipe only this row */}
        <div className="px-5 flex gap-5 overflow-x-auto pb-5 no-scrollbar md:overflow-visible snap-x whitespace-nowrap max-w-[100svw]">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer snap-start w-80 sm:w-84 shrink-0 rounded-2xl bg-card/60 ring-1 ring-border/50"
            >
              {post.images && post.images.length > 0 ? (
                <div className="relative w-full h-56 sm:h-60">
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
                <div className="bg-muted w-full h-56 sm:h-60 flex items-center justify-center relative">
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
