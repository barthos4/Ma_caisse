
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
import { ChevronDown, Download, Edit2, Printer, Trash2, FileText, FileSpreadsheet, Loader2 } from "lucide-react";
import type { Transaction } from "@/types";
import { TransactionForm } from "@/app/transactions/transaction-form"; 
import { useSettings } from "@/hooks/use-settings"; 
import { useToast } from "@/hooks/use-toast";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface JournalEntry extends Transaction {
  categoryName: string;
  balance: number;
}

export default function JournalPage() {
  const { 
    transactions: allTransactions, 
    isLoadingTransactions, 
    errorTransactions, 
    deleteTransaction, 
    fetchTransactions 
  } = useTransactions();
  const { 
    categories: allCategories, 
    getCategoryById, 
    isLoadingCategories,
    fetchCategories: fetchCategoriesHook
  } = useCategories();
  const { settings, isLoading: isLoadingSettings, fetchSettings: fetchSettingsHook } = useSettings();
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    fetchTransactions();
    fetchCategoriesHook();
    fetchSettingsHook();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    setCurrentDate(format(new Date(), 'dd/MM/yyyy', { locale: fr }));
  }, []);

  const journalEntries = useMemo(() => {
    let runningBalance = 0;
    return allTransactions
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
  }, [allTransactions, getCategoryById]);

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };
  
  const handleDeleteTransaction = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette transaction du journal ?")) {
      const success = await deleteTransaction(id);
      if (success) {
        toast({ title: "Succès", description: "Transaction supprimée du journal." });
        fetchTransactions(); 
      } else {
        toast({ title: "Erreur", description: errorTransactions || "Impossible de supprimer la transaction.", variant: "destructive" });
      }
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

  const exportToPDF = async () => {
    if (isLoadingSettings || !settings) return;
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

    let startY = 10;
    if (settings.companyLogoUrl) {
        try {
            const response = await fetch(settings.companyLogoUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
                reader.onloadend = () => {
                    if (reader.error) {
                        reject(reader.error);
                        return;
                    }
                    try {
                        doc.addImage(reader.result as string, 'PNG', 14, startY, 30, 15); // Adjust x, y, width, height as needed
                        startY += 20; // Adjust spacing after logo
                        resolve();
                    } catch (imgError) {
                        reject(imgError);
                    }
                };
                reader.onerror = (error) => reject(error);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Erreur de chargement du logo pour PDF (Journal):", error);
            // Continuer sans logo si erreur, startY n'est pas incrémenté
        }
    }


    doc.setFontSize(14);
    doc.text(settings.companyName || "GESTION CAISSE", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 5;
    if (settings.companyAddress) {
      doc.setFontSize(8);
      doc.text(settings.companyAddress, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
      startY += 5;
    }
     if (settings.rccm) {
      doc.setFontSize(8);
      doc.text(`RCCM: ${settings.rccm}`, 14, startY);
    }
    if (settings.niu) {
      doc.setFontSize(8);
      doc.text(`NIU: ${settings.niu}`, doc.internal.pageSize.getWidth() - 14 - (doc.getTextWidth(`NIU: ${settings.niu}`)), startY);
    }
    startY += 5;

    doc.setFontSize(12);
    doc.text("Journal de Caisse", doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 5;
    doc.setFontSize(9);
    doc.text(`Date d'export: ${currentDate}`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 7;


    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY, 
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133], fontSize: 7, textColor: [255,255,255] }, 
      styles: { font: 'helvetica', fontSize: 7, cellPadding: 1, overflow: 'linebreak' }, 
      columnStyles: {
        0: { cellWidth: 15 }, 
        1: { cellWidth: 18 }, 
        2: { cellWidth: 'auto' }, 
        3: { cellWidth: 20 }, 
        4: { cellWidth: 30 }, 
        5: { cellWidth: 18 }, 
        6: { cellWidth: 25, halign: 'right' as const }, 
        7: { cellWidth: 25, halign: 'right' as const }, 
        8: { cellWidth: 25, halign: 'right' as const }, 
      }
    });
    doc.save("journal_caisse_A4_paysage.pdf");
  };

  const exportToXLSX = () => {
    if (isLoadingSettings || !settings) return;
    const headerXlsx: any[][] = [ // Array of arrays for rows
      [settings.companyName || "GESTION CAISSE"],
      ...(settings.companyAddress ? [[settings.companyAddress]] : []),
       ...(settings.rccm || settings.niu ? [[
        (settings.rccm ? `RCCM: ${settings.rccm}` : '') + (settings.rccm && settings.niu ? ' | ' : '') + (settings.niu ? `NIU: ${settings.niu}` : '')
      ]] : []),
      ["Journal de Caisse"],
      [`Date d'export: ${currentDate}`],
      [], // Empty row for spacing
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

    const worksheet = XLSX.utils.aoa_to_sheet(headerXlsx); // Start with header
    XLSX.utils.sheet_add_json(worksheet, worksheetData, {origin: `A${headerXlsx.length +1}`}); // Add data after header
    
    const colWidths = [
        {wch:10}, {wch:12}, {wch:40}, {wch:15}, {wch:20}, {wch:10}, {wch:15}, {wch:15}, {wch:15}
    ];
    worksheet['!cols'] = colWidths;

    // Merge header cells
    if(!worksheet['!merges']) worksheet['!merges'] = [];
    const maxColIndex = colWidths.length - 1;
    headerXlsx.forEach((_, rowIndex) => {
        if (rowIndex < headerXlsx.length -1) { // Don't merge the empty spacer row
             worksheet['!merges']?.push({s: {r:rowIndex, c:0}, e: {r:rowIndex, c:maxColIndex}});
        }
    });
    
    // Apply currency format to relevant columns
    const currencyFormat = '#,##0 "F CFA"';
    const firstDataRow = headerXlsx.length + 2; // Header row for data + one for spacing
    for (let i = 0; i < worksheetData.length; i++) {
        const rowIndex = firstDataRow + i;
        if (worksheet[`G${rowIndex}`]) worksheet[`G${rowIndex}`].z = currencyFormat; // Revenu
        if (worksheet[`H${rowIndex}`]) worksheet[`H${rowIndex}`].z = currencyFormat; // Dépense
        if (worksheet[`I${rowIndex}`]) worksheet[`I${rowIndex}`].z = currencyFormat; // Solde
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
    XLSX.writeFile(workbook, "journal_caisse.xlsx");
  };

  const handlePrint = () => {
    if (isLoadingSettings) return;
    window.print();
  };

  const printHeader = (
    <div className="print:block hidden my-4 text-center">
      {settings.companyLogoUrl && <img src={settings.companyLogoUrl} alt="Logo Entreprise" className="h-16 mx-auto mb-2 object-contain" data-ai-hint="company logo"/>}
      <h1 className="text-xl font-bold text-primary print:text-black">{settings.companyName || "GESTION CAISSE"}</h1>
      {settings.companyAddress && <p className="text-sm print:text-black">{settings.companyAddress}</p>}
      <div className="flex justify-between text-xs mt-1 px-2">
        <span>{settings.rccm ? `RCCM: ${settings.rccm}` : ''}</span>
        <span>{settings.niu ? `NIU: ${settings.niu}` : ''}</span>
      </div>
      <h2 className="text-lg font-semibold mt-2 print:text-black">Journal de Caisse</h2>
      {currentDate && <p className="text-xs text-muted-foreground mt-1 print:text-black">Imprimé le: {currentDate}</p>}
    </div>
  );

  const isLoadingPage = isLoadingTransactions || isLoadingCategories || isLoadingSettings;
  const globalError = errorTransactions; // Assuming other errors are handled via toasts

  if (isLoadingPage && !journalEntries.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
   if (!isLoadingPage && globalError) {
    return <div className="text-center text-destructive py-10"><p>Erreur de chargement du journal: {globalError}</p></div>;
  }


  return (
    <div className="space-y-6 print:space-y-2">
      {printHeader}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal de Caisse</h1>
          <p className="text-muted-foreground">Un enregistrement chronologique de toutes vos transactions financières.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto" disabled={isLoadingSettings}>
                {isLoadingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                 Exporter <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToCSV} disabled={isLoadingSettings}>
                <FileText className="mr-2 h-4 w-4" />
                Exporter en CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} disabled={isLoadingSettings}>
                <FileText className="mr-2 h-4 w-4" />
                Exporter en PDF (A4 Paysage)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLSX} disabled={isLoadingSettings}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exporter en XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto" disabled={isLoadingSettings}>
           {isLoadingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Imprimer
          </Button>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto print:hidden">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? "Modifier" : "Ajouter"} la Transaction</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            transactionToEdit={editingTransaction} 
            onFormSubmit={() => {
              setIsFormOpen(false);
              setEditingTransaction(null); 
              fetchTransactions(); // Re-fetch transactions to update the journal
            }}
            availableCategories={allCategories}
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
              {journalEntries.length === 0 && !isLoadingPage && (
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
                    <Button variant="ghost" size="icon" onClick={() => handleEditTransaction(entry)} className="mr-1" aria-label="Modifier" disabled={isLoadingCategories}>
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

    