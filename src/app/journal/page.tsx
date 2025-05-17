
"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTransactions, useCategories } from "@/lib/mock-data";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCFA } from "@/lib/utils";
import { Download, Edit2, Trash2 } from "lucide-react";
import type { Transaction } from "@/types";
import { TransactionForm } from "@/app/transactions/transaction-form"; // Importer le formulaire

export default function JournalPage() {
  const { getTransactions, deleteTransaction } = useTransactions();
  const { getCategoryById } = useCategories();
  
  // Pour la modal d'édition
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Récupérer les transactions à chaque rendu pour refléter les mises à jour
  const transactions = getTransactions(); 

  const journalEntries = useMemo(() => {
    let runningBalance = 0;
    return transactions
      .slice() 
      .sort((a, b) => a.date.getTime() - b.date.getTime()) 
      .map(t => {
        if (t.type === 'income') {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
        return {
          ...t,
          categoryName: getCategoryById(t.categoryId)?.name || 'Non classé(e)',
          balance: runningBalance,
        };
      })
      .reverse(); 
  }, [transactions, getCategoryById]);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette transaction du journal ?")) {
      deleteTransaction(id);
      // Le re-render sera déclenché par la mise à jour de `transactionsStore` via `useTransactions`
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Description", "Catégorie", "Type", "Revenu (F CFA)", "Dépense (F CFA)", "Solde (F CFA)"];
    const rows = journalEntries.map(entry => {
      const income = entry.type === 'income' ? entry.amount : 0;
      const expense = entry.type === 'expense' ? entry.amount : 0;
      // Format description and category for CSV (escape double quotes)
      const descriptionCSV = `"${String(entry.description || '').replace(/"/g, '""')}"`;
      const categoryNameCSV = `"${String(entry.categoryName || '').replace(/"/g, '""')}"`;
      
      return [
        format(entry.date, 'yyyy-MM-dd', { locale: fr }),
        descriptionCSV,
        categoryNameCSV,
        entry.type === 'income' ? 'Revenu' : 'Dépense',
        income.toFixed(2),
        expense.toFixed(2),
        entry.balance.toFixed(2)
      ].join(',');
    });

    const csvContent = `${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // Added BOM for Excel compatibility
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "journal_caisse.csv");
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal de Caisse</h1>
          <p className="text-muted-foreground">Un enregistrement chronologique de toutes vos transactions financières.</p>
        </div>
        <Button onClick={exportToCSV} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" /> Exporter en CSV
        </Button>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            transactionToEdit={editingTransaction} 
            onFormSubmit={() => {
              setIsFormOpen(false);
              setEditingTransaction(null); 
              // Le re-render sera déclenché par la mise à jour de `transactionsStore`
            }} 
          />
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les Transactions</CardTitle>
          <CardDescription>Journal détaillé incluant le solde après chaque transaction. Vous pouvez modifier ou supprimer des transactions ici.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Revenu</TableHead>
                <TableHead className="text-right">Dépense</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                    Aucune transaction enregistrée pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {journalEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(entry.date, 'PP', { locale: fr })}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate" title={entry.description}>{entry.description}</TableCell>
                  <TableCell><Badge variant="outline">{entry.categoryName}</Badge></TableCell>
                  <TableCell className="text-right text-accent-foreground">
                    {entry.type === 'income' ? formatCurrencyCFA(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {entry.type === 'expense' ? formatCurrencyCFA(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${entry.balance >=0 ? 'text-foreground':'text-destructive'}`}>
                    {formatCurrencyCFA(entry.balance)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(entry)} className="mr-1" aria-label="Modifier">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTransaction(entry.id)} className="text-destructive hover:text-destructive" aria-label="Supprimer">
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

