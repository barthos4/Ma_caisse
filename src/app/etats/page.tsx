
"use client";
import { useState, useMemo, useEffect } from "react";
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
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, subDays, isSameDay } from "date-fns";
import { fr } from 'date-fns/locale';
import { Download, Printer, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface EtatRow {
  id: string;
  numero: number;
  type: string; // Category name
  montantPrevu: number;
  montantRealise: number;
  pourcentageRealisation: number;
  ecart: number;
}

export default function EtatsPage() {
  const { getTransactions } = useTransactions();
  const { getCategories } = useCategories();
  const allTransactions = getTransactions();
  const allCategories = getCategories();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [prevusRecettes, setPrevusRecettes] = useState<Record<string, number>>({});
  const [prevusDepenses, setPrevusDepenses] = useState<Record<string, number>>({});
  const [currentPrintDate, setCurrentPrintDate] = useState("");

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
    return allTransactions.filter((t) => {
      const transactionDate = t.date;
      return dateRange?.from && dateRange?.to ? 
        transactionDate >= startOfDay(dateRange.from) && transactionDate <= endOfDay(dateRange.to) : true;
    });
  }, [allTransactions, dateRange]);

  const handlePrevuChange = (categoryId: string, value: string, type: 'income' | 'expense') => {
    const amount = parseFloat(value) || 0;
    if (type === 'income') {
      setPrevusRecettes(prev => ({ ...prev, [categoryId]: amount }));
    } else {
      setPrevusDepenses(prev => ({ ...prev, [categoryId]: amount }));
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
        const pourcentageRealisation = montantPrevu > 0 ? (montantRealise / montantPrevu) * 100 : 0;
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

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const tableCellStyles = { fontSize: 8, cellPadding: 1.5 };
    const tableHeaderStyles = { fillColor: [220, 220, 220], textColor: [0,0,0], fontStyle: 'bold', fontSize: 8, halign: 'center' };
    
    doc.setFontSize(16);
    doc.text("GESTION CAISSE", doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(etatTitle, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Date d'export: ${currentPrintDate}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

    let startY = 35;

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
      columnStyles: { 5: { halign: 'right'}, 4: {halign: 'right'}, 3: {halign: 'right'}, 2: {halign: 'right'}}
    });
    startY = (doc as any).lastAutoTable.finalY + 2;
    (doc as any).autoTable({
      body: [[
        {content: 'Total Recettes', colSpan: 2, styles: {fontStyle: 'bold', halign: 'left'}}, 
        {content: formatCurrencyCFA(totalRecettesPrevus).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold', halign: 'right'}},
        {content: formatCurrencyCFA(totalRecettesRealisees).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold', halign: 'right'}},
        {}, {}
      ]],
      startY: startY,
      theme: 'grid',
      styles: {...tableCellStyles, fontStyle: 'bold'},
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
      columnStyles: { 5: { halign: 'right'}, 4: {halign: 'right'}, 3: {halign: 'right'}, 2: {halign: 'right'}}
    });
    startY = (doc as any).lastAutoTable.finalY + 2;
    (doc as any).autoTable({
      body: [[
        {content: 'Total Dépenses', colSpan: 2, styles: {fontStyle: 'bold', halign: 'left'}}, 
        {content: formatCurrencyCFA(totalDepensesPrevus).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold', halign: 'right'}},
        {content: formatCurrencyCFA(totalDepensesRealisees).replace(/\u00A0/g, ' '), styles: {fontStyle: 'bold', halign: 'right'}},
        {}, {}
      ]],
      startY: startY,
      theme: 'grid',
      styles: {...tableCellStyles, fontStyle: 'bold'},
    });
    startY = (doc as any).lastAutoTable.finalY + 8;
    
    doc.setFontSize(10);
    (doc as any).autoTable({
        body: [
            [{ content: 'BALANCE', styles: { fontStyle: 'bold', halign: 'left', cellWidth: 60 } },
             { content: `Total Recettes: ${formatCurrencyCFA(totalRecettesRealisees).replace(/\u00A0/g, ' ')}`, styles: {halign: 'right'} },
             { content: `Total Dépenses: ${formatCurrencyCFA(totalDepensesRealisees).replace(/\u00A0/g, ' ')}`, styles: {halign: 'right'} },
             { content: `Solde: ${formatCurrencyCFA(soldeRealise).replace(/\u00A0/g, ' ')}`, styles: { fontStyle: 'bold', halign: 'right'} },
            ]
        ],
        startY: startY,
        theme: 'plain',
        styles: {...tableCellStyles, fontStyle: 'bold'},
    });

    doc.save(`etat_de_caisse_A4.pdf`);
  };

  const exportToXLSX = () => {
    const wb = XLSX.utils.book_new();
    
    const headerXlsx = [
      { col1: "GESTION CAISSE" },
      { col1: etatTitle },
      { col1: `Date d'export: ${currentPrintDate}` },
      {}, 
    ];

    const wsDataRecettes = recettesData.map(r => ({
      "N°": r.numero,
      "Types de recettes": r.type,
      "Montant Prévu": r.montantPrevu,
      "Montant Réalisé": r.montantRealise,
      "% Réal.": r.pourcentageRealisation / 100, // Store as decimal for Excel percentage format
      "Ecart": r.ecart,
    }));
    wsDataRecettes.push({
      "N°": "", "Types de recettes": "Total Recettes", 
      "Montant Prévu": totalRecettesPrevus, "Montant Réalisé": totalRecettesRealisees, 
      "% Réal.": null, "Ecart": null
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
      "% Réal.": null, "Ecart": null
    });

    const wsSummary = [
      {}, // Empty row for spacing
      { col1: "BALANCE", col2: "TOTAL RECETTES", col3: "TOTAL DEPENSES", col4: "SOLDE" },
      { col1: "", col2: totalRecettesRealisees, col3: totalDepensesRealisees, col4: soldeRealise }
    ];

    const ws = XLSX.utils.json_to_sheet(headerXlsx, {skipHeader: true});
    XLSX.utils.sheet_add_aoa(ws, [["I- Les Recettes"]], {origin: "A5"});
    XLSX.utils.sheet_add_json(ws, wsDataRecettes, {origin: "A6", skipHeader: false});
    const recettesEndRow = 6 + wsDataRecettes.length;
    XLSX.utils.sheet_add_aoa(ws, [["II- Les Dépenses"]], {origin: {r: recettesEndRow + 1, c: 0}}); // A + recettesEndRow + 2
    XLSX.utils.sheet_add_json(ws, wsDataDepenses, {origin: {r: recettesEndRow + 2, c: 0}, skipHeader: false}); // A + recettesEndRow + 3
    const depensesEndRow = recettesEndRow + 2 + wsDataDepenses.length;
    XLSX.utils.sheet_add_json(ws, wsSummary, {origin: {r: depensesEndRow + 1, c:0}, skipHeader: true});

    // Basic styling (column widths, number formats)
    ws['!cols'] = [{wch:5}, {wch:30}, {wch:15}, {wch:15}, {wch:10}, {wch:15}];
    // Apply number formats
    wsDataRecettes.forEach((_row, i) => {
        ['C','D','F'].forEach(col => ws[`${col}${7+i}`] ? ws[`${col}${7+i}`].z = '#,##0 "F CFA"' : null);
        ws[`E${7+i}`] ? ws[`E${7+i}`].z = '0%' : null;
    });
     wsDataDepenses.forEach((_row, i) => {
        ['C','D','F'].forEach(col => ws[`${col}${recettesEndRow + 3 + i}`] ? ws[`${col}${recettesEndRow + 3 + i}`].z = '#,##0 "F CFA"' : null);
        ws[`E${recettesEndRow + 3 + i}`] ? ws[`E${recettesEndRow + 3 + i}`].z = '0%' : null;
    });
    ['B','C','D'].forEach(col => ws[`${col}${depensesEndRow + 3}`] ? ws[`${col}${depensesEndRow + 3}`].z = '#,##0 "F CFA"' : null);


    if(!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({s: {r:0, c:0}, e: {r:0, c:5}}); 
    ws['!merges'].push({s: {r:1, c:0}, e: {r:1, c:5}}); 
    ws['!merges'].push({s: {r:2, c:0}, e: {r:2, c:5}});
    ws['!merges'].push({s: {r:4, c:0}, e: {r:4, c:5}}); // Title I- Les Recettes
    ws['!merges'].push({s: {r:recettesEndRow + 1, c:0}, e: {r:recettesEndRow + 1, c:5}}); // Title II- Les Dépenses
    
    XLSX.utils.book_append_sheet(wb, ws, "Etat de Caisse");
    XLSX.writeFile(wb, "etat_de_caisse.xlsx");
  };

  const handlePrint = () => {
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
              <TableHead className="w-12 print:text-black">N°</TableHead>
              <TableHead className="print:text-black">{type === 'income' ? 'Types de recettes' : 'Types de dépenses'}</TableHead>
              <TableHead className="text-right print:text-black">Montant Prévu</TableHead>
              <TableHead className="text-right print:text-black">Montant Réalisé</TableHead>
              <TableHead className="text-right print:text-black">% Réal.</TableHead>
              <TableHead className="text-right print:text-black">Ecart</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground h-20 print:text-black">
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
                    value={row.montantPrevu === 0 ? '' : row.montantPrevu}
                    onChange={(e) => handlePrevuChange(row.id, e.target.value, type)}
                    className="w-32 text-right print:border-none print:bg-transparent print:p-0"
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="text-right print:text-black">{formatCurrencyCFA(row.montantRealise)}</TableCell>
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
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 print:space-y-2">
      <div className="print:block hidden my-6 text-center">
        <h1 className="text-2xl font-bold text-primary print:text-black">GESTION CAISSE</h1>
        <h2 className="text-xl font-semibold mt-1 print:text-black">{etatTitle}</h2>
        {currentPrintDate && <p className="text-sm text-muted-foreground mt-1 print:text-black">Imprimé le: {currentPrintDate}</p>}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Etat de la Caisse</h1>
          <p className="text-muted-foreground">Comparez vos prévisions et réalisations financières.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" /> Exporter <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4" /> Exporter en PDF (A4)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToXLSX}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Exporter en XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handlePrint} variant="outline" className="w-full sm:w-auto">
            <Printer className="mr-2 h-4 w-4" /> Imprimer
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
      
      {renderTableSection("I- Les Recettes", recettesData, 'income', totalRecettesPrevus, totalRecettesRealisees)}
      {renderTableSection("II- Les Dépenses", depensesData, 'expense', totalDepensesPrevus, totalDepensesRealisees)}

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
