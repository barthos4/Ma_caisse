// NOTE: This is a simplified in-memory data store for demonstration purposes.
// In a real application, you would use a database and proper state management.
"use client";

import type { Transaction, Category } from '@/types';
import { useState, useEffect, useCallback } from 'react';

let nextTransactionId = 4;
let nextCategoryId = 6;

const initialTransactions: Transaction[] = [
  { id: '1', date: new Date('2024-07-28'), description: 'Monthly Salary', amount: 3500, type: 'income', categoryId: '1' },
  { id: '2', date: new Date('2024-07-29'), description: 'Groceries from SuperMart', amount: 120.50, type: 'expense', categoryId: '2' },
  { id: '3', date: new Date('2024-07-30'), description: 'Apartment Rent', amount: 1200, type: 'expense', categoryId: '3' },
  { id: '4', date: new Date('2024-07-30'), description: 'Dinner with Friends', amount: 65.00, type: 'expense', categoryId: '5' },
  { id: '5', date: new Date('2024-07-31'), description: 'Freelance Project Payment', amount: 500, type: 'income', categoryId: '1' },
];

const initialCategories: Category[] = [
  { id: '1', name: 'Salary', type: 'income' },
  { id: '2', name: 'Groceries', type: 'expense' },
  { id: '3', name: 'Rent/Mortgage', type: 'expense' },
  { id: '4', name: 'Utilities', type: 'expense' },
  { id: '5', name: 'Dining Out', type: 'expense' },
  { id: '6', name: 'Transportation', type: 'expense' },
  { id: '7', name: 'Freelance', type: 'income' },
  { id: '8', name: 'Entertainment', type: 'expense' },
];


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
    const newTransaction: Transaction = { ...transaction, id: String(nextTransactionId++) };
    transactionsStore = [newTransaction, ...transactionsStore];
    notifyTransactionListeners();
  }, []);

  const getTransactionById = useCallback((id: string): Transaction | undefined => {
    return transactionsStore.find(t => t.id === id);
  }, []);

  const updateTransaction = useCallback((id: string, updatedTransactionData: Partial<Omit<Transaction, 'id'>>) => {
    transactionsStore = transactionsStore.map(t => 
      t.id === id ? { ...t, ...updatedTransactionData } : t
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

  const getCategories = useCallback(() => [...categoriesStore].sort((a,b) => a.name.localeCompare(b.name)), []);

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
    // Prevent deleting categories used in transactions (basic check)
    const isUsed = transactionsStore.some(t => t.categoryId === id);
    if (isUsed) {
      alert("Cannot delete category as it is used in transactions.");
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

  const currentBalance = transactions.reduce((acc, t) => {
    return t.type === 'income' ? acc + t.amount : acc - t.amount;
  }, 0);

  const recentTransactions = transactions.slice(0, 5).map(t => ({
    ...t,
    categoryName: getCategoryById(t.categoryId)?.name || 'N/A'
  }));
  
  const spendingSummary = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const categoryName = getCategoryById(t.categoryId)?.name || 'Uncategorized';
      acc[categoryName] = (acc[categoryName] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  return { currentBalance, recentTransactions, spendingSummary };
};
