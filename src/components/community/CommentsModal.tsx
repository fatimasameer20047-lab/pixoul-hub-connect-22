import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from '@/components/gallery/UserAvatar';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  commenter_name: string;
  commenter_avatar_color: string;
}

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoId: string;
  photoCaption?: string;
  onCommentAdded?: () => void;
}

export function CommentsModal({ isOpen, onClose, photoId, photoCaption, onCommentAdded }: CommentsModalProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && photoId) {
      fetchComments();
    }
  }, [isOpen, photoId]);

  const fetchComments = async () => {
    setIsLoading(true);
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

      const commentsData: Comment[] = (data || []).map((comment: any) => ({
        id: comment.id,
        text: comment.text,
        created_at: comment.created_at,
        user_id: comment.user_id,
        commenter_name: comment.profiles?.full_name || comment.profiles?.name || 'Anonymous',
        commenter_avatar_color: comment.profiles?.avatar_color || '#6366F1',
      }));

      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user) {
      toast.error('Please sign in to comment');
      return;
    }

    const commentText = newComment.trim();
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

      // Refresh comments
      await fetchComments();
      setNewComment('');
      toast.success('Comment added!');
      
      // Notify parent to update counts
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {photoCaption && (
            <div className="pb-4 border-b">
              <p className="text-sm">{photoCaption}</p>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <UserAvatar
                    name={comment.commenter_name}
                    size="sm"
                    color={comment.commenter_avatar_color}
                  />
                  <div className="flex-1">
                    <div className="bg-muted rounded-lg p-3">
                      <p className="text-sm font-semibold mb-1">{comment.commenter_name}</p>
                      <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-1">
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">No comments yet</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to comment!</p>
            </div>
          )}
        </div>

        {user && (
          <div className="flex gap-2 pt-4 border-t">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
