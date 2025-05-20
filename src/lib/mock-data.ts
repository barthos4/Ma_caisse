
"use client";

import type { Transaction, Category } from '@/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from '@/hooks/use-auth.tsx';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { parseISO, isValid, format, subMonths, addMonths, startOfMonth, endOfMonth, isSameMonth } from 'date-fns'; 
import { fr } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';


// --- Categories ---
export const useCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (e: any) {
      console.error("Erreur de chargement des catégories:", e.message || e);
      setError(e.message || "Erreur de chargement des catégories.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    } else {
      // Si l'utilisateur se déconnecte, vider les catégories et arrêter le chargement
      setIsLoading(false);
      setCategories([]);
    }
  }, [user, fetchCategories]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id'>): Promise<Category | null> => {
    if (!user) {
      setError("Utilisateur non authentifié pour ajouter une catégorie.");
      return null;
    }
    const newCategoryData: TablesInsert<'categories'> = { ...categoryData, user_id: user.id };
    try {
      const { data, error: insertError } = await supabase
        .from('categories')
        .insert(newCategoryData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      if (data) {
        const addedCategory: Category = {
            id: data.id,
            name: data.name,
            type: data.type as 'income' | 'expense',
        };
        setCategories(prev => [...prev, addedCategory].sort((a,b) => a.name.localeCompare(b.name, 'fr')));
        return addedCategory;
      }
      return null;
    } catch (e: any) {
      console.error("Erreur d'ajout de catégorie:", e.message || e);
      setError(e.message || "Erreur d'ajout de catégorie.");
      return null;
    }
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };
  
  const updateCategory = async (id: string, updatedData: Partial<Omit<Category, 'id' | 'user_id'>>): Promise<boolean> => {
     if (!user) {
      setError("Utilisateur non authentifié pour modifier une catégorie.");
      return false;
    }
    const categoryUpdate: TablesUpdate<'categories'> = { ...updatedData, updated_at: new Date().toISOString() };
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update(categoryUpdate)
        .eq('id', id)
        .eq('user_id', user.id); 

      if (updateError) throw updateError;
      
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } as Category : c).sort((a,b) => a.name.localeCompare(b.name, 'fr')));
      return true;
    } catch (e: any) {
      console.error("Erreur de mise à jour de catégorie:", e.message || e);
      setError(e.message || "Erreur de mise à jour de catégorie.");
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (!user) {
      setError("Utilisateur non authentifié pour supprimer une catégorie.");
      return false;
    }
    
    try {
      const { count, error: checkError } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', id)
        .eq('user_id', user.id);

      if (checkError) throw checkError;

      if (count && count > 0) {
        setError("Impossible de supprimer la catégorie car elle est utilisée dans des transactions.");
        return false;
      }
      
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (e: any) {
      console.error("Erreur de suppression de catégorie:", e.message || e);
      setError(e.message || "Erreur de suppression de catégorie.");
      return false;
    }
  };

  return { categories, getCategories: () => categories, isLoading, error, addCategory, getCategoryById, updateCategory, deleteCategory, fetchCategories };
};


