"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTransactions, useCategories } from "@/lib/mock-data";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from "@/components/ui/badge";
import { formatCurrencyCFA } from "@/lib/utils";

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
          categoryName: getCategoryById(t.categoryId)?.name || 'Non classé(e)',
          balance: runningBalance,
        };
      })
      .reverse(); // Reverse back to show most recent first
  }, [transactions, getCategoryById]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Journal de Caisse</h1>
        <p className="text-muted-foreground">Un enregistrement chronologique de toutes vos transactions financières.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les Transactions</CardTitle>
          <CardDescription>Journal détaillé incluant le solde après chaque transaction.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Revenu</TableHead>
                <TableHead className="text-right">Dépense</TableHead>
                <TableHead className="text-right">Solde</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Aucune transaction enregistrée pour le moment.
                  </TableCell>
                </TableRow>
              )}
              {journalEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{format(entry.date, 'PP', { locale: fr })}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">{entry.description}</TableCell>
                  <TableCell><Badge variant="outline">{entry.categoryName}</Badge></TableCell>
                  <TableCell className="text-right text-accent-foreground">
                    {entry.type === 'income' ? formatCurrencyCFA(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {entry.type === 'expense' ? formatCurrencyCFA(entry.amount) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${entry.balance >=0 ? 'text-foreground':'text-destructive'}`}>
                    {formatCurrencyCFA(entry.balance)}
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
