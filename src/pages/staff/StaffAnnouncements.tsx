import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Pin, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  published: boolean;
  created_at: string;
}

export default function StaffAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', pinned: false });
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error loading announcements", description: error.message, variant: "destructive" });
    } else {
      setAnnouncements(data || []);
    }
  };

  const handleAddAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('announcements')
      .insert({
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        excerpt: newAnnouncement.content.substring(0, 100),
        pinned: newAnnouncement.pinned,
        published: true,
      });

    if (error) {
      toast({ title: "Error creating announcement", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement created" });
      setNewAnnouncement({ title: '', content: '', pinned: false });
      setShowAddForm(false);
      fetchAnnouncements();
    }
  };

  const togglePin = async (id: string, currentPinned: boolean) => {
    const { error } = await supabase
      .from('announcements')
      .update({ pinned: !currentPinned })
      .eq('id', id);

    if (error) {
      toast({ title: "Error updating announcement", description: error.message, variant: "destructive" });
    } else {
      toast({ title: currentPinned ? "Announcement unpinned" : "Announcement pinned" });
      fetchAnnouncements();
    }
  };

  const deleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: "Error deleting announcement", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Announcement deleted" });
      fetchAnnouncements();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Announcements Management</h1>
          <p className="text-muted-foreground">Manage announcements visible to guests</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                placeholder="Announcement title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                placeholder="Announcement content..."
                rows={5}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={newAnnouncement.pinned}
                onCheckedChange={(checked) => setNewAnnouncement({ ...newAnnouncement, pinned: checked })}
              />
              <Label>Pin to Home Page</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddAnnouncement}>Create Announcement</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {announcement.title}
                    {announcement.pinned && <Pin className="h-4 w-4 text-primary" />}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={announcement.pinned ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePin(announcement.id, announcement.pinned)}
                  >
                    <Pin className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAnnouncement(announcement.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{announcement.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
