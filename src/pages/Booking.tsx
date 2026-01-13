import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, Clock, Users, MapPin, Star, MessageCircle, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { RoomBookingForm } from '@/components/booking/RoomBookingForm';
import { PartyRequestForm } from '@/components/booking/PartyRequestForm';
import { MyBookings } from '@/components/booking/MyBookings';
import { BookingDashboard } from '@/components/booking/BookingDashboard';
import { formatPriceAED } from '@/lib/price-formatter';
import { ImageViewer } from '@/components/ui/image-viewer';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { PackagesOffersBooking } from '@/components/booking/PackagesOffersBooking';

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
  // MOBILE: Quick view sheet for room details/amenities
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewRoom, setQuickViewRoom] = useState<Room | null>(null);
  const [partyPricing, setPartyPricing] = useState({
    title: 'Birthday Bash pricing',
    weekday_text: 'Weekdays (Mon-Thu): AED 199 / kid',
    weekend_text: 'Weekends (Fri-Sun): AED 235 / kid',
  });
  const [partyPricingLoading, setPartyPricingLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const chatParam = searchParams.get('chat');
  const allowedTabs = useMemo(
    () => ['rooms', 'packages', 'parties', 'my-bookings', ...(isDemoMode ? ['dashboard'] : [])],
    [isDemoMode]
  );
  const [activeTab, setActiveTab] = useState(
    tabParam && allowedTabs.includes(tabParam) ? tabParam : 'rooms'
  );

  useEffect(() => {
    if (activeTab === 'packages') {
      const packagesSection = document.getElementById('packages-offers');
      if (packagesSection) {
        packagesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [activeTab]);

  useEffect(() => {
    fetchRooms();
  }, []);

  useEffect(() => {
    const loadPartyPricing = async () => {
      setPartyPricingLoading(true);
      const { data } = await supabase
        .from('party_pricing_content')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();
      if (data) {
        setPartyPricing({
          title: data.title || 'Birthday Bash pricing',
          weekday_text: data.weekday_text || 'Weekdays (Mon-Thu): AED 199 / kid',
          weekend_text: data.weekend_text || 'Weekends (Fri-Sun): AED 235 / kid',
        });
      }
      setPartyPricingLoading(false);
    };
    loadPartyPricing();
  }, []);

  useEffect(() => {
    if (chatParam) {
      navigate(`/booking/chat/${chatParam}`, { replace: true });
    }
  }, [chatParam, navigate]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (nextTab && allowedTabs.includes(nextTab) && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, allowedTabs, activeTab]);

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

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const params = new URLSearchParams(searchParams);
    params.set('tab', value);
    setSearchParams(params, { replace: true });
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
    <div className="container mx-auto px-4 py-8 overflow-x-hidden">
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
          <Button
            variant="outline"
            onClick={() => {
              if (!user) {
                toast({ title: 'Please sign in', description: 'Sign in to chat with us', variant: 'destructive' });
                navigate('/auth');
                return;
              }
              navigate('/support');
            }}
            className="gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Chat with us
          </Button>
        </div>
      </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList
          className="w-full flex flex-wrap gap-2 justify-center md:grid md:gap-0"
          style={{ gridTemplateColumns: `repeat(${isDemoMode ? 5 : 4}, minmax(0, 1fr))` }}
        >
          <TabsTrigger value="rooms" className="px-3 py-2 text-xs sm:text-sm sm:px-4">Gaming Rooms</TabsTrigger>
          <TabsTrigger value="parties" className="px-3 py-2 text-xs sm:text-sm sm:px-4">Organize Party</TabsTrigger>
          <TabsTrigger value="packages" className="px-3 py-2 text-xs sm:text-sm sm:px-4">Packages &amp; Offers</TabsTrigger>
          <TabsTrigger value="my-bookings" className="px-3 py-2 text-xs sm:text-sm sm:px-4 hidden md:inline-flex">My Bookings</TabsTrigger>
          {isDemoMode && (
            <TabsTrigger value="dashboard" className="px-3 py-2 text-xs sm:text-sm sm:px-4">Staff Dashboard</TabsTrigger>
          )}
        </TabsList>
        <div className="md:hidden flex justify-center">
          <Button
            variant={activeTab === 'my-bookings' ? 'default' : 'outline'}
            size="sm"
            className="w-full max-w-xs mt-2"
            onClick={() => handleTabChange('my-bookings')}
          >
            My Bookings
          </Button>
        </div>

        <TabsContent value="rooms" className="space-y-6">
          {/* MOBILE: 2-column grid, square thumbnails, compact content */}
          <div className="grid grid-cols-2 gap-4 md:hidden">
            {rooms.map((room) => (
              <Card
                key={room.id}
                className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 overflow-hidden"
                onClick={() => {
                  setQuickViewRoom(room);
                  setQuickViewOpen(true);
                }}
              >
                {room.image_url && (
                  <div className="aspect-square w-full overflow-hidden">
                    <img
                      src={room.image_url}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate" title={room.name}>{room.name}</CardTitle>
                    <Badge variant={room.type === 'vip' ? 'default' : 'secondary'} className="text-[11px]">
                      {room.type.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>Up to {room.capacity} players</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatPriceAED(room.hourly_rate)}/hour</span>
                    </div>
                  </div>
                  <Button onClick={(e) => { e.stopPropagation(); handleBookRoom(room); }} className="w-full h-9 text-sm">Book</Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop grid */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    <div className="flex items-center gap-2 text-xs">
                      <Users className="h-4 w-4" />
                      Up to {room.capacity} players
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-4 w-4" />
                      {formatPriceAED(room.hourly_rate)}/hour
                    </div>
                  </div>

                  <Button onClick={() => handleBookRoom(room)} className="w-full h-9 text-sm">Book</Button>
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
              <div className="mt-3 rounded-lg border border-dashed border-border/70 bg-muted/40 p-3 space-y-1">
                <div className="text-sm font-semibold">{partyPricing.title}</div>
                <p className="text-sm text-muted-foreground">{partyPricing.weekday_text}</p>
                <p className="text-sm text-muted-foreground">{partyPricing.weekend_text}</p>
                {partyPricingLoading && (
                  <p className="text-xs text-muted-foreground">Refreshing pricing...</p>
                )}
              </div>
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

        <TabsContent value="packages" className="space-y-6">
          <PackagesOffersBooking />
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

      {/* MOBILE: Quick View Sheet for Room Amenities */}
      <Sheet open={quickViewOpen} onOpenChange={setQuickViewOpen}>
        <SheetContent side="bottom" className="md:hidden h-[85vh] p-0">
          {quickViewRoom && (
            <div className="flex flex-col h-full">
              {quickViewRoom.image_url && (
                <div className="aspect-square w-full overflow-hidden">
                  <img
                    src={quickViewRoom.image_url}
                    alt={quickViewRoom.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-4 space-y-3 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-lg">{quickViewRoom.name}</SheetTitle>
                </SheetHeader>
                <div className="flex items-center justify-between">
                  <Badge variant={quickViewRoom.type === 'vip' ? 'default' : 'secondary'} className="text-[11px]">
                    {quickViewRoom.type.toUpperCase()}
                  </Badge>
                  <div className="text-sm">{formatPriceAED(quickViewRoom.hourly_rate)}/hour</div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{quickViewRoom.description}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Amenities</p>
                  <div className="flex flex-wrap gap-1">
                    {quickViewRoom.amenities.map((amenity, index) => (
                      <Badge key={index} variant="outline" className="text-[11px]">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="p-4 border-t mt-auto">
                <Button className="w-full h-10" onClick={() => { handleBookRoom(quickViewRoom); setQuickViewOpen(false); }}>Book</Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
