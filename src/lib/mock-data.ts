
"use client";

import type { Transaction, Category } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from '@/hooks/use-auth.tsx'; // Updated import path
import type { Tables, TablesInsert, TablesUpdate } from '@/types/supabase';
import { parseISO } from 'date-fns'; // Pour convertir les strings de date de Supabase en objets Date


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
      console.error("Erreur de chargement des catégories:", e);
      setError(e.message || "Erreur de chargement.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'user_id'>): Promise<Category | null> => {
    if (!user) {
      setError("Utilisateur non authentifié.");
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
        setCategories(prev => [...prev, data].sort((a,b) => a.name.localeCompare(b.name, 'fr')));
        return data;
      }
      return null;
    } catch (e: any) {
      console.error("Erreur d'ajout de catégorie:", e);
      setError(e.message || "Erreur d'ajout.");
      return null;
    }
  };

  const getCategoryById = (id: string): Category | undefined => {
    return categories.find(c => c.id === id);
  };
  
  const updateCategory = async (id: string, updatedData: Partial<Omit<Category, 'id' | 'user_id'>>): Promise<boolean> => {
     if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    const categoryUpdate: TablesUpdate<'categories'> = { ...updatedData, updated_at: new Date().toISOString() };
    try {
      const { error: updateError } = await supabase
        .from('categories')
        .update(categoryUpdate)
        .eq('id', id)
        .eq('user_id', user.id); // Assurer que l'utilisateur modifie sa propre catégorie

      if (updateError) throw updateError;
      
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updatedData } : c).sort((a,b) => a.name.localeCompare(b.name, 'fr')));
      return true;
    } catch (e: any) {
      console.error("Erreur de mise à jour de catégorie:", e);
      setError(e.message || "Erreur de mise à jour.");
      return false;
    }
  };

  const deleteCategory = async (id: string): Promise<boolean> => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    // Vérifier si la catégorie est utilisée (côté client pour l'instant)
    // Idéalement, cela devrait être géré par des contraintes de DB ou une logique backend
    const transactionsUsingCategory = await supabase
        .from('transactions')
        .select('id', { count: 'exact' })
        .eq('category_id', id)
        .eq('user_id', user.id);

    if (transactionsUsingCategory.count && transactionsUsingCategory.count > 0) {
      alert("Impossible de supprimer la catégorie car elle est utilisée dans des transactions.");
      return false;
    }
    
    try {
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setCategories(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (e: any) {
      console.error("Erreur de suppression de catégorie:", e);
      setError(e.message || "Erreur de suppression.");
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
        .order('date', { ascending: false }); // Les plus récentes en premier pour l'affichage principal

      if (fetchError) throw fetchError;

      // Convertir les dates de string en objets Date
      const formattedData = (data || []).map(t => ({
        ...t,
        date: parseISO(t.date), // t.date est un string 'YYYY-MM-DD'
      }));
      setTransactions(formattedData as Transaction[]); // Cast après formatage

    } catch (e: any) {
      console.error("Erreur de chargement des transactions:", e);
      setError(e.message || "Erreur de chargement.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'user_id'>): Promise<Transaction | null> => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return null;
    }
    const newTransactionData: TablesInsert<'transactions'> = {
      ...transactionData,
      user_id: user.id,
      date: transactionData.date.toISOString().split('T')[0], // Format YYYY-MM-DD
      category_id: transactionData.categoryId || null,
      order_number: transactionData.orderNumber || null, // N° d'ordre est optionnel
      reference: transactionData.reference || null,
    };
    // @ts-ignore
    delete newTransactionData.categoryId; // Supabase attend category_id, pas categoryId

    try {
      const { data, error: insertError } = await supabase
        .from('transactions')
        .insert(newTransactionData)
        .select()
        .single();
      
      if (insertError) throw insertError;

      if (data) {
        const addedTransaction = { ...data, date: parseISO(data.date) } as Transaction;
        setTransactions(prev => [addedTransaction, ...prev].sort((a, b) => b.date.getTime() - a.date.getTime()));
        return addedTransaction;
      }
      return null;
    } catch (e: any) {
      console.error("Erreur d'ajout de transaction:", e);
      setError(e.message || "Erreur d'ajout.");
      return null;
    }
  };

  const getTransactionById = (id: string): Transaction | undefined => {
    return transactions.find(t => t.id === id);
  };

  const updateTransaction = async (id: string, updatedData: Partial<Omit<Transaction, 'id' | 'user_id'>>): Promise<boolean> => {
    if (!user) {
      setError("Utilisateur non authentifié.");
      return false;
    }
    
    const transactionUpdate: TablesUpdate<'transactions'> = {
        ...updatedData,
        updated_at: new Date().toISOString(),
        ...(updatedData.date && { date: updatedData.date.toISOString().split('T')[0] }),
        ...(updatedData.categoryId && { category_id: updatedData.categoryId }),
        order_number: updatedData.orderNumber || null, // N° d'ordre est optionnel
        reference: updatedData.reference || null,
    };
    // @ts-ignore
    if ('categoryId' in transactionUpdate) delete transactionUpdate.categoryId;


    try {
      const { error: updateError } = await supabase
        .from('transactions')
        .update(transactionUpdate)
        .eq('id', id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updatedData, date: updatedData.date || t.date } : t)
                                 .sort((a, b) => b.date.getTime() - a.date.getTime()));
      return true;
    } catch (e: any) {
      console.error("Erreur de mise à jour de transaction:", e);
      setError(e.message || "Erreur de mise à jour.");
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!user) {
      setError("Utilisateur non authentifié.");
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
      console.error("Erreur de suppression de transaction:", e);
      setError(e.message || "Erreur de suppression.");
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
  const { transactions, isLoading: isLoadingTransactions, error: errorTransactions } = useTransactions();
  const { categories, getCategoryById, isLoading: isLoadingCategories, error: errorCategories } = useCategories();

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

  const recentTransactions = transactions.slice(0, 5).map(t => ({
    ...t,
    categoryName: getCategoryById(t.categoryId!)?.name || 'N/A' // categoryId peut être null
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
