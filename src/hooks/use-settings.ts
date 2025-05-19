
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { AppSettings } from '@/types';

const SETTINGS_KEY = 'gc_app_settings'; // GESTION CAISSE app settings

const defaultSettings: AppSettings = {
  companyName: "Mon Entreprise", // Default value
  companyAddress: "123 Rue Principale, Ville, Pays", // Default value
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(SETTINGS_KEY);
      if (storedSettings) {
        setSettings(JSON.parse(storedSettings));
      } else {
        // If no settings found, save default settings to localStorage
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
      }
    } catch (error) {
      console.error("Erreur lors de la lecture des paramètres de l'application:", error);
      // Fallback to default settings and try to save them
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaultSettings));
    }
    setIsLoading(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    try {
      const updated = { ...settings, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      setSettings(updated);
      return true;
    } catch (error) {
      console.error("Erreur lors de la sauvegarde des paramètres de l'application:", error);
      return false;
    }
  }, [settings]);

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
