
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './use-auth'; // Pour obtenir user.id
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

const defaultSettings: AppSettings = {
  companyName: "Mon Entreprise",
  companyAddress: "123 Rue Principale, Ville, Pays",
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
        throw fetchError;
      }
      if (data) {
        setSettings(data);
      } else {
        // Si aucune donnée, on utilise les valeurs par défaut et on essaie de les insérer
        const initialSettingsData: TablesInsert<'app_settings'> = {
            user_id: user.id,
            company_name: defaultSettings.companyName,
            company_address: defaultSettings.companyAddress,
        };
        await supabase.from('app_settings').insert(initialSettingsData);
        setSettings(defaultSettings);
      }
    } catch (e: any) {
      console.error("Erreur lors de la lecture des paramètres de l'application:", e);
      setError(e.message || "Erreur de chargement des paramètres.");
      setSettings(defaultSettings); // Fallback
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Dépendance à user

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    setError(null);
    try {
      const settingsUpdate: TablesUpdate<'app_settings'> = {
        ...newSettings,
        user_id: user.id, // Assurez-vous que user_id est inclus car c'est la PK
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('app_settings')
        .upsert(settingsUpdate, { onConflict: 'user_id' }); // Upsert pour créer si n'existe pas ou mettre à jour

      if (updateError) throw updateError;
      
      // Re-fetch or update local state
      setSettings(prev => ({ ...prev, ...newSettings }));
      return true;
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde des paramètres de l'application:", e);
      setError(e.message || "Erreur de sauvegarde des paramètres.");
      return false;
    }
  }, [user, settings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings, // Exposer pour re-fetch manuel si besoin
  };
}
