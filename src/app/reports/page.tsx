"use client";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker"; // Assuming this exists or will be created
import { Button } from "@/components/ui/button";
import { useTransactions, useCategories } from "@/lib/mock-data";
import type { Transaction, Category, DatedAmount } from "@/types";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek, subWeeks, startOfDay, endOfDay, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip as ShadTooltip, // alias to avoid conflict with recharts Tooltip
  ChartTooltipContent,
  ChartLegend as ShadLegend, // alias
  ChartLegendContent,
} from "@/components/ui/chart"


// Dummy DateRangePicker - replace with actual implementation if available or shadcn has one
const DummyDateRangePicker = ({ date, onDateChange }: { date?: DateRange, onDateChange: (range?: DateRange) => void }) => {
  return (
    <div className="flex items-center gap-2 p-2 border rounded-md">
      <input 
        type="date" 
        className="p-1 border rounded" 
        value={date?.from ? format(date.from, 'yyyy-MM-dd') : ''}
        onChange={(e) => onDateChange({ ...date, from: new Date(e.target.value) })}
      />
      <span>-</span>
      <input 
        type="date" 
        className="p-1 border rounded"
        value={date?.to ? format(date.to, 'yyyy-MM-dd') : ''}
        onChange={(e) => onDateChange({ ...date, to: new Date(e.target.value) })}
      />
    </div>
  );
};


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
    { label: "Today", range: { from: startOfDay(new Date()), to: endOfDay(new Date()) } },
    { label: "Yesterday", range: { from: startOfDay(subDays(new Date(),1)), to: endOfDay(subDays(new Date(),1)) } },
    { label: "This Week", range: { from: startOfWeek(new Date()), to: endOfWeek(new Date()) } },
    { label: "Last Week", range: { from: startOfWeek(subWeeks(new Date(),1)), to: endOfWeek(subWeeks(new Date(),1)) } },
    { label: "This Month", range: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) } },
    { label: "Last Month", range: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) } },
  ];


  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      const transactionDate = t.date;
      const inDateRange = dateRange?.from && dateRange?.to ? 
        transactionDate >= dateRange.from && transactionDate <= dateRange.to : true;
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
        const categoryName = getCategoryById(t.categoryId)?.name || 'Uncategorized';
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
        const categoryName = getCategoryById(t.categoryId)?.name || 'Uncategorized';
        categoryMap[categoryName] = (categoryMap[categoryName] || 0) + t.amount;
      });
    for (const [name, value] of Object.entries(categoryMap)) {
      data.push({ name, value });
    }
    return data.sort((a,b) => b.value - a.value);
  }, [filteredTransactions, getCategoryById]);
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A5D6A7', '#64B5F6'];

  const chartConfig = {
    amount: {
      label: "Amount ($)",
    },
    ...spendingByCategory.reduce((acc, cur) => {
      acc[cur.name] = { label: cur.name, color: `hsl(var(--chart-${(Object.keys(acc).length % 5) + 1}))` };
      return acc;
    }, {} as any)
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">Analyze your income and spending patterns.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-sm font-medium mb-1 block">Date Range Preset</label>
            <Select
              onValueChange={(value) => {
                const preset = presetDateRanges.find(p => p.label === value);
                if (preset) setDateRange(preset.range);
              }}
              defaultValue="This Month"
            >
              <SelectTrigger>
                <SelectValue placeholder="Select preset" />
              </SelectTrigger>
              <SelectContent>
                {presetDateRanges.map(p => <SelectItem key={p.label} value={p.label}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Custom Date Range</label>
            <DummyDateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Category</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Transaction Type</label>
            <Select value={transactionType} onValueChange={setTransactionType as any}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Total Income</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-accent-foreground">${summary.totalIncome.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold text-destructive">${summary.totalExpenses.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Net Savings</CardTitle></CardHeader>
          <CardContent className={`text-2xl font-bold ${summary.net >= 0 ? 'text-accent-foreground' : 'text-destructive'}`}>
            ${summary.net.toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>Visual breakdown of your expenses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {spendingByCategory.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                 <BarChart accessibilityLayer data={spendingByCategory} layout="vertical" margin={{left: 20, right:20}}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="value" hide/>
                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tickMargin={8} width={100} />
                    <ShadTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="value" layout="vertical" radius={5}>
                       {spendingByCategory.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                       ))}
                    </Bar>
                  </BarChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground pt-10">No spending data for selected period/filters.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Income by Category</CardTitle>
            <CardDescription>Visual breakdown of your income sources.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
             {incomeByCategory.length > 0 ? (
              <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                 <PieChart>
                    <ShadTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie data={incomeByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {incomeByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                        ))}
                    </Pie>
                    <ShadLegend content={<ChartLegendContent nameKey="name" />} />
                 </PieChart>
              </ChartContainer>
            ) : <p className="text-center text-muted-foreground pt-10">No income data for selected period/filters.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
