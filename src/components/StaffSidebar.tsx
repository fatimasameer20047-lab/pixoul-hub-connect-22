import { Home, Calendar, BookOpen, Coffee, Image, HelpCircle, Bell, Settings, LogOut, Users, Megaphone } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStaff } from "@/contexts/StaffContext";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function StaffSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canManageRooms, canManageEvents, canManageSnacks, canModerateGallery, canManageGuides, canManageSupport, canManageStaff, isAdmin } = useStaff();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const isPixoulStaff = user?.email === 'pixoulgaming@staffportal.com';

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const staffItems = [
    { title: "Dashboard", url: "/staff", icon: Home, show: true },
    { title: "Home", url: "/staff/home", icon: Users, show: !isAdmin },
    { title: "Pixoul Posts", url: "/staff/pixoul-posts", icon: Megaphone, show: isPixoulStaff },
    { title: "Staff Management", url: "/staff/management", icon: Settings, show: canManageStaff },
    { title: "Room Management", url: "/staff/rooms", icon: Settings, show: canManageRooms },
    { title: "Events Management", url: "/staff/events", icon: Calendar, show: canManageEvents },
    { title: "Snacks Management", url: "/staff/snacks", icon: Coffee, show: canManageSnacks },
    { title: "Gallery Moderation", url: "/staff/gallery", icon: Image, show: canModerateGallery },
    { title: "Guides Management", url: "/staff/guides", icon: BookOpen, show: canManageGuides },
    { title: "Announcements", url: "/staff/announcements", icon: Bell, show: canManageGuides },
    { title: "Support Management", url: "/staff/support", icon: HelpCircle, show: canManageSupport },
  ].filter(item => item.show);

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Staff Portal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {staffItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end
                      className={({ isActive }) => 
                        isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
