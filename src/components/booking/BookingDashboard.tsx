import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Users, MapPin, CheckCircle, XCircle, Loader, Phone, Mail } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useStaff } from '@/contexts/StaffContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { formatPriceAED } from '@/lib/price-formatter';

interface ProfileSummary {
  user_id?: string;
  name?: string | null;
  full_name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
}

interface RoomBooking {
  id: string;
  user_id?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  total_amount: number;
  status: string;
  payment_status?: string | null;
  notes?: string;
  contact_phone?: string | null;
  contact_email?: string | null;
  created_at: string;
  package_label?: string | null;
  booking_source?: string | null;
  rooms?: {
    name?: string | null;
    type?: string | null;
  };
  profile?: ProfileSummary;
}

interface PartyRequest {
  id: string;
  user_id?: string | null;
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
  profile?: ProfileSummary;
}

type BookingTab = 'room-bookings' | 'packages-offers' | 'party-requests';

export function BookingDashboard({
  initialChatId,
  initialTab,
  highlightId,
  highlightType,
}: {
  initialChatId?: string;
  initialTab?: BookingTab;
  highlightId?: string;
  highlightType?: string;
}) {
  const [roomBookings, setRoomBookings] = useState<RoomBooking[]>([]);
  const [packageBookings, setPackageBookings] = useState<RoomBooking[]>([]);
  const [partyRequests, setPartyRequests] = useState<PartyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { canManageRooms } = useStaff();
  const { toast } = useToast();

  const resolveTabFromType = (type?: string): BookingTab => {
    if (type === 'booking_party') return 'party-requests';
    if (type === 'booking_package') return 'packages-offers';
    return 'room-bookings';
  };

  const [activeTab, setActiveTab] = useState<BookingTab>(() => initialTab || resolveTabFromType(highlightType));

  useEffect(() => {
    const nextTab = initialTab || resolveTabFromType(highlightType);
    setActiveTab(nextTab);
  }, [initialTab, highlightType]);

  useEffect(() => {
    fetchBookings();

    const roomBookingsChannel = supabase
      .channel('room-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_bookings'
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    const partyRequestsChannel = supabase
      .channel('party-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_requests'
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomBookingsChannel);
      supabase.removeChannel(partyRequestsChannel);
    };
  }, []);

  const fetchBookings = async () => {
    try {
      const { data: roomData, error: roomError } = await supabase
        .from('room_bookings')
        .select(`
          id, user_id, booking_date, start_time, end_time, duration_hours, total_amount, status, payment_status, notes, contact_phone, contact_email, created_at, package_label, booking_source,
          rooms (name, type)
        `)
        .order('created_at', { ascending: false });

      if (roomError) throw roomError;

      const { data: partyData, error: partyError } = await supabase
        .from('party_requests')
        .select(`
          id, user_id, name, party_type, age, school_name, preferred_date, preferred_time_start, preferred_time_end, guest_count, theme, status, estimated_cost, contact_phone, contact_email, special_notes, created_at
        `)
        .order('created_at', { ascending: false });

      if (partyError) throw partyError;

      const profileIds = new Set<string>();
      (roomData || []).forEach((booking: RoomBooking) => {
        if (booking.user_id) profileIds.add(booking.user_id);
      });
      (partyData || []).forEach((party: PartyRequest) => {
        if (party.user_id) profileIds.add(party.user_id);
      });

      let profileMap: Record<string, ProfileSummary> = {};
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles' as any)
          .select('user_id, name, full_name, username, email, phone_number')
          .in('user_id', Array.from(profileIds));

        profileMap = (profiles || []).reduce<Record<string, ProfileSummary>>((acc, profile) => {
          if (profile.user_id) acc[profile.user_id] = profile;
          return acc;
        }, {});
      }

      const bookingsWithProfiles = (roomData || []).map((booking) => ({
        ...booking,
        profile: booking.user_id ? profileMap[booking.user_id] : undefined,
      }));

      setRoomBookings(bookingsWithProfiles.filter((b) => b.booking_source !== 'package' && !b.package_label));
      setPackageBookings(bookingsWithProfiles.filter((b) => b.booking_source === 'package' || b.package_label));

      const partiesWithProfiles = (partyData || []).map((party) => ({
        ...party,
        profile: party.user_id ? profileMap[party.user_id] : undefined,
      }));
      setPartyRequests(partiesWithProfiles);
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

  const cancelBooking = async (bookingId: string, currentStatus: string) => {
    if (currentStatus === 'cancelled') {
      toast({
        title: "Already cancelled",
        description: "This booking has already been cancelled.",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId);

      if (error) {
        if (error.code === '23P01' || error.message?.includes('not available')) {
          toast({
            title: "Booking conflict",
            description: "This room is not available at that time. The time slot may have been booked by another customer.",
            variant: "destructive",
          });
          fetchBookings();
          return;
        }
        throw error;
      }

      toast({ title: "Booking cancelled" });
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const confirmBooking = async (bookingId: string, currentStatus: string) => {
    if (currentStatus === 'confirmed') {
      toast({
        title: "Already confirmed",
        description: "This booking is already confirmed.",
      });
      return;
    }
    if (currentStatus === 'cancelled') {
      toast({
        title: "Cannot confirm",
        description: "This booking is cancelled and cannot be confirmed.",
        variant: "destructive",
      });
      return;
    }
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'confirmed' })
        .eq('id', bookingId);

      if (error) throw error;

      toast({ title: "Booking confirmed" });
      fetchBookings();
    } catch (error: any) {
      toast({
        title: "Error confirming booking",
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

  const formatDateSafe = (value?: string | null) => {
    if (!value) return 'Date N/A';
    try {
      return format(parseISO(value), 'MMM dd, yyyy');
    } catch {
      return 'Date N/A';
    }
  };

  const isHighlighted = (id: string) => highlightId === id;

  const getBookingContact = (booking: RoomBooking) => {
    const profile = booking.profile;
    return {
      name: profile?.full_name || profile?.name || 'User',
      username: profile?.username ? `@${profile.username}` : '—',
      email: profile?.email || booking.contact_email || 'Not provided',
      phone: profile?.phone_number || booking.contact_phone || '—',
    };
  };

  const getPartyContact = (party: PartyRequest) => {
    const profile = party.profile;
    return {
      name: profile?.full_name || profile?.name || 'User',
      username: profile?.username ? `@${profile.username}` : '—',
      email: profile?.email || party.contact_email || 'Not provided',
      phone: profile?.phone_number || party.contact_phone || '—',
    };
  };

  if (!canManageRooms) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to view bookings.</p>
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

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as BookingTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="room-bookings">Room Bookings ({roomBookings.length})</TabsTrigger>
            <TabsTrigger value="packages-offers">Packages &amp; Offers ({packageBookings.length})</TabsTrigger>
            <TabsTrigger value="party-requests">Party Requests ({partyRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="room-bookings" className="space-y-4">
            {roomBookings.map((booking) => {
              const contact = getBookingContact(booking);
              return (
                <Card
                  key={booking.id}
                  className={isHighlighted(booking.id) ? 'border-primary ring-2 ring-primary/30' : undefined}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {booking.rooms?.name || 'Room (deleted)'} - {contact.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const status = booking.status || 'pending';
                          return (
                            <Badge variant={getStatusVariant(status)}>
                              {getStatusIcon(status)}
                              {status}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDateSafe(booking.booking_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {booking.start_time || 'N/A'} - {booking.end_time || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatPriceAED(booking.total_amount ?? 0)}</span>
                        <span className="text-muted-foreground">({booking.duration_hours ?? 0}h)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateSafe(booking.created_at)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{contact.username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{contact.email}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
                      </div>
                    </div>
                    
                    {booking.notes && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {booking.notes}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => cancelBooking(booking.id, booking.status)}
                        disabled={booking.status === 'cancelled'}
                      >
                        Cancel booking
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => confirmBooking(booking.id, booking.status)}
                        disabled={booking.status === 'confirmed' || booking.status === 'cancelled'}
                      >
                        Confirm booking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

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

          <TabsContent value="packages-offers" className="space-y-4">
            {packageBookings.map((booking) => {
              const contact = getBookingContact(booking);
              return (
                <Card
                  key={booking.id}
                  className={isHighlighted(booking.id) ? 'border-primary ring-2 ring-primary/30' : undefined}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        {booking.package_label || 'Package booking'} - {contact.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </div>
                      {(() => {
                        const status = booking.status || 'pending';
                        return (
                          <Badge variant={getStatusVariant(status)}>
                            {getStatusIcon(status)}
                            {status === 'pending' ? 'Pending Payment' : status}
                          </Badge>
                        );
                      })()}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {formatDateSafe(booking.booking_date)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {booking.start_time || 'N/A'} - {booking.end_time || 'N/A'}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatPriceAED(booking.total_amount ?? 0)}</span>
                        <span className="text-muted-foreground capitalize">
                          {booking.payment_status || 'unpaid'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>{contact.username}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{contact.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{contact.phone}</span>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {booking.notes}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => cancelBooking(booking.id, booking.status)}
                        disabled={booking.status === 'cancelled'}
                      >
                        Cancel booking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {packageBookings.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No package bookings</h3>
                  <p className="text-muted-foreground">Packages &amp; offers bookings will appear here.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="party-requests" className="space-y-4">
            {partyRequests.map((party) => {
              const contact = getPartyContact(party);
              return (
                <Card
                  key={party.id}
                  className={isHighlighted(party.id) ? 'border-primary ring-2 ring-primary/30' : undefined}
                >
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
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{contact.username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>{contact.email}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {contact.phone}
                        </div>
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
                        <strong>Estimated Cost:</strong> {formatPriceAED(party.estimated_cost)}
                      </div>
                    )}

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
                  </CardContent>
                </Card>
              );
            })}

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
        </Tabs>
      </div>
    </>
  );
}
