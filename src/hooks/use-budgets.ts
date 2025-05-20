
"use client";

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { TablesInsert, TablesUpdate, Database } from '@/types/supabase';
import { useAuth } from './use-auth.tsx';
import { startOfMonth, formatISO } from 'date-fns';

export type BudgetEntry = Database['public']['Tables']['budgets']['Row'];

export function useBudgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgetsForPeriod = useCallback(async (periodStartDate: Date) => {
    if (!user) {
      setBudgets([]);
      return;
    }
    setIsLoading(true);
    setError(null);

    const formattedPeriodStartDate = formatISO(startOfMonth(periodStartDate), { representation: 'date' });

    try {
      const { data, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', user.id)
        .eq('period_start_date', formattedPeriodStartDate);

      if (fetchError) throw fetchError;
      setBudgets(data || []);
    } catch (e: any) {
      console.error("Erreur de chargement des budgets:", e);
      setError(e.message || "Erreur de chargement des budgets.");
      setBudgets([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const upsertBudget = async (
    categoryId: string,
    periodStartDate: Date,
    amount: number,
    type: 'income' | 'expense'
  ): Promise<BudgetEntry | null> => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return null;
    }
    setIsLoading(true); // Peut-être un autre état pour le saving
    setError(null);

    const formattedPeriodStartDate = formatISO(startOfMonth(periodStartDate), { representation: 'date' });

    const budgetData: TablesInsert<'budgets'> = {
      user_id: user.id,
      category_id: categoryId,
      period_start_date: formattedPeriodStartDate,
      amount,
      type,
    };

    try {
      // Tenter un upsert. Conflit sur (user_id, category_id, period_start_date)
      const { data, error: upsertError } = await supabase
        .from('budgets')
        .upsert(budgetData, { 
            onConflict: 'user_id,category_id,period_start_date',
            // ignoreDuplicates: false, // default is false, will update existing
         })
        .select()
        .single();

      if (upsertError) throw upsertError;

      // Mettre à jour l'état local des budgets
      if (data) {
        setBudgets(prevBudgets => {
          const existingIndex = prevBudgets.findIndex(
            b => b.category_id === categoryId && b.period_start_date === formattedPeriodStartDate
          );
          if (existingIndex > -1) {
            const updatedBudgets = [...prevBudgets];
            updatedBudgets[existingIndex] = data;
            return updatedBudgets;
          }
          return [...prevBudgets, data];
        });
        return data;
      }
      return null;
    } catch (e: any) {
      console.error("Erreur lors de la sauvegarde du budget:", e);
      setError(e.message || "Erreur lors de la sauvegarde du budget.");
      return null;
    } finally {
      setIsLoading(false); // Peut-être un autre état pour le saving
    }
  };

  return {
    budgets,
    fetchBudgetsForPeriod,
    upsertBudget,
    isLoadingBudgets: isLoading, // Renommé pour clarté
    budgetError: error, // Renommé pour clarté
  };
}
