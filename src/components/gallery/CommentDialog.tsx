import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Heart } from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  commenter_name?: string;
  avatar_color?: string;
}

interface Photo {
  id: string;
  url: string;
  caption: string;
  author_name?: string;
  avatar_color?: string;
  user_has_liked?: boolean;
  like_count?: number;
  created_at: string;
}

interface CommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  photo: Photo | null;
  onLike?: () => void;
}

export function CommentDialog({ isOpen, onClose, photo, onLike }: CommentDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = async () => {
    if (!photo) return;
    
    const { data, error } = await supabase
      .from('photo_comments')
      .select(`
        *,
        profiles!photo_comments_user_id_fkey (
          full_name,
          name,
          avatar_color
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
        commenter_name: commenterName,
        avatar_color: profile?.avatar_color
      };
    });

    setComments(commentsWithNames);
  };

  useEffect(() => {
    if (isOpen && photo) {
      fetchComments();
    }
  }, [isOpen, photo]);

  const handleAddComment = async () => {
    if (!user || !newComment.trim() || !photo) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photo.id,
          user_id: user.id,
          text: newComment.trim()
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!photo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <DialogHeader className="p-6 pb-4">
            <div className="flex items-center gap-3">
              <UserAvatar 
                name={photo.author_name || 'Unknown User'} 
                size="md"
                color={photo.avatar_color}
              />
              <div>
                <DialogTitle>{photo.author_name || 'Unknown User'}</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(photo.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Photo and Content */}
          <div className="flex-1 overflow-hidden">
            <div className="p-6 pt-0">
              {/* Photo */}
              <div className="aspect-square rounded-lg overflow-hidden mb-4 bg-muted">
                <img 
                  src={photo.url} 
                  alt={photo.caption || "Photo"} 
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Caption and Actions */}
              <div className="space-y-4">
                {photo.caption && (
                  <p className="text-sm">{photo.caption}</p>
                )}

                {/* Like button */}
                {onLike && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onLike}
                    className="h-auto p-2"
                  >
                    <Heart className={`h-5 w-5 mr-2 ${photo.user_has_liked ? 'fill-current text-red-500' : 'text-muted-foreground'}`} />
                    <span className={photo.user_has_liked ? 'text-red-500' : 'text-muted-foreground'}>
                      {photo.like_count || 0} likes
                    </span>
                  </Button>
                )}
              </div>

              {/* Comments */}
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-4">Comments</h3>
                <ScrollArea className="h-40 mb-4">
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No comments yet.</p>
                    ) : (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <UserAvatar 
                            name={comment.commenter_name || 'User'} 
                            size="sm"
                            color={comment.avatar_color}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{comment.commenter_name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm break-words">{comment.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Add comment */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="flex-1 min-h-[60px] text-sm"
                    maxLength={500}
                  />
                  <Button 
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isSubmitting}
                    size="sm"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}