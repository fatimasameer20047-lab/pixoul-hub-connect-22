import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface RoleAssignment {
  id: string;
  role: string;
  assigned_email: string;
}

const FEATURE_NAMES: Record<string, string> = {
  booking: "Room Management",
  events_programs: "Events Management",
  snacks: "Snacks Management",
  gallery: "Gallery Moderation",
  guides: "Guides Management",
  support: "Support Management",
};

export default function StaffManagement() {
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("staff_role_assignments" as any)
        .select("*")
        .order("role");

      if (error) throw error;
      setAssignments((data as any) || []);
    } catch (error) {
      console.error("Error loading assignments:", error);
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
    setAssignments((prev) =>
      prev.map((assignment) =>
        assignment.id === roleId
          ? { ...assignment, assigned_email: newEmail }
          : assignment
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("staff_role_assignments" as any)
        .upsert(
          assignments.map((assignment) => ({
            id: assignment.id,
            role: assignment.role,
            assigned_email: assignment.assigned_email.toLowerCase().trim(),
          }))
        );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff assignments updated successfully",
      });
      
      // Reload to reflect changes
      await loadAssignments();
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast({
        title: "Error",
        description: "Failed to save staff assignments",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
          <CardDescription>
            Assign staff members to manage different features by their Supabase email address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {assignments.map((assignment) => (
            <div key={assignment.id} className="space-y-2">
              <Label htmlFor={`email-${assignment.id}`}>
                {FEATURE_NAMES[assignment.role] || assignment.role}
              </Label>
              <Input
                id={`email-${assignment.id}`}
                type="email"
                value={assignment.assigned_email}
                onChange={(e) => handleEmailChange(assignment.id, e.target.value)}
                placeholder="staff@staffportal.com"
              />
            </div>
          ))}
          
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
