import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function UsernameSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkUsername = async () => {
      if (!username || username.length < 3) {
        setIsAvailable(null);
        return;
      }

      // Validate username format
      if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        setIsAvailable(false);
        return;
      }

      setIsChecking(true);
      const { data } = await supabase
        .from('profiles' as any)
        .select('username')
        .eq('username', username.toLowerCase())
        .maybeSingle();

      setIsChecking(false);
      setIsAvailable(!data);
    };

    const timer = setTimeout(checkUsername, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isAvailable) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles' as any)
        .update({ username: username.toLowerCase() })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Username set successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set username');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose Your Username</CardTitle>
          <CardDescription>
            Pick a unique username to complete your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <Input
                  id="username"
                  type="text"
                  placeholder="username"
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
              {!isChecking && isAvailable === false && username.length >= 3 && (
                <p className="text-xs text-red-500">This username is not available</p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={!isAvailable || isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Setting username...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}