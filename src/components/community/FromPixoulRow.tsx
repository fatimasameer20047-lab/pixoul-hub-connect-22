import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/gallery/UserAvatar';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';

interface PixoulPost {
  id: string;
  url: string | null;
  caption: string;
  created_at: string;
  like_count: number;
  comment_count: number;
  user_has_liked: boolean;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  commenter_name: string;
  commenter_avatar_color: string;
}

export function FromPixoulRow() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [pixoulUserId, setPixoulUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<PixoulPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPixoulUser();
  }, []);

  useEffect(() => {
    if (pixoulUserId) {
      fetchPosts();
    }
  }, [pixoulUserId]);

  const fetchPixoulUser = async () => {
    try {
      // Fetch all gallery items and find posts from pixoulgaming user
      // We'll identify them by checking profiles with specific naming pattern
      const { data: galleryData, error: galleryError } = await supabase
        .from('gallery_items')
        .select('user_id, profiles:user_id(full_name, name)')
        .limit(1000);

      if (galleryError) throw galleryError;

      // Find the user with "Pixoul" in their name
      const pixoulItem = galleryData?.find((item: any) => {
        const name = item.profiles?.full_name || item.profiles?.name || '';
        return name.toLowerCase().includes('pixoul');
      });

      if (pixoulItem) {
        setPixoulUserId(pixoulItem.user_id);
      }
    } catch (error) {
      console.error('Error fetching Pixoul user:', error);
    }
  };

  const fetchPosts = async () => {
    if (!pixoulUserId) return;

    try {
      let query = supabase
        .from('gallery_items')
        .select('*')
        .eq('user_id', pixoulUserId)
        .order('created_at', { ascending: false })
        .limit(10);

      const { data, error } = await query;
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      // Get likes for current user
      const { data: likesData } = await supabase
        .from('photo_likes')
        .select('photo_id')
        .in('photo_id', data.map(p => p.id))
        .eq('user_id', user?.id || '');

      const likesSet = new Set(likesData?.map(l => l.photo_id) || []);

      const postsData = data.map(item => ({
        id: item.id,
        url: item.url || null,
        caption: item.caption || '',
        created_at: item.created_at,
        like_count: item.like_count || 0,
        comment_count: item.comment_count || 0,
        user_has_liked: likesSet.has(item.id)
      }));

      setPosts(postsData);
    } catch (error) {
      console.error('Error fetching Pixoul posts:', error);
      toast.error('Failed to load Pixoul posts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async (postId: string) => {
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
        .eq('photo_id', postId)
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
    }
  };

  const handlePostClick = async (post: PixoulPost) => {
    setSelectedPost(post);
    await fetchComments(post.id);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      const post = selectedPost?.id === postId ? selectedPost : posts.find(p => p.id === postId);
      if (!post) return;

      const isLiked = post.user_has_liked;

      // Optimistic update
      if (selectedPost?.id === postId) {
        setSelectedPost({
          ...selectedPost,
          user_has_liked: !isLiked,
          like_count: selectedPost.like_count + (isLiked ? -1 : 1)
        });
      }
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, user_has_liked: !isLiked, like_count: p.like_count + (isLiked ? -1 : 1) }
          : p
      ));

      if (isLiked) {
        await supabase.from('photo_likes').delete().eq('photo_id', postId).eq('user_id', user.id);
      } else {
        await supabase.from('photo_likes').insert({ photo_id: postId, user_id: user.id });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleAddComment = async () => {
    if (!user || !selectedPost) {
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
          photo_id: selectedPost.id,
          user_id: user.id,
          text: commentText
        });

      if (error) throw error;

      // Update counts
      setSelectedPost(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
      setPosts(prev => prev.map(p =>
        p.id === selectedPost.id ? { ...p, comment_count: p.comment_count + 1 } : p
      ));

      // Refresh comments
      await fetchComments(selectedPost.id);
      setNewComment('');
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollContainer = (direction: 'left' | 'right') => {
    const container = document.getElementById('pixoul-posts-container');
    if (container) {
      const scrollAmount = 300;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (isLoading || posts.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full px-4 py-6 lg:px-8 border-b bg-muted/30">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              From Pixoul
              <Badge variant="secondary" className="text-xs">Official</Badge>
            </h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollContainer('left')}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => scrollContainer('right')}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            id="pixoul-posts-container"
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {posts.map((post) => (
              <Card
                key={post.id}
                className="flex-shrink-0 w-[280px] cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handlePostClick(post)}
              >
                <CardContent className="p-0">
                  {post.url ? (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={post.url}
                        alt={post.caption || 'Pixoul post'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="p-3">
                    {post.caption && (
                      <p className="text-sm line-clamp-2 mb-2">{post.caption}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" />
                          {post.like_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {post.comment_count}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Pixoul
              <Badge variant="secondary" className="text-xs">Official</Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-4">
              {selectedPost.url && (
                <img
                  src={selectedPost.url}
                  alt={selectedPost.caption || 'Pixoul post'}
                  className="w-full rounded-lg max-h-[50vh] object-contain bg-muted"
                />
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0"
                    onClick={() => handleLike(selectedPost.id)}
                  >
                    <Heart
                      className={`h-5 w-5 ${selectedPost.user_has_liked ? 'fill-red-500 text-red-500' : ''}`}
                    />
                  </Button>
                  <span className="text-sm">
                    {selectedPost.like_count} {selectedPost.like_count === 1 ? 'like' : 'likes'}
                  </span>
                </div>

                {selectedPost.caption && (
                  <p className="text-sm whitespace-pre-wrap">{selectedPost.caption}</p>
                )}

                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-sm">
                    Comments ({selectedPost.comment_count})
                  </h4>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {comments.length > 0 ? (
                      comments.map((comment) => (
                        <div key={comment.id} className="flex gap-2">
                          <UserAvatar
                            name={comment.commenter_name}
                            size="sm"
                            color={comment.commenter_avatar_color}
                          />
                          <div className="flex-1">
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
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    )}
                  </div>

                  {user && (
                    <div className="flex gap-2 pt-2">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[60px] text-sm"
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
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