// --- Transactions ---
export interface TransactionFilters {
  searchTerm?: string;
  dateRange?: DateRange;
}

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (filters?.searchTerm && filters.searchTerm.trim() !== '') {
        const searchTerm = `%${filters.searchTerm.trim()}%`;
        query = query.or(`description.ilike.${searchTerm},reference.ilike.${searchTerm}`);
      }
      if (filters?.dateRange?.from) {
        query = query.gte('date', filters.dateRange.from.toISOString().split('T')[0]);
      }
      if (filters?.dateRange?.to) {
        query = query.lte('date', filters.dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error: fetchError } = await query.order('date', { ascending: false }); 

      if (fetchError) throw fetchError;

      const formattedData = (data || []).map(t => {
        const dateObj = parseISO(t.date);
        return {
          ...t,
          date: isValid(dateObj) ? dateObj : new Date(), 
          orderNumber: t.order_number || '', 
          categoryId: t.category_id || '', 
        } as Transaction; 
      });
      setTransactions(formattedData);

    } catch (e: any) {
      console.error("Erreur de chargement des transactions:", e.message || e);
      setError(e.message || "Erreur de chargement des transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
     if (user) {
      fetchTransactions(); // Fetch initial transactions without filters
    } else {
      setIsLoading(false);
      setTransactions([]);
    }
  }, [user, fetchTransactions]); // fetchTransactions is now stable due to useCallback

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction | null> => {
    if (!user) {
      setError("Utilisateur non authentifié pour ajouter une transaction.");
      return null;
    }

    const newTransactionData: TablesInsert<'transactions'> = {
      user_id: user.id,
      date: transactionData.date.toISOString().split('T')[0],
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      category_id: transactionData.categoryId || null,
      order_number: transactionData.orderNumber || null,
      reference: transactionData.reference || null,
    };

    try {
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactionData)
        .select()
        .single();
      
      if (insertError) {
        console.error("Erreur Supabase lors de l'ajout:", insertError);
        throw insertError;
      }

      if (data) {
        const dateObj = parseISO(data.date);
        const addedTransaction: Transaction = {
          id: data.id,
          // user_id: data.user_id, // Not part of Transaction type for client
          categoryId: data.category_id || '',
          orderNumber: data.order_number || '',
          date: isValid(dateObj) ? dateObj : new Date(),
          description: data.description,
          reference: data.reference || undefined,
          amount: data.amount,
          type: data.type as 'income' | 'expense',
        };
        // Optimistic update or re-fetch
        // setTransactions(prev => [addedTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
        fetchTransactions(); // Re-fetch to get the latest list including the new one with current filters
        return addedTransaction;
      }
      return null;
    } catch (e: any) {
      const errorMessage = e.message || "Erreur d'ajout de transaction inconnue.";
      const errorDetails = e.details || (e.data ? JSON.stringify(e.data) : '');
      const errorCode = e.code || '';
      console.error(`Erreur d'ajout de transaction: ${errorMessage}`, `Code: ${errorCode}`, `Détails: ${errorDetails}`, e);
      setError(`${errorMessage}${errorDetails ? ` (Détails: ${errorDetails})` : ''}`);
      return null;
    }
  };


  const getTransactionById = (id: string): Transaction | undefined => {
    return transactions.find(t => t.id === id);
  };

  const updateTransaction = async (id: string, updatedData: Partial<Omit<Transaction, 'id' | 'user_id'>>): Promise<boolean> => {
    if (!user) {
      setError("Utilisateur non authentifié pour modifier une transaction.");
      return false;
    }
    
    const transactionUpdate: TablesUpdate<'transactions'> = {
        updated_at: new Date().toISOString(),
        ...(updatedData.date && { date: updatedData.date.toISOString().split('T')[0] }),
        ...(updatedData.description && { description: updatedData.description }),
        ...(updatedData.amount && { amount: updatedData.amount }),
        ...(updatedData.type && { type: updatedData.type }),
        ...(updatedData.categoryId && { category_id: updatedData.categoryId }),
        ...(updatedData.hasOwnProperty('orderNumber') && { order_number: updatedData.orderNumber || null }),
        ...(updatedData.hasOwnProperty('reference') && { reference: updatedData.reference || null }),
    };

    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(transactionUpdate)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      // Optimistic update or re-fetch
      // setTransactions(prev => prev.map(t => { ... }).sort((a,b) => ...));
      fetchTransactions(); // Re-fetch to get the latest list
      return true;
    } catch (e: any) {
      console.error("Erreur de mise à jour de transaction:", e.message || e);
      setError(e.message || "Erreur de mise à jour de transaction.");
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!user) {
      setError("Utilisateur non authentifié pour supprimer une transaction.");
      return false;
    }
    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      // Optimistic update or re-fetch
      // setTransactions(prev => prev.filter(t => t.id !== id));
      fetchTransactions(); // Re-fetch to get the latest list
      return true;
    } catch (e: any) {
      console.error("Erreur de suppression de transaction:", e.message || e);
      setError(e.message || "Erreur de suppression de transaction.");
      return false;
    }
  };
  
  return { 
    transactions, 
    getTransactions: () => transactions, 
    isLoading, 
    error, 
    addTransaction, 
    getTransactionById, 
    updateTransaction, 
    deleteTransaction,
    fetchTransactions // Expose fetchTransactions for manual refresh or filtering
  };
};


