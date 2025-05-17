"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTransactions, useCategories } from "@/lib/mock-data";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";

export default function JournalPage() {
  const { getTransactions } = useTransactions();
  const { getCategoryById } = useCategories();
  
  const transactions = getTransactions(); // Already sorted by date desc in useTransactions

  const journalEntries = useMemo(() => {
    let runningBalance = 0;
    // Iterate in reverse to calculate running balance chronologically
    return transactions
      .slice() // Create a copy to avoid mutating the original from getTransactions
      .sort((a, b) => a.date.getTime() - b.date.getTime()) // Sort chronologically
      .map(t => {
        if (t.type === 'income') {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
        return {
          ...t,
          categoryName: getCategoryById(t.categoryId)?.name || 'N/A',
          balance: runningBalance,
        };
      })
      .reverse(); // Reverse back to show most recent first
  }, [transactions, getCategoryById]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cash Journal</h1>
        <p className="text-muted-foreground">A chronological record of all your financial transactions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
          <CardDescription>Detailed log including running balance after each transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    No transactions recorded yet.
                  </TableCell>
                </TableRow>
              )}
              {journalEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(entry.date, 'PP')}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{entry.description}</TableCell>
                  <TableCell><Badge variant="outline">{entry.categoryName}</Badge></TableCell>
                  <TableCell className="text-right text-accent-foreground">
                    {entry.type === 'income' ? `$${entry.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {entry.type === 'expense' ? `$${entry.amount.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${entry.balance >=0 ? 'text-foreground':'text-destructive'}`}>
                    ${entry.balance.toFixed(2)}
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
