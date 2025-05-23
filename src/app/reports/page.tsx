
"use client";
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useTransactions, useCategories } from "@/lib/mock-data";
import type { Transaction, Category } from "@/types";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, subDays, isSameDay } from "date-fns";
import { fr } from 'date-fns/locale';
import { Cell, PieChart as RechartsPieChart, BarChart as RechartsBarChart } from 'recharts';
import * as RechartsPrimitive from "recharts"; 
import { formatCurrencyCFA } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip as ShadTooltip,
  ChartTooltipContent,
  ChartLegend as ShadLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Printer, FileText, FileSpreadsheet, ChevronDown, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/use-settings"; 
import { useToast } from "@/hooks/use-toast"; 

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { 
    transactions: allTransactions, 
    isLoadingTransactions, 
    errorTransactions,
    fetchTransactions 
  } = useTransactions();
  const { 
    categories: allCategories, 
    getCategoryById, 
    isLoadingCategories, 
    errorCategories: errorCategoriesHook, 
    fetchCategories: fetchCategoriesHook 
  } = useCategories();
  const { settings, isLoading: isLoadingSettings, fetchSettings: fetchSettingsHook } = useSettings();
  const { toast } = useToast(); 
  
  const [currentPrintDate, setCurrentPrintDate] = useState("");
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingXLSX, setIsExportingXLSX] = useState(false);


   useEffect(() => {
    fetchTransactions();
    fetchCategoriesHook();
    fetchSettingsHook();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPrintDate(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }));
  }, []);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [transactionType, setTransactionType] = useState<"all" | "income" | "expense">("all");

  const presetDateRanges = [
    { label: "Aujourd'hui", range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
    { label: "Hier", range: { from: startOfDay(subDays(new Date(),1)), to: endOfDay(subDays(new Date(),1)) } },
    { label: "Cette Semaine", range: { from: startOfWeek(new Date(), {locale: fr}), to: endOfWeek(new Date(), {locale: fr}) } },
    { label: "Semaine Dernière", range: { from: startOfWeek(subWeeks(new Date(),1), {locale: fr}), to: endOfWeek(subWeeks(new Date(),1), {locale: fr}) } },
    { label: "Ce Mois-ci", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Mois Dernier", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
  ];


  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const transactionDate = t.date;
      const inDateRange = dateRange?.from && dateRange?.to ? 
        transactionDate >= startOfDay(dateRange.from) && transactionDate <= endOfDay(dateRange.to) : true;
      const categoryMatch = selectedCategory === "all" || t.categoryId === selectedCategory;
      const typeMatch = transactionType === "all" || t.type === transactionType;
      return inDateRange && categoryMatch && typeMatch;
    });
  }, [allTransactions, dateRange, selectedCategory, transactionType]);

  const summary = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    filteredTransactions.forEach((t) => {
      if (t.type === 'income') totalIncome += t.amount;
      else totalExpenses += t.amount;
    });
    return { totalIncome, totalExpenses, net: totalIncome - totalExpenses };
  }, [filteredTransactions]);

  const spendingByCategory = useMemo(() => {
    const data: { name: string; value: number }[] = [];
    const categoryMap: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const categoryName = getCategoryById(t.categoryId!)?.name || 'Non classé';
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + t.amount;
      });
    for (const [name, value] of Object.entries(categoryMap)) {
      data.push({ name, value });
    }
    return data.sort((a,b) => b.value - a.value);
  }, [filteredTransactions, getCategoryById]);

  const incomeByCategory = useMemo(() => {
    const data: { name: string; value: number }[] = [];
    const categoryMap: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'income')
      .forEach(t => {
        const categoryName = getCategoryById(t.categoryId!)?.name || 'Non classé';
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + t.amount;
      });
    for (const [name, value] of Object.entries(categoryMap)) {
      data.push({ name, value });
    }
    return data.sort((a,b) => b.value - a.value);
  }, [filteredTransactions, getCategoryById]);
  
  const chartConfig = {
    montant: { 
      label: `Montant (${"F CFA"})`, 
    },
    ...[...spendingByCategory, ...incomeByCategory].reduce((acc, cur) => { 
      const colorIndex = (Object.keys(acc).filter(k => k !== 'montant').length % 5) + 1;
      acc[cur.name] = { label: cur.name, color: `hsl(var(--chart-${colorIndex}))` };
      return acc;
    }, {} as any)
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; 
      const name = payload[0].name; 
      const value = payload[0].value;
      
      return (
        <div className="bg-background p-2 border rounded shadow-lg text-sm">
          <p className="font-medium">{data?.name || name || label}</p>
          <p className="text-foreground">{formatCurrencyCFA(value).replace(/\u00A0/g, ' ').replace(/\s/g, ' ')}</p>
        </div>
      );
    }
    return null;
  };

  const reportTitle = useMemo(() => {
    let title = "RAPPORT DES TRANSACTIONS";
    const fromDate = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : null;
    const toDate = dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: fr }) : null;

    if (fromDate && toDate) {
      if (isSameDay(dateRange!.from!, dateRange!.to!)) {
        title += ` DU ${fromDate}`;
      } else {
        title += ` DU ${fromDate} AU ${toDate}`;
      }
    } else if (fromDate) {
      title += ` A PARTIR DU ${fromDate}`;
    } else if (toDate) {
      title += ` JUSQU'AU ${toDate}`;
    }

    if (selectedCategory !== "all") {
      const catName = getCategoryById(selectedCategory!)?.name || "Catégorie inconnue";
      title += ` POUR ${catName.toUpperCase()}`;
    }
    if (transactionType !== "all") {
      title += transactionType === "income" ? " (REVENUS)" : " (DEPENSES)";
    }
    return title.toUpperCase();
  }, [dateRange, selectedCategory, transactionType, getCategoryById]);


  const getTransactionTypeName = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Revenu' : 'Dépense';
  }

  const formatForPdf = (value: number | string) => {
    if (typeof value === 'number') {
      return formatCurrencyCFA(value).replace(/\u00A0/g, ' ').replace(/\s/g, ' ');
    }
    return String(value).replace(/\u00A0/g, ' ').replace(/\s/g, ' ');
  };

  const exportDetailedToCSV = () => {
    if (isExportingCSV) return;
    setIsExportingCSV(true);
    try {
      const headers = ["N° Ordre", "Date", "Description", "Référence", "Catégorie", "Type", "Montant (F CFA)"];
      const rows = filteredTransactions.map(t => {
        const orderNumberCSV = `"${String(t.orderNumber || '').replace(/"/g, '""')}"`;
        const descriptionCSV = `"${String(t.description || '').replace(/"/g, '""')}"`;
        const referenceCSV = `"${String(t.reference || '').replace(/"/g, '""')}"`;
        const categoryNameCSV = `"${String(getCategoryById(t.categoryId!)?.name || 'Non classé(e)').replace(/"/g, '""')}"`;
        return [
          orderNumberCSV,
          format(t.date, 'yyyy-MM-dd', { locale: fr }),
          descriptionCSV,
          referenceCSV,
          categoryNameCSV,
          getTransactionTypeName(t.type),
          t.amount.toFixed(0) 
        ].join(',');
      });

      const csvContent = `${headers.join(',')}\n${rows.join('\n')}`;
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `rapport_transactions_detaillees_${format(new Date(), 'yyyyMMddHHmm')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting detailed CSV:", error);
      toast({ title: "Erreur", description: "Impossible d'exporter en CSV.", variant: "destructive" });
    } finally {
      setIsExportingCSV(false);
    }
  };

  const exportDetailedToPDF = async () => {
    if (isLoadingSettings || !settings) {
        toast({ title: "Chargement", description: "Les paramètres de l'entreprise ne sont pas encore chargés.", variant: "default"});
        return;
    }
    if (isExportingPDF) return;
    setIsExportingPDF(true);

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' }); 
      const tableColumn = ["N° Ord.", "Date", "Description", "Réf.", "Catégorie", "Type", "Montant"];
      const tableRows: (string | number)[][] = [];
      const pageMargin = 10;

      filteredTransactions.forEach(t => {
        const entryData = [
          t.orderNumber || '-',
          format(t.date, 'dd/MM/yy', { locale: fr }), 
          t.description,
          t.reference || '-',
          getCategoryById(t.categoryId!)?.name || 'Non classé(e)',
          getTransactionTypeName(t.type),
          formatForPdf(t.amount)
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
                      if (reader.error) { console.error("Erreur FileReader (Rapports):", reader.error); reject(reader.error); return; }
                      try {
                          const img = new Image();
                          img.onload = () => {
                              let w = img.width; let h = img.height; const ratio = w / h;
                              if (w > logoMaxWidth) { w = logoMaxWidth; h = w / ratio; }
                              if (h > logoMaxHeight) { h = logoMaxHeight; w = h * ratio; }
                              actualLogoWidth = w;
                              doc.addImage(reader.result as string, 'PNG', pageMargin, logoStartY, w, h);
                              resolve();
                          };
                          img.onerror = (err) => {
                            console.error("Erreur img.onerror (Rapports):", err);
                            reject(err);
                          };
                          img.src = reader.result as string;
                      } catch (imgError) { 
                        console.error("Erreur doc.addImage (Rapports):", imgError);
                        reject(imgError); 
                      }
                  };
                  reader.onerror = (err) => {
                    console.error("Erreur reader.onerror (Rapports):", err);
                    reject(err);
                  };
                  reader.readAsDataURL(blob);
              });
          } catch (error) {
              console.error("Erreur de chargement du logo pour PDF (Rapports):", error);
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
      doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, mainContentStartY, { align: 'center' });
      mainContentStartY += 5;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Date d'export: ${currentPrintDate}`, doc.internal.pageSize.getWidth() / 2, mainContentStartY, { align: 'center' });
      mainContentStartY += 6;


      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: mainContentStartY,
        theme: 'grid',
        headStyles: { fillColor: [74, 85, 104], fontSize: 7, textColor: [255,255,255] }, 
        styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 1, overflow: 'linebreak' }, 
        columnStyles: {
          0: { cellWidth: 20 }, 
          1: { cellWidth: 20 }, 
          2: { cellWidth: 80 },  
          3: { cellWidth: 30 }, 
          4: { cellWidth: 40 }, 
          5: { cellWidth: 25 }, 
          6: { cellWidth: 35, halign: 'right' as const }, 
        },
        margin: { left: pageMargin, right: pageMargin, top: 5, bottom: 15 },
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
      doc.save(`rapport_transactions_${format(new Date(), 'yyyyMMddHHmm')}.pdf`);
    } catch (error) {
      console.error("Error exporting detailed PDF (Rapports):", error);
      toast({ title: "Erreur", description: "Impossible d'exporter le rapport en PDF.", variant: "destructive" });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const exportDetailedToXLSX = () => {
    if (isLoadingSettings || !settings) {
        toast({ title: "Chargement", description: "Les paramètres de l'entreprise ne sont pas encore chargés.", variant: "default"});
        return;
    }
    if (isExportingXLSX) return;
    setIsExportingXLSX(true);
    try {
      const headerXlsx: any[][] = [
        [settings.companyName || "GESTION CAISSE"],
        ...(settings.companyAddress ? [[settings.companyAddress]] : []),
        // ...(settings.companyContact ? [[`Contact: ${settings.companyContact}`]] : []), // Moved to footer
        [reportTitle.toUpperCase()],
        [`Date d'export: ${currentPrintDate}`],
        [], 
      ];
      
      const worksheetData = filteredTransactions.map(t => ({
        "N° Ordre": t.orderNumber || '',
        "Date": format(t.date, 'yyyy-MM-dd', { locale: fr }),
        "Description": t.description,
        "Référence": t.reference || '',
        "Catégorie": getCategoryById(t.categoryId!)?.name || 'Non classé(e)',
        "Type": getTransactionTypeName(t.type),
        'Montant (F CFA)': t.amount
      }));

      const footerXlsx: any[][] = [
          [],
          [
            (settings.rccm ? `RCCM: ${settings.rccm}` : ''),
            (settings.niu ? `NIU: ${settings.niu}` : ''),
            (settings.companyContact ? `Contact: ${settings.companyContact}` : '')
          ].filter(Boolean).join(' | ')
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(headerXlsx);
      XLSX.utils.sheet_add_json(worksheet, worksheetData, {origin: `A${headerXlsx.length + 1}`}); 
      XLSX.utils.sheet_add_aoa(worksheet, footerXlsx, { origin: -1 });
      
      const colWidths = [ {wch:10}, {wch:12}, {wch:40}, {wch:20}, {wch:25}, {wch:15}, {wch:20} ];
      worksheet['!cols'] = colWidths;

      if(!worksheet['!merges']) worksheet['!merges'] = [];
      const maxColIndexXlsx = colWidths.length - 1;
      headerXlsx.forEach((row, rowIndex) => {
          if (row.length === 1 && rowIndex < headerXlsx.length -1 ) { 
              worksheet['!merges']?.push({s: {r:rowIndex, c:0}, e: {r:rowIndex, c:maxColIndexXlsx}});
          }
      });
      const footerRowIndexXlsx = headerXlsx.length + 1 + worksheetData.length + 1;
      if (footerXlsx[1] && footerXlsx[1].length === 1) {
          worksheet['!merges']?.push({ s: { r: footerRowIndexXlsx, c: 0 }, e: { r: footerRowIndexXlsx, c: maxColIndexXlsx } });
      }
      
      const currencyFormat = '#,##0 "F CFA"';
      const firstDataRowXlsx = headerXlsx.length + 2;
      for (let i = 0; i < worksheetData.length; i++) {
          const rowIndex = firstDataRowXlsx + i;
          if (worksheet[`G${rowIndex}`]) worksheet[`G${rowIndex}`].z = currencyFormat;
      }
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport Détail");
      XLSX.writeFile(workbook, `rapport_transactions_detaillees_${format(new Date(), 'yyyyMMddHHmm')}.xlsx`);
    } catch (error) {
      console.error("Error exporting detailed XLSX (Rapports):", error);
      toast({ title: "Erreur", description: "Impossible d'exporter le rapport en XLSX.", variant: "destructive" });
    } finally {
      setIsExportingXLSX(false);
    }
  };

  const handlePrintDetailed = () => {
    if (isLoadingSettings || !settings) {
        toast({ title: "Chargement", description: "Les paramètres de l'entreprise ne sont pas encore chargés.", variant: "default"});
        return;
    }
    window.print();
  };

 const printHeader = settings && (
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
        {!settings.companyLogoUrl && settings && (
          <>
            <h1 className="text-xl font-bold text-primary print:text-black">{settings.companyName || "GESTION CAISSE"}</h1>
            {settings.companyAddress && <p className="text-sm print:text-black">{settings.companyAddress}</p>}
          </>
        )}
        <h2 className="text-lg font-semibold mt-4 print:text-black">{reportTitle}</h2>
        {currentPrintDate && <p className="text-xs text-muted-foreground mt-1 print:text-black">Imprimé le: {currentPrintDate}</p>}
      </div>
  );

  const printFooter = settings && (
      <div className="print:block hidden print-footer-info text-xs text-center mt-4 p-2 border-t">
        <span className="mr-2">{settings.rccm ? `RCCM: ${settings.rccm}` : ''}</span>
        <span className="mr-2">{settings.niu ? `NIU: ${settings.niu}` : ''}</span>
        <span>{settings.companyContact ? `Contact: ${settings.companyContact}` : ''}</span>
      </div>
  );

  const isLoadingPage = isLoadingTransactions || isLoadingCategories || isLoadingSettings;
  const globalError = errorTransactions || errorCategoriesHook;

  if (isLoadingPage && !filteredTransactions.length && !allCategories.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  if (!isLoadingPage && globalError && !filteredTransactions.length && !allCategories.length) {
    return <div className="text-center text-destructive py-10"><p>Erreur de chargement des données des rapports: {globalError}</p></div>;
  }


  return (
    <div className="space-y-6 print:space-y-2">
      <div className="print:hidden">
        <h1 className="text-3xl font-bold tracking-tight">Rapports Financiers</h1>
        <p className="text-muted-foreground">Analysez vos modèles de revenus et de dépenses.</p>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="date-range-preset" className="text-sm font-medium mb-1 block">Plage de Dates Prédéfinie</label>
            <Select
              onValueChange={(value) => {
                const preset = presetDateRanges.find(p => p.label === value);
                if (preset) setDateRange(preset.range);
              }}
              defaultValue="Ce Mois-ci"
            >
              <SelectTrigger id="date-range-preset">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                {presetDateRanges.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="custom-date-range" className="text-sm font-medium mb-1 block">Plage de Dates Personnalisée</label>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
          <div>
            <label htmlFor="category-select" className="text-sm font-medium mb-1 block">Catégorie</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoadingCategories}>
              <SelectTrigger id="category-select"><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les Catégories</SelectItem>
                {allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="transaction-type-select" className="text-sm font-medium mb-1 block">Type de Transaction</label>
            <Select value={transactionType} onValueChange={setTransactionType as any}>
              <SelectTrigger id="transaction-type-select"><SelectValue placeholder="Sélectionner un type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les Types</SelectItem>
                <SelectItem value="income">Revenu</SelectItem>
                <SelectItem value="expense">Dépense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3 print:hidden">
        <Card>
          <CardHeader><CardTitle>Revenus Totaux</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-accent-foreground">{formatCurrencyCFA(summary.totalIncome)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Dépenses Totales</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">{formatCurrencyCFA(summary.totalExpenses)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Épargne Nette</CardTitle></CardHeader>
          <CardContent className={`text-2xl font-bold ${summary.net >= 0 ? 'text-accent-foreground' : 'text-destructive'}`}>
            {formatCurrencyCFA(summary.net)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 print:hidden">
        <Card>
          <CardHeader>
            <CardTitle>Dépenses par Catégorie</CardTitle>
            <CardDescription>Répartition visuelle de vos dépenses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {spendingByCategory.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                 <RechartsPrimitive.BarChart accessibilityLayer data={spendingByCategory} layout="vertical" margin={{left: 20, right:20}}>
                    <RechartsPrimitive.CartesianGrid horizontal={false} />
                    <RechartsPrimitive.XAxis type="number" dataKey="value" tickFormatter={(value) => formatCurrencyCFA(value).replace(/\u00A0/g, ' ')} hide/>
                    <RechartsPrimitive.YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                    <ShadTooltip cursor={false} content={<CustomTooltip />} />
                    <RechartsPrimitive.Bar dataKey="value" layout="vertical" radius={5}>
                       {spendingByCategory.map((entry, index) => (
                         <Cell key={`cell-expense-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                       ))}
                    </RechartsPrimitive.Bar>
                  </RechartsPrimitive.BarChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground pt-10">Aucune donnée de dépense pour la période/filtres sélectionnés.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenus par Catégorie</CardTitle>
            <CardDescription>Répartition visuelle de vos sources de revenus.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
             {incomeByCategory.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                 <RechartsPrimitive.PieChart>
                    <ShadTooltip content={<CustomTooltip />} />
                    <RechartsPrimitive.Pie data={incomeByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} 
                         label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                                {`${name} (${(percent * 100).toFixed(0)}%)`}
                              </text>
                            );
                          }}
                    >
                        {incomeByCategory.map((entry, index) => (
                          <Cell key={`cell-income-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                        ))}
                    </RechartsPrimitive.Pie>
                    <ShadLegend content={<ChartLegendContent nameKey="name" />} />
                 </RechartsPrimitive.PieChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground pt-10">Aucune donnée de revenu pour la période/filtres sélectionnés.</p>}
          </CardContent>
        </Card>
      </div>

      {printHeader}

      <Card className="print:shadow-none print:border-none print:bg-transparent">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Détail des Transactions Filtrées</CardTitle>
              <CardDescription>{reportTitle}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full sm:w-auto" disabled={isLoadingSettings || isExportingCSV || isExportingPDF || isExportingXLSX}>
                     {(isExportingCSV || isExportingPDF || isExportingXLSX) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                    Exporter <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportDetailedToCSV} disabled={isLoadingSettings || isExportingCSV}>
                    {isExportingCSV ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                     Exporter en CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDetailedToPDF} disabled={isLoadingSettings || isExportingPDF || !settings}>
                     {isExportingPDF ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                     Exporter en PDF (A4 Paysage)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDetailedToXLSX} disabled={isLoadingSettings || isExportingXLSX || !settings}>
                     {isExportingXLSX ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                     Exporter en XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handlePrintDetailed} variant="outline" className="w-full sm:w-auto" disabled={isLoadingSettings || !settings || isExportingPDF || isExportingXLSX}>
                {isLoadingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                 Imprimer
              </Button>
            </div>
          </div>
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
                <TableHead className="print:text-black">Type</TableHead>
                <TableHead className="text-right print:text-black">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 && !isLoadingPage &&(
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground h-24 print:text-black">
                    Aucune transaction pour les filtres sélectionnés.
                  </TableCell>
                </TableRow>
              )}
              {filteredTransactions.map((t) => (
                <TableRow key={t.id} className="print:border-b print:border-gray-200">
                  <TableCell className="print:text-black max-w-[80px] truncate" title={t.orderNumber}>{t.orderNumber || '-'}</TableCell>
                  <TableCell className="print:text-black">{format(t.date, 'PP', { locale: fr })}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate print:max-w-none print:text-black" title={t.description}>
                    {t.description}
                  </TableCell>
                  <TableCell className="print:text-black max-w-[100px] truncate" title={t.reference}>{t.reference || '-'}</TableCell>
                  <TableCell className="print:text-black">
                    <Badge variant="outline" className="print:border-gray-400 print:text-black print:bg-gray-100">
                      {getCategoryById(t.categoryId!)?.name || 'Non classé(e)'}
                    </Badge>
                  </TableCell>
                  <TableCell className="print:text-black">
                    <Badge 
                      variant={t.type === 'income' ? 'default' : 'secondary'} 
                      className={`${t.type === 'income' ? 'bg-accent text-accent-foreground border-accent print:bg-transparent print:border-green-700 print:text-green-700' : 'print:bg-transparent print:border-red-700 print:text-red-700'}`}
                    >
                      {getTransactionTypeName(t.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-accent-foreground print:text-green-700' : 'text-destructive print:text-red-700'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrencyCFA(t.amount)}
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

