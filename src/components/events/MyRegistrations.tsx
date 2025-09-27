import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, CheckCircle, XCircle, Loader, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ChatDialog } from '@/components/chat/ChatDialog';

interface Registration {
  id: string;
  participant_name: string;
  participant_email: string;
  party_size: number;
  status: string;
  notes?: string;
  created_at: string;
  events_programs: {
    id: string;
    title: string;
    event_date: string;
    start_time: string;
    type: string;
    category?: string;
    price: number;
  };
}

export function MyRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<{id: string, title: string} | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRegistrations();
    }
  }, [user]);

  const fetchRegistrations = async () => {
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select(`
          *,
          events_programs (
            id,
            title,
            event_date,
            start_time,
            type,
            category,
            price
          )
        `)
        .eq('user_id', user?.id || 'guest')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRegistrations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading registrations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'waitlist':
        return <Loader className="h-4 w-4 text-yellow-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      case 'waitlist':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const handleChatOpen = (eventId: string, eventTitle: string) => {
    setSelectedChat({ id: eventId, title: eventTitle });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No registrations yet</h3>
          <p className="text-muted-foreground">Register for events and programs to see them here!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {registrations.map((registration) => (
          <Card key={registration.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {registration.events_programs.title}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(registration.status)}>
                    {getStatusIcon(registration.status)}
                    {registration.status}
                  </Badge>
                  <Badge variant={registration.events_programs.type === 'event' ? 'default' : 'secondary'}>
                    {registration.events_programs.type}
                  </Badge>
                </div>
              </div>
              {registration.events_programs.category && (
                <Badge variant="outline" className="w-fit">
                  {registration.events_programs.category}
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {format(parseISO(registration.events_programs.event_date), 'MMM dd, yyyy')}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {registration.events_programs.start_time}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {registration.party_size} {registration.party_size === 1 ? 'person' : 'people'}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <strong>Participant:</strong> {registration.participant_name}
                </div>
                <div>
                  <strong>Email:</strong> {registration.participant_email}
                </div>
                {registration.events_programs.price > 0 && (
                  <div>
                    <strong>Total Cost:</strong> ${(registration.events_programs.price * registration.party_size).toFixed(2)}
                  </div>
                )}
                {registration.notes && (
                  <div>
                    <strong>Notes:</strong> {registration.notes}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleChatOpen(registration.events_programs.id, registration.events_programs.title)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Organizer
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedChat && (
        <ChatDialog
          isOpen={!!selectedChat}
          onClose={() => setSelectedChat(null)}
          conversationType="event_organizer"
          referenceId={selectedChat.id}
          title={`${selectedChat.title} - Contact Organizer`}
        />
      )}
    </>
  );
}