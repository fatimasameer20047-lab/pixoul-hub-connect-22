import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Calendar,
  Coffee,
  Camera,
  BookOpen,
  MessageSquare,
  CalendarPlus,
  Users,
  Megaphone,
  LogOut,
  User,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type ProfileSummary = {
  full_name?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  phone_number?: string | null;
};

const allRoutes = [
  { title: 'Home', url: '/', icon: Home },
  { title: 'Booking', url: '/booking', icon: Calendar },
  { title: 'Events & Sign-Ups', url: '/events', icon: CalendarPlus },
  { title: 'Snack & Drinks', url: '/snacks', icon: Coffee },
  { title: 'Gallery', url: '/gallery', icon: Camera },
  { title: 'Guides', url: '/guides', icon: BookOpen },
  { title: 'Support & Feedback', url: '/support', icon: MessageSquare },
  { title: 'Announcements', url: '/announcements', icon: Megaphone },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const [userProfile, setUserProfile] = useState<ProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/20 text-primary font-medium border-r-2 border-primary"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const isCollapsed = state === "collapsed";

  useEffect(() => {
    if (isDemoMode) return;

    const fetchProfileWithRetry = async (userId: string) => {
      const attempts = 6;
      const delayMs = 300;
      for (let i = 0; i < attempts; i++) {
        const { data, error } = await supabase
          .from('profiles' as any)
          .select('full_name, name, username, phone_number, email')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) return data;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return null;
    };

    const fetchProfile = async () => {
      setProfileLoading(true);
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user || user;

      if (!authUser?.id) {
        setUserProfile(null);
        setProfileLoading(false);
        return;
      }

      const profile = await fetchProfileWithRetry(authUser.id);
      if (profile) {
        setUserProfile(profile);
      }
      setProfileLoading(false);
    };

    fetchProfile();
  }, [user?.id, isDemoMode]);

      const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  const getDisplayName = () => {
    if (isDemoMode) return user?.user_metadata?.full_name || user?.user_metadata?.name || "Guest User";
    const emailPrefix = user?.email ? user.email.split("@")[0] : undefined;
    return userProfile?.full_name || userProfile?.name || user?.user_metadata?.full_name || user?.user_metadata?.username || emailPrefix || "User";
  };

  const getDisplayUsername = () => {
    const username = userProfile?.username || user?.user_metadata?.username;
    return username ? `@${username}` : "—";
  };

  const getDisplayPhone = () => userProfile?.phone_number || user?.user_metadata?.phone_number || "—";
  const getDisplayEmail = () => userProfile?.email || user?.email || "—";

  const getAvatarInitials = () => {
    const displayName = getDisplayName();
    if (displayName && displayName !== "User") {
      return getInitials(displayName);
    }
    return user?.email ? user.email.charAt(0).toUpperCase() : "U";
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Sidebar className={`border-r border-border/50 bg-sidebar/95 backdrop-blur-sm ${isCollapsed ? "w-14" : "w-60"}`}>
      <SidebarHeader className="border-b border-border/50 p-4">
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">P</span>
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Pixoul Hub
              </h2>
              <p className="text-xs text-muted-foreground">
                {isDemoMode ? 'Demo Portal' : 'Guest Portal'}
              </p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-sm">P</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {allRoutes.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {!isDemoMode && (
        <SidebarFooter className="border-t border-border/50 p-4">
          {!isCollapsed && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-primary font-medium text-sm">
                    {getAvatarInitials()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  {profileLoading ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-28 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplayUsername()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplayEmail()}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {getDisplayPhone()}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="w-full justify-start"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
          {isCollapsed && (
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <span className="text-primary font-medium text-sm">
                  {getAvatarInitials()}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="w-full p-2"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </SidebarFooter>
      )}
    </Sidebar>
  );
}




