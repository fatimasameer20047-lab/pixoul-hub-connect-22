import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MessageCircle, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/gallery/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';
import CommunityPhotoCard from '@/components/gallery/CommunityPhotoCard';
import { ChatDialog } from '@/components/chat/ChatDialog';

interface UserProfile {
  user_id: string;
  username: string;
  full_name: string;
  avatar_color: string;
}

interface Photo {
  id: string;
  url: string;
  caption: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  user_id: string;
  user_has_liked: boolean;
}

export default function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      // Fetch user profile by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles' as any)
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) throw profileError;

      const profile = profileData as any;
      setProfile(profile);

      // Fetch user's public photos
      const { data: photosData, error: photosError } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (photosError) throw photosError;

      // Get like status for current user
      const { data: likesData } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .in('photo_id', (photosData || []).map(p => p.id))
        .eq('user_id', user?.id || '');

      const likesSet = new Set((likesData || []).map(l => l.photo_id));

      setPhotos((photosData || []).map(p => ({
        ...p,
        user_has_liked: likesSet.has(p.id)
      })));
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (photoId: string) => {
    if (!user) {
      toast.error('Please sign in to like photos');
      return;
    }

    const photo = photos.find(p => p.id === photoId);
    if (!photo) return;

    const isLiked = photo.user_has_liked;

    // Optimistic update
    setPhotos(prev => prev.map(p =>
      p.id === photoId
        ? { ...p, user_has_liked: !isLiked, like_count: p.like_count + (isLiked ? -1 : 1) }
        : p
    ));

    try {
      if (isLiked) {
        await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('photo_likes')
          .insert({ photo_id: photoId, user_id: user.id });
      }
    } catch (error) {
      // Revert on error
      setPhotos(prev => prev.map(p =>
        p.id === photoId
          ? { ...p, user_has_liked: isLiked, like_count: p.like_count + (isLiked ? 1 : -1) }
          : p
      ));
      toast.error('Failed to update like');
    }
  };

  const isOwnProfile = user?.id === profile?.user_id;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="aspect-square" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">User not found</h3>
            <p className="text-muted-foreground">This user doesn't exist</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-6">
                <UserAvatar
                  name={profile.full_name}
                  size="xl"
                  color={profile.avatar_color}
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">{profile.full_name}</h1>
                  <p className="text-muted-foreground mb-4">@{profile.username}</p>
                  <div className="text-sm text-muted-foreground">
                    {photos.length} {photos.length === 1 ? 'post' : 'posts'}
                  </div>
                </div>
                {!isOwnProfile && user && (
                  <Button onClick={() => setShowChat(true)}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Posts Grid */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Posts</h2>
            {photos.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "You haven't shared any posts yet" : "This user hasn't shared any posts yet"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {photos.map((photo) => (
                  <CommunityPhotoCard
                    key={photo.id}
                    photo={{
                      ...photo,
                      author_name: profile.full_name,
                      avatar_color: profile.avatar_color,
                      visibility: 'public'
                    }}
                    likeCount={photo.like_count}
                    commentCount={photo.comment_count}
                    onLike={() => handleLike(photo.id)}
                    onPhotoClick={() => { }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showChat && !isOwnProfile && profile && (
        <ChatDialog
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          conversationType={'user_to_user' as any}
          referenceId={profile.user_id}
          title={`Chat with ${profile.full_name}`}
        />
      )}
    </>
  );
}