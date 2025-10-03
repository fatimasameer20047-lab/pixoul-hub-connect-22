import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Send, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/gallery/UserAvatar';
import { Skeleton } from '@/components/ui/skeleton';

interface CommunityPhoto {
  id: string;
  url: string;
  caption: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  user_id: string;
  author_name: string;
  avatar_color: string;
  user_has_liked: boolean;
}

interface PhotoComment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  commenter_name: string;
  commenter_avatar_color: string;
}

export function CommunityFeed() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'popular'>('newest');
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [photoComments, setPhotoComments] = useState<Record<string, PhotoComment[]>>({});
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPhotos();
    
    // Subscribe to real-time updates
    const photosChannel = supabase
      .channel('community-feed-photos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gallery_items'
        },
        () => {
          fetchPhotos();
        }
      )
      .subscribe();

    const likesChannel = supabase
      .channel('community-feed-likes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_likes'
        },
        () => {
          fetchPhotos();
        }
      )
      .subscribe();

    const commentsChannel = supabase
      .channel('community-feed-comments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'photo_comments'
        },
        () => {
          fetchPhotos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(photosChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [sortBy, user]);

  const fetchPhotos = async () => {
    try {
      let query = supabase
        .from('gallery_items')
        .select('*')
        .eq('visibility', 'public');

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query
          .order('like_count', { ascending: false })
          .order('comment_count', { ascending: false })
          .order('created_at', { ascending: false });
      }

      const { data: galleryData, error: galleryError } = await query;
      
      if (galleryError) throw galleryError;
      
      if (!galleryData || galleryData.length === 0) {
        setPhotos([]);
        setIsLoading(false);
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
        .eq('user_id', user?.id || '');
        
      if (likesError && user) throw likesError;
      
      // Create profile lookup
      const profileLookup = (profilesData || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);
      
      // Create likes lookup
      const likesLookup = new Set((likesData || []).map(like => like.photo_id));
      
      const photosWithAuthors = galleryData.map(item => {
        const profile = profileLookup[item.user_id];
        const authorName = profile?.full_name || profile?.name || 
          (item.user_id ? `user${item.user_id.slice(-4)}` : 'Anonymous');
        
        return {
          id: item.id,
          url: item.url,
          caption: item.caption || '',
          created_at: item.created_at,
          like_count: item.like_count || 0,
          comment_count: item.comment_count || 0,
          user_id: item.user_id,
          author_name: authorName,
          avatar_color: profile?.avatar_color || '#6366F1',
          user_has_liked: likesLookup.has(item.id)
        };
      });
      
      setPhotos(photosWithAuthors);
    } catch (error) {
      console.error('Error fetching community photos:', error);
      toast.error('Failed to load community feed');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPhotoComments = async (photoId: string) => {
    try {
      const { data, error } = await supabase
        .from('photo_comments')
        .select(`
          id,
          text,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            name,
            avatar_color
          )
        `)
        .eq('photo_id', photoId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const comments: PhotoComment[] = (data || []).map((comment: any) => ({
        id: comment.id,
        text: comment.text,
        created_at: comment.created_at,
        user_id: comment.user_id,
        commenter_name: comment.profiles?.full_name || comment.profiles?.name || 'Anonymous',
        commenter_avatar_color: comment.profiles?.avatar_color || '#6366F1',
      }));

      setPhotoComments(prev => ({ ...prev, [photoId]: comments }));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleToggleComments = async (photoId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(photoId)) {
      newExpanded.delete(photoId);
    } else {
      newExpanded.add(photoId);
      if (!photoComments[photoId]) {
        await fetchPhotoComments(photoId);
      }
    }
    setExpandedComments(newExpanded);
  };

  const handleLike = async (photoId: string) => {
    if (!user) {
      toast.error('Please sign in to like photos');
      return;
    }
    
    try {
      const photo = photos.find(p => p.id === photoId);
      if (!photo) return;
      
      const isLiked = photo.user_has_liked;
      
      // Optimistic update
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { 
              ...p, 
              user_has_liked: !isLiked,
              like_count: p.like_count + (isLiked ? -1 : 1)
            }
          : p
      ));
      
      if (isLiked) {
        const { error } = await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('photo_likes')
          .insert({ photo_id: photoId, user_id: user.id });
        if (error) throw error;
      }
    } catch (error) {
      // Revert optimistic update
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { 
              ...p, 
              user_has_liked: !p.user_has_liked,
              like_count: p.like_count + (p.user_has_liked ? 1 : -1)
            }
          : p
      ));
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async (photoId: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }
    
    const commentText = newComment[photoId]?.trim();
    if (!commentText) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photoId,
          user_id: user.id,
          text: commentText
        });
      
      if (error) throw error;
      
      // Update comment count
      setPhotos(prev => prev.map(p => 
        p.id === photoId 
          ? { ...p, comment_count: p.comment_count + 1 }
          : p
      ));
      
      // Refresh comments
      await fetchPhotoComments(photoId);
      
      // Clear input
      setNewComment(prev => ({ ...prev, [photoId]: '' }));
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full px-4 py-8 lg:px-8 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="max-w-[700px]">
            <CardContent className="p-0">
              <div className="p-3 flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="w-full aspect-square" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 lg:px-8">
      <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as 'newest' | 'popular')} className="space-y-6">
        <TabsList className="grid w-full max-w-[700px] grid-cols-2">
          <TabsTrigger value="newest">Newest</TabsTrigger>
          <TabsTrigger value="popular">Most Popular</TabsTrigger>
        </TabsList>

        <TabsContent value={sortBy} className="space-y-4 mt-6 max-w-[700px]">
          {photos.length === 0 ? (
            <Card className="max-w-[700px]">
              <CardContent className="p-12 text-center">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share with the community!</p>
              </CardContent>
            </Card>
          ) : (
            photos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="p-3 flex items-center gap-3">
                    <UserAvatar 
                      name={photo.author_name} 
                      size="md"
                      color={photo.avatar_color}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{photo.author_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(photo.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Image (if present) */}
                  {photo.url && (
                    <div className="w-full bg-muted" style={{ maxHeight: '70vh' }}>
                      <img 
                        src={photo.url} 
                        alt={photo.caption || "Community photo"} 
                        className="w-full h-full object-cover"
                        style={{ maxHeight: '70vh' }}
                      />
                    </div>
                  )}

                  {/* Actions & Content */}
                  <div className="p-3 space-y-2">
                    {/* Like & Comment buttons */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleLike(photo.id)}
                      >
                        <Heart 
                          className={`h-5 w-5 ${photo.user_has_liked ? 'fill-red-500 text-red-500' : 'text-foreground'}`} 
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 hover:bg-transparent"
                        onClick={() => handleToggleComments(photo.id)}
                      >
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Like count */}
                    {photo.like_count > 0 && (
                      <p className="text-sm font-semibold">
                        {photo.like_count} {photo.like_count === 1 ? 'like' : 'likes'}
                      </p>
                    )}

                    {/* Caption */}
                    {photo.caption && (
                      <p className="text-sm">
                        <span className="font-semibold mr-2">{photo.author_name}</span>
                        {photo.caption}
                      </p>
                    )}

                    {/* View comments link */}
                    {photo.comment_count > 0 && !expandedComments.has(photo.id) && (
                      <button
                        onClick={() => handleToggleComments(photo.id)}
                        className="text-sm text-muted-foreground hover:text-foreground"
                      >
                        View all {photo.comment_count} {photo.comment_count === 1 ? 'comment' : 'comments'}
                      </button>
                    )}

                    {/* Comments section */}
                    {expandedComments.has(photo.id) && (
                      <div className="space-y-2 pt-2 border-t">
                        {photoComments[photo.id]?.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {photoComments[photo.id].map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <UserAvatar 
                                  name={comment.commenter_name} 
                                  size="sm"
                                  color={comment.commenter_avatar_color}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm">
                                    <span className="font-semibold mr-1">{comment.commenter_name}</span>
                                    {comment.text}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {new Date(comment.created_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No comments yet</p>
                        )}

                        {/* Add comment input */}
                        <div className="flex gap-2 pt-1">
                          <Textarea
                            placeholder="Add a comment..."
                            value={newComment[photo.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [photo.id]: e.target.value }))}
                            className="min-h-[60px] text-sm resize-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleAddComment(photo.id);
                              }
                            }}
                          />
                          <Button 
                            onClick={() => handleAddComment(photo.id)}
                            disabled={!newComment[photo.id]?.trim() || isSubmitting}
                            size="sm"
                            className="self-end"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
