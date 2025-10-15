import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Save } from "lucide-react";

interface RoleAssignment {
  id: string;
  role: string;
  assigned_email: string;
}

const roleLabels: Record<string, { name: string; description: string }> = {
  'booking': { name: 'Room Management (Sara)', description: 'Manages rooms and booking processing' },
  'events_programs': { name: 'Event Management (Ahmed)', description: 'Manages events and programs' },
  'snacks': { name: 'Snacks & Drinks (Farah)', description: 'Manages snacks, drinks, and orders' },
  'gallery': { name: 'Gallery Moderation (Ali)', description: 'Moderates and approves public gallery' },
  'guides': { name: 'Guides & Announcements (Noor)', description: 'Manages guides and announcements' },
  'support': { name: 'Support & Chat (Mohamed)', description: 'Handles live chat and support' },
};

export default function StaffManagement() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      // First, ensure default assignments exist
      const allRoles = ['booking', 'events_programs', 'snacks', 'gallery', 'guides', 'support'];
      const defaultEmails: Record<string, string> = {
        'booking': 'sara@staffportal.com',
        'events_programs': 'ahmed@staffportal.com',
        'snacks': 'farah@staffportal.com',
        'gallery': 'ali@staffportal.com',
        'guides': 'noor@staffportal.com',
        'support': 'mohamed@staffportal.com',
      };

      // Seed default assignments if they don't exist
      for (const role of allRoles) {
        const { error: upsertError } = await supabase
          .from('staff_role_assignments')
          .upsert({
            role,
            assigned_email: defaultEmails[role],
          }, {
            onConflict: 'role',
            ignoreDuplicates: true,
          });

        if (upsertError) {
          console.error('Error seeding role:', role, upsertError);
        }
      }

      // Now fetch all assignments
      const { data, error } = await supabase
        .from('staff_role_assignments')
        .select('*')
        .order('role');

      if (error) throw error;
      
      setAssignments(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load staff assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (roleId: string, newEmail: string) => {
    setAssignments(prev =>
      prev.map(a => a.id === roleId ? { ...a, assigned_email: newEmail } : a)
    );
  };

  const handleSave = async (assignment: RoleAssignment) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('staff_role_assignments')
        .upsert({
          role: assignment.role,
          assigned_email: assignment.assigned_email.toLowerCase(),
        }, {
          onConflict: 'role'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${roleLabels[assignment.role].name} assignment`,
      });

      // Refresh assignments to get the correct IDs
      await fetchAssignments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update assignment",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading staff assignments...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Staff Management</h1>
        </div>
        <p className="text-muted-foreground">
          Assign or reassign staff email addresses to different roles. Each role grants access to specific management areas.
        </p>
      </div>

      <div className="space-y-4">
        {assignments.map((assignment) => (
          <Card key={assignment.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {roleLabels[assignment.role].name}
              </CardTitle>
              <CardDescription>
                {roleLabels[assignment.role].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label htmlFor={`email-${assignment.id}`}>Email Address</Label>
                  <Input
                    id={`email-${assignment.id}`}
                    type="email"
                    value={assignment.assigned_email}
                    onChange={(e) => handleEmailChange(assignment.id, e.target.value)}
                    placeholder="staff@staffportal.com"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => handleSave(assignment)}
                    disabled={saving}
                    size="default"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6 bg-muted/50">
        <CardHeader>
          <CardTitle className="text-base">Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• The assigned user must have an account in Supabase with the specified email ending in @staffportal.com</p>
          <p>• Changes take effect immediately upon save</p>
          <p>• The previous staff member will lose access to the role once reassigned</p>
          <p>• Admin account (admin@staffportal.com) has access to all roles by default</p>
        </CardContent>
      </Card>
    </div>
  );
}
