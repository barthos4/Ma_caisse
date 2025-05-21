
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from './use-auth.tsx';
import type { TablesInsert, TablesUpdate } from '@/types/supabase';

const defaultSettings: AppSettings = {
  companyName: "Mon Entreprise",
  companyAddress: "123 Rue Principale, Ville, Pays",
  companyLogoUrl: null,
  rccm: null,
  niu: null,
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings); // Reset to default if no user
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
        setSettings({
            companyName: data.company_name,
            companyAddress: data.company_address,
            companyLogoUrl: data.company_logo_url,
            rccm: data.rccm,
            niu: data.niu,
        });
      } else {
        // No settings found, use defaults (they might be inserted on first update)
        setSettings(defaultSettings);
      }
    } catch (e: any) {
      console.error("Erreur lors de la lecture des paramètres de l'application:", e);
      setError(e.message || "Erreur de chargement des paramètres.");
      setSettings(defaultSettings); // Fallback
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    setIsLoading(true); // Indicate saving
    setError(null);
    try {
      const settingsToUpsert: TablesInsert<'app_settings'> = { // Use Insert type for upsert
        user_id: user.id, 
        company_name: newSettings.companyName !== undefined ? newSettings.companyName : settings.companyName,
        company_address: newSettings.companyAddress !== undefined ? newSettings.companyAddress : settings.companyAddress,
        company_logo_url: newSettings.companyLogoUrl !== undefined ? newSettings.companyLogoUrl : settings.companyLogoUrl,
        rccm: newSettings.rccm !== undefined ? newSettings.rccm : settings.rccm,
        niu: newSettings.niu !== undefined ? newSettings.niu : settings.niu,
        updated_at: new Date().toISOString(),
      };
      
      // Ensure we don't try to set undefined values if they were not in newSettings
      if (newSettings.companyName === undefined) delete (settingsToUpsert as any).company_name;
      if (newSettings.companyAddress === undefined) delete (settingsToUpsert as any).company_address;
      if (newSettings.companyLogoUrl === undefined) delete (settingsToUpsert as any).company_logo_url;
      if (newSettings.rccm === undefined) delete (settingsToUpsert as any).rccm;
      if (newSettings.niu === undefined) delete (settingsToUpsert as any).niu;


      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert(settingsToUpsert, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;
      
      // Update local state immediately with potentially merged settings
      setSettings(prev => ({
        ...prev,
        ...newSettings // Apply only the changes that were passed
      }));
      setIsLoading(false);
      return true;
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde des paramètres de l'application:", e);
      setError(e.message || "Erreur de sauvegarde des paramètres.");
      setIsLoading(false);
      return false;
    }
  }, [user, settings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings,
  };
}
