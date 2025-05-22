
"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, DollarSign, List, LineChart as LineChartIcon, Loader2 } from "lucide-react"; 
import { useDashboardData, type MonthlyTrendData } from "@/lib/mock-data";
import { format as formatDate } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatCurrencyCFA } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip as ShadTooltip,
  ChartTooltipContent,
  ChartLegend as ShadLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import * as RechartsPrimitive from "recharts";

export default function DashboardPage() {
  const { currentBalance, totalIncome, totalExpenses, recentTransactions, spendingSummary, monthlyTrendData, isLoading, error } = useDashboardData();

  const totalSpendingFromSummary = Object.values(spendingSummary).reduce((sum, amount) => sum + amount, 0);

  const chartConfig = {
    income: {
      label: "Revenus",
      color: "hsl(var(--chart-2))", // Green
    },
    expenses: {
      label: "Dépenses",
      color: "hsl(var(--chart-5))", // Red
    },
  } satisfies Record<string, { label: string; color: string }>;


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive py-10">
        <p>Erreur de chargement des données du tableau de bord: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Revenus Totaux (Ce Mois)</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent-foreground">{formatCurrencyCFA(totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ensemble de tous les revenus enregistrés ce mois-ci.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépenses Totales (Ce Mois)</CardTitle>
            <TrendingDown className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{formatCurrencyCFA(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ensemble de toutes les dépenses enregistrées ce mois-ci.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Évolution Mensuelle (6 Derniers Mois)</CardTitle>
          <CardDescription>Aperçu des revenus et dépenses sur les derniers mois.</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] w-full">
          {monthlyTrendData && monthlyTrendData.length > 0 ? (
            <ChartContainer config={chartConfig} className="w-full h-full">
              <RechartsPrimitive.LineChart
                accessibilityLayer
                data={monthlyTrendData}
                margin={{
                  left: 12,
                  right: 12,
                  top: 12,
                  bottom: 12,
                }}
              >
                <RechartsPrimitive.CartesianGrid vertical={false} />
                <RechartsPrimitive.XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => value}
                />
                <RechartsPrimitive.YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => formatCurrencyCFA(value).replace(' F CFA', '')}
                />
                <ShadTooltip 
                  formatter={(value, name) => (
                    <div>
                      <p className="font-medium">{chartConfig[name as keyof typeof chartConfig]?.label}</p>
                      <p>{formatCurrencyCFA(value as number)}</p>
                    </div>
                  )}
                  itemStyle={{textTransform: 'capitalize'}} 
                />
                <ShadLegend content={<ChartLegendContent />} />
                <RechartsPrimitive.Line
                  dataKey="income"
                  type="monotone"
                  stroke={chartConfig.income.color}
                  strokeWidth={2}
                  dot={true}
                  name="Revenus"
                />
                <RechartsPrimitive.Line
                  dataKey="expenses"
                  type="monotone"
                  stroke={chartConfig.expenses.color}
                  strokeWidth={2}
                  dot={true}
                  name="Dépenses"
                />
              </RechartsPrimitive.LineChart>
            </ChartContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Pas de données de tendance mensuelle disponibles.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
                      <div className="text-xs text-muted-foreground">{formatDate(transaction.date, 'PP', { locale: fr })}</div>
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
            <CardTitle>Résumé des Dépenses par Catégorie (Ce Mois)</CardTitle>
            <CardDescription>Répartition de vos dépenses par catégorie.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(spendingSummary).length === 0 && (
               <p className="text-sm text-muted-foreground text-center">Aucune donnée de dépense disponible pour ce mois.</p>
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
