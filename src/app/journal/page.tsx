
"use client";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // DialogTrigger is not needed if Dialog is controlled by 'open' state
import { useTransactions, useCategories } from "@/lib/mock-data";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCFA } from "@/lib/utils";
import { ChevronDown, Download, Edit2, Printer, Trash2, FileText, FileSpreadsheet } from "lucide-react";
import type { Transaction } from "@/types";
import { TransactionForm } from "@/app/transactions/transaction-form"; 

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface JournalEntry extends Transaction {
  categoryName: string;
  balance: number;
}

export default function JournalPage() {
  const { getTransactions, deleteTransaction } = useTransactions();
  const { getCategoryById } = useCategories();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

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
    }
  };

  const exportToCSV = () => {
    const headers = ["Date", "Description", "Catégorie", "Type", "Revenu (F CFA)", "Dépense (F CFA)", "Solde (F CFA)"];
    const rows = journalEntries.map(entry => {
      const income = entry.type === 'income' ? entry.amount : 0;
      const expense = entry.type === 'expense' ? entry.amount : 0;
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
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
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

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableColumn = ["Date", "Description", "Catégorie", "Type", "Revenu", "Dépense", "Solde"];
    const tableRows: (string | number)[][] = [];

    journalEntries.forEach(entry => {
      const entryData = [
        format(entry.date, 'dd/MM/yyyy', { locale: fr }),
        entry.description,
        entry.categoryName,
        entry.type === 'income' ? 'Revenu' : 'Dépense',
        entry.type === 'income' ? formatCurrencyCFA(entry.amount) : '-',
        entry.type === 'expense' ? formatCurrencyCFA(entry.amount) : '-',
        formatCurrencyCFA(entry.balance)
      ];
      tableRows.push(entryData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] }, // Example header color
      styles: { font: 'helvetica', fontSize: 8 },
    });
    doc.text("Journal de Caisse", 14, 15);
    doc.save("journal_caisse.pdf");
  };

  const exportToXLSX = () => {
    const worksheetData = journalEntries.map(entry => ({
      Date: format(entry.date, 'yyyy-MM-dd', { locale: fr }),
      Description: entry.description,
      Catégorie: entry.categoryName,
      Type: entry.type === 'income' ? 'Revenu' : 'Dépense',
      'Revenu (F CFA)': entry.type === 'income' ? entry.amount : null,
      'Dépense (F CFA)': entry.type === 'expense' ? entry.amount : null,
      'Solde (F CFA)': entry.balance
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
    
    // Set column widths (optional)
    const colWidths = [
        {wch:12}, {wch:40}, {wch:20}, {wch:10}, {wch:15}, {wch:15}, {wch:15}
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, "journal_caisse.xlsx");
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="space-y-6 print:space-y-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal de Caisse</h1>
          <p className="text-muted-foreground">Un enregistrement chronologique de toutes vos transactions financières.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Exporter <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV}>
                <FileText className="mr-2 h-4 w-4" />
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4" />
                Exporter en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLSX}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exporter en XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" /> Imprimer
          </Button>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg print:hidden">
          <DialogHeader>
            <DialogTitle>Modifier la Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            transactionToEdit={editingTransaction} 
            onFormSubmit={() => {
              setIsFormOpen(false);
              setEditingTransaction(null); 
            }} 
          />
        </DialogContent>
      </Dialog>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="print:hidden">
          <CardTitle>Toutes les Transactions</CardTitle>
          <CardDescription>Journal détaillé incluant le solde après chaque transaction.</CardDescription>
        </CardHeader>
        <CardContent className="print:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Revenu</TableHead>
                <TableHead className="text-right">Dépense</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="text-right print:hidden">Actions</TableHead>
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
                  <TableCell className="font-medium max-w-[200px] truncate print:max-w-none" title={entry.description}>{entry.description}</TableCell>
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
                  <TableCell className="text-right print:hidden">
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
