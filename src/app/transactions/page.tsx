
"use client";
import { useState, useEffect } from "react";
import { TransactionForm } from "./transaction-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Edit2, Trash2, Loader2 } from "lucide-react";
import type { Transaction } from "@/types";
import { useTransactions, useCategories } from "@/lib/mock-data";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCFA } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function TransactionsPage() {
  const { transactions, isLoading, error, deleteTransaction, fetchTransactions } = useTransactions();
  const { getCategoryById, categories: allCategories, isLoading: isLoadingCategories } = useCategories(); // Charger toutes les catégories pour le formulaire
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  useEffect(() => {
    if (error) {
      toast({ title: "Erreur", description: error, variant: "destructive" });
    }
  }, [error, toast]);

  const handleAddTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette transaction ?")) {
      const success = await deleteTransaction(id);
      if (success) {
        toast({ title: "Succès", description: "Transaction supprimée." });
      } else {
        toast({ title: "Erreur", description: "Impossible de supprimer la transaction.", variant: "destructive" });
      }
    }
  };

  const getTransactionTypeName = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Revenu' : 'Dépense';
  }

  const handleFormSubmit = () => {
    setIsFormOpen(false);
    fetchTransactions(); // Re-fetch transactions after add/edit
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Gérez vos revenus et dépenses.</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleAddTransaction} className="w-full sm:w-auto" disabled={isLoadingCategories}>
              {isLoadingCategories ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Ajouter une Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto print:hidden">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Modifier" : "Ajouter"} une Transaction</DialogTitle>
            </DialogHeader>
            {/* Passer 'allCategories' au formulaire pour qu'il ait les options */}
            <TransactionForm 
              transactionToEdit={editingTransaction} 
              onFormSubmit={handleFormSubmit}
              availableCategories={allCategories} 
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
          {isLoading && (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          {!isLoading && error && (
             <p className="text-center text-destructive">Erreur de chargement des transactions: {error}</p>
          )}
          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Ordre</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                      Aucune transaction pour le moment. Cliquez sur "Ajouter une Transaction" pour commencer.
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="max-w-[80px] truncate" title={transaction.orderNumber || undefined}>{transaction.orderNumber || '-'}</TableCell>
                    <TableCell>{format(transaction.date, 'PP', { locale: fr })}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate" title={transaction.description}>{transaction.description}</TableCell>
                    <TableCell className="max-w-[100px] truncate" title={transaction.reference || undefined}>{transaction.reference || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{getCategoryById(transaction.categoryId!)?.name || 'N/A'}</Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
