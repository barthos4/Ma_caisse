
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
  companyContact: null, // Ajout du contact par défaut
};

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user) {
      setSettings(defaultSettings); 
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

      if (fetchError && fetchError.code !== 'PGRST116') { 
        throw fetchError;
      }
      if (data) {
        setSettings({
            companyName: data.company_name,
            companyAddress: data.company_address,
            companyLogoUrl: data.company_logo_url,
            rccm: data.rccm,
            niu: data.niu,
            companyContact: data.company_contact, // Mapping du nouveau champ
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (e: any) {
      console.error("Erreur lors de la lecture des paramètres de l'application:", e);
      setError(e.message || "Erreur de chargement des paramètres.");
      setSettings(defaultSettings); 
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
    setIsLoading(true); 
    setError(null);
    try {
      const currentDbSettings = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const settingsToUpsert: TablesInsert<'app_settings'> = { 
        user_id: user.id,
        company_name: newSettings.companyName !== undefined ? newSettings.companyName : (currentDbSettings.data?.company_name ?? settings.companyName),
        company_address: newSettings.companyAddress !== undefined ? newSettings.companyAddress : (currentDbSettings.data?.company_address ?? settings.companyAddress),
        company_logo_url: newSettings.companyLogoUrl !== undefined ? newSettings.companyLogoUrl : (currentDbSettings.data?.company_logo_url ?? settings.companyLogoUrl),
        rccm: newSettings.rccm !== undefined ? newSettings.rccm : (currentDbSettings.data?.rccm ?? settings.rccm),
        niu: newSettings.niu !== undefined ? newSettings.niu : (currentDbSettings.data?.niu ?? settings.niu),
        company_contact: newSettings.companyContact !== undefined ? newSettings.companyContact : (currentDbSettings.data?.company_contact ?? settings.companyContact), // Gestion du nouveau champ
        updated_at: new Date().toISOString(),
      };
      
      // Clean up undefined fields before upsert to avoid issues if a field was intentionally cleared
      for (const key in settingsToUpsert) {
        if (settingsToUpsert[key as keyof typeof settingsToUpsert] === undefined) {
          delete settingsToUpsert[key as keyof typeof settingsToUpsert];
        }
      }
      
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert(settingsToUpsert, { onConflict: 'user_id' });

      if (upsertError) throw upsertError;
      
      setSettings(prev => ({
        ...prev,
        ...newSettings 
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
