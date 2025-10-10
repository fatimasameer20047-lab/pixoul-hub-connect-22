import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RoomPhotoManagerProps {
  roomId: string;
  currentImageUrl: string | null;
  onPhotoUpdated: () => void;
}

export function RoomPhotoManager({ roomId, currentImageUrl, onPhotoUpdated }: RoomPhotoManagerProps) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${roomId}-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('rooms')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('rooms')
        .getPublicUrl(fileName);

      // Update room with new image URL
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ image_url: publicUrl })
        .eq('id', roomId);

      if (updateError) throw updateError;

      toast({
        title: "Photo updated",
        description: "Room photo has been updated successfully.",
      });

      onPhotoUpdated();
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

  const handleRemove = async () => {
    setUploading(true);
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ image_url: null })
        .eq('id', roomId);

      if (error) throw error;

      toast({
        title: "Photo removed",
        description: "Room photo has been removed.",
      });

      onPhotoUpdated();
    } catch (error: any) {
      toast({
        title: "Remove failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Label>Room Cover Photo</Label>
      
      {currentImageUrl ? (
        <div className="space-y-2">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
            <img 
              src={currentImageUrl} 
              alt="Room cover"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
              disabled={uploading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Remove Photo
            </Button>
            <label htmlFor="replace-photo" className="flex-1">
              <Button
                type="button"
                variant="secondary"
                disabled={uploading}
                className="w-full"
                onClick={() => document.getElementById('replace-photo')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Replace Photo
              </Button>
            </label>
            <input
              id="replace-photo"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
            />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center w-full">
          <label htmlFor="upload-photo" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Click to upload</span> cover photo
              </p>
            </div>
            <input
              id="upload-photo"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleUpload}
            />
          </label>
        </div>
      )}
    </div>
  );
}
