import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface StaffContextType {
  isStaff: boolean;
  staffEmail: string | null;
  staffRole: 'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed' | null;
  canManageRooms: boolean;
  canManageEvents: boolean;
  canManageSnacks: boolean;
  canModerateGallery: boolean;
  canManageGuides: boolean;
  canManageSupport: boolean;
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
  const [staffRole, setStaffRole] = useState<'sara' | 'ahmed' | 'farah' | 'ali' | 'noor' | 'mohamed' | null>(null);

  useEffect(() => {
    if (user?.email?.endsWith('@staffportal.com')) {
      setIsStaff(true);
      setStaffEmail(user.email);
      
      // Determine role based on email
      const emailPrefix = user.email.split('@')[0].toLowerCase();
      if (['sara', 'ahmed', 'farah', 'ali', 'noor', 'mohamed'].includes(emailPrefix)) {
        setStaffRole(emailPrefix as any);
      }
    } else {
      setIsStaff(false);
      setStaffEmail(null);
      setStaffRole(null);
    }
  }, [user]);

  const value = {
    isStaff,
    staffEmail,
    staffRole,
    canManageRooms: staffRole === 'sara',
    canManageEvents: staffRole === 'ahmed',
    canManageSnacks: staffRole === 'farah',
    canModerateGallery: staffRole === 'ali',
    canManageGuides: staffRole === 'noor',
    canManageSupport: staffRole === 'mohamed',
  };

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
};
