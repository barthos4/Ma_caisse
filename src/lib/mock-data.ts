
"use client";

import type { Transaction, Category } from '@/types';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from '@/hooks/use-auth.tsx';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { parseISO, isValid, format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';


// --- Categories ---
export const useCategories = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [errorCategories, setErrorCategories] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!user) {
      setCategories([]);
      setIsLoadingCategories(false);
      return;
    }
    setIsLoadingCategories(true);
    setErrorCategories(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setCategories(data || []);
    } catch (e: any) {
      console.error("Erreur de chargement des catégories:", e);
      setErrorCategories(e.message || "Erreur de chargement des catégories.");
    } finally {
      setIsLoadingCategories(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCategories();
    } else {
      setIsLoadingCategories(false);
      setCategories([]);
    }
  }, [user, fetchCategories]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id'>): Promise<Category | null> => {
    if (!user) {
      setErrorCategories("Utilisateur non authentifié pour ajouter une catégorie.");
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
        // Optimistic update or re-fetch
        fetchCategories(); // Re-fetch for consistency
        return addedCategory;
      }
      return null;
    } catch (e: any) {
      console.error("Erreur d'ajout de catégorie:", e);
      setErrorCategories(e.message || "Erreur d'ajout de catégorie.");
      return null;
    }
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };
  
  const updateCategory = async (id: string, updatedData: Partial<Omit<Category, 'id' | 'user_id'>>): Promise<boolean> => {
     if (!user) {
      setErrorCategories("Utilisateur non authentifié pour modifier une catégorie.");
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
      fetchCategories(); // Re-fetch for consistency
      return true;
    } catch (e: any) {
      console.error("Erreur de mise à jour de catégorie:", e);
      setErrorCategories(e.message || "Erreur de mise à jour de catégorie.");
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (!user) {
      setErrorCategories("Utilisateur non authentifié pour supprimer une catégorie.");
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
        setErrorCategories("Impossible de supprimer la catégorie car elle est utilisée dans des transactions.");
        return false;
      }
      
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      fetchCategories(); // Re-fetch for consistency
      return true;
    } catch (e: any) {
      console.error("Erreur de suppression de catégorie:", e);
      setErrorCategories(e.message || "Erreur de suppression de catégorie.");
      return false;
    }
  };

  return { 
    categories, 
    isLoadingCategories, 
    errorCategories, 
    addCategory, 
    getCategoryById, 
    updateCategory, 
    deleteCategory, 
    fetchCategories 
  };
};


// --- Transactions ---
export interface TransactionFilters {
  searchTerm?: string;
  dateRange?: DateRange;
}

export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [errorTransactions, setErrorTransactions] = useState<string | null>(null);

  const fetchTransactions = useCallback(async (filters?: TransactionFilters) => {
    if (!user) {
      setTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }
    setIsLoadingTransactions(true);
    setErrorTransactions(null);
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

      if (fetchError) {
        console.error('Supabase fetch error (transactions):', fetchError);
        throw fetchError;
      }

      const formattedData = (data || []).map(t => {
        const dateObj = parseISO(t.date as string); // Assuming t.date is string from Supabase
        return {
          ...t,
          date: isValid(dateObj) ? dateObj : new Date(), 
          orderNumber: t.order_number || '', 
          categoryId: t.category_id || '', 
          // Ensure all fields from Transaction type are mapped
          amount: t.amount,
          description: t.description,
          id: t.id,
          reference: t.reference || undefined,
          type: t.type as 'income' | 'expense',
        } as Transaction; 
      });
      setTransactions(formattedData);

    } catch (e: any) {
      console.error("Erreur détaillée de chargement des transactions:", e);
      let displayError = "Erreur de chargement des transactions.";
      if (e && e.message) {
        if (e.message.toLowerCase().includes("failed to fetch")) {
          displayError = "Erreur de réseau : Impossible de joindre le serveur de données. Vérifiez votre connexion internet et les paramètres de Supabase.";
        } else {
          displayError = e.message; // Other types of errors (e.g., Supabase specific errors)
        }
      } else if (typeof e === 'string') {
        displayError = e;
      }
      setErrorTransactions(displayError);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [user]);

  useEffect(() => {
     if (user) {
      fetchTransactions();
    } else {
      setIsLoadingTransactions(false);
      setTransactions([]);
    }
  }, [user, fetchTransactions]);

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction | null> => {
    if (!user) {
      setErrorTransactions("Utilisateur non authentifié pour ajouter une transaction.");
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
        console.error("Erreur Supabase lors de l'ajout de transaction:", insertError);
        throw insertError;
      }

      if (data) {
        fetchTransactions(); // Re-fetch to update list
        const dateObj = parseISO(data.date as string);
        return {
          id: data.id,
          categoryId: data.category_id || '',
          orderNumber: data.order_number || '',
          date: isValid(dateObj) ? dateObj : new Date(),
          description: data.description,
          reference: data.reference || undefined,
          amount: data.amount,
          type: data.type as 'income' | 'expense',
        };
      }
      return null;
    } catch (e: any) {
      const supabaseError = e as { message?: string; details?: string; code?: string; hint?: string };
      const errorMessage = supabaseError.message || "Erreur d'ajout de transaction inconnue.";
      const errorDetails = supabaseError.details ? `Détails: ${supabaseError.details}` : '';
      const errorCode = supabaseError.code ? `Code: ${supabaseError.code}` : '';
      const errorHint = supabaseError.hint ? `Hint: ${supabaseError.hint}`: '';
      
      console.error(`Erreur d'ajout de transaction: ${errorMessage}`, errorCode, errorDetails, errorHint, e);
      setErrorTransactions(`${errorMessage}${errorDetails ? ` (${errorDetails})` : ''}`);
      return null;
    }
  };


  const getTransactionById = (id: string): Transaction | undefined => {
    return transactions.find(t => t.id === id);
  };

  const updateTransaction = async (id: string, updatedData: Partial<Omit<Transaction, 'id' | 'user_id'>>): Promise<boolean> => {
    if (!user) {
      setErrorTransactions("Utilisateur non authentifié pour modifier une transaction.");
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
      fetchTransactions();
      return true;
    } catch (e: any) {
      console.error("Erreur de mise à jour de transaction:", e);
      setErrorTransactions(e.message || "Erreur de mise à jour de transaction.");
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!user) {
      setErrorTransactions("Utilisateur non authentifié pour supprimer une transaction.");
      return false;
    }
    try {
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      fetchTransactions();
      return true;
    } catch (e: any) {
      console.error("Erreur de suppression de transaction:", e);
      setErrorTransactions(e.message || "Erreur de suppression de transaction.");
      return false;
    }
  };
  
  return { 
    transactions, 
    isLoadingTransactions, 
    errorTransactions, 
    addTransaction, 
    getTransactionById, 
    updateTransaction, 
    deleteTransaction,
    fetchTransactions
  };
};


