
"use client";

import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Mettre à jour la valeur débattue après le délai spécifié
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Annuler le timeout si la valeur change (ou si le composant est démonté)
    // Ceci est important pour éviter de mettre à jour la valeur débattue
    // si la valeur change rapidement dans l'intervalle de délai.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Ne ré-exécuter l'effet que si la valeur ou le délai change

  return debouncedValue;
}
