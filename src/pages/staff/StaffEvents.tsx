import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Users, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { EventForm } from '@/components/events/EventForm';
import { EventRegistrations } from '@/components/events/EventRegistrations';
import { format, parseISO } from 'date-fns';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  event_date: string;
  start_time: string;
  max_participants?: number;
  current_participants: number;
  price: number;
  image_url?: string;
  is_active: boolean;
}

export default function StaffEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingRegistrations, setViewingRegistrations] = useState<Event | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events_programs')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) {
      toast({
        title: "Error loading events",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEvents((data || []).map(event => ({
        ...event,
        type: event.type as 'event' | 'program'
      })));
    }
  };

  return (
    <div className="p-6 space-y-6">
      {viewingRegistrations ? (
        <EventRegistrations
          eventId={viewingRegistrations.id}
          eventTitle={viewingRegistrations.title}
          onBack={() => setViewingRegistrations(null)}
        />
      ) : showEventForm ? (
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
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Events Management</h1>
              <p className="text-muted-foreground">Create and manage events and programs</p>
            </div>
            <Button onClick={() => setShowEventForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Event/Program
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                {event.image_url && (
                  <div className="w-full h-48 overflow-hidden">
                    <img
                      src={event.image_url}
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg line-clamp-1">{event.title}</CardTitle>
                    <Badge variant={event.type === 'event' ? 'default' : 'secondary'}>
                      {event.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {event.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(event.event_date), 'MMM dd, yyyy')} at {event.start_time}
                    </div>
                    {event.max_participants && (
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {event.current_participants}/{event.max_participants} registered
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        setEditingEvent(event);
                        setShowEventForm(true);
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => setViewingRegistrations(event)}
                    >
                      Registrations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