// --- Derived Data & Helpers ---
export interface MonthlyTrendData {
  month: string;
  income: number;
  expenses: number;
}

export const useDashboardData = () => {
  const { 
    transactions, 
    isLoadingTransactions: isLoadingTransactionsHook, 
    errorTransactions: errorTransactionsHook, 
    fetchTransactions: fetchTransactionsFromHook 
  } = useTransactions();
  const { 
    categories,
    getCategoryById, 
    isLoadingCategories: isLoadingCategoriesHook, 
    errorCategories: errorCategoriesHook, 
    fetchCategories: fetchCategoriesFromHook
  } = useCategories();
  const { user } = useAuth();

  const [dashboardIsLoading, setDashboardIsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        // Initial call handled by individual hooks based on user state
        // This effect will mainly react to loading state changes from those hooks
      } else {
        setDashboardIsLoading(false); // Not logged in, nothing to load for dashboard
      }
    };
    loadData();
  }, [user]);

 useEffect(() => {
    // Update dashboard loading state based on the loading states of its data sources
    if (user) {
      setDashboardIsLoading(isLoadingTransactionsHook || isLoadingCategoriesHook);
      if (errorTransactionsHook) {
        setDashboardError(errorTransactionsHook);
      } else if (errorCategoriesHook) {
        setDashboardError(errorCategoriesHook);
      } else {
        setDashboardError(null);
      }
    } else {
      setDashboardIsLoading(false);
      setDashboardError(null);
    }
  }, [user, isLoadingTransactionsHook, isLoadingCategoriesHook, errorTransactionsHook, errorCategoriesHook]);


  const { totalIncome, totalExpenses, currentBalance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    transactions.forEach(t => {
      const transactionMonth = t.date.getMonth();
      const transactionYear = t.date.getFullYear();
      if (transactionMonth === currentMonth && transactionYear === currentYear) {
        if (t.type === 'income') {
          income += t.amount;
        } else {
          expenses += t.amount;
        }
      }
    });
    // Calculate overall balance from ALL transactions, not just current month
    let overallIncome = 0;
    let overallExpenses = 0;
    transactions.forEach(t => {
      if (t.type === 'income') overallIncome += t.amount;
      else overallExpenses += t.amount;
    });
    return { 
      totalIncome: income, // This month's income
      totalExpenses: expenses, // This month's expenses
      currentBalance: overallIncome - overallExpenses // Overall balance
    };
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
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return transactions
      .filter(t => t.type === 'expense' && t.categoryId && t.date.getMonth() === currentMonth && t.date.getFullYear() === currentYear)
      .reduce((acc, t) => {
        const categoryName = getCategoryById(t.categoryId!)?.name || 'Non classé';
        acc[categoryName] = (acc[categoryName] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>);
  }, [transactions, getCategoryById]);

  const monthlyTrendData = useMemo(() => {
    if (!transactions || transactions.length === 0) return [];
    const trend: MonthlyTrendData[] = [];
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
    error: dashboardError
  };
};
