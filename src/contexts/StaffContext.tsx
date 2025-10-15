import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StaffContextType {
  isStaff: boolean;
  isAdmin: boolean;
  staffEmail: string | null;
  canManageRooms: boolean;
  canManageEvents: boolean;
  canManageSnacks: boolean;
  canModerateGallery: boolean;
  canManageGuides: boolean;
  canManageSupport: boolean;
  canManageStaff: boolean;
}

const StaffContext = createContext<StaffContextType | undefined>(undefined);

export const useStaff = () => {
  const context = useContext(StaffContext);
  if (context === undefined) {
    throw new Error('useStaff must be used within a StaffProvider');
  }
  return context;
};

export const StaffProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.email?.endsWith('@staffportal.com')) {
      setIsStaff(true);
      setStaffEmail(user.email);
      
      // Check if admin
      if (user.email.toLowerCase() === 'admin@staffportal.com') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
        // Load role assignments for staff
        loadRoleAssignments();
      }
    } else {
      setIsStaff(false);
      setIsAdmin(false);
      setStaffEmail(null);
      setRoleAssignments({});
    }
  }, [user]);

  const loadRoleAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_role_assignments' as any)
        .select('role, assigned_email');

      if (error) throw error;

      const assignments: Record<string, string> = {};
      (data as any)?.forEach((assignment: any) => {
        assignments[assignment.role] = assignment.assigned_email.toLowerCase();
      });
      setRoleAssignments(assignments);
    } catch (error) {
      console.error('Error loading role assignments:', error);
    }
  };

  const userEmailLower = user?.email?.toLowerCase() || '';

  const value = {
    isStaff,
    isAdmin,
    staffEmail,
    canManageRooms: roleAssignments['booking'] === userEmailLower,
    canManageEvents: roleAssignments['events_programs'] === userEmailLower,
    canManageSnacks: roleAssignments['snacks'] === userEmailLower,
    canModerateGallery: roleAssignments['gallery'] === userEmailLower,
    canManageGuides: roleAssignments['guides'] === userEmailLower,
    canManageSupport: roleAssignments['support'] === userEmailLower,
    canManageStaff: isAdmin,
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
};
