import React, { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RoomPhotoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: () => void;
}

const ROOM_MAPPING = [
  { index: 1, name: 'PC Room 1', id: 'pc-room-1' },
  { index: 2, name: 'PC Room 2', id: 'pc-room-2' },
  { index: 3, name: 'PC Room 3', id: 'pc-room-3' },
  { index: 4, name: 'PC Room 4', id: 'pc-room-4' },
  { index: 5, name: 'Event Hall', id: 'event-hall' },
  { index: 6, name: 'Social Gaming Room', id: 'social-gaming-room' },
  { index: 7, name: 'VIP Room 1', id: 'vip-room-1' },
  { index: 8, name: 'VIP Room 2', id: 'vip-room-2' },
];

export function RoomPhotoUploadDialog({ open, onOpenChange, onUploadComplete }: RoomPhotoUploadDialogProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 8) {
      toast({
        title: "Too many files",
        description: "Please select up to 8 images maximum",
        variant: "destructive",
      });
      return;
    }
    setSelectedFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      // Upload files to storage and update room records
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const roomMapping = ROOM_MAPPING[i];
        
        if (roomMapping) {
          // Upload to storage
          const fileName = `${roomMapping.id}-${Date.now()}.jpg`;
          const { error: uploadError } = await supabase.storage
            .from('rooms')
            .upload(fileName, file);

          if (uploadError) {
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('rooms')
            .getPublicUrl(fileName);

          // Update room record
          const { error: updateError } = await supabase
            .from('rooms')
            .update({ image_url: publicUrl })
            .eq('name', roomMapping.name);

          if (updateError) {
            throw updateError;
          }
        }
      }

      toast({
        title: "Photos uploaded successfully",
        description: `Updated ${selectedFiles.length} room photos`,
      });
      
      setSelectedFiles([]);
      onUploadComplete();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Set Room Photos</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            Upload up to 8 images. They will be mapped by upload order to:
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            {ROOM_MAPPING.map((room) => (
              <div key={room.index} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                  {room.index}
                </span>
                {room.name}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="room-photos" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                  <p className="mb-2 text-sm text-muted-foreground">
                    <span className="font-medium">Click to upload</span> room photos
                  </p>
                  <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB each</p>
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
                <h4 className="font-medium">Selected Files ({selectedFiles.length}/8):</h4>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <Card key={index} className="p-2">
                      <CardContent className="flex items-center justify-between p-0">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              → {ROOM_MAPPING[index]?.name || 'Not mapped'}
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={selectedFiles.length === 0 || uploading}
            >
              {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Photos`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}