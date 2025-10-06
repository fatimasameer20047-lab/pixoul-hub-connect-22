import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PixoulPost {
  id: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  published: boolean;
  type: 'event' | 'program' | 'announcement' | 'post';
  title: string | null;
  caption: string;
  images: string[];
  pinned: boolean;
}

const StaffPixoulPosts = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PixoulPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PixoulPost | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    type: 'post' as PixoulPost['type'],
    title: '',
    caption: '',
    published: true,
    images: [] as string[],
    pinned: false,
  });

  useEffect(() => {
    if (user?.email === 'pixoulgaming@staffportal.com') {
      fetchPosts();
    }
  }, [user]);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('pixoul_posts')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data as PixoulPost[]) || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // Create post first to get ID if editing, or use temp ID
      const postId = editingPost?.id || crypto.randomUUID();

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${postId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('pixoul-posts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('pixoul-posts')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
      toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (url: string) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter(u => u !== url)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.caption.trim()) {
      toast.error('Caption is required');
      return;
    }

    try {
      if (editingPost) {
        const updateData: any = {
          type: formData.type,
          title: formData.title || null,
          caption: formData.caption,
          published: formData.published,
          images: formData.images,
          pinned: formData.pinned,
        };

        const { error } = await supabase
          .from('pixoul_posts')
          .update(updateData)
          .eq('id', editingPost.id);

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        toast.success('Post updated successfully');
      } else {
        const insertData: any = {
          author_id: user!.id,
          type: formData.type,
          title: formData.title || null,
          caption: formData.caption,
          published: formData.published,
          images: formData.images,
          pinned: formData.pinned,
        };

        const { error } = await supabase
          .from('pixoul_posts')
          .insert(insertData);

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        toast.success('Post created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPosts();
    } catch (error: any) {
      console.error('Error saving post:', error);
      toast.error(error.message || 'Failed to save post');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase
        .from('pixoul_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Post deleted successfully');
      fetchPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const togglePin = async (post: PixoulPost) => {
    try {
      const newPinned = !post.pinned;
      
      const { error } = await supabase
        .from('pixoul_posts')
        .update({ pinned: newPinned })
        .eq('id', post.id);

      if (error) throw error;
      toast.success(newPinned ? 'Pinned to top' : 'Unpinned');
      fetchPosts();
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update pin status');
    }
  };

  const openEditDialog = (post: PixoulPost) => {
    setEditingPost(post);
    setFormData({
      type: post.type,
      title: post.title || '',
      caption: post.caption,
      published: post.published,
      images: post.images || [],
      pinned: post.pinned,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setEditingPost(null);
    setFormData({
      type: 'post',
      title: '',
      caption: '',
      published: true,
      images: [],
      pinned: false,
    });
  };

  if (user?.email !== 'pixoulgaming@staffportal.com') {
    return (
      <div className="p-8">
        <p className="text-muted-foreground">Access denied. This page is only for Pixoul staff.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Pixoul Posts</h1>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPost ? 'Edit Post' : 'New Post'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Type</label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: PixoulPost['type']) =>
                      setFormData(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="post">Post</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="program">Program</SelectItem>
                      <SelectItem value="announcement">Announcement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Title (Optional)</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter title..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Caption *</label>
                  <Textarea
                    value={formData.caption}
                    onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                    placeholder="What's on your mind?"
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Images</label>
                  <div className="space-y-2">
                    {formData.images.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {formData.images.map((url, index) => (
                          <div key={index} className="relative">
                            <img
                              src={url}
                              alt={`Upload ${index + 1}`}
                              className="w-full h-32 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(url)}
                              className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById('image-upload')?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Uploading...' : 'Upload Images'}
                    </Button>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={formData.pinned}
                    onChange={(e) => setFormData(prev => ({ ...prev, pinned: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="pinned" className="text-sm font-medium">
                    Pin to top
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={formData.published}
                    onChange={(e) => setFormData(prev => ({ ...prev, published: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="published" className="text-sm font-medium">
                    Published
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingPost ? 'Update' : 'Create'} Post
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Loading posts...</p>
          ) : posts.length === 0 ? (
            <p className="text-muted-foreground">No posts yet. Create your first post!</p>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <Badge variant={post.published ? 'default' : 'secondary'}>
                      {post.published ? 'Published' : 'Draft'}
                    </Badge>
                    <Badge variant="outline">{post.type}</Badge>
                    {post.pinned && <Badge variant="destructive">Pinned</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => togglePin(post)}
                    >
                      {post.pinned ? 'Unpin' : 'Pin'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditDialog(post)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(post.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {post.title && <h3 className="font-semibold mb-1">{post.title}</h3>}
                <p className="text-sm mb-2 whitespace-pre-wrap">{post.caption}</p>
                {post.images && post.images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {post.images.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Media ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                      />
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffPixoulPosts;
