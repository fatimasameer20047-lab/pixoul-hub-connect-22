import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Eye, EyeOff, Upload, Image as ImageIcon } from 'lucide-react';
// Cropper removed for simple posting

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (feedFile: File, thumbFile: File, visibility: 'private' | 'public', caption: string) => Promise<void>;
}

export default function PhotoUploadModal({ isOpen, onClose, onUpload }: PhotoUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<'select' | 'details'>('select');
  const [uploadProgress, setUploadProgress] = useState(0);
  // No crop/export step; generate on post
  const [exported, setExported] = useState<null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic validation
      setError(null);
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Unsupported file type. Use JPG, PNG, or WEBP.');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('Large image selected. We will compress it on upload.');
      }

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

      // Generate feed + thumbnail directly from selected file
      const { generateFeedAndThumbFromFile } = await import('@/lib/image-utils');
      const { feed, thumb } = await generateFeedAndThumbFromFile(selectedFile, 1080, 320);

      let feedBlob = feed;

      // Optionally recompress if still too large (> ~8MB)
      const maxBytes = 8 * 1024 * 1024;
      if (feedBlob.size > maxBytes) {
        const recompressed = await recompress(feedBlob, 0.8);
        feedBlob = recompressed.size < feedBlob.size ? recompressed : feedBlob;
      }

      // Build Files from processed blobs
      const time = Date.now();
      const feedName = `${time}_feed.jpg`;
      const thumbName = `${time}_thumb.jpg`;
      const feedFile = new File([feedBlob], feedName, { type: 'image/jpeg' });
      const thumbFile = new File([thumb], thumbName, { type: 'image/jpeg' });

      // Wrap onUpload to upload feed size; Then also upload thumb via the same handler by convention
      // We only pass feed file to DB; storage uploads of both will be handled in page's onUpload
      // Combine files via DataTransfer-like approach is not supported; adjust onUpload implementation to accept feed file
      // For now, upload feed file via onUpload, then upload thumbnail via direct storage on the page after resolve if needed.
      await onUpload(feedFile, thumbFile, visibility, caption);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset form
      setSelectedFile(null);
      setCaption('');
      setVisibility('private');
      setExported(null);
      setStep('select');
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  async function recompress(blob: Blob, quality = 0.8): Promise<Blob> {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return blob;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0);
      const out: Blob = await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), 'image/jpeg', quality));
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

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
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to 8MB (we will compress if needed)</p>
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
            {error && <div className="text-xs text-amber-600">{error}</div>}
          </div>

          {/* No cropper step: go straight to details */}

          {/* Caption */}
          {step === 'details' && (
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
          )}

          {/* Visibility */}
          {step === 'details' && (
          <div className="space-y-3">
            <Label>Visibility</Label>
            <p className="text-sm text-muted-foreground">
              All photos require staff approval before being published
            </p>
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
                    <div>Submit for Approval</div>
                    <div className="text-xs text-muted-foreground">Will be visible after staff approval</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          )}

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
