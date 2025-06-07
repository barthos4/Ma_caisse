
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
      try {
        // This call might internally try to use a refresh token.
        // If the refresh token is invalid, Supabase logs the error,
        // and this call should ideally return an error or a null session.
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          // This will catch errors like "Invalid Refresh Token" if getSession itself surfaces it.
          console.error("Error getting initial session from Supabase (likely due to invalid token):", error);
          setSession(null);
          setUser(null);
        } else {
          setSession(currentSession); // currentSession will be null if token was invalid and refresh failed
          setUser(currentSession?.user ?? null);
        }
      } catch (e) { // Catch any other unexpected errors during getSession
        console.error("Exception caught during getInitialSession:", e);
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false); // Critical: ensure loading state is resolved
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      // The onAuthStateChange listener is crucial for handling session state changes,
      // including when a session becomes invalid after a failed token refresh.
      async (event: AuthChangeEvent, sessionState: Session | null) => {
        setSession(sessionState);
        setUser(sessionState?.user ?? null);
        setIsLoading(false); // Ensure loading is false after any auth state changes

        // Navigation logic based on new auth state
        if (event === 'SIGNED_OUT' || (!sessionState && event !== 'INITIAL_SESSION' && event !== 'USER_DELETED')) {
          if (pathname !== '/login') {
            router.replace('/login');
          }
        } else if (event === 'SIGNED_IN') {
          if (pathname === '/login') {
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

