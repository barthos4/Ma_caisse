
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
import { Download, Printer, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { getTransactions } = useTransactions();
  const { getCategories, getCategoryById } = useCategories();
  const allTransactions = getTransactions();
  const allCategories = getCategories();

  const [currentPrintDate, setCurrentPrintDate] = useState("");

  useEffect(() => {
    setCurrentPrintDate(format(new Date(), 'dd/MM/yyyy', { locale: fr }));
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
        const categoryName = getCategoryById(t.categoryId)?.name || 'Non classé';
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
        const categoryName = getCategoryById(t.categoryId)?.name || 'Non classé';
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
          <p className="text-foreground">{formatCurrencyCFA(value)}</p>
        </div>
      );
    }
    return null;
  };

  const reportTitle = useMemo(() => {
    let title = "Rapport des Transactions";
    const fromDate = dateRange?.from ? format(dateRange.from, 'dd/MM/yyyy', { locale: fr }) : null;
    const toDate = dateRange?.to ? format(dateRange.to, 'dd/MM/yyyy', { locale: fr }) : null;

    if (fromDate && toDate) {
      if (isSameDay(dateRange!.from!, dateRange!.to!)) {
        title += ` du ${fromDate}`;
      } else {
        title += ` du ${fromDate} au ${toDate}`;
      }
    } else if (fromDate) {
      title += ` à partir du ${fromDate}`;
    } else if (toDate) {
      title += ` jusqu'au ${toDate}`;
    }

    if (selectedCategory !== "all") {
      const catName = getCategoryById(selectedCategory)?.name || "Catégorie inconnue";
      title += ` pour ${catName}`;
    }
    if (transactionType !== "all") {
      title += transactionType === "income" ? " (Revenus)" : " (Dépenses)";
    }
    return title;
  }, [dateRange, selectedCategory, transactionType, getCategoryById]);


  const getTransactionTypeName = (type: 'income' | 'expense') => {
    return type === 'income' ? 'Revenu' : 'Dépense';
  }

  // Export and Print functions for Detailed Transactions
  const exportDetailedToCSV = () => {
    const headers = ["Date", "Description", "Catégorie", "Type", "Montant (F CFA)"];
    const rows = filteredTransactions.map(t => {
      const descriptionCSV = `"${String(t.description || '').replace(/"/g, '""')}"`;
      const categoryNameCSV = `"${String(getCategoryById(t.categoryId)?.name || 'Non classé(e)').replace(/"/g, '""')}"`;
      return [
        format(t.date, 'yyyy-MM-dd', { locale: fr }),
        descriptionCSV,
        categoryNameCSV,
        getTransactionTypeName(t.type),
        t.amount.toFixed(0) // No decimals
      ].join(',');
    });

    const csvContent = `${headers.join(',')}\n${rows.join('\n')}`;
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `rapport_transactions_detaillees.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const exportDetailedToPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const tableColumn = ["Date", "Description", "Catégorie", "Type", "Montant"];
    const tableRows: (string | number)[][] = [];

    filteredTransactions.forEach(t => {
      const entryData = [
        format(t.date, 'dd/MM/yyyy', { locale: fr }),
        t.description,
        getCategoryById(t.categoryId)?.name || 'Non classé(e)',
        getTransactionTypeName(t.type),
        formatCurrencyCFA(t.amount)
      ];
      tableRows.push(entryData);
    });

    doc.setFontSize(18);
    doc.text("GESTION CAISSE", doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(reportTitle, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Date d'export: ${currentPrintDate}`, doc.internal.pageSize.getWidth() / 2, 29, { align: 'center' });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [22, 160, 133] },
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 20 }, // Date
        1: { cellWidth: 70 }, // Description
        2: { cellWidth: 35 }, // Catégorie
        3: { cellWidth: 20 }, // Type
        4: { cellWidth: 30, halign: 'right' }, // Montant
      }
    });
    doc.save("rapport_transactions_detaillees_A4.pdf");
  };

  const exportDetailedToXLSX = () => {
    const headerData = [
      { col1: "GESTION CAISSE" },
      { col1: reportTitle },
      { col1: `Date d'export: ${currentPrintDate}` },
      {}, 
    ];
    
    const worksheetData = filteredTransactions.map(t => ({
      Date: format(t.date, 'yyyy-MM-dd', { locale: fr }),
      Description: t.description,
      Catégorie: getCategoryById(t.categoryId)?.name || 'Non classé(e)',
      Type: getTransactionTypeName(t.type),
      'Montant (F CFA)': t.amount
    }));

    const worksheet = XLSX.utils.json_to_sheet(headerData, {skipHeader: true});
    XLSX.utils.sheet_add_json(worksheet, worksheetData, {origin: "A5"}); 
    
    const colWidths = [ {wch:12}, {wch:40}, {wch:25}, {wch:15}, {wch:20} ];
    worksheet['!cols'] = colWidths;

    if(!worksheet['!merges']) worksheet['!merges'] = [];
    worksheet['!merges'].push({s: {r:0, c:0}, e: {r:0, c:4}}); 
    worksheet['!merges'].push({s: {r:1, c:0}, e: {r:1, c:4}}); 
    worksheet['!merges'].push({s: {r:2, c:0}, e: {r:2, c:4}}); 
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rapport Détail");
    XLSX.writeFile(workbook, "rapport_transactions_detaillees.xlsx");
  };

  const handlePrintDetailed = () => {
    // We rely on CSS @media print to hide unnecessary elements
    // and the dynamic title section for printing.
    window.print();
  };


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
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                 <BarChart accessibilityLayer data={spendingByCategory} layout="vertical" margin={{left: 20, right:20}}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="value" tickFormatter={(value) => formatCurrencyCFA(value)} hide/>
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={120} />
                    <ShadTooltip cursor={false} content={<CustomTooltip />} />
                    <Bar dataKey="value" layout="vertical" radius={5}>
                       {spendingByCategory.map((entry, index) => (
                         <Cell key={`cell-expense-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                       ))}
                    </Bar>
                  </BarChart>
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
                 <PieChart>
                    <ShadTooltip content={<CustomTooltip />} />
                    <Pie data={incomeByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} labelLine={false} 
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
                    </Pie>
                    <ShadLegend content={<ChartLegendContent nameKey="name" />} />
                 </PieChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground pt-10">Aucune donnée de revenu pour la période/filtres sélectionnés.</p>}
          </CardContent>
        </Card>
      </div>

      {/* Section for Print Header */}
      <div className="print:block hidden my-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary print:text-black">GESTION CAISSE</h1>
          <h2 className="text-xl font-semibold mt-1 print:text-black">{reportTitle}</h2>
          {currentPrintDate && <p className="text-sm text-muted-foreground mt-1 print:text-black">Imprimé le: {currentPrintDate}</p>}
        </div>
      </div>

      {/* Detailed Transactions Table */}
      <Card className="print:shadow-none print:border-none print:bg-transparent">
        <CardHeader className="print:hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Détail des Transactions Filtrées</CardTitle>
              <CardDescription>{reportTitle}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" /> Exporter <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={exportDetailedToCSV}>
                    <FileText className="mr-2 h-4 w-4" /> Exporter en CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDetailedToPDF}>
                    <FileText className="mr-2 h-4 w-4" /> Exporter en PDF (A4)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportDetailedToXLSX}>
                    <FileSpreadsheet className="mr-2 h-4 w-4" /> Exporter en XLSX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handlePrintDetailed} variant="outline" className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" /> Imprimer
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="print:p-0">
          <Table>
            <TableHeader>
              <TableRow className="print:border-b print:border-gray-300">
                <TableHead className="print:text-black">Date</TableHead>
                <TableHead className="print:text-black">Description</TableHead>
                <TableHead className="print:text-black">Catégorie</TableHead>
                <TableHead className="print:text-black">Type</TableHead>
                <TableHead className="text-right print:text-black">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground h-24 print:text-black">
                    Aucune transaction pour les filtres sélectionnés.
                  </TableCell>
                </TableRow>
              )}
              {filteredTransactions.map((t) => (
                <TableRow key={t.id} className="print:border-b print:border-gray-200">
                  <TableCell className="print:text-black">{format(t.date, 'PP', { locale: fr })}</TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate print:max-w-none print:text-black" title={t.description}>
                    {t.description}
                  </TableCell>
                  <TableCell className="print:text-black">
                    <Badge variant="outline" className="print:border-gray-400 print:text-black print:bg-gray-100">
                      {getCategoryById(t.categoryId)?.name || 'Non classé(e)'}
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
    </div>
  );
}


    