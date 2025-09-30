import { Home, Calendar, BookOpen, Coffee, Image, HelpCircle, Bell, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useStaff } from "@/contexts/StaffContext";

export function StaffSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { canManageRooms, canManageEvents, canManageSnacks, canModerateGallery, canManageGuides, canManageSupport } = useStaff();

  const staffItems = [
    { title: "Dashboard", url: "/staff", icon: Home, show: true },
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
    </Sidebar>
  );
}
