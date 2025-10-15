import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaff } from '@/contexts/StaffContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, Calendar, Coffee, Image, BookOpen, HelpCircle, Users } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const { isAdmin, canManageRooms, canManageEvents, canManageSnacks, canModerateGallery, canManageGuides, canManageSupport } = useStaff();

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Staff Portal</h1>
        <p className="text-muted-foreground">
          Welcome to the Pixoul staff management system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary text-primary-foreground">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <CardTitle>Staff Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isAdmin ? 'Administrator' : 'Staff Member'}
              </p>
            </div>
            <Badge variant="secondary" className="ml-auto">{user?.email}</Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Staff Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Assign features to staff members
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
