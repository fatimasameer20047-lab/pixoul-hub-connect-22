import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Check, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { UserAvatar } from '@/components/gallery/UserAvatar';

export function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarColor, setAvatarColor] = useState('#6366F1');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username === profile?.username || username.length < 3) {
        setIsAvailable(null);
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setIsAvailable(false);
        return;
      }

      setIsChecking(true);
      const { data } = await supabase
        .from('profiles' as any)
        .select('username')
        .eq('username', username.toLowerCase())
        .neq('user_id', user?.id)
        .maybeSingle();

      setIsChecking(false);
      setIsAvailable(!data);
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username, profile, user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles' as any)
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      const profileData = data as any;
      setProfile(profileData);
      setUsername(profileData.username || '');
      setFullName(profileData.full_name || '');
      setAvatarColor(profileData.avatar_color || '#6366F1');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles' as any)
        .update({
          username: username.toLowerCase(),
          full_name: fullName,
          avatar_color: avatarColor
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully!');
      fetchProfile();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const randomColor = () => {
    const colors = [
      '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
      '#10B981', '#3B82F6', '#EF4444', '#14B8A6'
    ];
    setAvatarColor(colors[Math.floor(Math.random() * colors.length)]);
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your profile information and avatar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-6">
          {/* Avatar */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="flex items-center gap-4">
              <UserAvatar
                name={fullName}
                size="xl"
                color={avatarColor}
              />
              <Button
                type="button"
                variant="outline"
                onClick={randomColor}
              >
                <Camera className="h-4 w-4 mr-2" />
                Change Color
              </Button>
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pr-10"
                required
                minLength={3}
                maxLength={20}
                pattern="[a-zA-Z0-9_]+"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {isChecking && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {!isChecking && isAvailable === true && <Check className="h-4 w-4 text-green-500" />}
                {!isChecking && isAvailable === false && <X className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              3-20 characters, letters, numbers, and underscores only
            </p>
            {!isChecking && isAvailable === false && username !== profile.username && (
              <p className="text-xs text-red-500">This username is not available</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSaving || (username !== profile.username && isAvailable !== true)}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}