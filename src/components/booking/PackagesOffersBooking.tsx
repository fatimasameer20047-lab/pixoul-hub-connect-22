import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatPriceAEDUSD } from '@/lib/price-formatter';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Check, MessageCircle } from 'lucide-react';
import { packageGroups, PackageGroup } from '@/lib/package-catalog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';
import { format } from 'date-fns';
import { buildTimeSlots, getBusinessHours, isPhoneValid } from './booking-validators';

type PackageSelection = {
  group: PackageGroup;
  item: PackageGroup['items'][number];
  option: PackageGroup['items'][number]['options'][number];
};

type DbPackageRow = {
  id: string;
  group_key: string;
  group_title: string;
  group_subtitle: string | null;
  package_name: string;
  option_label: string;
  duration_hours: number;
  price: number;
  description: string | null;
  sort_order: number;
};

type RoomRecord = {
  id: string;
  name: string;
  type: string;
  capacity: number;
  hourly_rate: number;
  amenities?: string[];
};

const isTimeInFuture = (selectedDate: Date, timeSlot: string): boolean => {
  const now = new Date();
  const [hours, minutes] = timeSlot.split(':').map(Number);
  const slotDateTime = new Date(selectedDate);
  slotDateTime.setHours(hours, minutes, 0, 0);
  
  // Add 30 minute buffer for same-day bookings
  const bufferTime = new Date(now.getTime() + 30 * 60 * 1000);
  return slotDateTime > bufferTime;
};

const calculateEndTime = (start: string, hours: number) => {
  const [startHour, startMin] = start.split(':').map(Number);
  const endHour = startHour + hours;
  return `${endHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}`;
};

function resolveRoomType(itemId: string, groupId: string) {
  if (groupId === 'social-gaming' || itemId.includes('social')) return 'social';
  if (itemId.includes('vip')) return 'vip';
  return 'standard';
}

