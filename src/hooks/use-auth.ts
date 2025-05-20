
"use client";

import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ error: Error | null }>;
  signup: (email: string, password?: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, sessionState: Session | null) => {
        setSession(sessionState);
        setUser(sessionState?.user ?? null);
        setIsLoading(false);

        // Gérer les redirections ici ou dans MainLayout
        if (event === 'SIGNED_OUT') {
          if (pathname !== '/login' && pathname !== '/signup') {
            router.replace('/login');
          }
        } else if (event === 'SIGNED_IN') {
          if (pathname === '/login' || pathname === '/signup') {
             router.replace('/');
          }
        }
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, [router, pathname]);

  const login = useCallback(async (email: string, password?: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: password! });
    setIsLoading(false);
    return { error };
  }, []);

  const signup = useCallback(async (email: string, password?: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({ email, password: password! });
    // Supabase envoie un email de confirmation par défaut.
    // Pour la simulation, nous pourrions vouloir connecter l'utilisateur directement
    // ou gérer l'état "en attente de confirmation".
    // Pour l'instant, on ne fait rien de plus ici après l'inscription.
    setIsLoading(false);
    return { error };
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    // La redirection est gérée par onAuthStateChange
    setIsLoading(false);
  }, []);

  const value = {
    user,
    session,
    isLoading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
