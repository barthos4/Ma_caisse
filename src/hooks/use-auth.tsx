
"use client";

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User, AuthError as SupabaseAuthError, Subscription } from '@supabase/supabase-js';

// Explicitly type AuthError to match what Supabase returns, which extends Error
type AuthError = SupabaseAuthError | Error | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ error: AuthError }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsLoading(true);
    const getInitialSession = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setIsLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, sessionState: Session | null) => {
        setSession(sessionState);
        setUser(sessionState?.user ?? null);
        setIsLoading(false);

        if (event === 'SIGNED_OUT') {
          if (pathname !== '/login') { // Removed /signup check
            router.replace('/login');
          }
        } else if (event === 'SIGNED_IN') {
          if (pathname === '/login') { // Removed /signup check
             router.replace('/');
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, pathname]);

  const loginCallback = useCallback(async (email: string, password?: string): Promise<{ error: AuthError }> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password! });
    setIsLoading(false);
    return { error };
  }, []);

  const logoutCallback = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await supabase.auth.signOut();
    // setUser(null); // Handled by onAuthStateChange
    // setSession(null); // Handled by onAuthStateChange
    // No need to manually set isLoading to false here if onAuthStateChange handles it
  }, []);
  
  const contextValue: AuthContextType = {
    user,
    session,
    isLoading,
    login: loginCallback,
    logout: logoutCallback,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
