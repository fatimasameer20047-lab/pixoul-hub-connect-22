import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserAvatar } from '@/components/gallery/UserAvatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserProfile {
  user_id: string;
  username: string;
  full_name: string;
  avatar_color: string;
}

export function UserSearch() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      const { data, error } = await supabase
        .from('profiles' as any)
        .select('user_id, username, full_name, avatar_color')
        .ilike('username', `%${searchQuery}%`)
        .not('username', 'is', null)
        .limit(10);

      if (!error && data) {
        setResults(data as any);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUserClick = (username: string) => {
    navigate(`/user/${username}`);
    setSearchQuery('');
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {searchQuery && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[300px]">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="divide-y">
                  {results.map((user) => (
                    <button
                      key={user.user_id}
                      onClick={() => handleUserClick(user.username)}
                      className="w-full p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 text-left"
                    >
                      <UserAvatar
                        name={user.full_name}
                        size="sm"
                        color={user.avatar_color}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}