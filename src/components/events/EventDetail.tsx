import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, Users, DollarSign, MapPin, User, MessageCircle } from 'lucide-react';
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
import { ChatDialog } from '@/components/chat/ChatDialog';
import { CheckoutDialog } from '@/components/payment/CheckoutDialog';
import { formatPriceAEDUSD } from '@/lib/price-formatter';

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  category?: string;
  event_date: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  max_participants?: number;
  current_participants: number;
  price: number;
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

export function EventDetail({ event, onBack, onRegistrationComplete }: EventDetailProps) {
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [registrationData, setRegistrationData] = useState({
    participantName: '',
    participantEmail: '',
    partySize: '1',
    notes: '',
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const isEventFull = event.max_participants && event.current_participants >= event.max_participants;
  const isEventPast = isBefore(parseISO(event.event_date), startOfDay(new Date()));
  const canRegister = user && !isEventFull && !isEventPast;

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsRegistering(true);

    try {
      const partySize = parseInt(registrationData.partySize);
      const totalAmount = event.price * partySize;

      // Create registration with unpaid status
      const { data: registration, error } = await supabase
        .from('event_registrations')
        .insert({
          user_id: user.id,
          event_id: event.id,
          participant_name: registrationData.participantName,
          participant_email: registrationData.participantEmail,
          party_size: partySize,
          notes: registrationData.notes,
          payment_status: 'unpaid',
          status: 'pending',
          amount_paid: totalAmount,
        })
        .select()
        .single();

      if (error) throw error;

      if (event.price > 0) {
        // If event has a price, open checkout dialog
        setRegistrationId(registration.id);
        setShowCheckout(true);
      } else {
        // Free event - confirm immediately
        await supabase
          .from('event_registrations')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed' 
          })
          .eq('id', registration.id);

        toast({
          title: "Registration successful!",
          description: "You've been registered for this event.",
        });

        setShowRegistrationForm(false);
        onRegistrationComplete();
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
  };

  const handleInputChange = (field: string, value: string) => {
    setRegistrationData(prev => ({ ...prev, [field]: value }));
  };

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
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={registrationData.participantEmail}
                    onChange={(e) => handleInputChange('participantEmail', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Party Size</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={registrationData.partySize}
                    onChange={(e) => handleInputChange('partySize', e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Additional Notes</Label>
                  <Textarea
                    value={registrationData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Any special requirements or notes..."
                    rows={3}
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
                  <div className="flex justify-between">
                    <span>Date:</span>
                    <span>{format(parseISO(event.event_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{event.start_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Party Size:</span>
                    <span>{registrationData.partySize} {parseInt(registrationData.partySize) === 1 ? 'person' : 'people'}</span>
                  </div>
                  {event.price > 0 && (
                    <div className="flex justify-between font-semibold">
                      <span>Total:</span>
                      <span>{formatPriceAEDUSD(event.price * parseInt(registrationData.partySize))}</span>
                    </div>
                  )}
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={!registrationData.participantName || !registrationData.participantEmail || isRegistering}
              >
                {isRegistering ? 'Registering...' : (event.price > 0 ? 'Proceed to Payment' : 'Complete Registration')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {registrationId && showCheckout && (
          <CheckoutDialog
            open={showCheckout}
            onOpenChange={setShowCheckout}
            type="event"
            referenceId={registrationId}
            amount={event.price * parseInt(registrationData.partySize)}
            itemName={event.title}
            description={`Event registration for ${registrationData.partySize} ${parseInt(registrationData.partySize) === 1 ? 'person' : 'people'}`}
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
                      {isEventFull && !isEventPast && (
                        <Badge variant="destructive">Full</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(event.event_date), 'MMMM dd, yyyy')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {event.start_time}
                    {event.duration_minutes && ` (${event.duration_minutes}min)`}
                  </div>
                  {event.max_participants && (
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {event.current_participants}/{event.max_participants} participants
                    </div>
                  )}
                  {event.price > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      {formatPriceAEDUSD(event.price)} per person
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
                ) : isEventFull ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">This event is currently full.</p>
                    <Button variant="outline" className="w-full">
                      Join Waitlist
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button 
                      onClick={() => setShowRegistrationForm(true)}
                      className="w-full"
                    >
                      Register Now
                    </Button>
                    {event.price > 0 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Payment will be processed after registration
                      </p>
                    )}
                  </>
                )}

                <Button
                  variant="outline"
                  onClick={() => setShowChat(true)}
                  className="w-full"
                  disabled={!user}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Contact Organizer
                </Button>
              </CardContent>
            </Card>

            {event.max_participants && (
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Registered:</span>
                      <span>{event.current_participants}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Available:</span>
                      <span>{event.max_participants - event.current_participants}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((event.current_participants / event.max_participants) * 100, 100)}%`
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showChat && (
        <ChatDialog
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          conversationType="event_organizer"
          referenceId={event.id}
          title={`${event.title} - Contact Organizer`}
        />
      )}
    </>
  );
}