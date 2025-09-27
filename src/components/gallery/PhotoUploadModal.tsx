import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File, visibility: 'private' | 'public', caption: string) => Promise<void>;
}

export default function PhotoUploadModal({ isOpen, onClose, onUpload }: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setStep('details');
    }
  };

  const handlePost = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onUpload(selectedFile, visibility, caption);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset form
      setSelectedFile(null);
      setCaption('');
      setVisibility('private');
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setCaption('');
      setVisibility('private');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Photo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* File picker */}
          <div className="space-y-2">
            <Label htmlFor="photo-upload">Select Photo</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              {selectedFile ? (
                <div className="space-y-2">
                  <ImageIcon className="h-8 w-8 mx-auto text-primary" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSelectedFile(null)}
                    disabled={isUploading}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div>
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <span className="text-primary hover:text-primary/80 font-medium">
                        Click to upload
                      </span>
                      <span className="text-muted-foreground"> or drag and drop</span>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 20MB</p>
                </div>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </div>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="Write a caption for your photo..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={300}
              disabled={isUploading}
              className="min-h-[80px]"
            />
            <div className="text-xs text-muted-foreground text-right">
              {caption.length}/300
            </div>
          </div>

          {/* Visibility */}
          <div className="space-y-3">
            <Label>Visibility</Label>
            <RadioGroup 
              value={visibility} 
              onValueChange={(value: 'private' | 'public') => setVisibility(value)}
              disabled={isUploading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer">
                  <EyeOff className="h-4 w-4" />
                  <div>
                    <div>Private</div>
                    <div className="text-xs text-muted-foreground">Only you can see this photo</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="flex items-center gap-2 cursor-pointer">
                  <Eye className="h-4 w-4" />
                  <div>
                    <div>Public</div>
                    <div className="text-xs text-muted-foreground">Visible in community gallery</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Upload progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePost}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Post Photo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}