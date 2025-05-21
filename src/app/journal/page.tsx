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
    setCurrentDate(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }));
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
          categoryName: getCategoryById(t.categoryId!)?.name || 'Non classé(e)',
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

  const formatForPdf = (value: number | string) => {
    if (typeof value === 'number') {
      return formatCurrencyCFA(value).replace(/\u00A0/g, ' ').replace(/\s/g, ' ');
    }
    return String(value).replace(/\u00A0/g, ' ').replace(/\s/g, ' ');
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
      link.setAttribute("download", `journal_caisse_${format(new Date(), 'yyyyMMddHHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const exportToPDF = async () => {
    if (isLoadingSettings || !settings) {
         toast({ title: "Chargement", description: "Les paramètres de l'entreprise ne sont pas encore chargés.", variant: "default"});
        return;
    }
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 
    const tableColumn = ["N° Ordre", "Date", "Description", "Référence", "Catégorie", "Type", "Revenu", "Dépense", "Solde"];
    const tableRows: (string | number)[][] = [];
    const pageMargin = 10;
    
    journalEntries.forEach(entry => {
      const entryData = [
        entry.orderNumber || '-',
        format(entry.date, 'dd/MM/yy', { locale: fr }), 
        entry.description,
        entry.reference || '-',
        entry.categoryName,
        entry.type === 'income' ? 'Revenu' : 'Dépense',
        entry.type === 'income' ? formatForPdf(entry.amount) : '-',
        entry.type === 'expense' ? formatForPdf(entry.amount) : '-',
        formatForPdf(entry.balance)
      ];
      tableRows.push(entryData);
    });

    let logoStartY = 10;
    let headerTextStartY = logoStartY;
    const logoMaxHeight = 12;
    const logoMaxWidth = 35;
    let actualLogoWidth = 0;

    if (settings.companyLogoUrl) {
        try {
            const response = await fetch(settings.companyLogoUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            await new Promise<void>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                     if (reader.error) {
                        console.error("Erreur FileReader (Journal):", reader.error);
                        reject(reader.error);
                        return;
                    }
                    try {
                        const img = new Image();
                        img.onload = () => {
                            let w = img.width;
                            let h = img.height;
                            const ratio = w / h;

                            if (w > logoMaxWidth) { w = logoMaxWidth; h = w / ratio; }
                            if (h > logoMaxHeight) { h = logoMaxHeight; w = h * ratio; }
                            actualLogoWidth = w;
                            doc.addImage(reader.result as string, 'PNG', pageMargin, logoStartY, w, h);
                            resolve();
                        };
                        img.onerror = reject;
                        img.src = reader.result as string;
                    } catch (imgError) { reject(imgError); }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error("Erreur de chargement du logo pour PDF (Journal):", error);
        }
    }

    const headerTextX = pageMargin + (actualLogoWidth > 0 ? actualLogoWidth + 3 : 0);
    const headerTextWidth = doc.internal.pageSize.getWidth() - headerTextX - pageMargin;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(settings.companyName || "GESTION CAISSE", headerTextX, headerTextStartY + 4, { align: 'left', maxWidth: headerTextWidth });
    headerTextStartY += 5;
    
    if (settings.companyAddress) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(settings.companyAddress, headerTextX, headerTextStartY, { align: 'left', maxWidth: headerTextWidth });
      headerTextStartY += 3;
    }

    let mainContentStartY = Math.max(logoStartY + logoMaxHeight + 3, headerTextStartY + 3);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("JOURNAL DE CAISSE", doc.internal.pageSize.getWidth() / 2, mainContentStartY, { align: 'center' });
    mainContentStartY += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Date d'export: ${currentDate}`, doc.internal.pageSize.getWidth() / 2, mainContentStartY, { align: 'center' });
    mainContentStartY += 6;


    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: mainContentStartY, 
      theme: 'grid',
      headStyles: { fillColor: [74, 85, 104], fontSize: 7, textColor: [255,255,255] }, // Darker Gray
      styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1, overflow: 'linebreak' }, 
      columnStyles: {
        0: { cellWidth: 15 }, 
        1: { cellWidth: 18 }, 
        2: { cellWidth: 65 }, // Increased for description
        3: { cellWidth: 25 }, 
        4: { cellWidth: 35 }, 
        5: { cellWidth: 18 }, 
        6: { cellWidth: 28, halign: 'right' as const }, // Revenu
        7: { cellWidth: 28, halign: 'right' as const }, // Dépense
        8: { cellWidth: 30, halign: 'right' as const }, // Solde
      },
      margin: { left: pageMargin, right: pageMargin, top: 5, bottom: 15 }, // Added bottom margin for footer
      didDrawPage: (data: any) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        const pageInfo = `Page ${data.pageNumber} sur ${pageCount}`;
        const footerTextParts = [
            settings.rccm ? `RCCM: ${settings.rccm}` : '',
            settings.niu ? `NIU: ${settings.niu}` : '',
            settings.companyContact ? `Contact: ${settings.companyContact}` : ''
        ].filter(Boolean);
        
        doc.text(footerTextParts.join('  |  '), pageMargin, doc.internal.pageSize.getHeight() - 8);
        doc.text(pageInfo, doc.internal.pageSize.getWidth() - pageMargin - doc.getTextWidth(pageInfo), doc.internal.pageSize.getHeight() - 8);
      }
    });
    doc.save(`journal_caisse_${format(new Date(), 'yyyyMMddHHmm')}.pdf`);
  };

  const exportToXLSX = () => {
    if (isLoadingSettings || !settings) {
        toast({ title: "Chargement", description: "Les paramètres de l'entreprise ne sont pas encore chargés.", variant: "default"});
        return;
    }
    const headerXlsx: any[][] = [ 
      [settings.companyName || "GESTION CAISSE"],
      ...(settings.companyAddress ? [[settings.companyAddress]] : []),
      ...(settings.companyContact ? [[`Contact: ${settings.companyContact}`]] : []),
      ["JOURNAL DE CAISSE"],
      [`Date d'export: ${currentDate}`],
      [], 
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

    const footerXlsx: any[][] = [
        [],
        [
          (settings.rccm ? `RCCM: ${settings.rccm}` : ''),
          (settings.niu ? `NIU: ${settings.niu}` : ''),
        ].filter(Boolean).join(' | ')
    ];


    const worksheet = XLSX.utils.aoa_to_sheet(headerXlsx); 
    XLSX.utils.sheet_add_json(worksheet, worksheetData, {origin: `A${headerXlsx.length +1}`}); 
    XLSX.utils.sheet_add_aoa(worksheet, footerXlsx, { origin: -1 }); 
    
    const colWidths = [
        {wch:10}, {wch:12}, {wch:40}, {wch:20}, {wch:25}, {wch:10}, {wch:18}, {wch:18}, {wch:18} // Adjusted
    ];
    worksheet['!cols'] = colWidths;

    if(!worksheet['!merges']) worksheet['!merges'] = [];
    const maxColIndex = colWidths.length - 1;
    headerXlsx.forEach((row, rowIndex) => {
        if (row.length === 1 && rowIndex < headerXlsx.length -1 ) { 
             worksheet['!merges']?.push({s: {r:rowIndex, c:0}, e: {r:rowIndex, c:maxColIndex}});
        }
    });
     const footerRowIndex = headerXlsx.length + worksheetData.length + 1;
     if (footerXlsx[1] && footerXlsx[1].length === 1) {
        worksheet['!merges']?.push({ s: { r: footerRowIndex, c: 0 }, e: { r: footerRowIndex, c: maxColIndex } });
     }
    
    const currencyFormat = '#,##0 "F CFA"';
    const firstDataRow = headerXlsx.length + 2; 
    for (let i = 0; i < worksheetData.length; i++) {
        const rowIndex = firstDataRow + i;
        if (worksheet[`G${rowIndex}`]) worksheet[`G${rowIndex}`].z = currencyFormat; 
        if (worksheet[`H${rowIndex}`]) worksheet[`H${rowIndex}`].z = currencyFormat; 
        if (worksheet[`I${rowIndex}`]) worksheet[`I${rowIndex}`].z = currencyFormat; 
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Journal");
    XLSX.writeFile(workbook, `journal_caisse_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);
  };

  const handlePrint = () => {
    if (isLoadingSettings || !settings) {
         toast({ title: "Chargement", description: "Les paramètres de l'entreprise ne sont pas encore chargés.", variant: "default"});
        return;
    }
    window.print();
  };

 const printHeader = (
     <div className="print:block hidden my-4 text-center">
        {settings.companyLogoUrl && (
          <div className="flex justify-start items-start mb-2">
            <img 
              src={settings.companyLogoUrl} 
              alt="Logo Entreprise" 
              className="h-16 w-auto max-w-[150px] object-contain mr-4" 
              data-ai-hint="company logo"
            />
            <div className="text-left">
              <h1 className="text-xl font-bold text-primary print:text-black">{settings.companyName || "GESTION CAISSE"}</h1>
              {settings.companyAddress && <p className="text-sm print:text-black">{settings.companyAddress}</p>}
            </div>
          </div>
        )}
        {!settings.companyLogoUrl && (
          <>
            <h1 className="text-xl font-bold text-primary print:text-black">{settings.companyName || "GESTION CAISSE"}</h1>
            {settings.companyAddress && <p className="text-sm print:text-black">{settings.companyAddress}</p>}
          </>
        )}
        <h2 className="text-lg font-semibold mt-4 print:text-black">JOURNAL DE CAISSE</h2>
        {currentDate && <p className="text-xs text-muted-foreground mt-1 print:text-black">Imprimé le: {currentDate}</p>}
      </div>
  );

  const printFooter = (
      <div className="print:block hidden print-footer-info text-xs text-center mt-4 p-2 border-t">
        <span className="mr-2">{settings.rccm ? `RCCM: ${settings.rccm}` : ''}</span>
        <span className="mr-2">{settings.niu ? `NIU: ${settings.niu}` : ''}</span>
        <span>{settings.companyContact ? `Contact: ${settings.companyContact}` : ''}</span>
      </div>
  );

  const isLoadingPage = isLoadingTransactions || isLoadingCategories || isLoadingSettings;
  const globalError = errorTransactions; 

  if (isLoadingPage && !journalEntries.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
   if (!isLoadingPage && globalError && !journalEntries.length) { // Show error only if no data to display
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
              fetchTransactions(); 
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
      {printFooter}
    </div>
  );
}
