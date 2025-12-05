import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

export function PackagesOffersRow() {
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('pixoul_posts')
        .select('id,type,title,caption,images,created_at,pinned,published,channel')
        .eq('published', true)
        .eq('channel', 'packages_offers')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      const normalized = ((data as PixoulPost[] | null) || []).map(post => ({
        ...post,
        channel: post.channel ?? 'packages_offers',
      }));
      setPosts(normalized);
    } catch (error) {
      console.error('Error fetching Packages & Offers posts:', error);
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

  const renderPlaceholder = () => (
    <section className="py-9 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">Packages &amp; Offers</h2>
          <Link to="/from-pixoul?channel=packages_offers" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>
        <div className="px-5 flex gap-5 overflow-x-auto pb-5 no-scrollbar md:overflow-visible snap-x whitespace-nowrap max-w-[100svw]">
          {[...Array(4)].map((_, i) => (
            <Card
              key={i}
              className="overflow-hidden hover:shadow-lg transition-shadow snap-start w-80 sm:w-84 shrink-0 rounded-2xl bg-card/60 ring-1 ring-border/50"
            >
              <div className="relative w-full h-56 sm:h-60">
                <Skeleton className="absolute inset-0" />
                <Badge className="absolute top-2 right-2" variant="secondary">
                  Loading
                </Badge>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-12" />
                </div>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-60" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Button size="sm" disabled>
                    View Details
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );

  console.log('[PackagesOffersRow] render', {
    mode: import.meta.env.MODE,
    count: posts.length,
    channels: posts.slice(0, 3).map(post => post.channel),
  });

  if (isLoading || posts.length === 0) {
    return renderPlaceholder();
  }

  return (
    <section className="py-9 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl font-bold">Packages &amp; Offers</h2>
          <Link to="/from-pixoul?channel=packages_offers" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        {/* Horizontal scroll row identical to FromPixoulRow */}
        <div className="px-5 flex gap-5 overflow-x-auto pb-5 no-scrollbar md:overflow-visible snap-x whitespace-nowrap max-w-[100svw]">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="overflow-hidden hover:shadow-lg transition-shadow snap-start w-80 sm:w-84 shrink-0 rounded-2xl bg-card/60 ring-1 ring-border/50"
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
                <div className="relative bg-muted w-full h-56 sm:h-60 flex items-center justify-center">
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
                <Button
                  size="sm"
                  className="w-full mt-3"
                  variant="default"
                  asChild
                >
                  <Link to={`/booking?tab=packages#packages-offers`}>
                    View Details
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PackagesOffersRow;
