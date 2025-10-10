import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, Star, MessageCircle, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { RoomBookingForm } from '@/components/booking/RoomBookingForm';
import { PartyRequestForm } from '@/components/booking/PartyRequestForm';
import { MyBookings } from '@/components/booking/MyBookings';
import { BookingDashboard } from '@/components/booking/BookingDashboard';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { ImageViewer } from '@/components/ui/image-viewer';

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  hourly_rate: number;
  description: string;
  amenities: string[];
  image_url: string | null;
}

export default function Booking() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [showViewer, setShowViewer] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast({
        title: "Error loading rooms",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
    }
  };

  const handleBookRoom = (room: Room) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to make a booking",
        variant: "destructive",
      });
      return;
    }
    setSelectedRoom(room);
    setShowRoomForm(true);
  };

  const handleRequestParty = () => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to request a party",
        variant: "destructive",
      });
      return;
    }
    setShowPartyForm(true);
  };

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'vip': return <Star className="h-4 w-4" />;
      case 'social': return <Users className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  if (showRoomForm && selectedRoom) {
    return (
      <RoomBookingForm 
        room={selectedRoom} 
        onBack={() => {
          setShowRoomForm(false);
          setSelectedRoom(null);
        }}
      />
    );
  }

  if (showPartyForm) {
    return (
      <PartyRequestForm 
        onBack={() => setShowPartyForm(false)}
      />
    );
  }

  if (showDashboard) {
    return <BookingDashboard />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Booking
            </h1>
            <p className="text-muted-foreground">
              Reserve gaming rooms or organize parties at Pixoul Hub
            </p>
          </div>
        </div>
      </div>

        <Tabs defaultValue="rooms" className="space-y-6">
        <TabsList className={`grid w-full ${isDemoMode ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="rooms">Gaming Rooms</TabsTrigger>
          <TabsTrigger value="parties">Organize Party</TabsTrigger>
          <TabsTrigger value="my-bookings">My Bookings</TabsTrigger>
          {isDemoMode && (
            <TabsTrigger value="dashboard">Staff Dashboard</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="rooms" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <Card key={room.id} className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 overflow-hidden">
                {room.image_url && (
                  <div 
                    className="aspect-video w-full overflow-hidden cursor-pointer"
                    onClick={() => {
                      setViewerImages([room.image_url!]);
                      setShowViewer(true);
                    }}
                  >
                    <img 
                      src={room.image_url} 
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {getRoomTypeIcon(room.type)}
                      {room.name}
                    </CardTitle>
                    <Badge variant={room.type === 'vip' ? 'default' : 'secondary'}>
                      {room.type.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{room.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-4 w-4" />
                      Up to {room.capacity} players
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4" />
                      {formatPriceAEDUSD(room.hourly_rate)}/hour
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Amenities:</p>
                    <div className="flex flex-wrap gap-1">
                      {room.amenities.map((amenity, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button 
                    onClick={() => handleBookRoom(room)}
                    className="w-full"
                  >
                    Book Room
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="parties" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Organize a Party
              </CardTitle>
              <p className="text-muted-foreground">
                Let us help you create the perfect gaming party experience
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card 
                  className="text-center p-6 cursor-pointer hover:shadow-lg hover:shadow-primary/20 transition-all"
                  onClick={() => navigate('/party-gallery?category=birthday')}
                >
                  <h3 className="font-semibold mb-2 text-lg">Birthday Parties</h3>
                  <p className="text-sm text-muted-foreground">Celebrate with VR gaming and custom themes</p>
                  <p className="text-xs text-primary mt-2">View past events →</p>
                </Card>
                <Card 
                  className="text-center p-6 cursor-pointer hover:shadow-lg hover:shadow-primary/20 transition-all"
                  onClick={() => navigate('/party-gallery?category=other')}
                >
                  <h3 className="font-semibold mb-2 text-lg">Other Events</h3>
                  <p className="text-sm text-muted-foreground">Graduation, team building, corporate events, and more</p>
                  <p className="text-xs text-primary mt-2">View past events →</p>
                </Card>
              </div>
              
              <div className="text-center">
                <Button onClick={handleRequestParty} size="lg" className="px-8">
                  Request Party Planning
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-bookings">
          <MyBookings />
        </TabsContent>

        {isDemoMode && (
          <TabsContent value="dashboard">
            <BookingDashboard />
          </TabsContent>
        )}
      </Tabs>

      <ImageViewer
        images={viewerImages}
        open={showViewer}
        onOpenChange={setShowViewer}
      />
    </div>
  );
}