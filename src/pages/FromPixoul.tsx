import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'react-router-dom';

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
  channel: PixoulChannel;
}

const FromPixoul = () => {
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const channelParam = searchParams.get('channel') === 'packages_offers' ? 'packages_offers' : 'from_pixoul';
  const sectionTitle = channelParam === 'packages_offers' ? 'Packages & Offers' : 'From Pixoul';

  useEffect(() => {
    fetchPixoulPosts(channelParam);
  }, [channelParam]);

  const fetchPixoulPosts = async (channel: PixoulChannel) => {
    try {
      const { data, error } = await supabase
        .from('pixoul_posts')
        .select('*')
        .eq('published', true)
        .eq('channel', channel)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      const normalized = ((data as PixoulPost[] | null) || []).map(post => ({
        ...post,
        channel: post.channel ?? 'from_pixoul',
      }));
      setPosts(normalized);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-bold mb-6">{sectionTitle}</h1>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-64 w-full" />
                <div className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            {sectionTitle === 'Packages & Offers'
              ? 'No Packages & Offers posts yet.'
              : 'No posts from Pixoul yet.'}
          </p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} id={`post-${post.id}`} className="overflow-hidden relative">
                {post.pinned && (
                  <Badge className="absolute top-4 right-4 z-10" variant="destructive">
                    Pinned
                  </Badge>
                )}
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 p-4">
                    {post.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${post.title || 'Post'} image ${index + 1}`}
                        className="w-full max-h-[500px] object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary">Pixoul</Badge>
                    <Badge variant={getTypeBadgeColor(post.type)} className="capitalize">
                      {post.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(post.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {post.title && (
                    <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
                  )}
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {post.caption}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FromPixoul;
