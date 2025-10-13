import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StaffContextType {
  isStaff: boolean;
  staffEmail: string | null;
  staffRole: 'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed' | 'admin' | null;
  isAdmin: boolean;
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
  const [staffEmail, setStaffEmail] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed' | 'admin' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleAssignments, setRoleAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchRoleAssignments = async () => {
      if (!user?.email?.endsWith('@staffportal.com')) {
        setIsStaff(false);
        setStaffEmail(null);
        setStaffRole(null);
        setIsAdmin(false);
        return;
      }

      setIsStaff(true);
      setStaffEmail(user.email);

      // Check if admin
      if (user.email === 'admin@staffportal.com') {
        setIsAdmin(true);
        setStaffRole('admin');
        return;
      }

      // Fetch role assignments from database
      const { data: assignments } = await supabase
        .from('staff_role_assignments')
        .select('role, assigned_email');

      if (assignments) {
        const assignmentMap: Record<string, string> = {};
        assignments.forEach((a) => {
          assignmentMap[a.role] = a.assigned_email;
        });
        setRoleAssignments(assignmentMap);

        // Check if current user is assigned to any role
        const userRole = Object.entries(assignmentMap).find(
          ([_, email]) => email === user.email
        );

        if (userRole) {
          const [role] = userRole;
          // Map database role to legacy role names
          const roleMap: Record<string, 'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed'> = {
            'booking': 'sara',
            'events_programs': 'ahmed',
            'snacks': 'farah',
            'gallery': 'ali',
            'guides': 'noor',
            'support': 'mohamed',
          };
          setStaffRole(roleMap[role] || null);
        } else {
          setStaffRole(null);
        }
      }
    };

    fetchRoleAssignments();
  }, [user]);

  const value = {
    isStaff,
    staffEmail,
    staffRole,
    isAdmin,
    canManageRooms: isAdmin || roleAssignments['booking'] === user?.email,
    canManageEvents: isAdmin || roleAssignments['events_programs'] === user?.email,
    canManageSnacks: isAdmin || roleAssignments['snacks'] === user?.email,
    canModerateGallery: isAdmin || roleAssignments['gallery'] === user?.email,
    canManageGuides: isAdmin || roleAssignments['guides'] === user?.email,
    canManageSupport: isAdmin || roleAssignments['support'] === user?.email,
    canManageStaff: isAdmin,
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
};
