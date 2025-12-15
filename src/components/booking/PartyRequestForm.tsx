import React, { useState } from 'react';
import { ArrowLeft, Users, Calendar, Phone, Mail, MessageCircle } from 'lucide-react';
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

interface PartyRequestFormProps {
  onBack: () => void;
}

const timeSlots = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

export function PartyRequestForm({ onBack }: PartyRequestFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    partyType: '',
    age: '',
    schoolName: '',
    guestCount: '',
    theme: '',
    specialNotes: '',
    contactPhone: '',
    contactEmail: '',
  });
  const [preferredDate, setPreferredDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !preferredDate) return;

    // Validate conditional fields
    if (formData.partyType === 'birthday' && !formData.age) {
      toast({
        title: "Age required",
        description: "Please enter the age for birthday parties",
        variant: "destructive",
      });
      return;
    }

    if (formData.partyType === 'graduation' && !formData.schoolName) {
      toast({
        title: "School/University required", 
        description: "Please enter the school or university name for graduation parties",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('party_requests')
        .insert({
          user_id: user.id,
          name: formData.name,
          party_type: formData.partyType,
          age: formData.partyType === 'birthday' && formData.age ? parseInt(formData.age) : null,
          school_name: formData.partyType === 'graduation' ? formData.schoolName : null,
          preferred_date: format(preferredDate, 'yyyy-MM-dd'),
          preferred_time_start: startTime || null,
          preferred_time_end: endTime || null,
          guest_count: parseInt(formData.guestCount),
          theme: formData.theme,
          special_notes: formData.specialNotes,
          contact_phone: formData.contactPhone,
          contact_email: formData.contactEmail,
        });

      if (error) throw error;

      toast({
        title: "Party request submitted!",
        description: "Our team will review your request and get back to you soon.",
      });

      onBack();
    } catch (error: any) {
      toast({
        title: "Submission failed",
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
        Back to Booking
      </Button>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Organize a Party
          </CardTitle>
          <p className="text-muted-foreground">
            Fill out the details below and our team will help you plan the perfect event
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Party Host Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter the host's name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Party Type *</Label>
                <Select 
                  value={formData.partyType} 
                  onValueChange={(value) => {
                    handleInputChange('partyType', value);
                    // Clear conditional fields when party type changes
                    handleInputChange('age', '');
                    handleInputChange('schoolName', '');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select party type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday</SelectItem>
                    <SelectItem value="graduation">Graduation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.partyType === 'birthday' && (
                <div className="space-y-2">
                  <Label>Age *</Label>
                  <Input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    placeholder="Age being celebrated"
                    required
                  />
                </div>
              )}

              {formData.partyType === 'graduation' && (
                <div className="space-y-2">
                  <Label>School/University Name *</Label>
                  <Input
                    type="text"
                    value={formData.schoolName}
                    onChange={(e) => handleInputChange('schoolName', e.target.value)}
                    placeholder="Enter school or university name"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Number of Guests *</Label>
                <Input
                  type="number"
                  value={formData.guestCount}
                  onChange={(e) => handleInputChange('guestCount', e.target.value)}
                  placeholder="Expected number of guests"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !preferredDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {preferredDate ? format(preferredDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={preferredDate}
                      onSelect={setPreferredDate}
                      disabled={(date) => date < new Date()}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Preferred Start Time</Label>
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
                <Label>Preferred End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
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
                <Label>Theme/Style</Label>
                <Input
                  value={formData.theme}
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                  placeholder="e.g., Sci-Fi, Fantasy, Neon, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Contact Phone *</Label>
                <Input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                  placeholder="Your phone number"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Contact Email *</Label>
                <Input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                  placeholder="Your email address"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Special Notes</Label>
                <Textarea
                  value={formData.specialNotes}
                  onChange={(e) => handleInputChange('specialNotes', e.target.value)}
                  placeholder="Any special requests, dietary restrictions, accessibility needs, or other details..."
                  rows={4}
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Our team will review your request within 24 hours</li>
                <li>• We'll contact you to discuss pricing and availability</li>
                <li>• Custom party packages will be created based on your needs</li>
                <li>• You can chat with our staff through your booking details</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={
                !formData.name || 
                !formData.partyType || 
                !formData.guestCount || 
                !formData.contactPhone || 
                !formData.contactEmail || 
                !preferredDate ||
                (formData.partyType === 'birthday' && !formData.age) ||
                (formData.partyType === 'graduation' && !formData.schoolName) ||
                isSubmitting
              }
            >
              {isSubmitting ? 'Submitting Request...' : 'Submit Party Request'}
            </Button>

          </form>
        </CardContent>
      </Card>

    </div>
  );
}
