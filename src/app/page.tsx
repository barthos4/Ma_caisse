
"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, List } from "lucide-react"; 
import { useDashboardData } from "@/lib/mock-data";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrencyCFA } from "@/lib/utils";

export default function DashboardPage() {
  const { currentBalance, totalIncome, totalExpenses, recentTransactions, spendingSummary } = useDashboardData();

  const totalSpendingFromSummary = Object.values(spendingSummary).reduce((sum, amount) => sum + amount, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Actuel</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${currentBalance >= 0 ? 'text-accent-foreground' : 'text-destructive'}`}>
              {formatCurrencyCFA(currentBalance)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Votre aperçu financier global.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus Totaux</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent-foreground">{formatCurrencyCFA(totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ensemble de tous les revenus enregistrés.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses Totales</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{formatCurrencyCFA(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ensemble de toutes les dépenses enregistrées.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transactions Récentes</CardTitle>
            <CardDescription>Vos 5 dernières activités financières.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">Aucune transaction récente.</TableCell>
                  </TableRow>
                )}
                {recentTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-xs text-muted-foreground">{format(transaction.date, 'PP', { locale: fr })}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{transaction.categoryName}</Badge></TableCell>
                    <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-accent-foreground' : 'text-destructive'}`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrencyCFA(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résumé des Dépenses par Catégorie</CardTitle>
            <CardDescription>Répartition de vos dépenses par catégorie.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(spendingSummary).length === 0 && (
               <p className="text-sm text-muted-foreground text-center">Aucune donnée de dépense disponible.</p>
            )}
            {Object.entries(spendingSummary).map(([category, amount]) => {
              const percentage = totalSpendingFromSummary > 0 ? (amount / totalSpendingFromSummary) * 100 : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{category}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrencyCFA(amount)}</span>
                  </div>
                  <Progress value={percentage} aria-label={`Pourcentage des dépenses pour ${category}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
