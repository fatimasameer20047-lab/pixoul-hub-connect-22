import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Calendar, Clock, DollarSign, MapPin, User, Phone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';
import { formatPriceAED } from '@/lib/price-formatter';
import { isPhoneValid } from '@/components/booking/booking-validators';
import { useNavigate } from 'react-router-dom';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  category?: string;
  event_date: string;
  start_time: string;
  end_time?: string;
  start_date?: string | null;
  end_date?: string | null;
  duration_minutes?: number;
  price?: number | null;
  contact_phone?: string | null;
  location?: string;
  instructor?: string;
  requirements?: string[];
  image_url?: string;
  is_active: boolean;
}

interface EventDetailProps {
  event: Event;
  onBack: () => void;
  onRegistrationComplete: () => void;
}

interface ExistingRegistration {
  id: string;
  participant_name: string;
  participant_email: string | null;
  contact_phone: string | null;
  party_size: number | null;
  notes: string | null;
  status?: string | null;
  cancelled_at?: string | null;
}

export function EventDetail({ event, onBack, onRegistrationComplete }: EventDetailProps) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    participantName: '',
    participantEmail: '',
    participantPhone: '',
    partySize: '1',
    notes: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [existingRegistration, setExistingRegistration] = useState<ExistingRegistration | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showProgramPrompt, setShowProgramPrompt] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const navigate = useNavigate();

  const parseStoredPhone = (phoneValue?: string | null) => {
    if (!phoneValue) return '';
    const digits = phoneValue.replace(/\D/g, '');
    return digits.startsWith('971') ? digits.slice(3, 12) : digits.slice(0, 9);
  };

  const eventPrice = useMemo(
    () => (event.type === 'program' ? event.price || 0 : 0),
    [event.price, event.type]
  );
  const comparisonDate =
    event.type === 'program'
      ? event.end_date || event.start_date || null
      : event.event_date;
  const isEventPast = comparisonDate
    ? isBefore(parseISO(comparisonDate), startOfDay(new Date()))
    : false;

  const fetchExistingRegistration = async () => {
    if (!user) {
      setExistingRegistration(null);
      setRegistrationData({
        participantName: '',
        participantEmail: '',
        participantPhone: '',
        partySize: '1',
        notes: '',
      });
      return;
    }

    const { data, error } = await supabase
      .from('event_registrations')
      .select('id, participant_name, participant_email, contact_phone, party_size, notes, status, cancelled_at')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking registration status:', error);
      return;
    }

    if (data) {
      setExistingRegistration(data as ExistingRegistration);
      setRegistrationData({
        participantName: data.participant_name,
        participantEmail: data.participant_email || '',
        participantPhone: parseStoredPhone(data.contact_phone),
        partySize: data.party_size?.toString() || '1',
        notes: data.notes || '',
      });
      setRegistrationId(data.id);
    } else {
      setExistingRegistration(null);
      setRegistrationData({
        participantName: '',
        participantEmail: '',
        participantPhone: '',
        partySize: '1',
        notes: '',
      });
      setRegistrationId(null);
    }
  };

  useEffect(() => {
    fetchExistingRegistration();
  }, [event.id, user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`event-reg-${event.id}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_registrations',
          filter: `event_id=eq.${event.id}`,
        },
        () => {
          fetchExistingRegistration();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, user?.id]);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isRegistered) return;
    setPhoneError(null);

    if (!isPhoneValid(registrationData.participantPhone)) {
      setPhoneError('Enter a valid UAE mobile number (e.g., 50xxxxxxx).');
      return;
    }

    setIsRegistering(true);

    try {
      const partySize = Math.max(1, parseInt(registrationData.partySize) || 1);
      const totalAmount = eventPrice * partySize;

    // Create registration with unpaid status
    const { data: registration, error } = await supabase
      .from('event_registrations')
      .upsert({
        user_id: user.id,
        event_id: event.id,
        participant_name: registrationData.participantName,
        participant_email: registrationData.participantEmail || null,
        contact_phone: `+971${registrationData.participantPhone}`,
        party_size: partySize,
        notes: registrationData.notes,
        payment_status: 'unpaid',
        status: 'confirmed',
        amount_paid: totalAmount,
        cancelled_at: null,
        cancelled_by: null,
      }, { onConflict: 'event_id,user_id' })
      .select()
      .single();

      if (error) throw error;
      setExistingRegistration(registration as ExistingRegistration);

      if (eventPrice > 0) {
        // If event has a price, open checkout dialog
        setRegistrationId(registration.id);
        setShowCheckout(true);
      } else {
        // Free event - confirm immediately
        await supabase
          .from('event_registrations')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed',
            cancelled_at: null,
            cancelled_by: null,
          })
          .eq('id', registration.id);

        toast({
          title: "Registration successful!",
          description: "You've been registered for this event.",
        });

        setShowRegistrationForm(false);
        onRegistrationComplete();
        fetchExistingRegistration();
      }
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Already registered",
          description: "You're already registered for this event.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Registration failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleCheckoutSuccess = () => {
    toast({
      title: "Payment successful!",
      description: "Your event registration is confirmed.",
    });
    setShowRegistrationForm(false);
    setShowCheckout(false);
    onRegistrationComplete();
    fetchExistingRegistration();
  };

  const handleInputChange = (field: string, value: string) => {
    setRegistrationData(prev => ({ ...prev, [field]: value }));
  };

  const handleCancelRegistration = async () => {
    if (!existingRegistration || !user) return;
    const confirmCancel = window.confirm('Cancel your registration for this event?');
    if (!confirmCancel) return;

    try {
      setIsCancelling(true);
      const { error } = await supabase
        .from('event_registrations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id
        })
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Registration cancelled",
        description: "You can register again at any time.",
      });

      setShowCheckout(false);
      setShowRegistrationForm(false);
      onRegistrationComplete();
      fetchExistingRegistration();
    } catch (error: any) {
      toast({
        title: "Unable to cancel registration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const isRegistered = Boolean(existingRegistration && existingRegistration.status === 'confirmed');
  const partySizeNumber = Math.max(1, parseInt(registrationData.partySize) || 1);

  if (showRegistrationForm) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={() => setShowRegistrationForm(false)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Event
        </Button>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Register for {event.title}</CardTitle>
            <p className="text-muted-foreground">
              {format(parseISO(event.event_date), 'MMMM dd, yyyy')} at {event.start_time}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegistration} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Participant Name *</Label>
                  <Input
                    value={registrationData.participantName}
                    onChange={(e) => handleInputChange('participantName', e.target.value)}
                    placeholder="Enter participant name"
                    required
                    disabled={isRegistered}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input
                    type="email"
                    value={registrationData.participantEmail}
                    onChange={(e) => handleInputChange('participantEmail', e.target.value)}
                    placeholder="Enter email address"
                    disabled={isRegistered}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contact Phone *</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-input bg-muted text-sm text-muted-foreground select-none">
                      +971
                    </span>
                    <Input
                      type="tel"
                      inputMode="numeric"
                      value={registrationData.participantPhone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                        handleInputChange('participantPhone', digits);
                        if (phoneError && isPhoneValid(digits)) {
                          setPhoneError(null);
                        }
                      }}
                      placeholder="5xxxxxxxx"
                      className="rounded-l-none"
                      required
                      disabled={isRegistered}
                    />
                  </div>
                  {phoneError && (
                    <div className="flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span>{phoneError}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Party Size</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={registrationData.partySize}
                    onChange={(e) => handleInputChange('partySize', e.target.value)}
                    disabled={isRegistered}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={registrationData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any special requirements or notes..."
                    rows={3}
                    disabled={isRegistered}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Registration Summary</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Event:</span>
                    <span>{event.title}</span>
                  </div>
                  {event.type === 'event' && (
                    <div className="flex justify-between">
                      <span>Date:</span>
                      <span>{format(parseISO(event.event_date), 'MMM dd, yyyy')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>{event.type === 'program' ? 'Start Date:' : 'Time:'}</span>
                    <span>{event.start_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Party Size:</span>
                    <span>{partySizeNumber} {partySizeNumber === 1 ? 'person' : 'people'}</span>
                  </div>
                  {eventPrice > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatPriceAED(eventPrice * partySizeNumber)}</span>
                    </div>
                  )}
                </div>
              </div>

              {isRegistered ? (
                <div className="space-y-2">
                  <Button 
                    type="button" 
                    className="w-full" 
                    variant="secondary"
                    onClick={() => setShowRegistrationForm(false)}
                  >
                    Registered
                  </Button>
                  <Button 
                    type="button" 
                    className="w-full" 
                    variant="outline"
                    onClick={handleCancelRegistration}
                    disabled={isCancelling}
                  >
                    {isCancelling ? 'Cancelling...' : 'Cancel Registration'}
                  </Button>
                </div>
              ) : (
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={
                    !registrationData.participantName ||
                    !isPhoneValid(registrationData.participantPhone) ||
                    isRegistering
                  }
                >
                  {isRegistering ? 'Registering...' : (event.price > 0 ? 'Proceed to Payment' : 'Complete Registration')}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {registrationId && showCheckout && (
          <CheckoutDialog
            open={showCheckout}
            onOpenChange={setShowCheckout}
            type="event"
            referenceId={registrationId}
            amount={eventPrice * partySizeNumber}
            itemName={event.title}
            description={`Event registration for ${partySizeNumber} ${partySizeNumber === 1 ? 'person' : 'people'}`}
            onSuccess={handleCheckoutSuccess}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          onClick={onBack}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              {event.image_url && (
                <div className="w-full h-64 overflow-hidden">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant={event.type === 'event' ? 'default' : 'secondary'}>
                        {event.type}
                      </Badge>
                      {event.category && (
                        <Badge variant="outline">{event.category}</Badge>
                      )}
                      {isEventPast && (
                        <Badge variant="outline">Past Event</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {event.type === 'event' && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(parseISO(event.event_date), 'MMMM dd, yyyy')}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span className="capitalize">
                      {event.type === 'program' ? 'Start Date:' : 'Start Time:'}
                    </span>
                    <span>{event.start_time}</span>
                    {event.type === 'program' && event.duration_minutes && ` (${event.duration_minutes}min)`}
                  </div>
                  {event.type === 'program' && eventPrice > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {formatPriceAED(eventPrice)} per person
                    </div>
                  )}
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  {event.instructor && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {event.instructor}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{event.description}</p>
                </div>

                {event.type === 'program' && event.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>If interested, contact: {event.contact_phone}</span>
                  </div>
                )}

                {event.requirements && event.requirements.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Requirements</h3>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {event.requirements.map((req, index) => (
                        <li key={index}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!user ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">Please sign in to register for this event.</p>
                    <Button variant="outline" className="w-full">
                      Sign In
                    </Button>
                  </div>
                ) : isEventPast ? (
                  <div className="text-center">
                    <p className="text-muted-foreground">This event has already passed.</p>
                  </div>
                ) : (
                  <>
                    <Button 
                      onClick={() => {
                        if (event.type === 'program') {
                          setShowProgramPrompt(true);
                        } else {
                          setShowRegistrationForm(true);
                        }
                      }}
                      className="w-full"
                      variant={isRegistered ? 'secondary' : 'default'}
                    >
                      {isRegistered ? 'Registered' : 'Register Now'}
                    </Button>
                    {event.type === 'program' && eventPrice > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Payment will be processed after registration
                      </p>
                    )}
                    {showProgramPrompt && event.type === 'program' && (
                      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          To register for this program, please chat with our staff to confirm details and payment.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button
                            className="sm:flex-1"
                            onClick={() => {
                              const prefill = `Hi, I want to register for the program ${event.title} on ${event.event_date || event.start_date || 'TBD'} at ${event.start_time}. Please share the details and payment steps. ID: ${event.id}`;
                              navigate('/support', { state: { prefillMessage: prefill } });
                            }}
                          >
                            Chat with staff
                          </Button>
                          <Button
                            variant="outline"
                            className="sm:flex-1"
                            onClick={() => setShowProgramPrompt(false)}
                          >
                            Back
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