// --- Derived Data & Helpers ---
export interface MonthlyTrendData {
  month: string;
  income: number;
  expenses: number;
}

export const useDashboardData = () => {
  const { transactions, isLoading: isLoadingTransactionsHook, error: errorTransactionsHook, fetchTransactions: fetchTransactionsFromHook } = useTransactions();
  const { getCategoryById, isLoading: isLoadingCategories, error: errorCategories, fetchCategories } = useCategories();
  const { user } = useAuth();

  // Renommer pour éviter la confusion avec les variables locales
  const [dashboardIsLoading, setDashboardIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setDashboardIsLoading(true);
        setDashboardError(null);
        try {
          // Ces fonctions sont déjà appelées dans leurs hooks respectifs au changement de user
          // Mais nous voulons nous assurer qu'elles sont à jour pour le dashboard
          await fetchTransactionsFromHook(); // Assurez-vous que cela retourne une promesse ou gérez l'état de chargement
          await fetchCategories(); // Idem
        } catch (err: any) {
          setDashboardError(err.message || "Erreur de chargement des données du tableau de bord");
        } finally {
          setDashboardIsLoading(isLoadingTransactionsHook || isLoadingCategories);
        }
      } else {
        setDashboardIsLoading(false);
      }
    };
    loadData();
  }, [user, fetchTransactionsFromHook, fetchCategories, isLoadingCategories, isLoadingTransactionsHook]);
  
  const { totalIncome, totalExpenses, currentBalance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach(t => {
      if (t.type === 'income') {
        income += t.amount;
      } else {
        expenses += t.amount;
      }
    });
    return { totalIncome: income, totalExpenses: expenses, currentBalance: income - expenses };
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map(t => ({
        ...t,
        categoryName: getCategoryById(t.categoryId!)?.name || 'Non classé'
      }));
  }, [transactions, getCategoryById]);
  
  const spendingSummary = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && t.categoryId)
      .reduce((acc, t) => {
        const categoryName = getCategoryById(t.categoryId!)?.name || 'Non classé';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions, getCategoryById]);

  const monthlyTrendData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const trend: MonthlyTrendData[] = [];
    // Afficher les 6 derniers mois incluant le mois actuel
    const firstMonth = startOfMonth(subMonths(new Date(), 5));

    for (let i = 0; i < 6; i++) {
      const currentMonthStart = startOfMonth(addMonths(firstMonth, i));
      const currentMonthEnd = endOfMonth(currentMonthStart);
      const monthKey = format(currentMonthStart, 'MMM yy', { locale: fr });
      
      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      transactions.forEach(t => {
        if (t.date >= currentMonthStart && t.date <= currentMonthEnd) {
          if (t.type === 'income') {
            monthlyIncome += t.amount;
          } else {
            monthlyExpenses += t.amount;
          }
        }
      });
      trend.push({ month: monthKey, income: monthlyIncome, expenses: monthlyExpenses });
    }
    return trend;
  }, [transactions]);

  return { 
    currentBalance, 
    totalIncome, 
    totalExpenses, 
    recentTransactions, 
    spendingSummary, 
    monthlyTrendData,
    isLoading: dashboardIsLoading, 
    error: dashboardError || errorTransactionsHook || errorCategories 
  };
};
