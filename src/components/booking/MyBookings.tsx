import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, Loader } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { formatPriceAED } from '@/lib/price-formatter';

interface RoomBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  status: string;
  booking_source?: string | null;
  package_label?: string | null;
  notes?: string;
  created_at: string;
  rooms: {
    name: string;
    type: string;
  };
}

interface PartyRequest {
  id: string;
  name: string;
  party_type: string;
  age?: number;
  preferred_date: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  guest_count: number;
  theme?: string;
  status: string;
  estimated_cost?: number;
  created_at: string;
}

export function MyBookings() {
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [packageBookings, setPackageBookings] = useState<RoomBooking[]>([]);
  const [partyRequests, setPartyRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelPromptId, setCancelPromptId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`room-bookings-user-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_bookings',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBookings = async () => {
    try {
      // Fetch room bookings
      const { data: roomData, error: roomError } = await supabase
        .from('room_bookings')
        .select(`
          *,
          rooms (name, type)
        `)
        .eq('user_id', user?.id || 'guest')
        .order('created_at', { ascending: false });

      if (roomError) throw roomError;

      // Fetch party requests
      const { data: partyData, error: partyError } = await supabase
        .from('party_requests')
        .select('*')
        .eq('user_id', user?.id || 'guest')
        .order('created_at', { ascending: false });

      if (partyError) throw partyError;

      setPackageBookings(
        (roomData || []).filter(
          (booking: RoomBooking) => booking.booking_source === 'package' || booking.package_label
        )
      );
      setRoomBookings(
        (roomData || []).filter(
          (booking: RoomBooking) => booking.booking_source !== 'package' && !booking.package_label
        )
      );
      setPartyRequests(partyData || []);
    } catch (error: any) {
      toast({
        title: "Error loading bookings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openSupportForBooking = (booking: RoomBooking) => {
    const message = `Hi, Iâ€™d like to cancel my booking and request a refund if applicable:
Room: ${booking.rooms.name}
Date: ${format(parseISO(booking.booking_date), 'yyyy-MM-dd')}
Time: ${booking.start_time} - ${booking.end_time}
Booking ID: ${booking.id}
Thank you.`;

    navigate('/support', { state: { prefillMessage: message } });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'cancelled':
      case 'declined':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Loader className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
        return 'default';
      case 'cancelled':
      case 'declined':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rooms">Room Bookings ({roomBookings.length})</TabsTrigger>
          <TabsTrigger value="packages">Packages &amp; Offers ({packageBookings.length})</TabsTrigger>
          <TabsTrigger value="parties">Party Requests ({partyRequests.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rooms" className="space-y-4">
          {roomBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No room bookings yet</h3>
                <p className="text-muted-foreground">Book your first gaming room to get started!</p>
              </CardContent>
            </Card>
          ) : (
            roomBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {booking.rooms.name}
                    </CardTitle>
                     <div className="flex items-center gap-2">
                       <Badge variant={getStatusVariant(booking.status)}>
                         {getStatusIcon(booking.status)}
                         {booking.status === 'pending' ? 'Pending Payment' : booking.status}
                       </Badge>
                     </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(booking.booking_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {booking.start_time} - {booking.end_time}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPriceAED(booking.total_amount ?? 0)}</span>
                      <span className="text-muted-foreground">({booking.duration_hours}h)</span>
                    </div>
                  </div>
                  
                  {booking.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div />
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0"
                      onClick={() => setCancelPromptId(`room-${booking.id}`)}
                    >
                      Cancel my booking
                    </Button>
                  </div>

                  {cancelPromptId === `room-${booking.id}` && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span className="text-muted-foreground">
                        To cancel and request a refund, please message our staff. We’ll confirm the cancellation and refund details in chat.
                      </span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => openSupportForBooking(booking)}>
                          Chat with staff
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCancelPromptId(null)}>
                          Keep booking
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="packages" className="space-y-4">
          {packageBookings.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No package bookings yet</h3>
                <p className="text-muted-foreground">Package and offer bookings will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            packageBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {booking.package_label || 'Package booking'}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(booking.status)}>
                        {getStatusIcon(booking.status)}
                        {booking.status === 'pending' ? 'Pending Payment' : booking.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(booking.booking_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {booking.start_time} - {booking.end_time}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{formatPriceAED(booking.total_amount ?? 0)}</span>
                      <span className="text-muted-foreground">({booking.duration_hours}h)</span>
                    </div>
                  </div>

                  {booking.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div />
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0"
                      onClick={() => setCancelPromptId(`package-${booking.id}`)}
                    >
                      Cancel my booking
                    </Button>
                  </div>

                  {cancelPromptId === `package-${booking.id}` && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span className="text-muted-foreground">
                        To cancel and request a refund, please message our staff. We’ll confirm the cancellation and refund details in chat.
                      </span>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => openSupportForBooking(booking)}>
                          Chat with staff
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCancelPromptId(null)}>
                          Keep booking
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="parties" className="space-y-4">
          {partyRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No party requests yet</h3>
                <p className="text-muted-foreground">Request a party to celebrate in style!</p>
              </CardContent>
            </Card>
          ) : (
            partyRequests.map((party) => (
              <Card key={party.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {party.name}'s {party.party_type} Party
                    </CardTitle>
                    <Badge variant={getStatusVariant(party.status)}>
                      {getStatusIcon(party.status)}
                      {party.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(party.preferred_date), 'MMM dd, yyyy')}
                    </div>
                    {party.preferred_time_start && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {party.preferred_time_start} - {party.preferred_time_end || 'TBD'}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {party.guest_count} guests
                    </div>
                  </div>

                  {party.theme && (
                    <div className="text-sm">
                      <strong>Theme:</strong> {party.theme}
                    </div>
                  )}

                  {party.estimated_cost && (
                    <div className="text-sm">
                      <strong>Estimated Cost:</strong> {formatPriceAED(party.estimated_cost)}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div />
                    <Button
                      variant="link"
                      size="sm"
                      className="px-0"
                      onClick={() => setCancelPromptId(`party-${party.id}`)}
                    >
                      Cancel my booking
                    </Button>
                  </div>

                  {cancelPromptId === `party-${party.id}` && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <span className="text-muted-foreground">
                        To cancel your booking, please chat with the staff.
                      </span>
                      <Button size="sm" onClick={() => navigate('/support')}>
                        Chat with staff
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

    </>
  );
}

