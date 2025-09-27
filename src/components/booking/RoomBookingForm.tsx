import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ChatDialog } from '@/components/chat/ChatDialog';

interface Room {
  id: string;
  name: string;
  type: string;
  capacity: number;
  hourly_rate: number;
  description: string;
  amenities: string[];
}

interface RoomBookingFormProps {
  room: Room;
  onBack: () => void;
}

const timeSlots = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export function RoomBookingForm({ room, onBack }: RoomBookingFormProps) {
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const calculateEndTime = (start: string, hours: number) => {
    const [startHour, startMin] = start.split(':').map(Number);
    const endHour = startHour + hours;
    return `${endHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
  };

  const calculateTotal = () => {
    if (!duration) return 0;
    return room.hourly_rate * parseInt(duration);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !startTime || !duration) return;

    setIsSubmitting(true);

    try {
      const endTime = calculateEndTime(startTime, parseInt(duration));
      const totalAmount = calculateTotal();

      const { error } = await supabase
        .from('room_bookings')
        .insert({
          user_id: user.id,
          room_id: room.id,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          duration_hours: parseInt(duration),
          total_amount: totalAmount,
          notes,
          contact_phone: contactPhone,
          contact_email: contactEmail,
        });

      if (error) throw error;

      toast({
        title: "Booking confirmed!",
        description: `Your ${room.name} booking has been confirmed.`,
      });

      onBack();
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Rooms
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Book {room.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(date) => date < new Date()}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((hours) => (
                          <SelectItem key={hours} value={hours.toString()}>
                            {hours} hour{hours > 1 ? 's' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Your phone number"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Your email address"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special requests or notes..."
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={!date || !startTime || !duration || isSubmitting}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Booking'}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowChat(true)}
                  className="w-full"
                  disabled={!user}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat with Booking Team
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Room:</span>
                  <span className="font-medium">{room.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span>{room.capacity} players</span>
                </div>
                <div className="flex justify-between">
                  <span>Rate:</span>
                  <span>${room.hourly_rate}/hour</span>
                </div>
                {date && (
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{format(date, "MMM dd, yyyy")}</span>
                  </div>
                )}
                {startTime && duration && (
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{startTime} - {calculateEndTime(startTime, parseInt(duration))}</span>
                  </div>
                )}
                {duration && (
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{duration} hour{parseInt(duration) > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              
              <hr />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>${calculateTotal()}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span>Payment coming soon</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-semibold">Room Amenities</h3>
            <div className="space-y-1">
              {room.amenities.map((amenity, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  {amenity}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showChat && (
        <ChatDialog
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          conversationType="room_booking"
          referenceId={room.id}
          title={`${room.name} - Booking Support`}
        />
      )}
    </div>
  );
}