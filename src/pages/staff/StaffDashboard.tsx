import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaff } from '@/contexts/StaffContext';
import { Settings, Calendar, Coffee, Image, BookOpen, HelpCircle, Bell } from 'lucide-react';

export default function StaffDashboard() {
  const { staffRole, staffEmail, isAdmin, canManageRooms, canManageEvents, canManageSnacks, canModerateGallery, canManageGuides, canManageSupport, canManageStaff } = useStaff();

  const roleInfo = {
    admin: { name: 'Admin', role: 'System Administrator', icon: Settings, color: 'bg-red-600' },
    sara: { name: 'Sara', role: 'Room Manager', icon: Settings, color: 'bg-blue-500' },
    ahmed: { name: 'Ahmed', role: 'Events Manager', icon: Calendar, color: 'bg-green-500' },
    farah: { name: 'Farah', role: 'Snacks Manager', icon: Coffee, color: 'bg-orange-500' },
    ali: { name: 'Ali', role: 'Gallery Moderator', icon: Image, color: 'bg-purple-500' },
    noor: { name: 'Noor', role: 'Content Manager', icon: BookOpen, color: 'bg-pink-500' },
    mohamed: { name: 'Mohamed', role: 'Support Manager', icon: HelpCircle, color: 'bg-red-500' },
  };

  const currentRole = staffRole ? roleInfo[staffRole] : null;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Staff Portal</h1>
        <p className="text-muted-foreground">
          Welcome to the Pixoul staff management system
        </p>
      </div>

      {currentRole && (
        <Card className="border-l-4" style={{ borderLeftColor: currentRole.color }}>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${currentRole.color} text-white`}>
                <currentRole.icon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{currentRole.name}</CardTitle>
                <p className="text-sm text-muted-foreground">{currentRole.role}</p>
              </div>
              <Badge variant="secondary" className="ml-auto">{staffEmail}</Badge>
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {canManageStaff && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Staff Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Assign and manage staff role assignments
              </p>
            </CardContent>
          </Card>
        )}

        {canManageRooms && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Room Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Edit room details, manage photos, and process bookings
              </p>
            </CardContent>
          </Card>
        )}

        {canManageEvents && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Create events, manage registrations, and send notifications
              </p>
            </CardContent>
          </Card>
        )}

        {canManageSnacks && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coffee className="h-5 w-5" />
                Snacks Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add items, upload photos, and manage availability
              </p>
            </CardContent>
          </Card>
        )}

        {canModerateGallery && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Gallery Moderation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Review and approve user posts, remove violations
              </p>
            </CardContent>
          </Card>
        )}

        {canManageGuides && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Content Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage guides and announcements for guests
              </p>
            </CardContent>
          </Card>
        )}

        {canManageSupport && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Support Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Process guest feedback and manage live chat
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
