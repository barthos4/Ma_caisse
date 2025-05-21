
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
  companyContact: null,
};

const LOGO_BUCKET_NAME = 'companylogos'; // Correction du nom du bucket

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

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found, which is fine for new users
        throw fetchError;
      }
      if (data) {
        setSettings({
            companyName: data.company_name,
            companyAddress: data.company_address,
            companyLogoUrl: data.company_logo_url,
            rccm: data.rccm,
            niu: data.niu,
            companyContact: data.company_contact,
        });
      } else {
        setSettings(prev => ({...defaultSettings, user_id: user.id })); // Ensure user_id is set for potential upsert
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
    if (user) {
      fetchSettings();
    } else {
      setSettings(defaultSettings);
      setIsLoading(false);
    }
  }, [user, fetchSettings]);

  const uploadCompanyLogo = async (logoFile: File): Promise<{ publicUrl: string | null; error: string | null }> => {
    if (!user) {
      return { publicUrl: null, error: "Utilisateur non authentifié." };
    }
    setError(null);

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${user.id}/logo.${fileExt?.toLowerCase()}`; 
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET_NAME)
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true, 
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(LOGO_BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error("Impossible d'obtenir l'URL publique du logo téléversé.");
      }
      
      return { publicUrl: urlData.publicUrl, error: null };

    } catch (e: any) {
      console.error("Erreur de téléversement du logo (objet complet):", e);
      let errorMessage = "Erreur lors du téléversement du logo.";
      if (e && e.message) {
        errorMessage = e.message;
      }
      // Tentative d'obtenir plus de détails si c'est une erreur Supabase
      if (e && typeof e === 'object') {
        if ((e as any).details) errorMessage += ` Détails: ${(e as any).details}`;
        if ((e as any).code) errorMessage += ` Code: ${(e as any).code}`;
      }
      setError(errorMessage);
      return { publicUrl: null, error: errorMessage };
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<Omit<AppSettings, 'user_id'>>) => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    setError(null);

    try {
      const currentSettingsData = (await supabase.from('app_settings').select('*').eq('user_id', user.id).single()).data;

      const settingsToUpsert: TablesInsert<'app_settings'> = {
        user_id: user.id,
        company_name: newSettings.companyName !== undefined ? (newSettings.companyName || null) : (currentSettingsData?.company_name || null),
        company_address: newSettings.companyAddress !== undefined ? (newSettings.companyAddress || null) : (currentSettingsData?.company_address || null),
        company_logo_url: newSettings.companyLogoUrl !== undefined ? (newSettings.companyLogoUrl || null) : (currentSettingsData?.company_logo_url || null),
        rccm: newSettings.rccm !== undefined ? (newSettings.rccm || null) : (currentSettingsData?.rccm || null),
        niu: newSettings.niu !== undefined ? (newSettings.niu || null) : (currentSettingsData?.niu || null),
        company_contact: newSettings.companyContact !== undefined ? (newSettings.companyContact || null) : (currentSettingsData?.company_contact || null),
        updated_at: new Date().toISOString(),
      };
      
      const { data: upsertedData, error: upsertError } = await supabase
        .from('app_settings')
        .upsert(settingsToUpsert, { onConflict: 'user_id' })
        .select() 
        .single();

      if (upsertError) throw upsertError;
      
      if (upsertedData) {
        setSettings({
            companyName: upsertedData.company_name,
            companyAddress: upsertedData.company_address,
            companyLogoUrl: upsertedData.company_logo_url,
            rccm: upsertedData.rccm,
            niu: upsertedData.niu,
            companyContact: upsertedData.company_contact,
        });
      }
      return true;
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde des paramètres de l'application:", e);
      setError(e.message || "Erreur de sauvegarde des paramètres.");
      return false;
    }
  }, [user]); // settings n'est plus une dépendance directe pour éviter boucle si setSettings est appelé

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings,
    uploadCompanyLogo,
  };
}
