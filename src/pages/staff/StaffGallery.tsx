import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GalleryItem {
  id: string;
  url: string;
  caption: string;
  visibility: string;
  user_id: string;
  created_at: string;
}

export default function StaffGallery() {
  const [pendingPosts, setPendingPosts] = useState<GalleryItem[]>([]);
  const [publicPosts, setPublicPosts] = useState<GalleryItem[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    
    // Set up real-time subscription for new posts
    const channel = supabase
      .channel('gallery-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gallery_items'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    const { data: pending } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('visibility', 'private')
      .eq('comment_count', -1)
      .order('created_at', { ascending: false });

    const { data: publicData } = await supabase
      .from('gallery_items')
      .select('*')
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    setPendingPosts(pending || []);
    setPublicPosts(publicData || []);
  };

  const approvePost = async (id: string) => {
    const { error } = await supabase
      .from('gallery_items')
      .update({ visibility: 'public', comment_count: 0 })
      .eq('id', id);

    if (error) {
      toast({ title: "Error approving post", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post approved" });
      fetchPosts();
    }
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase
      .from('gallery_items')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error deleting post", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post deleted" });
      fetchPosts();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gallery Moderation</h1>
        <p className="text-muted-foreground">Review and manage user-submitted content</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval ({pendingPosts.length})
          </TabsTrigger>
          <TabsTrigger value="public">
            Public Gallery ({publicPosts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pendingPosts.map((post) => (
                  <Card key={post.id} className="overflow-hidden">
                    <img src={post.url} alt="" className="w-full aspect-square object-cover" />
                    <CardContent className="pt-4 space-y-3">
                      <p className="text-sm">{post.caption}</p>
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Awaiting Review
                      </Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => approvePost(post.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => deletePost(post.id)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {pendingPosts.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No posts pending approval
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="public" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {publicPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden group">
                <img src={post.url} alt="" className="w-full aspect-square object-cover" />
                <CardContent className="pt-4 space-y-2">
                  <p className="text-sm line-clamp-2">{post.caption}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => deletePost(post.id)}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
