
"use client";
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(format(new Date(), 'dd/MM/yyyy', { locale: fr }));
  }, []);

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
      });
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
    const headers = ["N° Ordre", "Date", "Description", "Référence", "Catégorie", "Type", "Revenu (F CFA)", "Dépense (F CFA)", "Solde (F CFA)"];
    const entriesToExport = [...journalEntries]; 

    const rows = entriesToExport.map(entry => {
      const income = entry.type === 'income' ? entry.amount : 0;
      const expense = entry.type === 'expense' ? entry.amount : 0;
      const orderNumberCSV = `"${String(entry.orderNumber || '').replace(/"/g, '""')}"`;
      const descriptionCSV = `"${String(entry.description || '').replace(/"/g, '""')}"`;
      const referenceCSV = `"${String(entry.reference || '').replace(/"/g, '""')}"`;
      const categoryNameCSV = `"${String(entry.categoryName || '').replace(/"/g, '""')}"`;
      
      return [
        orderNumberCSV,
        format(entry.date, 'yyyy-MM-dd', { locale: fr }),
        descriptionCSV,
        referenceCSV,
        categoryNameCSV,
        entry.type === 'income' ? 'Revenu' : 'Dépense',
        income.toFixed(0),
        expense.toFixed(0),
        entry.balance.toFixed(0)
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
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 
    const tableColumn = ["N° Ord.", "Date", "Description", "Réf.", "Catégorie", "Type", "Revenu", "Dépense", "Solde"];
    const tableRows: (string | number)[][] = [];
    
    journalEntries.forEach(entry => {
      const entryData = [
        entry.orderNumber || '-',
        format(entry.date, 'dd/MM/yy', { locale: fr }), 
        entry.description,
        entry.reference || '-',
        entry.categoryName,
        entry.type === 'income' ? 'Revenu' : 'Dépense',
        entry.type === 'income' ? formatCurrencyCFA(entry.amount).replace(/\u00A0/g, ' ') : '-',
        entry.type === 'expense' ? formatCurrencyCFA(entry.amount).replace(/\u00A0/g, ' ') : '-',
        formatCurrencyCFA(entry.balance).replace(/\u00A0/g, ' ')
      ];
      tableRows.push(entryData);
    });

    doc.setFontSize(18);
    doc.text("GESTION CAISSE", doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text("Journal de Caisse", doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date d'export: ${currentDate}`, doc.internal.pageSize.getWidth() / 2, 29, { align: 'center' });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35, 
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133], fontSize: 7 }, 
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, overflow: 'linebreak' }, 
      columnStyles: {
        0: { cellWidth: 15 }, 
        1: { cellWidth: 18 }, 
        2: { cellWidth: 'auto' }, 
        3: { cellWidth: 20 }, 
        4: { cellWidth: 30 }, 
        5: { cellWidth: 18 }, 
        6: { cellWidth: 25, halign: 'right' }, 
        7: { cellWidth: 25, halign: 'right' }, 
        8: { cellWidth: 25, halign: 'right' }, 
      }
    });
    doc.save("journal_caisse_A4.pdf");
  };

  const exportToXLSX = () => {
    const headerData = [
      { col1: "GESTION CAISSE" }, 
      { col1: "Journal de Caisse" }, 
      { col1: `Date d'export: ${currentDate}` }, 
      {}, 
    ];
    
    const worksheetData = journalEntries.map(entry => ({
      "N° Ordre": entry.orderNumber || '',
      "Date": format(entry.date, 'yyyy-MM-dd', { locale: fr }),
      "Description": entry.description,
      "Référence": entry.reference || '',
      "Catégorie": entry.categoryName,
      "Type": entry.type === 'income' ? 'Revenu' : 'Dépense',
      'Revenu (F CFA)': entry.type === 'income' ? entry.amount : null,
      'Dépense (F CFA)': entry.type === 'expense' ? entry.amount : null,
      'Solde (F CFA)': entry.balance
    }));

    const worksheet = XLSX.utils.json_to_sheet(headerData, {skipHeader: true});
    XLSX.utils.sheet_add_json(worksheet, worksheetData, {origin: "A5"}); 
    
    const colWidths = [
        {wch:10}, {wch:12}, {wch:40}, {wch:15}, {wch:20}, {wch:10}, {wch:15}, {wch:15}, {wch:15}
    ];
    worksheet['!cols'] = colWidths;

    if(!worksheet['!merges']) worksheet['!merges'] = [];
    worksheet['!merges'].push({s: {r:0, c:0}, e: {r:0, c:8}}); 
    worksheet['!merges'].push({s: {r:1, c:0}, e: {r:1, c:8}}); 
    worksheet['!merges'].push({s: {r:2, c:0}, e: {r:2, c:8}}); 
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
    XLSX.writeFile(workbook, "journal_caisse.xlsx");
  };

  const handlePrint = () => {
    window.print();
  };


  return (
    <div className="space-y-6 print:space-y-2">
      <div className="print:block hidden my-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary print:text-black">GESTION CAISSE</h1>
          <h2 className="text-xl font-semibold mt-1 print:text-black">Journal de Caisse</h2>
          {currentDate && <p className="text-sm text-muted-foreground mt-1 print:text-black">Imprimé le: {currentDate}</p>}
        </div>
      </div>
      
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
                Exporter en PDF (A4)
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto print:hidden">
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

      <Card className="print:shadow-none print:border-none print:bg-transparent">
        <CardHeader className="print:hidden">
          <CardTitle>Toutes les Transactions</CardTitle>
          <CardDescription>Journal détaillé incluant le solde après chaque transaction, du plus ancien au plus récent.</CardDescription>
        </CardHeader>
        <CardContent className="print:p-0">
          <Table>
            <TableHeader>
              <TableRow className="print:border-b print:border-gray-300">
                <TableHead className="print:text-black">N° Ordre</TableHead>
                <TableHead className="print:text-black">Date</TableHead>
                <TableHead className="print:text-black">Description</TableHead>
                <TableHead className="print:text-black">Référence</TableHead>
                <TableHead className="print:text-black">Catégorie</TableHead>
                <TableHead className="text-right print:text-black">Revenu</TableHead>
                <TableHead className="text-right print:text-black">Dépense</TableHead>
                <TableHead className="text-right print:text-black">Solde</TableHead>
                <TableHead className="text-right print:hidden">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground h-24 print:text-black">
                    Aucune transaction enregistrée pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {journalEntries.map((entry) => (
                <TableRow key={entry.id} className="print:border-b print:border-gray-200">
                  <TableCell className="print:text-black max-w-[80px] truncate" title={entry.orderNumber}>{entry.orderNumber || '-'}</TableCell>
                  <TableCell className="print:text-black">{format(entry.date, 'PP', { locale: fr })}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate print:max-w-none print:text-black" title={entry.description}>{entry.description}</TableCell>
                  <TableCell className="print:text-black max-w-[100px] truncate" title={entry.reference}>{entry.reference || '-'}</TableCell>
                  <TableCell className="print:text-black"><Badge variant="outline" className="print:border-gray-400 print:text-black print:bg-gray-100">{entry.categoryName}</Badge></TableCell>
                  <TableCell className="text-right text-accent-foreground print:text-green-700">
                    {entry.type === 'income' ? formatCurrencyCFA(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-destructive print:text-red-700">
                    {entry.type === 'expense' ? formatCurrencyCFA(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${entry.balance >=0 ? 'text-foreground print:text-black':'text-destructive print:text-red-700'}`}>
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
