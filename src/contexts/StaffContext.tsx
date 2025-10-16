import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StaffContextType {
  isStaff: boolean;
  isAdmin: boolean;
  staffEmail: string | null;
  staffRole: 'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed' | null;
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
  const [staffRole, setStaffRole] = useState<'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed' | null>(null);
  const [permissions, setPermissions] = useState({
    canManageRooms: false,
    canManageEvents: false,
    canManageSnacks: false,
    canModerateGallery: false,
    canManageGuides: false,
    canManageSupport: false,
    canManageStaff: false,
  });

  useEffect(() => {
    const loadStaffPermissions = async () => {
      if (!user?.email?.endsWith('@staffportal.com')) {
        setIsStaff(false);
        setIsAdmin(false);
        setStaffEmail(null);
        setStaffRole(null);
        setPermissions({
          canManageRooms: false,
          canManageEvents: false,
          canManageSnacks: false,
          canModerateGallery: false,
          canManageGuides: false,
          canManageSupport: false,
          canManageStaff: false,
        });
        return;
      }

      setIsStaff(true);
      setStaffEmail(user.email);

      // Check if admin
      const adminEmail = user.email.toLowerCase();
      if (adminEmail === 'admin@staffportal.com') {
        setIsAdmin(true);
        setStaffRole(null);
        setPermissions({
          canManageRooms: false,
          canManageEvents: false,
          canManageSnacks: false,
          canModerateGallery: false,
          canManageGuides: false,
          canManageSupport: false,
          canManageStaff: true,
        });
        return;
      }

      // For non-admin staff, load from database
      setIsAdmin(false);
      const { data: assignments } = await supabase
        .from('staff_role_assignments')
        .select('role, assigned_email');

      if (assignments) {
        const userEmailLower = user.email.toLowerCase();
        const newPermissions = {
          canManageRooms: assignments.some(a => a.role === 'booking' && a.assigned_email.toLowerCase() === userEmailLower),
          canManageEvents: assignments.some(a => a.role === 'events_programs' && a.assigned_email.toLowerCase() === userEmailLower),
          canManageSnacks: assignments.some(a => a.role === 'snacks' && a.assigned_email.toLowerCase() === userEmailLower),
          canModerateGallery: assignments.some(a => a.role === 'gallery' && a.assigned_email.toLowerCase() === userEmailLower),
          canManageGuides: assignments.some(a => a.role === 'guides' && a.assigned_email.toLowerCase() === userEmailLower),
          canManageSupport: assignments.some(a => a.role === 'support' && a.assigned_email.toLowerCase() === userEmailLower),
          canManageStaff: false,
        };
        setPermissions(newPermissions);

        // Set legacy staffRole for dashboard display
        const emailPrefix = user.email.split('@')[0].toLowerCase();
        if (['sara', 'ahmed', 'farah', 'ali', 'noor', 'mohamed'].includes(emailPrefix)) {
          setStaffRole(emailPrefix as any);
        }
      }
    };

    loadStaffPermissions();
  }, [user]);

  const value = {
    isStaff,
    isAdmin,
    staffEmail,
    staffRole,
    ...permissions,
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
};
