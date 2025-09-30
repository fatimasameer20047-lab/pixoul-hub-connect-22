import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Upload, Users, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RoomPhotoUploadDialog } from '@/components/booking/RoomPhotoUploadDialog';
import { BookingDashboard } from '@/components/booking/BookingDashboard';

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

export default function StaffRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Room Management</h1>
          <p className="text-muted-foreground">Manage room details and bookings</p>
        </div>
        <Button onClick={() => setShowPhotoUpload(true)} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Set Room Photos
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <Card key={room.id}>
            {room.image_url && (
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={room.image_url} 
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{room.name}</CardTitle>
                <Badge variant={room.type === 'vip' ? 'default' : 'secondary'}>
                  {room.type.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{room.description}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Capacity: {room.capacity}
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  ${room.hourly_rate}/hour
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Edit Details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <BookingDashboard />

      <RoomPhotoUploadDialog
        open={showPhotoUpload}
        onOpenChange={setShowPhotoUpload}
        onUploadComplete={fetchRooms}
      />
    </div>
  );
}
