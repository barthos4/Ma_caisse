
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

const LOGO_BUCKET_NAME = 'companylogos';

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
            companyContact: data.company_contact,
        });
      } else {
        setSettings(prev => ({...defaultSettings, user_id: user.id }));
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
    if (!user || !user.id) {
      const authErrorMsg = "Utilisateur non authentifié ou ID utilisateur manquant.";
      console.error(authErrorMsg);
      setError(authErrorMsg);
      return { publicUrl: null, error: authErrorMsg };
    }
    setError(null); 

    const fileExt = logoFile.name.split('.').pop();
    const fileName = `${user.id}/logo.${fileExt?.toLowerCase()}`;
    
    console.log(`Attempting to upload to bucket: ${LOGO_BUCKET_NAME}, file: ${fileName}, file type: ${logoFile.type}, file size: ${logoFile.size}`);

    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET_NAME)
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase uploadError object:", JSON.stringify(uploadError, null, 2));
        let detailedErrorMessage = `Supabase Storage Error: ${uploadError.message || 'Unknown error'}`;
        const sbError = uploadError as any;
        if (sbError.statusCode) detailedErrorMessage += ` (Status: ${sbError.statusCode})`;
        if (sbError.error) detailedErrorMessage += ` (Details: ${sbError.error})`;
        if (sbError.stack) console.error("Upload error stack:", sbError.stack);
        setError(detailedErrorMessage);
        return { publicUrl: null, error: detailedErrorMessage };
      }

      const { data: urlData } = supabase.storage
        .from(LOGO_BUCKET_NAME)
        .getPublicUrl(fileName);

      if (!urlData || !urlData.publicUrl) {
        const urlErrorMsg = "Impossible d'obtenir l'URL publique du logo téléversé après succès.";
        console.error(urlErrorMsg);
        setError(urlErrorMsg);
        return { publicUrl: null, error: urlErrorMsg };
      }
      
      return { publicUrl: urlData.publicUrl, error: null };

    } catch (e: any) {
      console.error("--- BEGIN DETAILED ERROR LOG (uploadCompanyLogo catch block) ---");
      console.error("Raw error object 'e':", e);

      let processedMessage = "Erreur de téléversement du logo inconnue.";

      if (e instanceof Error) {
        processedMessage = `Error Name: ${e.name}, Message: ${e.message}`;
        if (e.stack) {
            console.error("Error Stack:", e.stack);
        }
        // Check if it's a DOMException which might have specific properties
        if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
            processedMessage += `, DOMException Code: ${e.code}`;
        }
      } else if (e && typeof e === 'object') {
        // Try to stringify, but be careful of circular references
        try {
            processedMessage = `Object Error: ${JSON.stringify(e, Object.getOwnPropertyNames(e), 2)}`;
        } catch (stringifyError) {
            processedMessage = `Object Error (could not stringify): ${Object.prototype.toString.call(e)}`;
        }
      } else if (e !== null && e !== undefined) {
        processedMessage = `Primitive Error: ${String(e)}`;
      }

      console.error("Processed error message for UI:", processedMessage);
      console.error("--- END DETAILED ERROR LOG ---");
      
      setError(processedMessage);
      return { publicUrl: null, error: processedMessage };
    }
  };

  const updateSettings = useCallback(async (newSettings: Partial<Omit<AppSettings, 'user_id'>>) => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    setError(null);

    try {
      const { data: currentSettingsData, error: fetchError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: no rows found
        throw fetchError;
      }

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
  }, [user]); 

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings,
    uploadCompanyLogo,
  };
}
