import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

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
  const location = useLocation();
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';
  const [userProfile, setUserProfile] = useState<{ full_name?: string; name?: string } | null>(null);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/20 text-primary font-medium border-r-2 border-primary" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground";

  const isCollapsed = state === "collapsed";

  // Fetch user profile
  useEffect(() => {
    if (user && !isDemoMode) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, name')
          .eq('user_id', user.id)
          .single();
        
        if (data) {
          setUserProfile(data);
        }
      };
      
      fetchProfile();
    }
  }, [user, isDemoMode]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  const getDisplayName = () => {
    if (isDemoMode) return user?.user_metadata?.name || 'Guest User';
    return userProfile?.full_name || userProfile?.name || user?.user_metadata?.name || 'User';
  };

  const getAvatarInitials = () => {
    const displayName = getDisplayName();
    if (displayName !== 'User') {
      return getInitials(displayName);
    }
    return user?.email ? user.email.charAt(0).toUpperCase() : 'U';
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
                  <p className="text-sm font-medium truncate">
                    {getDisplayName()}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
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