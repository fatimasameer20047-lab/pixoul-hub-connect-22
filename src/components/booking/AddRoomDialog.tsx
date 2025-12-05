import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddRoomDialog({ open, onOpenChange, onSuccess }: AddRoomDialogProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState('pc');
  const [capacity, setCapacity] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [description, setDescription] = useState('');
  const [amenities, setAmenities] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      toast({
        title: "Too many files",
        description: "Maximum 5 photos allowed",
        variant: "destructive",
      });
      return;
    }
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create room first
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name,
          type,
          capacity: parseInt(capacity),
          hourly_rate: parseFloat(hourlyRate),
          description,
          amenities: amenities.split(',').map(a => a.trim()).filter(a => a),
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Upload photos if any
      if (selectedFiles.length > 0) {
        const uploadedUrls: string[] = [];
        
        for (const file of selectedFiles) {
          const fileName = `${room.id}-${Date.now()}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('rooms')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('rooms')
            .getPublicUrl(fileName);

          uploadedUrls.push(publicUrl);
        }

        // Set first image as cover
        if (uploadedUrls.length > 0) {
          await supabase
            .from('rooms')
            .update({ image_url: uploadedUrls[0] })
            .eq('id', room.id);
        }
      }

      toast({
        title: "Room created",
        description: "New room has been added successfully.",
      });

      // Reset form
      setName('');
      setType('pc');
      setCapacity('');
      setHourlyRate('');
      setDescription('');
      setAmenities('');
      setSelectedFiles([]);
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* MOBILE: Constrain dialog width and add comfortable scrolling */}
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* MOBILE: Single column form on small screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <SelectItem value="console">Console</SelectItem>
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
              <Label htmlFor="hourlyRate">Hourly Rate (AED)</Label>
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

          <div className="space-y-2">
            <Label>Room Photos (1-5 images)</Label>
            <div className="flex items-center justify-center w-full">
              <label htmlFor="room-photos" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">Click to upload</span> room photos
                  </p>
                </div>
                <input 
                  id="room-photos" 
                  type="file" 
                  className="hidden" 
                  multiple 
                  accept="image/*"
                  onChange={handleFileSelect}
                />
              </label>
            </div>
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Selected: {selectedFiles.length} photos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="relative border rounded p-2 flex items-center gap-2">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="sm:min-w-[10rem]">
              {isSubmitting ? 'Creating...' : 'Create Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
