
"use client";

import type { Transaction, Category } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from '@/hooks/use-auth.tsx';
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { parseISO, isValid } from 'date-fns'; 


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
        // Ensure correct typing for the returned category
        const addedCategory: Category = {
            id: data.id,
            name: data.name,
            type: data.type as 'income' | 'expense',
            // user_id: data.user_id, // user_id is not part of Category type
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
        // alert("Impossible de supprimer la catégorie car elle est utilisée dans des transactions.");
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
export const useTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false }); 

      if (fetchError) throw fetchError;

      const formattedData = (data || []).map(t => {
        const dateObj = parseISO(t.date);
        return {
          ...t,
          date: isValid(dateObj) ? dateObj : new Date(), // Fallback to new Date() if parseISO fails
          orderNumber: t.order_number || '', // Ensure orderNumber is string
          categoryId: t.category_id || '', // Ensure categoryId is string
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
      fetchTransactions();
    } else {
      setIsLoading(false);
      setTransactions([]);
    }
  }, [user, fetchTransactions]);

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction | null> => {
    if (!user) {
      setError("Utilisateur non authentifié pour ajouter une transaction.");
      return null;
    }

    // Explicitly construct the object for Supabase
    const newTransactionData: TablesInsert<'transactions'> = {
      user_id: user.id,
      date: transactionData.date.toISOString().split('T')[0], // Format YYYY-MM-DD
      description: transactionData.description,
      amount: transactionData.amount,
      type: transactionData.type,
      category_id: transactionData.categoryId || null, // categoryId from form is a string or null
      order_number: transactionData.orderNumber || null, // orderNumber from form is string or null
      reference: transactionData.reference || null,     // reference from form is string or null
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
          user_id: data.user_id,
          categoryId: data.category_id || '',
          orderNumber: data.order_number || '',
          date: isValid(dateObj) ? dateObj : new Date(),
          description: data.description,
          reference: data.reference || undefined,
          amount: data.amount,
          type: data.type as 'income' | 'expense',
        };
        setTransactions(prev => [addedTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
        return addedTransaction;
      }
      return null;
    } catch (e: any) {
      // Log more detailed error if available
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
      
      setTransactions(prev => prev.map(t => {
        if (t.id === id) {
            const newDate = updatedData.date ? (isValid(updatedData.date) ? updatedData.date : t.date) : t.date;
            return { ...t, ...updatedData, date: newDate } as Transaction;
        }
        return t;
        }).sort((a, b) => b.date.getTime() - a.date.getTime()));
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
      setTransactions(prev => prev.filter(t => t.id !== id));
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
    fetchTransactions
  };
};


// --- Derived Data & Helpers ---
export const useDashboardData = () => {
  const { transactions, isLoading: isLoadingTransactions, error: errorTransactions, fetchTransactions } = useTransactions();
  const { getCategoryById, isLoading: isLoadingCategories, error: errorCategories, fetchCategories } = useCategories();
  const { user } = useAuth();

  // Refetch data if user changes or if an error occurs (could indicate stale data)
  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
    }
  }, [user, fetchTransactions, fetchCategories]);


  const isLoading = isLoadingTransactions || isLoadingCategories;
  const error = errorTransactions || errorCategories;

  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
    } else {
      totalExpenses += t.amount;
    }
  });
  
  const currentBalance = totalIncome - totalExpenses;

  // Sort transactions by date descending for recentTransactions
  const sortedTransactions = [...transactions].sort((a,b) => b.date.getTime() - a.date.getTime());

  const recentTransactions = sortedTransactions.slice(0, 5).map(t => ({
    ...t,
    categoryName: getCategoryById(t.categoryId!)?.name || 'Non classé' 
  }));
  
  const spendingSummary = transactions
    .filter(t => t.type === 'expense' && t.categoryId)
    .reduce((acc, t) => {
      const categoryName = getCategoryById(t.categoryId!)?.name || 'Non classé';
      acc[categoryName] = (acc[categoryName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  return { currentBalance, totalIncome, totalExpenses, recentTransactions, spendingSummary, isLoading, error };
};
