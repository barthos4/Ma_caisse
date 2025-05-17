"use client";
import { useState } from "react";
import { TransactionForm } from "./transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit2, Trash2 } from "lucide-react";
import type { Transaction } from "@/types";
import { useTransactions, useCategories } from "@/lib/mock-data";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCFA } from "@/lib/utils";

export default function TransactionsPage() {
  const { getTransactions, deleteTransaction } = useTransactions();
  const { getCategoryById } = useCategories();
  const transactions = getTransactions();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
      deleteTransaction(id);
    }
  };

  const getTransactionTypeName = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Revenu' : 'Dépense';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Gérez vos revenus et dépenses.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddTransaction} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Ajouter une Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Modifier" : "Ajouter"} une Transaction</DialogTitle>
            </DialogHeader>
            <TransactionForm 
              transactionToEdit={editingTransaction} 
              onFormSubmit={() => setIsFormOpen(false)} 
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historique des Transactions</CardTitle>
          <CardDescription>Une liste de toutes vos activités financières enregistrées.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Aucune transaction pour le moment. Cliquez sur "Ajouter une Transaction" pour commencer.
                  </TableCell>
                </TableRow>
              )}
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{format(transaction.date, 'PP', { locale: fr })}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{transaction.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{getCategoryById(transaction.categoryId)?.name || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'income' ? 'default' : 'outline'} className={transaction.type === 'income' ? 'bg-accent text-accent-foreground border-accent' : ''}>
                      {getTransactionTypeName(transaction.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${transaction.type === 'income' ? 'text-accent-foreground' : 'text-destructive'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrencyCFA(transaction.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(transaction)} className="mr-1" aria-label="Modifier">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(transaction.id)} className="text-destructive hover:text-destructive" aria-label="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
