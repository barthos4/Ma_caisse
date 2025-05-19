
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Corrected import

const AUTH_KEY = 'gc_auth_state'; // GESTION CAISSE auth state

interface AuthState {
  isAuthenticated: boolean;
  user: { email: string } | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({ isAuthenticated: false, user: null });
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedState = localStorage.getItem(AUTH_KEY);
      if (storedState) {
        setAuthState(JSON.parse(storedState));
      }
    } catch (error) {
      console.error("Erreur lors de la lecture de l'état d'authentification:", error);
      // Si localStorage n'est pas accessible ou corrompu, on part d'un état non authentifié.
      localStorage.removeItem(AUTH_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, _password?: string): Promise<boolean> => {
    // Simuler un appel API et une vérification de mot de passe
    // Dans une vraie application, vous feriez une requête fetch/axios ici
    // et vérifieriez les identifiants côté serveur.
    
    // Pour la simulation, on accepte n'importe quel mot de passe si l'email est fourni
    if (email) {
      const newAuthState = { isAuthenticated: true, user: { email } };
      localStorage.setItem(AUTH_KEY, JSON.stringify(newAuthState));
      setAuthState(newAuthState);
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (email: string, _password?: string): Promise<boolean> => {
    // Simuler une inscription
    // Dans une vraie application, vous enverriez les données au serveur pour créer un utilisateur.
     if (email) {
      const newAuthState = { isAuthenticated: true, user: { email } }; // Auto-login after signup
      localStorage.setItem(AUTH_KEY, JSON.stringify(newAuthState));
      setAuthState(newAuthState);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    setAuthState({ isAuthenticated: false, user: null });
    router.replace('/login'); // Rediriger vers la page de connexion après la déconnexion
  }, [router]);

  return {
    ...authState,
    isLoading,
    login,
    signup,
    logout,
  };
}
