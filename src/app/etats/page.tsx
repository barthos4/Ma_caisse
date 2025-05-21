
"use client";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTransactions, useCategories } from "@/lib/mock-data";
import type { Category } from "@/types";
import { formatCurrencyCFA } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, startOfDay, endOfDay, subDays, isSameDay, formatISO } from "date-fns";
import { fr } from 'date-fns/locale';
import { Download, Printer, FileText, FileSpreadsheet, ChevronDown, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSettings } from "@/hooks/use-settings";
import { useBudgets } from "@/hooks/use-budgets.ts";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress"; 


import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EtatRow {
  id: string; // category_id
  numero: number;
  type: string; // Category name
  montantPrevu: number;
  montantRealise: number;
  pourcentageRealisation: number;
  ecart: number;
}

export default function EtatsPage() {
  const { transactions, isLoading: isLoadingTransactions, error: errorTransactions, fetchTransactions } = useTransactions();
  const { categories: allCategories, isLoading: isLoadingCategories, error: errorCategories, fetchCategories: fetchCategoriesHook } = useCategories();
  const { settings, isLoading: isLoadingSettings, fetchSettings: fetchSettingsHook } = useSettings();
  const { budgets, fetchBudgetsForPeriod, upsertBudget, isLoadingBudgets, budgetError } = useBudgets();
  const { toast } = useToast();
  
  const [currentPrintDate, setCurrentPrintDate] = useState("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [prevusRecettes, setPrevusRecettes] = useState<Record<string, number>>({});
  const [prevusDepenses, setPrevusDepenses] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchTransactions();
    fetchCategoriesHook();
    fetchSettingsHook();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  useEffect(() => {
    if (dateRange?.from && dateRange?.to) { 
      fetchBudgetsForPeriod(dateRange.from);
    }
  }, [dateRange, fetchBudgetsForPeriod]);

  useEffect(() => {
    const newPrevusRecettes: Record<string, number> = {};
    const newPrevusDepenses: Record<string, number> = {};
    budgets.forEach(budget => {
      if (budget.type === 'income') {
        newPrevusRecettes[budget.category_id] = budget.amount;
      } else {
        newPrevusDepenses[budget.category_id] = budget.amount;
      }
    });
    setPrevusRecettes(newPrevusRecettes);
    setPrevusDepenses(newPrevusDepenses);
  }, [budgets]);
  
  useEffect(() => {
    if (budgetError) {
      toast({ title: "Erreur Budgets", description: budgetError, variant: "destructive" });
    }
  }, [budgetError, toast]);


  useEffect(() => {
    setCurrentPrintDate(format(new Date(), 'dd/MM/yyyy', { locale: fr }));
  }, []);


  const presetDateRanges = [
    { label: "Ce Mois-ci", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Mois Dernier", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
    { label: "Cette Semaine", range: { from: startOfWeek(new Date(), {locale: fr}), to: endOfWeek(new Date(), {locale: fr}) } },
    { label: "Aujourd'hui", range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
  ];

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const transactionDate = t.date; // t.date is already a Date object
      return dateRange?.from && dateRange?.to ? 
        transactionDate >= startOfDay(dateRange.from) && transactionDate <= endOfDay(dateRange.to) : true;
    });
  }, [transactions, dateRange]);

  const handlePrevuChange = (categoryId: string, value: string, type: 'income' | 'expense') => {
    const amount = parseFloat(value) || 0;
    if (type === 'income') {
      setPrevusRecettes(prev => ({ ...prev, [categoryId]: amount }));
    } else {
      setPrevusDepenses(prev => ({ ...prev, [categoryId]: amount }));
    }
  };

  const handleSaveBudget = async (categoryId: string, type: 'income' | 'expense') => {
    const amount = type === 'income' ? prevusRecettes[categoryId] : prevusDepenses[categoryId];
    const numericAmount = Number(amount) || 0;

    if (dateRange?.from) {
      const result = await upsertBudget(categoryId, dateRange.from, numericAmount, type);
      if (!result) {
        toast({ title: "Erreur", description: `Impossible d'enregistrer le budget. ${budgetError || ''}`, variant: "destructive"});
      }
       // else { toast({ title: "Budget Enregistré", description: "Le montant prévu a été sauvegardé."}); }
    } else {
      toast({ title: "Erreur", description: "Veuillez sélectionner une période valide pour enregistrer le budget.", variant: "destructive"});
    }
  };


  const processData = (categories: Category[], type: 'income' | 'expense'): EtatRow[] => {
    return categories
      .filter(c => c.type === type)
      .map((category, index) => {
        const montantRealise = filteredTransactions
          .filter(t => t.categoryId === category.id)
          .reduce((sum, t) => sum + t.amount, 0);
        
        const montantPrevu = type === 'income' ? (prevusRecettes[category.id] || 0) : (prevusDepenses[category.id] || 0);
        const pourcentageRealisation = montantPrevu > 0 ? (montantRealise / montantPrevu) * 100 : (montantRealise > 0 ? 100 : 0);
        const ecart = montantRealise - montantPrevu;

        return {
          id: category.id,
          numero: index + 1,
          type: category.name,
          montantPrevu,
          montantRealise,
          pourcentageRealisation,
          ecart,
        };
      });
  };

  const recettesData = processData(allCategories, 'income');
  const depensesData = processData(allCategories, 'expense');

  const totalRecettesPrevus = recettesData.reduce((sum, row) => sum + row.montantPrevu, 0);
  const totalRecettesRealisees = recettesData.reduce((sum, row) => sum + row.montantRealise, 0);
  const totalDepensesPrevus = depensesData.reduce((sum, row) => sum + row.montantPrevu, 0);
  const totalDepensesRealisees = depensesData.reduce((sum, row) => sum + row.montantRealise, 0);

  const soldeRealise = totalRecettesRealisees - totalDepensesRealisees;

  const etatTitle = useMemo(() => {
    let title = "Etat de la Caisse";
    const fromDate = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : null;
    const toDate = dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: fr }) : null;

    if (fromDate && toDate) {
      if (isSameDay(dateRange!.from!, dateRange!.to!)) {
        title += ` du ${fromDate}`;
      } else {
        title += ` du ${fromDate} au ${toDate}`;
      }
    }
    return title;
  }, [dateRange]);

  const exportToPDF = async () => {
    if (isLoadingSettings || !settings) return;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' }); // Portrait for this report
    const tableCellStyles = { fontSize: 8, cellPadding: 1.5 };
    const tableHeaderStyles = { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold' as const, fontSize: 8, halign: 'center' as const };
    
    let startY = 10;
     if (settings.companyLogoUrl) {
        try {
            const response = await fetch(settings.companyLogoUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
                reader.onload = () => {
                    doc.addImage(reader.result as string, 'PNG', 14, startY, 30, 15); // Adjust x, y, width, height as needed
                    resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
            startY += 20; // Adjust spacing after logo
        } catch (error) {
            console.error("Erreur de chargement du logo pour PDF:", error);
            // Continuer sans logo si erreur
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
    doc.text(etatTitle, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 5;
    doc.setFontSize(9);
    doc.text(`Date d'export: ${currentPrintDate}`, doc.internal.pageSize.getWidth() / 2, startY, { align: 'center' });
    startY += 7;

    doc.setFontSize(10);
    doc.text("I- Les Recettes", 14, startY);
    startY += 5;
    (doc as any).autoTable({
      head: [['N°', 'Types de recettes', 'Montant Prévu', 'Montant Réalisé', '% Réal.', 'Ecart']],
      body: recettesData.map(r => [
        r.numero, 
        r.type, 
        formatCurrencyCFA(r.montantPrevu).replace(/\u00A0/g, ' '), 
        formatCurrencyCFA(r.montantRealise).replace(/\u00A0/g, ' '), 
        `${r.pourcentageRealisation.toFixed(0)}%`, 
        formatCurrencyCFA(r.ecart).replace(/\u00A0/g, ' ')
      ]),
      startY: startY,
      theme: 'grid',
      headStyles: tableHeaderStyles,
      styles: tableCellStyles,
      columnStyles: { 
        0: { cellWidth: 10, halign: 'center' as const },
        1: { cellWidth: 50 },
        2: { cellWidth: 35, halign: 'right' as const },
        3: { cellWidth: 35, halign: 'right' as const },
        4: { cellWidth: 20, halign: 'right' as const },
        5: { cellWidth: 30, halign: 'right' as const }
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 2;
    (doc as any).autoTable({
      body: [[
        {content: 'Total Recettes', colSpan: 2, styles: {fontStyle: 'bold' as const, halign: 'left' as const}}, 
        {content: formatCurrencyCFA(totalRecettesPrevus).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold' as const, halign: 'right' as const}},
        {content: formatCurrencyCFA(totalRecettesRealisees).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold' as const, halign: 'right' as const}},
        {content: '', styles: {}}, 
        {content: '', styles: {}}  
      ]],
      startY: startY,
      theme: 'grid',
      styles: {...tableCellStyles, fontStyle: 'bold' as const},
      columnStyles: { 
        0: { cellWidth: 10 + 50 + (doc.internal.pageSize.width - (10+50+35+35+20+30) - 28) / 2  }, // Adjust to take remaining width
        1: { cellWidth: 35, halign: 'right' as const },
        2: { cellWidth: 35, halign: 'right' as const },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 }
      },
      didParseCell: function (data: any) { 
        if (data.row.index === 0 && data.cell.raw.content === 'Total Recettes') {
             data.cell.colSpan = 2;
        }
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(10);
    doc.text("II- Les Dépenses", 14, startY);
    startY += 5;
    (doc as any).autoTable({
      head: [['N°', 'Types de dépenses', 'Montant Prévu', 'Montant Réalisé', '% Réal.', 'Ecart']],
      body: depensesData.map(d => [
        d.numero, 
        d.type, 
        formatCurrencyCFA(d.montantPrevu).replace(/\u00A0/g, ' '), 
        formatCurrencyCFA(d.montantRealise).replace(/\u00A0/g, ' '), 
        `${d.pourcentageRealisation.toFixed(0)}%`, 
        formatCurrencyCFA(d.ecart).replace(/\u00A0/g, ' ')
      ]),
      startY: startY,
      theme: 'grid',
      headStyles: tableHeaderStyles,
      styles: tableCellStyles,
      columnStyles: { 
        0: { cellWidth: 10, halign: 'center' as const },
        1: { cellWidth: 50 },
        2: { cellWidth: 35, halign: 'right' as const },
        3: { cellWidth: 35, halign: 'right' as const },
        4: { cellWidth: 20, halign: 'right' as const },
        5: { cellWidth: 30, halign: 'right' as const }
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 2;
    (doc as any).autoTable({
      body: [[
        {content: 'Total Dépenses', colSpan: 2, styles: {fontStyle: 'bold' as const, halign: 'left' as const}}, 
        {content: formatCurrencyCFA(totalDepensesPrevus).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold' as const, halign: 'right' as const}},
        {content: formatCurrencyCFA(totalDepensesRealisees).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold' as const, halign: 'right' as const}},
        {content: '', styles: {}}, 
        {content: '', styles: {}}  
      ]],
      startY: startY,
      theme: 'grid',
      styles: {...tableCellStyles, fontStyle: 'bold' as const},
       columnStyles: { 
        0: { cellWidth: 10 + 50 + (doc.internal.pageSize.width - (10+50+35+35+20+30) - 28) / 2  },
        1: { cellWidth: 35, halign: 'right' as const },
        2: { cellWidth: 35, halign: 'right' as const },
        3: { cellWidth: 20 },
        4: { cellWidth: 30 }
      },
      didParseCell: function (data: any) {
        if (data.row.index === 0 && data.cell.raw.content === 'Total Dépenses') {
             data.cell.colSpan = 2;
        }
      }
    });
    startY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.setFontSize(10);
    const balanceSectionWidth = doc.internal.pageSize.getWidth() - 28; // Total width minus margins
    (doc as any).autoTable({
        body: [
            [
             { content: 'BALANCE', styles: { fontStyle: 'bold' as const, halign: 'left' as const, cellWidth: balanceSectionWidth * 0.25 } }, // 25%
             { content: `Total Recettes: ${formatCurrencyCFA(totalRecettesRealisees).replace(/\u00A0/g, ' ')}`, styles: {halign: 'right' as const, cellWidth: balanceSectionWidth * 0.25} }, // 25%
             { content: `Total Dépenses: ${formatCurrencyCFA(totalDepensesRealisees).replace(/\u00A0/g, ' ')}`, styles: {halign: 'right' as const, cellWidth: balanceSectionWidth * 0.25} }, // 25%
             { content: `Solde: ${formatCurrencyCFA(soldeRealise).replace(/\u00A0/g, ' ')}`, styles: { fontStyle: 'bold' as const, halign: 'right' as const, cellWidth: balanceSectionWidth * 0.25} }, // 25%
            ]
        ],
        startY: startY,
        theme: 'plain', 
        styles: {...tableCellStyles, fontStyle: 'bold' as const},
        tableWidth: 'auto' 
    });

    doc.save(`etat_de_caisse_A4_portrait.pdf`);
  };

  const exportToXLSX = () => {
    if (isLoadingSettings || !settings) return;
    const wb = XLSX.utils.book_new();
    
    const headerXlsx: any[][] = [ // Array of arrays for rows
      [settings.companyName || "GESTION CAISSE"],
      ...(settings.companyAddress ? [[settings.companyAddress]] : []),
      ...(settings.rccm || settings.niu ? [[
        (settings.rccm ? `RCCM: ${settings.rccm}` : '') + (settings.rccm && settings.niu ? ' | ' : '') + (settings.niu ? `NIU: ${settings.niu}` : '')
      ]] : []),
      [etatTitle],
      [`Date d'export: ${currentPrintDate}`],
      [], // Empty row for spacing
    ];

    const wsDataRecettes = recettesData.map(r => ({
      "N°": r.numero,
      "Types de recettes": r.type,
      "Montant Prévu": r.montantPrevu,
      "Montant Réalisé": r.montantRealise,
      "% Réal.": r.pourcentageRealisation / 100, 
      "Ecart": r.ecart,
    }));
    wsDataRecettes.push({
      "N°": "", "Types de recettes": "Total Recettes", 
      "Montant Prévu": totalRecettesPrevus, "Montant Réalisé": totalRecettesRealisees, 
      "% Réal.": null as any, "Ecart": null as any
    });
    
    const wsDataDepenses = depensesData.map(d => ({
      "N°": d.numero,
      "Types de dépenses": d.type,
      "Montant Prévu": d.montantPrevu,
      "Montant Réalisé": d.montantRealise,
      "% Réal.": d.pourcentageRealisation / 100,
      "Ecart": d.ecart,
    }));
    wsDataDepenses.push({
      "N°": "", "Types de dépenses": "Total Dépenses", 
      "Montant Prévu": totalDepensesPrevus, "Montant Réalisé": totalDepensesRealisees, 
      "% Réal.": null as any, "Ecart": null as any
    });

    const wsSummary: any[][] = [ // Array of arrays for rows
      [], 
      ["BALANCE"], 
      ["Total Recettes", totalRecettesRealisees],
      ["Total Dépenses", totalDepensesRealisees],
      ["Solde", soldeRealise]
    ];

    const ws = XLSX.utils.aoa_to_sheet(headerXlsx); // Start with header
    const recettesStartRow = headerXlsx.length + 1;
    XLSX.utils.sheet_add_aoa(ws, [["I- Les Recettes"]], {origin: `A${recettesStartRow}`});
    XLSX.utils.sheet_add_json(ws, wsDataRecettes, {origin: `A${recettesStartRow + 1}`, skipHeader: false});
    
    const depensesStartRow = recettesStartRow + 1 + wsDataRecettes.length + 1;
    XLSX.utils.sheet_add_aoa(ws, [["II- Les Dépenses"]], {origin: {r: depensesStartRow -1 , c: 0}}); 
    XLSX.utils.sheet_add_json(ws, wsDataDepenses, {origin: {r: depensesStartRow, c: 0}, skipHeader: false}); 
    
    const summaryStartRow = depensesStartRow + wsDataDepenses.length + 1;
    XLSX.utils.sheet_add_aoa(ws, wsSummary, {origin: {r: summaryStartRow -1, c:0}, skipHeader: true});


    ws['!cols'] = [{wch:5}, {wch:30}, {wch:15}, {wch:15}, {wch:10}, {wch:15}];
    
    const currencyFormat = '#,##0 "F CFA"';
    const percentageFormat = '0%';

    for (let i = 0; i < wsDataRecettes.length; i++) {
        const rowIndex = recettesStartRow + 1 + i; 
        if (ws[`C${rowIndex}`]) ws[`C${rowIndex}`].z = currencyFormat; 
        if (ws[`D${rowIndex}`]) ws[`D${rowIndex}`].z = currencyFormat; 
        if (ws[`E${rowIndex}`] && wsDataRecettes[i]["% Réal."] !== null) ws[`E${rowIndex}`].z = percentageFormat; 
        if (ws[`F${rowIndex}`] && wsDataRecettes[i]["Ecart"] !== null) ws[`F${rowIndex}`].z = currencyFormat; 
    }
    for (let i = 0; i < wsDataDepenses.length; i++) {
        const rowIndex = depensesStartRow + 1 + i; 
        if (ws[`C${rowIndex}`]) ws[`C${rowIndex}`].z = currencyFormat;
        if (ws[`D${rowIndex}`]) ws[`D${rowIndex}`].z = currencyFormat;
        if (ws[`E${rowIndex}`] && wsDataDepenses[i]["% Réal."] !== null) ws[`E${rowIndex}`].z = percentageFormat;
        if (ws[`F${rowIndex}`] && wsDataDepenses[i]["Ecart"] !== null) ws[`F${rowIndex}`].z = currencyFormat;
    }
    
    const balanceDataStartRow = summaryStartRow + 1; 
    if (ws[`B${balanceDataStartRow}`]) ws[`B${balanceDataStartRow}`].z = currencyFormat; 
    if (ws[`B${balanceDataStartRow + 1}`]) ws[`B${balanceDataStartRow + 1}`].z = currencyFormat; 
    if (ws[`B${balanceDataStartRow + 2}`]) ws[`B${balanceDataStartRow + 2}`].z = currencyFormat; 

    if(!ws['!merges']) ws['!merges'] = [];
    const maxColIndexXlsx = ws['!cols'].length -1;
    headerXlsx.forEach((_, rowIndex) => {
        if (rowIndex < headerXlsx.length -1) { 
             ws['!merges']?.push({s: {r:rowIndex, c:0}, e: {r:rowIndex, c:maxColIndexXlsx}});
        }
    });
    ws['!merges'].push({s: {r:recettesStartRow-1, c:0}, e: {r:recettesStartRow-1, c:maxColIndexXlsx}}); 
    ws['!merges'].push({s: {r:depensesStartRow -1, c:0}, e: {r:depensesStartRow -1, c:maxColIndexXlsx}}); 
    ws['!merges'].push({s: {r:summaryStartRow -1, c:0}, e: {r:summaryStartRow -1, c:maxColIndexXlsx}}); 
    
    XLSX.utils.book_append_sheet(wb, ws, "Etat de Caisse");
    XLSX.writeFile(wb, "etat_de_caisse.xlsx");
  };

  const handlePrint = () => {
    if (isLoadingSettings || !settings) return;
    window.print();
  };

  const renderTableSection = (title: string, data: EtatRow[], type: 'income' | 'expense', totalPrevus: number, totalRealises: number) => (
    <Card className="print:shadow-none print:border-none print:bg-transparent">
      <CardHeader className="print:py-2">
        <CardTitle className="text-xl print:text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="print:p-0">
        <Table>
          <TableHeader>
            <TableRow className="print:border-b print:border-gray-400">
              <TableHead className="w-12 print:text-black">N°</TableHead><TableHead className="print:text-black">{type === 'income' ? 'Types de recettes' : 'Types de dépenses'}</TableHead><TableHead className="text-right print:text-black">Montant Prévu</TableHead><TableHead className="text-right print:text-black">Montant Réalisé</TableHead><TableHead className="text-right print:text-black">Progression</TableHead><TableHead className="text-right print:text-black">% Réal.</TableHead><TableHead className="text-right print:text-black">Ecart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground h-20 print:text-black">
                  Aucune catégorie de {type === 'income' ? 'recette' : 'dépense'}.
                </TableCell>
              </TableRow>
            )}
            {data.map((row) => (
              <TableRow key={row.id} className="print:border-b print:border-gray-300">
                <TableCell className="print:text-black">{row.numero}</TableCell>
                <TableCell className="font-medium print:text-black">{row.type}</TableCell>
                <TableCell className="text-right print:text-black">
                  <Input
                    type="number"
                    value={(type === 'income' ? prevusRecettes[row.id] : prevusDepenses[row.id]) ?? ''}
                    onChange={(e) => handlePrevuChange(row.id, e.target.value, type)}
                    onBlur={() => handleSaveBudget(row.id, type)}
                    className="w-32 text-right print:border-none print:bg-transparent print:p-0"
                    placeholder="0"
                    disabled={isLoadingBudgets} 
                  />
                </TableCell>
                <TableCell className="text-right print:text-black">{formatCurrencyCFA(row.montantRealise)}</TableCell>
                <TableCell className="text-right print:text-black w-32">
                  <Progress 
                    value={row.montantPrevu > 0 ? Math.min((row.montantRealise / row.montantPrevu) * 100, 100) : (row.montantRealise > 0 ? 100 : 0)} 
                    className="h-2 print:hidden"
                    aria-label={`Progression ${row.type}`}
                  />
                   <span className="print:block hidden text-xs">
                    {`${(row.montantPrevu > 0 ? Math.min((row.montantRealise / row.montantPrevu) * 100, 100) : (row.montantRealise > 0 ? 100 : 0)).toFixed(0)}%`}
                  </span>
                </TableCell>
                <TableCell className="text-right print:text-black">{row.pourcentageRealisation.toFixed(0)}%</TableCell>
                <TableCell className={`text-right print:text-black ${row.ecart < 0 ? 'text-destructive print:text-red-700' : 'text-accent-foreground print:text-green-700'}`}>
                  {formatCurrencyCFA(row.ecart)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50 font-bold print:border-t-2 print:border-b-2 print:border-gray-500">
              <TableCell colSpan={2} className="print:text-black">{type === 'income' ? 'Total Recettes' : 'Total Dépenses'}</TableCell>
              <TableCell className="text-right print:text-black">{formatCurrencyCFA(totalPrevus)}</TableCell>
              <TableCell className="text-right print:text-black">{formatCurrencyCFA(totalRealises)}</TableCell>
              <TableCell colSpan={3}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  const printHeader = (
     <div className="print:block hidden my-4 text-center">
        {settings.companyLogoUrl && <img src={settings.companyLogoUrl} alt="Logo Entreprise" className="h-16 mx-auto mb-2 object-contain" data-ai-hint="company logo"/>}
        <h1 className="text-xl font-bold text-primary print:text-black">{settings.companyName || "GESTION CAISSE"}</h1>
        {settings.companyAddress && <p className="text-sm print:text-black">{settings.companyAddress}</p>}
        <div className="flex justify-between text-xs mt-1 px-2">
            <span>{settings.rccm ? `RCCM: ${settings.rccm}` : ''}</span>
            <span>{settings.niu ? `NIU: ${settings.niu}` : ''}</span>
        </div>
        <h2 className="text-lg font-semibold mt-2 print:text-black">{etatTitle}</h2>
        {currentPrintDate && <p className="text-xs text-muted-foreground mt-1 print:text-black">Imprimé le: {currentPrintDate}</p>}
      </div>
  );

  const isLoadingPage = isLoadingCategories || isLoadingTransactions || isLoadingSettings || isLoadingBudgets;
  const globalError = errorCategories || errorTransactions || budgetError; 

  if (isLoadingPage && !filteredTransactions.length && !allCategories.length && !budgets.length) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (globalError && !isLoadingPage) { 
    return (
      <div className="text-center text-destructive py-10">
        <p>Erreur de chargement des données: {globalError}</p>
        <p>Veuillez actualiser la page ou vérifier votre connexion.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-2">
      {printHeader}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Etat de la Caisse</h1>
          <p className="text-muted-foreground">Comparez vos prévisions et réalisations financières.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto" disabled={isLoadingSettings || isLoadingBudgets}>
                {(isLoadingSettings || isLoadingBudgets) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Download className="mr-2 h-4 w-4" />} 
                Exporter <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF} disabled={isLoadingSettings || isLoadingBudgets}>
                <FileText className="mr-2 h-4 w-4" /> Exporter en PDF (A4 Portrait)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLSX} disabled={isLoadingSettings || isLoadingBudgets}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Exporter en XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto" disabled={isLoadingSettings || isLoadingBudgets}>
            {(isLoadingSettings || isLoadingBudgets) ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Printer className="mr-2 h-4 w-4" />}
             Imprimer
          </Button>
        </div>
      </div>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
           <div>
            <label htmlFor="date-range-preset" className="text-sm font-medium mb-1 block">Période Prédéfinie</label>
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
            <label htmlFor="custom-date-range" className="text-sm font-medium mb-1 block">Période Personnalisée</label>
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </CardContent>
      </Card>
      
      {(isLoadingCategories || isLoadingBudgets) && (!recettesData.length && !depensesData.length) ? ( 
        <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {renderTableSection("I- Les Recettes", recettesData, 'income', totalRecettesPrevus, totalRecettesRealisees)}
          {renderTableSection("II- Les Dépenses", depensesData, 'expense', totalDepensesPrevus, totalDepensesRealisees)}
        </>
      )}


      <Card className="mt-6 print:shadow-none print:border-2 print:border-black print:mt-4">
        <CardHeader className="print:py-2">
          <CardTitle className="text-xl print:text-lg text-center font-bold">BALANCE</CardTitle>
        </CardHeader>
        <CardContent className="print:p-1">
          <Table className="print:border-collapse">
            <TableBody>
              <TableRow className="print:border-none">
                <TableCell className="font-semibold print:text-black print:border print:border-gray-400">Total Recettes Réalisées</TableCell>
                <TableCell className="text-right print:text-black print:border print:border-gray-400">{formatCurrencyCFA(totalRecettesRealisees)}</TableCell>
              </TableRow>
              <TableRow className="print:border-none">
                <TableCell className="font-semibold print:text-black print:border print:border-gray-400">Total Dépenses Réalisées</TableCell>
                <TableCell className="text-right print:text-black print:border print:border-gray-400">{formatCurrencyCFA(totalDepensesRealisees)}</TableCell>
              </TableRow>
              <TableRow className="font-bold text-lg bg-muted/30 print:border-2 print:border-black print:bg-gray-200">
                <TableCell className="print:text-black print:border print:border-gray-400">SOLDE</TableCell>
                <TableCell className={`text-right print:border print:border-gray-400 ${soldeRealise < 0 ? 'text-destructive print:text-red-700' : 'text-accent-foreground print:text-green-700'}`}>
                  {formatCurrencyCFA(soldeRealise)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
