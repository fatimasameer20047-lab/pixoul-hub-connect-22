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
}

export function FromPixoulRow() {
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPixoulPosts();
  }, []);

  const fetchPixoulPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('pixoul_posts')
        .select('*')
        .eq('published', true)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      setPosts((data as PixoulPost[]) || []);
    } catch (error) {
      console.error('Error fetching Pixoul posts:', error);
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
