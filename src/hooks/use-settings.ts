
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

const LOGO_BUCKET_NAME = 'company_logos'; // Assurez-vous que ce nom correspond à votre bucket Supabase

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
        // Si aucune configuration n'existe pour l'utilisateur, nous pourrions insérer les valeurs par défaut
        // ou simplement utiliser les valeurs par défaut de l'état local.
        // Pour l'instant, nous utilisons les valeurs par défaut de l'état.
        setSettings(prev => ({...prev, user_id: user.id })); // Assurer que user_id est là pour un futur upsert
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
      // Reset to default if user logs out or is not available
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
    const fileName = `${user.id}/logo.${fileExt}`; // Chemin unique par utilisateur
    
    try {
      // Tenter de supprimer l'ancien logo s'il existe pour éviter les fichiers orphelins
      // Ceci est optionnel et peut être rendu plus robuste (lister les fichiers, etc.)
      // Pour l'instant, nous allons simplement essayer d'écraser avec upsert:true
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(LOGO_BUCKET_NAME)
        .upload(fileName, logoFile, {
          cacheControl: '3600',
          upsert: true, // Écrase le fichier s'il existe déjà au même chemin
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
      console.error("Erreur de téléversement du logo:", e);
      const errorMessage = e.message || "Erreur lors du téléversement du logo.";
      setError(errorMessage);
      return { publicUrl: null, error: errorMessage };
    }
  };


  const updateSettings = useCallback(async (newSettings: Partial<Omit<AppSettings, 'user_id'>>) => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    // setIsLoading(true); // Peut-être un état de sauvegarde distinct
    setError(null);

    try {
      const settingsToUpsert: TablesInsert<'app_settings'> = {
        user_id: user.id, // Toujours s'assurer que user_id est défini
        company_name: newSettings.companyName !== undefined ? newSettings.companyName : settings.companyName,
        company_address: newSettings.companyAddress !== undefined ? newSettings.companyAddress : settings.companyAddress,
        company_logo_url: newSettings.companyLogoUrl !== undefined ? newSettings.companyLogoUrl : settings.companyLogoUrl,
        rccm: newSettings.rccm !== undefined ? newSettings.rccm : settings.rccm,
        niu: newSettings.niu !== undefined ? newSettings.niu : settings.niu,
        company_contact: newSettings.companyContact !== undefined ? newSettings.companyContact : settings.companyContact,
        updated_at: new Date().toISOString(),
      };
      
      // Nettoyer les champs undefined pour l'upsert
      for (const key in settingsToUpsert) {
        if (settingsToUpsert[key as keyof typeof settingsToUpsert] === undefined) {
           // Garder null si c'est intentionnel, sinon utiliser la valeur existante de l'état
           const existingValue = settings[key as keyof AppSettings];
            if (existingValue === null || (newSettings as any)[key] === null) {
                 (settingsToUpsert as any)[key] = null;
            } else {
                (settingsToUpsert as any)[key] = existingValue;
            }
        }
         // Si la nouvelle valeur est une chaîne vide, la traiter comme null pour la BD (sauf si le champ doit être une chaîne vide)
        if (typeof (settingsToUpsert as any)[key] === 'string' && (settingsToUpsert as any)[key].trim() === '' && key !== 'companyName') { // companyName peut être une chaîne vide
            if ((newSettings as any)[key] === '') (settingsToUpsert as any)[key] = null;
        }
      }
      
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert(settingsToUpsert, { onConflict: 'user_id' })
        .select() // Pour obtenir la ligne mise à jour/insérée
        .single();

      if (upsertError) throw upsertError;
      
      // Mettre à jour l'état local avec les données de newSettings
      setSettings(prev => ({
        ...prev, // Conserver les anciennes valeurs non modifiées
        ...(newSettings.companyName !== undefined && { companyName: newSettings.companyName }),
        ...(newSettings.companyAddress !== undefined && { companyAddress: newSettings.companyAddress }),
        ...(newSettings.companyLogoUrl !== undefined && { companyLogoUrl: newSettings.companyLogoUrl }),
        ...(newSettings.rccm !== undefined && { rccm: newSettings.rccm }),
        ...(newSettings.niu !== undefined && { niu: newSettings.niu }),
        ...(newSettings.companyContact !== undefined && { companyContact: newSettings.companyContact }),
      }));
      // setIsLoading(false);
      return true;
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde des paramètres de l'application:", e);
      setError(e.message || "Erreur de sauvegarde des paramètres.");
      // setIsLoading(false);
      return false;
    }
  }, [user, settings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    fetchSettings,
    uploadCompanyLogo,
  };
}
