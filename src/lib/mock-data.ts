// NOTE: This is a simplified in-memory data store for demonstration purposes.
// In a real application, you would use a database and proper state management.
"use client";

import type { Transaction, Category } from '@/types';
import { useState, useEffect, useCallback } from 'react';

let nextTransactionId = 1; 
let nextCategoryId = 1;    

const initialTransactions: Transaction[] = []; 
const initialCategories: Category[] = [];   


// --- Transactions ---
let transactionsStore: Transaction[] = [...initialTransactions];
const transactionListeners: Set<() => void> = new Set();

const notifyTransactionListeners = () => {
  transactionListeners.forEach(listener => listener());
};

export const useTransactions = () => {
  const [, forceUpdate] = useState({});
  
  useEffect(() => {
    const listener = () => forceUpdate({});
    transactionListeners.add(listener);
    return () => transactionListeners.delete(listener);
  }, []);

  const getTransactions = useCallback(() => [...transactionsStore].sort((a, b) => b.date.getTime() - a.date.getTime()), []);
  
  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { 
      ...transaction, 
      id: String(nextTransactionId++),
      orderNumber: transaction.orderNumber || undefined,
      reference: transaction.reference || undefined,
    };
    transactionsStore = [newTransaction, ...transactionsStore];
    notifyTransactionListeners();
  }, []);

  const getTransactionById = useCallback((id: string): Transaction | undefined => {
    return transactionsStore.find(t => t.id === id);
  }, []);

  const updateTransaction = useCallback((id: string, updatedTransactionData: Partial<Omit<Transaction, 'id'>>) => {
    transactionsStore = transactionsStore.map(t => 
      t.id === id ? { 
        ...t, 
        ...updatedTransactionData,
        orderNumber: updatedTransactionData.orderNumber || t.orderNumber,
        reference: updatedTransactionData.reference || t.reference,
      } : t
    );
    notifyTransactionListeners();
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    transactionsStore = transactionsStore.filter(t => t.id !== id);
    notifyTransactionListeners();
  }, []);
  
  return { getTransactions, addTransaction, getTransactionById, updateTransaction, deleteTransaction };
};


// --- Categories ---
let categoriesStore: Category[] = [...initialCategories];
const categoryListeners: Set<() => void> = new Set();

const notifyCategoryListeners = () => {
  categoryListeners.forEach(listener => listener());
};

export const useCategories = () => {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const listener = () => forceUpdate({});
    categoryListeners.add(listener);
    return () => categoryListeners.delete(listener);
  }, []);

  const getCategories = useCallback(() => [...categoriesStore].sort((a,b) => a.name.localeCompare(b.name, 'fr')), []);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const newCategory: Category = { ...category, id: String(nextCategoryId++) };
    categoriesStore = [...categoriesStore, newCategory];
    notifyCategoryListeners();
  }, []);

  const getCategoryById = useCallback((id: string): Category | undefined => {
    return categoriesStore.find(c => c.id === id);
  }, []);
  
  const updateCategory = useCallback((id: string, updatedCategoryData: Partial<Omit<Category, 'id'>>) => {
    categoriesStore = categoriesStore.map(c => 
      c.id === id ? { ...c, ...updatedCategoryData } : c
    );
    notifyCategoryListeners();
  }, []);

  const deleteCategory = useCallback((id: string) => {
    const isUsed = transactionsStore.some(t => t.categoryId === id);
    if (isUsed) {
      alert("Impossible de supprimer la catégorie car elle est utilisée dans des transactions.");
      return false;
    }
    categoriesStore = categoriesStore.filter(c => c.id !== id);
    notifyCategoryListeners();
    return true;
  }, []);

  return { getCategories, addCategory, getCategoryById, updateCategory, deleteCategory };
};

// --- Derived Data & Helpers ---
export const useDashboardData = () => {
  const { getTransactions } = useTransactions();
  const { getCategoryById } = useCategories();
  const transactions = getTransactions();

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
    categoryName: getCategoryById(t.categoryId)?.name || 'N/A'
  }));
  
  const spendingSummary = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const categoryName = getCategoryById(t.categoryId)?.name || 'Non classé';
      acc[categoryName] = (acc[categoryName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  return { currentBalance, totalIncome, totalExpenses, recentTransactions, spendingSummary };
};
