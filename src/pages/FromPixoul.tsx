import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface PixoulPost {
  id: string;
  type: 'event' | 'program' | 'announcement' | 'post';
  title: string | null;
  caption: string;
  media_urls: string[];
  created_at: string;
}

const FromPixoul = () => {
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
        .eq('status', 'published')
        .order('created_at', { ascending: false });

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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto py-8 px-6">
        <h1 className="text-3xl font-bold mb-6">From Pixoul</h1>

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
            No posts from Pixoul yet.
          </p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 p-4">
                    {post.media_urls.map((url, index) => (
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
