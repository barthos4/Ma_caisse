
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
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error getting initial session from Supabase:", error);
          // If there's an error (e.g., invalid refresh token), treat as no session
          setSession(null);
          setUser(null);
        } else {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
        }
      } catch (e) {
        console.error("Exception caught while getting initial session:", e);
        // Catch any other unexpected errors during getSession
        setSession(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, sessionState: Session | null) => {
        setSession(sessionState);
        setUser(sessionState?.user ?? null);
        setIsLoading(false); // Ensure loading is false after auth state changes

        if (event === 'SIGNED_OUT') {
          if (pathname !== '/login') {
            router.replace('/login');
          }
        } else if (event === 'SIGNED_IN') {
          if (pathname === '/login') {
             router.replace('/');
          }
        }
        // Handle TOKEN_REFRESHED or USER_UPDATED if necessary, though often just updating session/user is enough.
        // If a token refresh fails critically, Supabase should eventually set sessionState to null,
        // which would be handled like a SIGNED_OUT or lead to !isAuthenticated.
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, pathname]);

  const loginCallback = useCallback(async (email: string, password?: string): Promise<{ error: AuthError }> => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password! });
    setIsLoading(false); // Set loading to false regardless of outcome
    // onAuthStateChange will handle setting user/session and navigation on success
    return { error };
  }, []);

  const logoutCallback = useCallback(async (): Promise<void> => {
    setIsLoading(true); // Optional: indicate loading during logout
    await supabase.auth.signOut();
    // onAuthStateChange will handle clearing user/session and navigation
    // No need to manually set isLoading to false here if onAuthStateChange does it.
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
