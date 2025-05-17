"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useTransactions, useCategories } from "@/lib/mock-data";
import type { Transaction, Category } from "@/types"; // Removed DatedAmount as it's not directly used here
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, subDays } from "date-fns";
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

export default function ReportsPage() {
  const { getTransactions } = useTransactions();
  const { getCategories, getCategoryById } = useCategories();
  const allTransactions = getTransactions();
  const allCategories = getCategories();

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
    montant: { // Changed from 'amount'
      label: `Montant (${"F CFA"})`, // Using "F CFA" directly
    },
    ...[...spendingByCategory, ...incomeByCategory].reduce((acc, cur) => { // Combine both to ensure all categories get colors
      const colorIndex = (Object.keys(acc).filter(k => k !== 'montant').length % 5) + 1;
      acc[cur.name] = { label: cur.name, color: `hsl(var(--chart-${colorIndex}))` };
      return acc;
    }, {} as any)
  };
  
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // For BarChart vertical layout
      const name = payload[0].name; // For PieChart might be payload[0].name
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Rapports Financiers</h1>
        <p className="text-muted-foreground">Analysez vos modèles de revenus et de dépenses.</p>
      </div>

      <Card>
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

      <div className="grid gap-6 md:grid-cols-3">
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

      <div className="grid gap-6 md:grid-cols-2">
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
    </div>
  );
}
