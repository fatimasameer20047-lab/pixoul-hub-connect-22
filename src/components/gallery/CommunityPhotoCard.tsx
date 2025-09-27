import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserAvatar } from './UserAvatar';

interface Photo {
  id: string;
  url: string;
  caption: string;
  visibility: 'private' | 'public';
  created_at: string;
  user_id: string;
  author_name?: string;
  user_has_liked?: boolean;
  like_count?: number;
  avatar_color?: string;
}

interface Comment {
  id: string;
  text: string;
  user_id: string;
  created_at: string;
  commenter_name?: string;
}

interface CommunityPhotoCardProps {
  photo: Photo;
  likeCount: number;
  commentCount: number;
  onLike: () => void;
  onPhotoClick: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
};

export default function CommunityPhotoCard({ 
  photo, 
  likeCount, 
  commentCount,
  onLike,
  onPhotoClick
}: CommunityPhotoCardProps) {
  const { user } = useAuth();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const fetchComments = async () => {
    if (commentsLoaded) return;
    
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
    setCommentsLoaded(true);
  };

  const handleToggleComments = async () => {
    if (!showComments) {
      await fetchComments();
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    setIsSubmittingComment(true);
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
      setCommentsLoaded(false); // Force refetch
      await fetchComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-2 flex items-center gap-3">
          <UserAvatar 
            name={photo.author_name || 'Unknown User'} 
            size="md"
            color={photo.avatar_color}
          />
          <div className="flex-1">
            <p className="text-sm font-medium">{photo.author_name || 'Unknown User'}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(photo.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Image */}
        <div 
          className="aspect-square bg-muted overflow-hidden cursor-pointer"
          onClick={onPhotoClick}
        >
          <img 
            src={photo.url} 
            alt={photo.caption || "Gallery photo"} 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Caption */}
          {photo.caption && (
            <p className="text-sm">{photo.caption}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-sm hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onLike();
                }}
              >
                <Heart className={`h-5 w-5 mr-1 ${photo.user_has_liked ? 'fill-current text-red-500' : 'text-muted-foreground'}`} />
                <span className={photo.user_has_liked ? 'text-red-500' : 'text-muted-foreground'}>{photo.like_count || 0}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1 text-sm text-muted-foreground hover:text-foreground"
                onClick={handleToggleComments}
              >
                <MessageCircle className="h-5 w-5 mr-1" />
                <span>{commentCount}</span>
              </Button>
            </div>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="space-y-3 border-t border-border pt-3">
              {/* Comments list */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No comments yet.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2">
                      <UserAvatar 
                        name={comment.commenter_name || 'Unknown User'} 
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{comment.commenter_name}</span>
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

              {/* Add comment */}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 min-h-[60px] text-sm"
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || isSubmittingComment}
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
  );
}