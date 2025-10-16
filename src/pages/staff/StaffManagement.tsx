import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Calendar, Coffee, Image, BookOpen, Bell, HelpCircle, Loader } from 'lucide-react';

interface FeatureAssignment {
  role: string;
  assigned_email: string;
  feature_name: string;
  icon: any;
}

const FEATURES: FeatureAssignment[] = [
  { role: 'booking', assigned_email: '', feature_name: 'Room Management', icon: Settings },
  { role: 'events_programs', assigned_email: '', feature_name: 'Events Management', icon: Calendar },
  { role: 'snacks', assigned_email: '', feature_name: 'Snacks Management', icon: Coffee },
  { role: 'gallery', assigned_email: '', feature_name: 'Gallery Moderation', icon: Image },
  { role: 'guides', assigned_email: '', feature_name: 'Guides Management', icon: BookOpen },
  { role: 'support', assigned_email: '', feature_name: 'Support Management', icon: HelpCircle },
];

const STAFF_EMAILS = [
  'sara@staffportal.com',
  'ahmed@staffportal.com',
  'farah@staffportal.com',
  'ali@staffportal.com',
  'noor@staffportal.com',
  'mohamed@staffportal.com',
];

export default function StaffManagement() {
  const [assignments, setAssignments] = useState<FeatureAssignment[]>(FEATURES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_role_assignments')
        .select('role, assigned_email');

      if (error) throw error;

      if (data) {
        const updatedAssignments = FEATURES.map(feature => {
          const assignment = data.find(a => a.role === feature.role);
          return {
            ...feature,
            assigned_email: assignment?.assigned_email || '',
          };
        });
        setAssignments(updatedAssignments);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load staff assignments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (role: string, email: string) => {
    setAssignments(prev =>
      prev.map(a => (a.role === role ? { ...a, assigned_email: email } : a))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = assignments.map(a => ({
        role: a.role,
        assigned_email: a.assigned_email,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('staff_role_assignments')
          .upsert(update, { onConflict: 'role' });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Staff assignments updated successfully',
      });

      // Reload to refresh permissions
      window.location.reload();
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to save staff assignments',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
        <p className="text-muted-foreground">
          Assign features to staff members by selecting their email addresses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Assignments</CardTitle>
          <CardDescription>
            Choose which staff member is responsible for each feature
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {assignments.map((assignment) => (
            <div key={assignment.role} className="flex items-center gap-4 p-4 border rounded-lg">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <assignment.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <Label htmlFor={assignment.role} className="text-base font-medium">
                  {assignment.feature_name}
                </Label>
              </div>
              <div className="w-64">
                <Select
                  value={assignment.assigned_email}
                  onValueChange={(email) => handleEmailChange(assignment.role, email)}
                >
                  <SelectTrigger id={assignment.role}>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_EMAILS.map((email) => (
                      <SelectItem key={email} value={email}>
                        {email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
