import React, { useState } from 'react';
import { ArrowLeft, Calendar, Clock, X, ImageIcon, Phone, Plus } from 'lucide-react';
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
import { useStaff } from '@/contexts/StaffContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatPriceAED } from '@/lib/price-formatter';

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
  price?: number | null;
  contact_phone?: string | null;
  start_date?: string | null;
  end_date?: string | null;
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

class EventFormErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Event form render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="container mx-auto px-4 py-12">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
            <h3 className="text-lg font-semibold text-destructive mb-2">Unable to load event form</h3>
            <p className="text-sm text-muted-foreground">
              Please refresh and try again. If the problem persists, contact an administrator.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
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
    price: event?.price?.toString() || '',
    contactPhone: event?.contact_phone || '',
    durationMinutes: event?.duration_minutes?.toString() || '',
    requirements: event?.requirements?.join('\n') || '',
  });
  
  const [eventDate, setEventDate] = useState<Date | undefined>(
    event?.event_date ? new Date(event.event_date) : undefined
  );
  const [programStartDate, setProgramStartDate] = useState<Date | undefined>(
    event?.start_date ? new Date(event.start_date) : undefined
  );
  const [programEndDate, setProgramEndDate] = useState<Date | undefined>(
    event?.end_date ? new Date(event.end_date) : undefined
  );
  const [startTime, setStartTime] = useState(event?.start_time || '');
  const [endTime, setEndTime] = useState(event?.end_time || '');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(event?.image_url || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { user } = useAuth();
  const { canManageEvents } = useStaff();
  const { toast } = useToast();
  const isProgram = formData.type === 'program';
  const isEvent = formData.type === 'event';

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = async () => {
    if (event?.image_url && event?.id) {
      try {
        const imagePath = event.image_url.split('/events/')[1];
        if (imagePath) {
          const { error } = await supabase.storage.from('events').remove([imagePath]);
          if (error) throw error;
        }
        
        const { error: updateError } = await supabase
          .from('events_programs')
          .update({ image_url: null })
          .eq('id', event.id);
        
        if (updateError) throw updateError;
        
        toast({
          title: "Image removed",
          description: "Event image has been removed successfully.",
        });
      } catch (error: any) {
        toast({
          title: "Error removing image",
          description: error.message,
          variant: "destructive",
        });
      }
    }
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadImage = async (eventId: string): Promise<string | null> => {
    if (!selectedImage) return null;

    setIsUploadingImage(true);
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${eventId}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('events')
        .upload(filePath, selectedImage, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('events')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !canManageEvents) return;
    const isProgram = formData.type === 'program';
    if (!isProgram && !eventDate) return;
    if (isProgram && (!programStartDate || !programEndDate)) return;

    setIsSubmitting(true);

    try {
      const isProgram = formData.type === 'program';
      const parsedPrice = isProgram ? parseFloat(formData.price || '0') : null;

      const baseData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        category: formData.category || null,
        price: parsedPrice,
        contact_phone: isProgram ? formData.contactPhone : null,
        location: formData.location || null,
        instructor: formData.instructor || null,
        requirements: formData.requirements ? formData.requirements.split('\n').filter(r => r.trim()) : null,
        is_active: true,
        max_participants: null,
      };

      const scheduleData = isProgram
        ? {
            start_date: programStartDate ? format(programStartDate, 'yyyy-MM-dd') : null,
            end_date: programEndDate ? format(programEndDate, 'yyyy-MM-dd') : null,
            duration_minutes: formData.durationMinutes ? parseInt(formData.durationMinutes) : null,
          }
        : {
            event_date: eventDate ? format(eventDate, 'yyyy-MM-dd') : null,
            start_time: startTime,
            end_time: endTime || null,
          };

      const cleanup = isProgram
        ? { event_date: null, start_time: null, end_time: null }
        : { start_date: null, end_date: null, duration_minutes: null };

      const eventData = { ...baseData, ...scheduleData, ...cleanup };

      let eventId = event?.id;
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
        const { data: newEvent, error: insertError } = await supabase
          .from('events_programs')
          .insert(eventData)
          .select()
          .single();
        error = insertError;
        eventId = newEvent?.id;
      }

      if (error) throw error;

      // Upload image if one was selected
      if (selectedImage && eventId) {
        const imageUrl = await uploadImage(eventId);
        if (imageUrl) {
          const { error: imageError } = await supabase
            .from('events_programs')
            .update({ image_url: imageUrl })
            .eq('id', eventId);
          
          if (imageError) throw imageError;
        }
      }

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

  if (!canManageEvents) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground">You don't have permission to manage events.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EventFormErrorBoundary>
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

              {formData.type === 'event' && (
                <>
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
                </>
              )}

              {formData.type === 'program' && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !programStartDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {programStartDate ? format(programStartDate, "PPP") : "Pick a start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={programStartDate}
                          onSelect={setProgramStartDate}
                          disabled={(date) => date < new Date()}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !programEndDate && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {programEndDate ? format(programEndDate, "PPP") : "Pick an end date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={programEndDate}
                          onSelect={setProgramEndDate}
                          disabled={(date) => date < new Date()}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              )}

              {formData.type === 'program' && (
              <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.durationMinutes}
                    onChange={(e) => handleInputChange('durationMinutes', e.target.value)}
                    placeholder="e.g., 120"
                />
              </div>
              )}

              {formData.type === 'program' && (
                <>
                  <div className="space-y-2">
                    <Label>Price (AED) *</Label>
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
                    <Label>Contact Phone *</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.contactPhone}
                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                        placeholder="+971XXXXXXXXX"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

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
              <Label>Cover Image (optional)</Label>
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Event cover" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="event-image"
                  />
                  <label htmlFor="event-image" className="cursor-pointer">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Click to upload cover image
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 5MB
                    </p>
                  </label>
                </div>
              )}
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

            {formData.type === 'program' && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Price Display</h3>
                <p className="text-sm text-muted-foreground">
                  Price will be displayed in AED to customers.
                  {formData.price && (
                    <span className="block mt-1">
                      Display: {formatPriceAED(parseFloat(formData.price))}
                    </span>
                  )}
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                !formData.title || 
                !formData.description || 
                (isEvent && (!eventDate || !startTime)) ||
                (isProgram && (!programStartDate || !programEndDate)) ||
                (isProgram && (!formData.price || !formData.contactPhone)) ||
                isSubmitting ||
                isUploadingImage
              }
            >
              {isSubmitting || isUploadingImage ? (event?.id ? 'Updating...' : 'Creating...') : (event?.id ? 'Update Event' : 'Create Event')}
            </Button>
          </form>
        </CardContent>
      </Card>
      </div>
    </EventFormErrorBoundary>
  );
}
