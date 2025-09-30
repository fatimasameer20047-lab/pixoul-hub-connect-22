import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface RoomEditDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RoomEditDialog({ room, open, onOpenChange, onSuccess }: RoomEditDialogProps) {
  const [name, setName] = useState(room?.name || '');
  const [type, setType] = useState(room?.type || 'pc');
  const [capacity, setCapacity] = useState(room?.capacity.toString() || '');
  const [hourlyRate, setHourlyRate] = useState(room?.hourly_rate.toString() || '');
  const [description, setDescription] = useState(room?.description || '');
  const [amenities, setAmenities] = useState(room?.amenities.join(', ') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Update form when room changes
  useState(() => {
    if (room) {
      setName(room.name);
      setType(room.type);
      setCapacity(room.capacity.toString());
      setHourlyRate(room.hourly_rate.toString());
      setDescription(room.description);
      setAmenities(room.amenities.join(', '));
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          name,
          type,
          capacity: parseInt(capacity),
          hourly_rate: parseFloat(hourlyRate),
          description,
          amenities: amenities.split(',').map(a => a.trim()).filter(a => a),
        })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: "Room updated",
        description: "Room details have been updated successfully.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error updating room",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Room Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Room Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Room Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pc">PC</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                required
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                required
                min="0"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amenities">Amenities (comma-separated)</Label>
            <Textarea
              id="amenities"
              value={amenities}
              onChange={(e) => setAmenities(e.target.value)}
              placeholder="High-end gaming PCs, Ultra-wide monitors, RGB lighting"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
