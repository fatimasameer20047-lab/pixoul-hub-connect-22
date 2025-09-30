import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, MessageCircle, CheckCircle, XCircle, Loader, Eye, Edit, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ChatDialog } from '@/components/chat/ChatDialog';

interface RoomBooking {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  status: string;
  notes?: string;
  contact_phone?: string;
  contact_email?: string;
  created_at: string;
  rooms: {
    name: string;
    type: string;
  };
  profiles: {
    name: string;
  };
}

interface PartyRequest {
  id: string;
  name: string;
  party_type: string;
  age?: number;
  school_name?: string;
  preferred_date: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  guest_count: number;
  theme?: string;
  status: string;
  estimated_cost?: number;
  contact_phone: string;
  contact_email: string;
  special_notes?: string;
  created_at: string;
  profiles: {
    name: string;
  };
}

export function BookingDashboard() {
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [partyRequests, setPartyRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState<{type: 'room_booking' | 'party_request', id: string, title: string} | null>(null);
  const { user } = useAuth();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const { toast } = useToast();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      // Fetch room bookings
      const { data: roomData, error: roomError } = await supabase
        .from('room_bookings')
        .select(`
          *,
          rooms!inner (name, type),
          profiles!room_bookings_user_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (roomError) throw roomError;

      // Fetch party requests
      const { data: partyData, error: partyError } = await supabase
        .from('party_requests')
        .select(`
          *,
          profiles!party_requests_user_id_fkey (name)
        `)
        .order('created_at', { ascending: false });

      if (partyError) throw partyError;

      setRoomBookings((roomData as any) || []);
      setPartyRequests((partyData as any) || []);
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

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Booking status has been updated successfully.",
      });

      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updatePartyStatus = async (partyId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('party_requests')
        .update({ status: newStatus })
        .eq('id', partyId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: "Party request status has been updated successfully.",
      });

      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
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

  const handleChatOpen = (type: 'room_booking' | 'party_request', id: string, title: string) => {
    setSelectedChat({ type, id, title });
  };

  if (!isDemoMode) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">Staff features are only available in demo mode.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Booking Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage room bookings and party requests
          </p>
        </div>

        <Tabs defaultValue="room-bookings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="room-bookings">Room Bookings ({roomBookings.length})</TabsTrigger>
            <TabsTrigger value="party-requests">Party Requests ({partyRequests.length})</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>

          <TabsContent value="room-bookings" className="space-y-4">
            {roomBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {booking.rooms.name} - {booking.profiles.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(booking.status)}>
                        {getStatusIcon(booking.status)}
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(booking.booking_date), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {booking.start_time} - {booking.end_time}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">${booking.total_amount}</span>
                      <span className="text-muted-foreground">({booking.duration_hours}h)</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(booking.created_at), 'MMM dd, HH:mm')}
                    </div>
                  </div>

                  {(booking.contact_phone || booking.contact_email) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {booking.contact_phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {booking.contact_phone}
                        </div>
                      )}
                      {booking.contact_email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          {booking.contact_email}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {booking.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Notes:</strong> {booking.notes}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select
                      defaultValue={booking.status}
                      onValueChange={(newStatus) => updateBookingStatus(booking.id, newStatus)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChatOpen('room_booking', booking.id, `${booking.rooms.name} - ${booking.profiles.name}`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {roomBookings.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No room bookings</h3>
                  <p className="text-muted-foreground">Room bookings will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="party-requests" className="space-y-4">
            {partyRequests.map((party) => (
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
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
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(party.created_at), 'MMM dd, HH:mm')}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {party.contact_phone}
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {party.contact_email}
                    </div>
                  </div>

                  {party.age && (
                    <div className="text-sm">
                      <strong>Age:</strong> {party.age}
                    </div>
                  )}

                  {party.school_name && (
                    <div className="text-sm">
                      <strong>School/University:</strong> {party.school_name}
                    </div>
                  )}

                  {party.theme && (
                    <div className="text-sm">
                      <strong>Theme:</strong> {party.theme}
                    </div>
                  )}

                  {party.special_notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Special Notes:</strong> {party.special_notes}
                    </div>
                  )}

                  {party.estimated_cost && (
                    <div className="text-sm">
                      <strong>Estimated Cost:</strong> ${party.estimated_cost}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Select
                      defaultValue={party.status}
                      onValueChange={(newStatus) => updatePartyStatus(party.id, newStatus)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="declined">Declined</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleChatOpen('party_request', party.id, `${party.name}'s ${party.party_type} Party`)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {partyRequests.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No party requests</h3>
                  <p className="text-muted-foreground">Party requests will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="messages">
            <Card>
              <CardContent className="text-center py-12">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Messages</h3>
                <p className="text-muted-foreground">Message management coming soon.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {selectedChat && (
        <ChatDialog
          isOpen={!!selectedChat}
          onClose={() => setSelectedChat(null)}
          conversationType={selectedChat.type}
          referenceId={selectedChat.id}
          title={selectedChat.title}
        />
      )}
    </>
  );
}