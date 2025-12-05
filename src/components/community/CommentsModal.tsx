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
  handle: string;
  replyTo?: string;
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
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && photoId) {
      fetchComments();
    }
  }, [isOpen, photoId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from('photo_comments')
        .select('id, text, created_at, user_id')
        .eq('photo_id', photoId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Fetch profiles for all commenters
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, name, avatar_color')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Map profiles to comments
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.user_id, p])
      );

      const enrichedComments: Comment[] = commentsData.map((comment) => {
        const profile = profilesMap.get(comment.user_id);
        const rawText = comment.text || '';
        let replyTo: string | undefined;
        let displayText = rawText;
        const m = rawText.match(/^\[r:([a-f0-9\-]+)\]\s*(.*)$/i);
        if (m) {
          replyTo = m[1];
          displayText = m[2] || '';
        }
        return {
          id: comment.id,
          text: displayText,
          created_at: comment.created_at,
          user_id: comment.user_id,
          commenter_name: profile?.full_name || profile?.name || 'Anonymous',
          commenter_avatar_color: profile?.avatar_color || '#6366F1',
          handle: `@user${(comment.user_id || '').slice(-4)}`,
          replyTo,
        };
      });

      setComments(enrichedComments);
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
      const payloadText = replyTo ? `[r:${replyTo.id}] ${commentText}` : commentText;
      const { error } = await supabase
        .from('photo_comments')
        .insert({
          photo_id: photoId,
          user_id: user.id,
          text: payloadText
        });

      if (error) throw error;

      // Refresh comments
      await fetchComments();
      setNewComment('');
      setReplyTo(null);
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

  const handleReply = (parent: Comment) => {
    setReplyTo({ id: parent.id, handle: parent.handle });
    setNewComment(`${parent.handle} `);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const toggleReplies = (parentId: string) => {
    setOpenReplies(prev => ({ ...prev, [parentId]: !prev[parentId] }));
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
              {(() => {
                const parents = comments.filter(c => !c.replyTo);
                const repliesByParent = comments.filter(c => !!c.replyTo).reduce((acc, c) => {
                  const pid = c.replyTo as string;
                  (acc[pid] = acc[pid] || []).push(c);
                  return acc;
                }, {} as Record<string, Comment[]>);
                return parents.map((comment) => (
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
                      <p className="text-xs text-muted-foreground mt-1 ml-1 flex items-center gap-3">
                        {new Date(comment.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                        <button className="underline" onClick={() => handleReply(comment)}>Reply</button>
                      </p>

                      {repliesByParent[comment.id]?.length ? (
                        <div className="mt-2 ml-10">
                          <button
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => toggleReplies(comment.id)}
                          >
                            {openReplies[comment.id] ? 'Hide replies' : `View replies (${repliesByParent[comment.id].length})`}
                          </button>
                          {openReplies[comment.id] && (
                            <div className="mt-2 space-y-3">
                              {repliesByParent[comment.id].map((reply) => (
                                <div key={reply.id} className="flex gap-3">
                                  <UserAvatar
                                    name={reply.commenter_name}
                                    size="sm"
                                    color={reply.commenter_avatar_color}
                                  />
                                  <div className="flex-1">
                                    <div className="bg-muted rounded-lg p-3">
                                      <p className="text-sm"><span className="font-semibold mr-1">{reply.commenter_name}</span>{reply.text}</p>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1 ml-1">
                                      {new Date(reply.created_at).toLocaleDateString('en-US', {
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
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ));
              })()}
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
              ref={inputRef}
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
