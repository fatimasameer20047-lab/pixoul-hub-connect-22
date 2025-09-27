import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Camera, Users, User, Upload, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import PhotoCard from '@/components/gallery/PhotoCard';
import PhotoDetail from '@/components/gallery/PhotoDetail';
import PhotoUploadModal from '@/components/gallery/PhotoUploadModal';
import CommunityPhotoCard from '@/components/gallery/CommunityPhotoCard';

interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  visibility: 'private' | 'public';
  created_at: string;
  user_id: string;
  author_name?: string;
  user_has_liked?: boolean;
  like_count?: number;  
  comment_count?: number;
  avatar_color?: string;
}

interface PhotoStats {
  [photoId: string]: {
    likes: number;
    comments: number;
  };
}

export default function Gallery() {
  const { user } = useAuth();
  const userId = user?.id || 'guest';
  
  const [myPhotos, setMyPhotos] = useState<GalleryItem[]>([]);
  const [communityPhotos, setCommunityPhotos] = useState<GalleryItem[]>([]);
  const [photoStats, setPhotoStats] = useState<PhotoStats>({});
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [isPhotoDetailOpen, setIsPhotoDetailOpen] = useState(false);
  const [myFilter, setMyFilter] = useState<'all' | 'private' | 'public'>('all');

  const fetchMyPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMyPhotos((data || []).map(item => ({
        ...item,
        visibility: item.visibility as 'private' | 'public',
        caption: item.caption || '',
        comment_count: item.comment_count || 0
      })));
    } catch (error) {
      console.error('Error fetching my photos:', error);
    }
  };

  const fetchCommunityPhotos = async () => {
    try {
      // First get the public gallery items
      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });
      
      if (galleryError) throw galleryError;
      
      if (!galleryData || galleryData.length === 0) {
        setCommunityPhotos([]);
        return;
      }
      
      // Get user profiles
      const userIds = [...new Set(galleryData.map(item => item.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, name, avatar_color')
        .in('user_id', userIds);
        
      if (profilesError) throw profilesError;
      
      // Get likes for current user
      const { data: likesData, error: likesError } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .in('photo_id', galleryData.map(item => item.id))
        .eq('user_id', userId);
        
      if (likesError) throw likesError;
      
      // Create profile lookup
      const profileLookup = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Create likes lookup
      const likesLookup = new Set((likesData || []).map(like => like.photo_id));
      
      setCommunityPhotos(galleryData.map(item => {
        const profile = profileLookup[item.user_id];
        const authorName = profile?.full_name || profile?.name || 
          (item.user_id ? `user${item.user_id.slice(-4)}` : 'Anonymous');
        
        return {
          ...item,
          visibility: item.visibility as 'private' | 'public',
          caption: item.caption || '',
          author_name: authorName,
          user_has_liked: likesLookup.has(item.id),
          avatar_color: profile?.avatar_color || '#6366F1',
          like_count: item.like_count || 0,
          comment_count: item.comment_count || 0
        };
      }));
    } catch (error) {
      console.error('Error fetching community photos:', error);
    }
  };

  const fetchPhotoStats = async () => {
    try {
      // Get all photo IDs
      const allPhotos = [...myPhotos, ...communityPhotos];
      const photoIds = allPhotos.map(p => p.id);
      
      if (photoIds.length === 0) return;

      // Fetch likes count
      const { data: likesData, error: likesError } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .in('photo_id', photoIds);

      // Fetch comments count  
      const { data: commentsData, error: commentsError } = await supabase
        .from('photo_comments')
        .select('photo_id')
        .in('photo_id', photoIds);

      if (likesError) throw likesError;
      if (commentsError) throw commentsError;

      // Calculate stats
      const stats: PhotoStats = {};
      photoIds.forEach(photoId => {
        stats[photoId] = {
          likes: likesData?.filter(like => like.photo_id === photoId).length || 0,
          comments: commentsData?.filter(comment => comment.photo_id === photoId).length || 0,
        };
      });

      setPhotoStats(stats);
    } catch (error) {
      console.error('Error fetching photo stats:', error);
    }
  };

  useEffect(() => {
    fetchMyPhotos();
    fetchCommunityPhotos();
  }, [userId]);

  useEffect(() => {
    fetchPhotoStats();
  }, [myPhotos, communityPhotos]);

  const handleUpload = async (file: File, visibility: 'private' | 'public', caption: string) => {
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('gallery')
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('gallery_items')
        .insert({
          user_id: userId,
          url: publicUrl,
          visibility,
          caption
        });

      if (dbError) throw dbError;

      toast.success('Photo uploaded successfully!');
      
      // Refresh photos
      await fetchMyPhotos();
      if (visibility === 'public') {
        await fetchCommunityPhotos();
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
      throw error;
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // Get the photo to find the storage path
      const photo = myPhotos.find(p => p.id === photoId);
      if (!photo) return;

      // Extract file path from URL
      const urlParts = photo.url.split('/');
      const filePath = urlParts.slice(-2).join('/'); // userId/filename

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('gallery')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('gallery_items')
        .delete()
        .eq('id', photoId);

      if (dbError) throw dbError;

      toast.success('Photo deleted successfully!');
      
      // Refresh photos
      await fetchMyPhotos();
      await fetchCommunityPhotos();
    } catch (error) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleEditPhoto = async (photoId: string) => {
    const photo = myPhotos.find(p => p.id === photoId);
    if (!photo) return;

    const newCaption = prompt('Edit caption:', photo.caption || '');
    if (newCaption === null) return; // User cancelled

    try {
      const { error } = await supabase
        .from('gallery_items')
        .update({ caption: newCaption })
        .eq('id', photoId);

      if (error) throw error;

      toast.success('Caption updated successfully!');
      await fetchMyPhotos();
      if (photo.visibility === 'public') {
        await fetchCommunityPhotos();
      }
    } catch (error) {
      console.error('Error updating caption:', error);
      toast.error('Failed to update caption');
    }
  };

  const handleChangeVisibility = async (photoId: string, newVisibility: 'private' | 'public') => {
    try {
      const { error } = await supabase
        .from('gallery_items')
        .update({ visibility: newVisibility })
        .eq('id', photoId);

      if (error) throw error;

      toast.success(`Photo is now ${newVisibility}`);
      
      // Refresh photos
      await fetchMyPhotos();
      await fetchCommunityPhotos();
    } catch (error) {
      console.error('Error changing visibility:', error);
      toast.error('Failed to change visibility');
    }
  };

  const filteredMyPhotos = myPhotos.filter(photo => {
    if (myFilter === 'all') return true;
    return photo.visibility === myFilter;
  });

  const getFilterCounts = () => {
    return {
      all: myPhotos.length,
      private: myPhotos.filter(p => p.visibility === 'private').length,
      public: myPhotos.filter(p => p.visibility === 'public').length,
    };
  };

  const filterCounts = getFilterCounts();

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground">
          Browse community photos and manage your personal library
        </p>
      </div>

      <Tabs defaultValue="community" className="space-y-4">
        <TabsList>
          <TabsTrigger value="community" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Community
          </TabsTrigger>
          <TabsTrigger value="my-library" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            My Library
          </TabsTrigger>
        </TabsList>

        <TabsContent value="community" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {communityPhotos.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No public photos yet. Share your gaming moments!</p>
              </div>
            ) : (
              communityPhotos.map((photo) => (
                <CommunityPhotoCard
                  key={photo.id}
                  photo={photo}
                  likeCount={photo.like_count || 0}
                  commentCount={photoStats[photo.id]?.comments || photo.comment_count || 0}
                  onPhotoClick={() => {
                    setSelectedPhoto(photo);
                    setIsPhotoDetailOpen(true);
                  }}
                  onLike={async () => {
                    if (!userId) return;
                    
                    try {
                      const isLiked = photo.user_has_liked;
                      
                      // Optimistic update for UI
                      setCommunityPhotos(prev => prev.map(p => 
                        p.id === photo.id 
                          ? { 
                              ...p, 
                              user_has_liked: !isLiked,
                              like_count: (p.like_count || 0) + (isLiked ? -1 : 1)
                            }
                          : p
                      ));
                      
                      if (isLiked) {
                        const { error } = await supabase
                          .from('photo_likes')
                          .delete()
                          .eq('photo_id', photo.id)
                          .eq('user_id', userId);
                        if (error) throw error;
                      } else {
                        const { error } = await supabase
                          .from('photo_likes')
                          .insert({ photo_id: photo.id, user_id: userId });
                        if (error) throw error;
                      }
                    } catch (error) {
                      // Revert optimistic update on error
                      setCommunityPhotos(prev => prev.map(p => 
                        p.id === photo.id 
                          ? { 
                              ...p, 
                              user_has_liked: photo.user_has_liked,
                              like_count: photo.like_count || 0
                            }
                          : p
                      ));
                      toast.error('Failed to update like');
                    }
                  }}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-library" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <div className="flex gap-2">
                <Button 
                  variant={myFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setMyFilter('all')}
                >
                  All ({filterCounts.all})
                </Button>
                <Button 
                  variant={myFilter === 'private' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setMyFilter('private')}
                >
                  Private ({filterCounts.private})
                </Button>
                <Button 
                  variant={myFilter === 'public' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setMyFilter('public')}
                >
                  Public ({filterCounts.public})
                </Button>
              </div>
            </div>
            <Button onClick={() => setIsUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMyPhotos.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {myFilter === 'all' 
                    ? 'No photos yet. Upload your first photo!' 
                    : `No ${myFilter} photos found.`
                  }
                </p>
              </div>
            ) : (
              filteredMyPhotos.map((photo) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  isOwner={true}
                  likeCount={photo.like_count || 0}
                  commentCount={photo.comment_count || 0}
                  showLikeCommentUI={false}
                  showInlineLike={false}
                  onPhotoClick={() => {
                    setSelectedPhoto(photo);
                    setIsPhotoDetailOpen(true);
                  }}
                  onDelete={handleDeletePhoto}
                  onEdit={handleEditPhoto}
                  onChangeVisibility={handleChangeVisibility}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />

      <PhotoDetail
        photo={selectedPhoto}
        isOpen={isPhotoDetailOpen}
        onClose={() => {
          setIsPhotoDetailOpen(false);
          setSelectedPhoto(null);
        }}
      />
    </div>
  );
}