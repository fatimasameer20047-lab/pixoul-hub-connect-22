import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, DollarSign, MapPin } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { formatPriceAED } from '@/lib/price-formatter';

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

interface PixoulEvent {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  category?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  duration_minutes?: number | null;
  price?: number | null;
  location?: string | null;
  image_url?: string | null;
  is_active?: boolean | null;
  created_by?: string | null;
  created_by_email?: string | null;
  created_at?: string | null;
}

export function FromPixoulRow() {
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [events, setEvents] = useState<PixoulEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setIsLoading(true);
    try {
      const postsPromise = supabase
        .from('pixoul_posts')
        .select('id,type,title,caption,images,created_at,pinned,published,channel')
        .eq('published', true)
        .eq('channel', 'from_pixoul')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(8);

      const eventsPromise = supabase
        .from('events_programs')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true })
        .limit(6);

      const [{ data: postsData, error: postsError }, { data: eventsData, error: eventsError }] =
        await Promise.all([postsPromise, eventsPromise]);

      if (postsError) throw postsError;
      if (eventsError) throw eventsError;

      const normalizedPosts = ((postsData as PixoulPost[] | null) || []).map(post => ({
        ...post,
        channel: post.channel ?? 'from_pixoul',
      }));
      const combined = [...normalizedPosts]
        .sort((a, b) => {
          const ap = a.pinned ? 1 : 0;
          const bp = b.pinned ? 1 : 0;
          if (ap !== bp) return bp - ap;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
        .slice(0, 12);

      setPosts(combined);

      const staffEvents = ((eventsData as PixoulEvent[] | null) || []).filter((evt) => {
        const creator = (evt as any).created_by_email || (evt as any).created_by;
        if (creator) {
          return (
            creator === 'pixoulevents@staffportal.com' ||
            (typeof creator === 'string' && creator.endsWith('@staffportal.com'))
          );
        }
        return true;
      });

      const upcomingEvents = staffEvents.filter((evt) => !isEventPast(evt));
      setEvents(upcomingEvents);
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isEventPast = (event: PixoulEvent) => {
    const comparisonDate =
      event.type === 'program'
        ? event.end_date || event.start_date || null
        : event.event_date;
    if (!comparisonDate) return false;
    return isBefore(parseISO(comparisonDate), startOfDay(new Date()));
  };

  const hasContent = useMemo(() => posts.length > 0 || events.length > 0, [posts.length, events.length]);

  type FeedItem = { kind: 'post'; post: PixoulPost } | { kind: 'event'; event: PixoulEvent };

  const getItemDate = (item: FeedItem) => {
    if (item.kind === 'post') {
      return new Date(item.post.created_at).getTime();
    }
    const evt = item.event;
    const dateString = evt.event_date || evt.start_date || evt.created_at || '';
    return dateString ? new Date(dateString).getTime() : 0;
  };

  const pinnedPosts = useMemo(() => posts.filter((post) => post.pinned), [posts]);
  const regularPosts = useMemo(() => posts.filter((post) => !post.pinned), [posts]);

  const combinedItems: FeedItem[] = useMemo(() => {
    const mixed: FeedItem[] = [
      ...regularPosts.map((post) => ({ kind: 'post', post })),
      ...events.map((event) => ({ kind: 'event', event })),
    ];

    mixed.sort((a, b) => getItemDate(b) - getItemDate(a));

    return [
      ...pinnedPosts.map((post) => ({ kind: 'post', post })),
      ...mixed,
    ];
  }, [events, pinnedPosts, regularPosts]);

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
    eventCount: events.length,
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

  if (!hasContent) {
    return null;
  }

  return (
    <section className="py-9 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">From Pixoul</h2>
          <Link to="/from-pixoul?channel=from_pixoul" className="text-sm text-primary hover:underline">
            View All
          </Link>
        </div>

        <div className="px-5 flex gap-5 overflow-x-auto pb-5 no-scrollbar md:overflow-visible snap-x whitespace-nowrap max-w-[100svw]">
          {combinedItems.map((item) => {
            if (item.kind === 'post') {
              const post = item.post;
              return (
                <Card
                  key={`post-${post.id}`}
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
              );
            }

            const event = item.event;
            return (
              <Card
                key={`event-${event.id}`}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer snap-start w-80 sm:w-84 shrink-0 rounded-2xl bg-card/60 ring-1 ring-border/50"
                onClick={() => navigate(`/events?eventId=${event.id}`)}
              >
                {event.image_url && (
                  <div className="w-full h-56 sm:h-60 overflow-hidden">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg leading-tight line-clamp-2">{event.title}</CardTitle>
                      {event.category && (
                        <Badge variant="outline" className="w-fit">{event.category}</Badge>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <Badge variant={event.type === 'event' ? 'default' : 'secondary'} className="capitalize">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  <div className="space-y-1 text-sm">
                    {event.type === 'event' && event.event_date && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(parseISO(event.event_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span className="capitalize">
                        {event.type === 'program' ? 'Start Date:' : 'Start Time:'}
                      </span>
                      <span>
                        {event.type === 'program'
                          ? event.start_date
                            ? format(parseISO(event.start_date), 'MMM dd, yyyy')
                            : 'TBD'
                          : event.start_time || 'TBD'}
                      </span>
                    </div>
                    {event.type === 'program' && (event.price || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {formatPriceAED(event.price || 0)} per person
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {event.location}
                      </div>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/events?eventId=${event.id}`);
                    }}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
