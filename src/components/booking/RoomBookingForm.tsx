import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MessageCircle, AlertCircle } from 'lucide-react';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { buildTimeSlots, getBusinessHours, isPhoneValid } from './booking-validators';

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

const isTimeInFuture = (selectedDate: Date, timeSlot: string): boolean => {
  const now = new Date();
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotDateTime = new Date(selectedDate);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Add 30 minute buffer for same-day bookings
  const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);
  return slotDateTime > bufferTime;
};

interface AvailableSlot {
  start_time: string;
  end_time: string;
}

export function RoomBookingForm({ room, onBack }: RoomBookingFormProps) {
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [bookedSlots, setBookedSlots] = useState<{start_time: string, end_time: string}[]>([]);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [contactEmailError, setContactEmailError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch available/booked slots when date changes
  useEffect(() => {
    if (date && room.id) {
      fetchAvailability();
    }
  }, [date, room.id]);

  // Subscribe to real-time booking updates
  useEffect(() => {
    if (!date || !room.id) return;

    const channel = supabase
      .channel('room-availability')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_bookings',
          filter: `room_id=eq.${room.id}`
        },
        () => {
          fetchAvailability();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, room.id]);

  const fetchAvailability = async () => {
    if (!date) return;

    try {
      const { data, error } = await supabase.rpc('get_confirmed_room_slots', {
        p_room_id: room.id,
        p_booking_date: format(date, 'yyyy-MM-dd'),
      });

      if (error) throw error;

      setBookedSlots((data as any) || []);
    } catch (error: any) {
      console.error('Error fetching availability:', error);
    }
  };

  const isTimeSlotAvailable = (time: string, durationHours: number, targetDate: Date | undefined = date) => {
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + (durationHours * 60);

    const { close } = getBusinessHours(targetDate);
    if (endMinutes > close * 60) {
      return false;
    }

    if (!bookedSlots.length) return true;

    return !bookedSlots.some(booking => {
      const [bookingStartHours, bookingStartMins] = booking.start_time.split(':').map(Number);
      const [bookingEndHours, bookingEndMins] = booking.end_time.split(':').map(Number);
      
      const bookingStart = bookingStartHours * 60 + bookingStartMins;
      const bookingEnd = bookingEndHours * 60 + bookingEndMins;

      // Check for overlap: new.start < existing.end AND new.end > existing.start
      return startMinutes < bookingEnd && endMinutes > bookingStart;
    });
  };

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
    setPhoneError(null);
    setContactEmailError(null);

    // Check if time is in the future
    if (!isTimeInFuture(date, startTime)) {
      setConflictError('Selected time must be at least 30 minutes in the future.');
      return;
    }

    const durationHours = parseInt(duration);
    const { close } = getBusinessHours(date);
    const [startHour] = startTime.split(':').map(Number);
    if (startHour + durationHours > close) {
      setConflictError('Selected time extends past closing hours.');
      return;
    }

    if (!isPhoneValid(contactPhone)) {
      setPhoneError('Enter a valid UAE mobile number (e.g., 50xxxxxxx).');
      return;
    }

    if (!contactEmail.trim()) {
      const message = 'Contact email is required.';
      setContactEmailError(message);
      toast({
        title: 'Missing contact email',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    // Check availability before submitting
    if (!isTimeSlotAvailable(startTime, durationHours)) {
      setConflictError('This time slot is no longer available. Please choose another time.');
      return;
    }

    setIsSubmitting(true);
    setConflictError(null);

    try {
      const endTime = calculateEndTime(startTime, durationHours);
      const totalAmount = calculateTotal();

      const { data, error } = await supabase
        .rpc('create_room_booking_safe', {
          p_user_id: user.id,
          p_room_id: room.id,
          p_booking_date: format(date, 'yyyy-MM-dd'),
          p_start_time: startTime,
          p_end_time: endTime,
          p_duration_hours: durationHours,
          p_total_amount: totalAmount,
          p_status: 'pending',
          p_payment_status: 'unpaid',
          p_notes: notes,
          p_contact_phone: `971${contactPhone}`,
          p_contact_email: contactEmail,
          p_booking_source: 'room',
          p_package_label: null,
        })
        .single();

      if (error) {
        const overlapMessage = 'This time slot is already booked. Please choose another time.';
        if (
          error.code === '23P01' ||
          error.message?.includes('TIME_SLOT_ALREADY_BOOKED') ||
          error.message?.includes('not available') ||
          error.message?.includes('conflicts with key') ||
          error.message?.includes('room_bookings_no_overlap_per_room')
        ) {
          setConflictError(overlapMessage);
          toast({
            title: 'Time slot unavailable',
            description: overlapMessage,
            variant: 'destructive',
          });
          return;
        }
        throw error;
      }

      setBookingId(data.id);
      setShowCheckout(true);
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
    <div className="container mx-auto px-4 py-6">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Rooms
      </Button>

      {/* MOBILE: Comfortable 1-col form layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Book {room.name}</CardTitle>
            </CardHeader>
            <CardContent>
              {conflictError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{conflictError}</AlertDescription>
                </Alert>
              )}
              
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
                          onSelect={(newDate) => {
                            setDate(newDate);
                            setStartTime('');
                            setDuration('');
                            setConflictError(null);
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const checkDate = new Date(date);
                            checkDate.setHours(0, 0, 0, 0);
                            return checkDate < today;
                          }}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Select 
                      value={startTime} 
                      onValueChange={(value) => {
                        setStartTime(value);
                        setConflictError(null);
                      }}
                      disabled={!date}
                    >
                    <SelectTrigger>
                      <SelectValue placeholder={date ? "Select time" : "Select date first"} />
                    </SelectTrigger>
                    <SelectContent>
                        {buildTimeSlots(date, parseInt(duration) || 1).map((time) => {
                          const durationNum = parseInt(duration) || 1;
                          const available = isTimeSlotAvailable(time, durationNum);
                          const isFuture = date ? isTimeInFuture(date, time) : true;
                          const isEnabled = available && isFuture;
                          return (
                            <SelectItem 
                              key={time} 
                              value={time}
                              disabled={!isEnabled}
                            >
                              {time} {!isEnabled && '(Unavailable)'}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>

                  <div className="space-y-2">
                    <Label>Duration (hours)</Label>
                    <Select 
                      value={duration} 
                      onValueChange={(value) => {
                        setDuration(value);
                        setConflictError(null);
                      }}
                      disabled={!date}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={date ? "Select duration" : "Select date first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((hours) => {
                          const available = startTime ? isTimeSlotAvailable(startTime, hours) : true;
                          return (
                            <SelectItem 
                              key={hours} 
                              value={hours.toString()}
                              disabled={!available}
                            >
                              {hours} hour{hours > 1 ? 's' : ''} {!available && '(Unavailable)'}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-input bg-muted text-sm text-muted-foreground select-none">
                        +971
                      </span>
                      <Input
                        type="tel"
                        inputMode="numeric"
                        value={contactPhone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\\D/g, '').slice(0, 9);
                          setContactPhone(digits);
                          if (phoneError && isPhoneValid(digits)) {
                            setPhoneError(null);
                          }
                        }}
                        placeholder="5xxxxxxxx"
                        className="rounded-l-none"
                      />
                    </div>
                    {phoneError && (
                      <p className="text-sm text-destructive">{phoneError}</p>
                    )}
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Contact Email</Label>
                    <Input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => {
                        setContactEmail(e.target.value);
                        if (contactEmailError && e.target.value.trim()) {
                          setContactEmailError(null);
                        }
                      }}
                      placeholder="Your email address"
                    />
                    {contactEmailError && (
                      <p className="text-sm text-destructive">{contactEmailError}</p>
                    )}
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
                  disabled={!date || !startTime || !duration || isSubmitting || !isPhoneValid(contactPhone) || !contactEmail.trim()}
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Booking'}
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
                  <span>AED {room.hourly_rate}/hour</span>
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
                <span>AED {calculateTotal()}</span>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Payment required to confirm booking</p>
                <p>• Time slot reserved after payment</p>
                <p>• Includes 5% VAT</p>
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

      {bookingId && (
        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          type="booking"
          referenceId={bookingId}
          amount={calculateTotal()}
          itemName={`${room.name} Booking`}
          description={`${format(date!, 'PPP')} at ${startTime} for ${duration} hours`}
          onSuccess={() => {
            toast({
              title: "Booking confirmed!",
              description: `Your ${room.name} booking has been confirmed.`,
            });
            onBack();
          }}
        />
      )}
    </div>
  );
}


