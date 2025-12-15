import React, { useState, useEffect } from 'react';
import { Calendar, Clock, DollarSign, Filter, Search, Settings, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { EventDetail } from '@/components/events/EventDetail';
import { MyRegistrations } from '@/components/events/MyRegistrations';
import { EventForm } from '@/components/events/EventForm';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { ImageViewer } from '@/components/ui/image-viewer';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  category?: string;
  event_date: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  price?: number | null;
  contact_phone?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  location?: string;
  instructor?: string;
  requirements?: string[];
  image_url?: string;
  is_active: boolean;
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const { user } = useAuth();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchTerm, typeFilter, categoryFilter, dateFilter]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events_programs')
        .select('*')
        .eq('is_active', true)
        .order('event_date', { ascending: true })
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents((data || []).map(event => ({
        ...event,
        type: event.type as 'event' | 'program'
      })));
    } catch (error: any) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(event => event.type === typeFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.category === categoryFilter);
    }

    // Date filter
    const today = startOfDay(new Date());
    if (dateFilter === 'upcoming') {
      filtered = filtered.filter(event => !isEventPast(event));
    } else if (dateFilter === 'past') {
      filtered = filtered.filter(event => isEventPast(event));
    }

    setFilteredEvents(filtered);
  };

  const getAvailableCategories = () => {
    const categories = events
      .map(event => event.category)
      .filter((category, index, self) => category && self.indexOf(category) === index);
    return categories;
  };

  const isEventPast = (event: Event) => {
    const compareDate = event.type === 'program'
      ? (event.end_date || event.start_date || null)
      : event.event_date;
    if (!compareDate) return false;
    return isBefore(parseISO(compareDate), startOfDay(new Date()));
  };

  if (selectedEvent) {
    return (
      <EventDetail 
        event={selectedEvent} 
        onBack={() => setSelectedEvent(null)}
        onRegistrationComplete={fetchEvents}
      />
    );
  }

  if (showEventForm) {
    return (
      <EventForm
        event={editingEvent || undefined}
        onBack={() => {
          setShowEventForm(false);
          setEditingEvent(null);
        }}
        onSuccess={() => {
          setShowEventForm(false);
          setEditingEvent(null);
          fetchEvents();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 overflow-x-hidden">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Events & Programs
            </h1>
            <p className="text-muted-foreground">
              Join our exciting events and educational programs
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="catalog" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="catalog">Event Catalog</TabsTrigger>
          <TabsTrigger value="registrations">My Registrations</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-6">
          {/* Filters */}
          <Card>
            {/* MOBILE: Compact filters so the list dominates */}
            <CardContent className="pt-3 pb-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="event">Events</SelectItem>
                    <SelectItem value="program">Programs</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
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

                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-9 text-sm"
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                    setDateFilter('all');
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* MOBILE: 2-column grid, square thumbnails, compact */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {filteredEvents.map((event) => (
              <Card 
                key={event.id} 
                className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => setSelectedEvent(event)}
              >
                {event.image_url && (
                  <div 
                    className="w-full overflow-hidden rounded-b-none rounded-t-xl aspect-square"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerImages([event.image_url!]);
                      setShowViewer(true);
                    }}
                  >
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />
                  </div>
                )}
                <CardHeader className="py-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-1 text-base" title={event.title}>{event.title}</CardTitle>
                    <div className="flex flex-col gap-2">
                      <Badge variant={event.type === 'event' ? 'default' : 'secondary'} className="text-[11px]">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                  {event.category && (
                    <Badge variant="outline" className="w-fit text-[11px]">
                      {event.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5 text-xs">
                    {event.type === 'event' && (
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
                      <span>{event.start_time}</span>
                      {event.type === 'program' && event.duration_minutes && ` (${event.duration_minutes}min)`}
                    </div>
                    {event.type === 'program' && (event.price || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {formatPriceAEDUSD(event.price || 0)}
                      </div>
                    )}
                    {event.type === 'program' && event.contact_phone && (
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>If interested, contact: {event.contact_phone}</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    className="w-full h-9 text-sm" 
                    variant={isEventPast(event) ? "outline" : "default"}
                    disabled={isEventPast(event)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                    }}
                  >
                    {isEventPast(event) ? 'Past Event' : 'View Details'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <Card 
                key={event.id} 
                className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer overflow-hidden"
                onClick={() => setSelectedEvent(event)}
              >
                {event.image_url && (
                  <div 
                    className="w-full overflow-hidden rounded-b-none rounded-t-xl md:rounded-t-xl aspect-video"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerImages([event.image_url!]);
                      setShowViewer(true);
                    }}
                  >
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <div className="flex flex-col gap-2">
                      <Badge variant={event.type === 'event' ? 'default' : 'secondary'}>
                        {event.type}
                      </Badge>
                      {isEventPast(event) && (
                        <Badge variant="outline">Past</Badge>
                      )}
                    </div>
                  </div>
                  {event.category && (
                    <Badge variant="outline" className="w-fit">
                      {event.category}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {event.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    {event.type === 'event' && (
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
                      <span>{event.start_time}</span>
                      {event.type === 'program' && event.duration_minutes && ` (${event.duration_minutes}min)`}
                    </div>
                    {event.type === 'program' && (event.price || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {formatPriceAEDUSD(event.price || 0)}
                      </div>
                    )}
                    {event.type === 'program' && event.contact_phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <span>If interested, contact: {event.contact_phone}</span>
                      </div>
                    )}
                    {event.instructor && (
                      <div className="text-xs text-muted-foreground">
                        Instructor: {event.instructor}
                      </div>
                    )}
                  </div>

                  {/* MOBILE: Full-width button stack */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      className="flex-1 w-full" 
                      variant={isEventPast(event) ? "outline" : "default"}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(event);
                      }}
                    >
                      {isEventPast(event) ? 'Past Event' : 'View Details'}
                    </Button>
                    {isDemoMode && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingEvent(event);
                          setShowEventForm(true);
                        }}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredEvents.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No events found</h3>
                <p className="text-muted-foreground">Try adjusting your filters or check back later for new events.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="registrations">
          <MyRegistrations />
        </TabsContent>
      </Tabs>

      <ImageViewer
        images={viewerImages}
        open={showViewer}
        onOpenChange={setShowViewer}
      />
    </div>
  );
}
