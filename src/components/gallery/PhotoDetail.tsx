import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Photo {
  id: string;
  url: string;
  caption: string;
  visibility: 'private' | 'public';
  created_at: string;
  user_id: string;
}

interface PhotoLike {
  id: string;
  user_id: string;
  photo_id: string;
}

interface PhotoComment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  photo_id: string;
  commenter_name?: string;
}

interface PhotoDetailProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PhotoDetail({ photo, isOpen, onClose }: PhotoDetailProps) {
  const { user } = useAuth();
  const userId = user?.id;

  const [likes, setLikes] = useState<PhotoLike[]>([]);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const fetchLikes = async () => {
    if (!photo) return;
    
    const { data, error } = await supabase
      .from('photo_likes')
      .select('*')
      .eq('photo_id', photo.id);

    if (error) {
      console.error('Error fetching likes:', error);
      return;
    }

    setLikes(data || []);
    setUserHasLiked(data?.some(like => like.user_id === userId) || false);
  };

  const fetchComments = async () => {
    if (!photo) return;
    
    const { data, error } = await supabase
      .from('photo_comments')
      .select(`
        *,
        profiles!photo_comments_user_id_fkey (
          full_name,
          name
        )
      `)
      .eq('photo_id', photo.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return;
    }

    const commentsWithNames = (data || []).map(comment => {
      const profile = comment.profiles as any;
      const commenterName = profile?.full_name || profile?.name || 
        `user${comment.user_id.slice(-4)}`;
      
      return {
        ...comment,
        commenter_name: commenterName
      };
    });

    setComments(commentsWithNames);
  };

  useEffect(() => {
    if (photo && isOpen) {
      fetchLikes();
      fetchComments();

      // Set up realtime subscriptions
      const likesChannel = supabase
        .channel(`photo_likes_${photo.id}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'photo_likes', filter: `photo_id=eq.${photo.id}` },
          () => fetchLikes()
        )
        .subscribe();

      const commentsChannel = supabase
        .channel(`photo_comments_${photo.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'photo_comments', filter: `photo_id=eq.${photo.id}` },
          () => fetchComments()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(likesChannel);
        supabase.removeChannel(commentsChannel);
      };
    }
  }, [photo, isOpen]);

  const handleLike = async () => {
    if (!userId || !photo) return;

    try {
      if (userHasLiked) {
        // Unlike
        const { error } = await supabase
          .from('photo_likes')
          .delete()
          .eq('photo_id', photo.id)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Like
        const { error } = await supabase
          .from('photo_likes')
          .insert({
            photo_id: photo.id,
            user_id: userId
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async () => {
    if (!userId || !photo || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photo.id,
          user_id: userId,
          text: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!userId || (userId !== commentUserId && userId !== photo?.user_id)) return;

    try {
      const { error } = await supabase
        .from('photo_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Photo Details</DialogTitle>
        </DialogHeader>
        
        <div className="grid md:grid-cols-2 gap-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Image */}
          <div className="aspect-square rounded-lg overflow-hidden bg-muted">
            <img 
              src={photo.url} 
              alt={photo.caption || "Gallery photo"} 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details and Comments */}
          <div className="space-y-4">
            {/* Caption */}
            {photo.caption && (
              <div>
                <h3 className="font-medium mb-2">Caption</h3>
                <p className="text-muted-foreground">{photo.caption}</p>
              </div>
            )}

            {/* Likes and Comments Count */}
            <div className="flex items-center gap-4">
              <Button
                variant={userHasLiked ? "default" : "outline"}
                size="sm"
                onClick={handleLike}
                className="flex items-center gap-2"
              >
                <Heart className={`h-4 w-4 ${userHasLiked ? 'fill-current' : ''}`} />
                {likes.length}
              </Button>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                {comments.length}
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4">
              <h3 className="font-medium">Comments</h3>
              
              {/* Comment input */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[80px]"
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                  size="sm"
                >
                  Post
                </Button>
              </div>

              {/* Comments list */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No comments yet. Be the first to comment!</p>
                ) : (
                  comments.map((comment) => (
                    <Card key={comment.id} className="p-3">
                      <CardContent className="p-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium">{comment.commenter_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm">{comment.text}</p>
                          </div>
                          {(userId === comment.user_id || userId === photo.user_id) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                              className="text-destructive hover:text-destructive ml-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}