export function PackagesOffersBooking() {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<PackageSelection | null>(null);
  const [packages, setPackages] = useState<PackageGroup[]>(packageGroups);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const buildGroupsFromRows = useCallback((rows: DbPackageRow[]): PackageGroup[] => {
    if (!rows?.length) return [];

    const groupMap = new Map<string, PackageGroup>();
    const itemMap = new Map<string, PackageGroup['items'][number]>();

    const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    rows.forEach((row) => {
      const groupId = row.group_key || slugify(row.group_title || 'group');
      const existingGroup = groupMap.get(groupId);
      if (!existingGroup) {
        groupMap.set(groupId, {
          id: groupId,
          title: row.group_title || row.group_key,
          subtitle: row.group_subtitle || '',
          items: [],
        });
      }
      const itemKey = `${groupId}-${slugify(row.package_name)}`;
      let item = itemMap.get(itemKey);
      if (!item) {
        item = {
          id: itemKey,
          name: row.package_name,
          description: row.description || '',
          options: [],
        };
        itemMap.set(itemKey, item);
        groupMap.get(groupId)!.items.push(item);
      }
      item.options.push({
        id: row.id,
        label: row.option_label,
        durationHours: row.duration_hours,
        price: Number(row.price),
        menuItemId: row.id,
      });
    });

    return Array.from(groupMap.values());
  }, []);

  const loadPackages = useCallback(async () => {
    setLoadingPackages(true);
    setPackagesError(null);
    const { data, error } = await supabase
      .from('booking_packages')
      .select('*')
      .eq('is_active', true)
      .order('group_key', { ascending: true })
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading booking packages', error);
      setPackagesError('Unable to load packages right now.');
      setPackages(packageGroups);
    } else {
      const groups = buildGroupsFromRows((data as DbPackageRow[]) || []);
      setPackages(groups.length ? groups : packageGroups);
    }
    setLoadingPackages(false);
  }, [buildGroupsFromRows]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const handleSelect = async (group: PackageGroup, item: PackageGroup['items'][number], option: PackageGroup['items'][number]['options'][number]) => {
    if (!user) {
      toast({
        title: 'Please sign in to book packages',
        description: 'Log in to continue with booking.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setSelectedOptions((prev) => ({ ...prev, [item.id]: option.id }));
    setSelection({ group, item, option });
  };

  if (selection) {
    return (
      <PackageBookingForm
        selection={selection}
        onBack={() => setSelection(null)}
      />
    );
  }

  return (
    <div id="packages-offers" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Packages &amp; Offers
          </h2>
          <p className="text-muted-foreground">Book bundles directly from the Booking page.</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => navigate('/booking?tab=rooms')}
        >
          Back to Rooms
        </Button>
      </div>

      {packagesError && (
        <Alert variant="destructive">
          <AlertDescription>{packagesError}</AlertDescription>
        </Alert>
      )}

      {loadingPackages ? (
        <div className="text-sm text-muted-foreground">Loading packages...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {packages.map((group) => (
          <Card
            key={group.id}
            className="group hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 overflow-hidden"
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span>{group.title}</span>
                <Badge variant="secondary">{group.subtitle}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border/60 p-4 bg-muted/40 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <p className="font-semibold leading-tight">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                    </div>
                    {selectedOptions[item.id] ? (
                      <Badge variant="default" className="flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Selected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Choose option</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {item.options.map((option) => {
                      const isSelected = selectedOptions[item.id] === option.id;
                      return (
                        <Button
                          key={option.id}
                          variant={isSelected ? 'default' : 'outline'}
                          className="flex-1 min-w-[150px] justify-between"
                          onClick={() => handleSelect(group, item, option)}
                        >
                          <span>{option.label}</span>
                          <span className="font-semibold">{formatPriceAEDUSD(option.price)}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground bg-muted/30">
        <p>
          Packages now follow the booking flow for rooms. Pick a package to choose your date, time, and pay to confirm.
        </p>
        <p className="mt-2">
          Need a custom bundle? Choose the closest option and leave details during booking.
        </p>
      </div>
    </div>
  );
}

function PackageBookingForm({ selection, onBack }: { selection: PackageSelection; onBack: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [notes, setNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [room, setRoom] = useState<RoomRecord | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<{ start_time: string; end_time: string }[]>([]);

  const durationHours = selection.option.durationHours || 1;
  const totalAmount = selection.option.price;
  const packageLabel = `${selection.item.name} - ${selection.option.label}`;

  const fetchRoom = useCallback(async () => {
    const targetType = resolveRoomType(selection.item.id, selection.group.id);
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('type', targetType)
        .order('name')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: fallback, error: fallbackError } = await supabase
          .from('rooms')
          .select('*')
          .order('name')
          .limit(1)
          .maybeSingle();
        if (fallbackError) throw fallbackError;
        if (fallback) setRoom(fallback as RoomRecord);
      } else {
        setRoom(data as RoomRecord);
      }
    } catch (error: any) {
      console.error('Error fetching room for package booking', error);
      toast({
        title: 'Unable to start booking',
        description: 'Please try again shortly.',
        variant: 'destructive',
      });
    }
  }, [selection.group.id, selection.item.id, toast]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    const loadBookings = async () => {
      if (!date || !room?.id) return;
      try {
        const { data, error } = await supabase
          .from('room_bookings')
          .select('start_time, end_time')
          .eq('room_id', room.id)
          .eq('booking_date', format(date, 'yyyy-MM-dd'))
          .eq('status', 'confirmed');

        if (error) throw error;
        setBookedSlots(data || []);
      } catch (error: any) {
        console.error('Error fetching availability:', error);
      }
    };
    loadBookings();
  }, [date, room?.id]);

  const isTimeSlotAvailable = (time: string, hours: number, targetDate: Date | undefined = date) => {
    const [hoursPart, minutes] = time.split(':').map(Number);
    const startMinutes = hoursPart * 60 + minutes;
    const endMinutes = startMinutes + hours * 60;

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
      return startMinutes < bookingEnd && endMinutes > bookingStart;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !date || !startTime || !room?.id) return;
    setPhoneError(null);

    if (!isTimeInFuture(date, startTime)) {
      setConflictError('Selected time must be at least 30 minutes in the future.');
      return;
    }

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

    if (!isTimeSlotAvailable(startTime, durationHours)) {
      setConflictError('This time slot is no longer available. Please choose another time.');
      return;
    }

    setIsSubmitting(true);
    setConflictError(null);

    try {
      const endTime = calculateEndTime(startTime, durationHours);

      const { data, error } = await supabase
        .from('room_bookings')
        .insert({
          user_id: user.id,
          room_id: room.id,
          booking_date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          duration_hours: durationHours,
          total_amount: totalAmount,
          status: 'pending',
          payment_status: 'unpaid',
          booking_source: 'package',
          package_label: packageLabel,
          notes,
          contact_phone: `971${contactPhone}`,
          contact_email: contactEmail,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23P01' || error.message.includes('not available')) {
          setConflictError('This time slot is no longer available. Please choose another time.');
          return;
        }
        throw error;
      }

      setBookingId(data.id);
      setShowCheckout(true);
    } catch (error: any) {
      toast({
        title: 'Booking failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Packages
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Book {packageLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              {conflictError && (
                <Alert variant="destructive" className="mb-4">
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
                            'justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={date}
                          onSelect={(newDate) => {
                            setDate(newDate);
                            setStartTime('');
                            setConflictError(null);
                          }}
                          disabled={(dateValue) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const checkDate = new Date(dateValue);
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
                        <SelectValue placeholder={date ? 'Select time' : 'Select date first'} />
                      </SelectTrigger>
                      <SelectContent>
                        {buildTimeSlots(date, durationHours).map((time) => {
                          const available = isTimeSlotAvailable(time, durationHours);
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

                  <div className="space-y-2 md:col-span-2">
                    <Label>Package Duration</Label>
                    <Input value={`${durationHours} hour${durationHours > 1 ? 's' : ''}`} disabled />
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
                  disabled={!date || !startTime || isSubmitting || !room || !isPhoneValid(contactPhone)}
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
                  <span>Package:</span>
                  <span className="font-medium">{packageLabel}</span>
                </div>
                {room && (
                  <div className="flex justify-between">
                    <span>Room Type:</span>
                    <span className="capitalize">{room.type}</span>
                  </div>
                )}
                {date && (
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{format(date, 'MMM dd, yyyy')}</span>
                  </div>
                )}
                {startTime && (
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{startTime} - {calculateEndTime(startTime, durationHours)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Duration:</span>
                  <span>{durationHours} hour{durationHours > 1 ? 's' : ''}</span>
                </div>
              </div>

              <hr />

              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatPriceAEDUSD(totalAmount)}</span>
              </div>

              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Payment required to confirm booking</p>
                <p>• Time slot reserved after payment</p>
                <p>• Includes 5% VAT</p>
              </div>
            </CardContent>
          </Card>

          {room?.amenities?.length ? (
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
          ) : null}
        </div>
      </div>

      {bookingId && (
        <CheckoutDialog
          open={showCheckout}
          onOpenChange={setShowCheckout}
          type="booking"
          referenceId={bookingId}
          amount={totalAmount}
          itemName={packageLabel}
          description={`${format(date!, 'PPP')} at ${startTime} for ${durationHours} hours`}
          onSuccess={() => {
            toast({
              title: 'Booking confirmed!',
              description: `Your booking for ${packageLabel} has been confirmed.`,
            });
            onBack();
          }}
        />
      )}
    </div>
  );
}
