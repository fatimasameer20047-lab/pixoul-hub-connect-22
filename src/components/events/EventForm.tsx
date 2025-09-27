import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, Users, DollarSign, Upload, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Event {
  id?: string;
  title: string;
  description: string;
  type: 'event' | 'program';
  category?: string;
  event_date: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  max_participants?: number;
  price: number;
  location?: string;
  instructor?: string;
  requirements?: string[];
  image_url?: string;
}

interface EventFormProps {
  event?: Event;
  onBack: () => void;
  onSuccess: () => void;
}

const timeSlots = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00'
];

export function EventForm({ event, onBack, onSuccess }: EventFormProps) {
  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    type: event?.type || 'event' as 'event' | 'program',
    category: event?.category || '',
    location: event?.location || '',
    instructor: event?.instructor || '',
    price: event?.price?.toString() || '0',
    maxParticipants: event?.max_participants?.toString() || '',
    durationMinutes: event?.duration_minutes?.toString() || '',
    requirements: event?.requirements?.join('\n') || '',
  });
  
  const [eventDate, setEventDate] = useState<Date | undefined>(
    event?.event_date ? new Date(event.event_date) : undefined
  );
  const [startTime, setStartTime] = useState(event?.start_time || '');
  const [endTime, setEndTime] = useState(event?.end_time || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isDemoMode || !eventDate) return;

    setIsSubmitting(true);

    try {
      const eventData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category || null,
        event_date: format(eventDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime || null,
        duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
        max_participants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
        price: parseFloat(formData.price),
        location: formData.location || null,
        instructor: formData.instructor || null,
        requirements: formData.requirements ? formData.requirements.split('\n').filter(r => r.trim()) : null,
        is_active: true,
      };

      let error;
      if (event?.id) {
        // Update existing event
        const { error: updateError } = await supabase
          .from('events_programs')
          .update(eventData)
          .eq('id', event.id);
        error = updateError;
      } else {
        // Create new event
        const { error: insertError } = await supabase
          .from('events_programs')
          .insert(eventData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: event?.id ? "Event updated!" : "Event created!",
        description: event?.id ? "The event has been updated successfully." : "The event has been created successfully.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error saving event",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Button 
        variant="ghost" 
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Events
      </Button>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {event?.id ? 'Edit Event' : 'Create New Event/Program'}
          </CardTitle>
          <p className="text-muted-foreground">
            {event?.id ? 'Update the event details below' : 'Fill out the details to create a new event or program'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter event title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={(value: 'event' | 'program') => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="program">Program</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  placeholder="e.g., Workshop, Tournament, Training"
                />
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Event location"
                />
              </div>

              <div className="space-y-2">
                <Label>Event Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !eventDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {eventDate ? format(eventDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select start time" />
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
                <Label>End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select end time" />
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
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => handleInputChange('durationMinutes', e.target.value)}
                  placeholder="e.g., 120"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Participants</Label>
                <Input
                  type="number"
                  value={formData.maxParticipants}
                  onChange={(e) => handleInputChange('maxParticipants', e.target.value)}
                  placeholder="Maximum number of participants"
                />
              </div>

              <div className="space-y-2">
                <Label>Price (USD/AED) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Instructor</Label>
                <Input
                  value={formData.instructor}
                  onChange={(e) => handleInputChange('instructor', e.target.value)}
                  placeholder="Instructor name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of the event..."
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => handleInputChange('requirements', e.target.value)}
                placeholder="Enter each requirement on a new line..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Enter each requirement on a separate line</p>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Price Display</h3>
              <p className="text-sm text-muted-foreground">
                Price will be displayed in both USD and AED (converted automatically) to customers.
                {formData.price && (
                  <span className="block mt-1">
                    Display: ${formData.price} USD / {(parseFloat(formData.price) * 3.67).toFixed(2)} AED
                  </span>
                )}
              </p>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                !formData.title || 
                !formData.description || 
                !eventDate || 
                !startTime ||
                isSubmitting
              }
            >
              {isSubmitting ? (event?.id ? 'Updating...' : 'Creating...') : (event?.id ? 'Update Event' : 'Create Event')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}