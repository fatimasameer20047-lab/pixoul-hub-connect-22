import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const isDemoMode = import.meta.env.DEMO_MODE === 'true';

  useEffect(() => {
    if (isDemoMode) {
      // Demo mode: create guest session
      const guestUser = {
        id: 'guest',
        email: 'guest@pixoul.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        aud: 'authenticated',
        role: 'authenticated',
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: { name: 'Guest User' },
        identities: [],
        factors: []
      } as User;

      const guestSession = {
        access_token: 'guest-token',
        refresh_token: 'guest-refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: guestUser
      } as Session;

      setUser(guestUser);
      setSession(guestSession);
      setIsLoading(false);
      return;
    }

    // Normal auth mode: use Supabase auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle auto-confirm for preview environment
        if (session?.user && !session.user.email_confirmed_at) {
          const isPreview = window.location.hostname.includes('lovableproject.com');
          if (isPreview) {
            try {
              await supabase.functions.invoke('auto-confirm-signup', {
                body: { email: session.user.email }
              });
              // Refresh session after confirmation
              setTimeout(() => {
                supabase.auth.refreshSession();
              }, 1000);
            } catch (error) {
              console.log('Auto-confirm failed:', error);
            }
          }
        }
        
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isDemoMode]);

  const signOut = async () => {
    if (isDemoMode) {
      // In demo mode, just reset to guest
      return;
    }
    
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
