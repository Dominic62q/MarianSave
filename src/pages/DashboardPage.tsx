import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategories, getPreviewCategories } from "@/lib/categories";
import { createDashboardSnapshot } from "@/lib/dashboard";
import { formatCurrency, formatDate, formatTransactionType } from "@/lib/formatters";
import { isTauriRuntime } from "@/lib/runtime";
import { getPreviewSettings, getSettings } from "@/lib/settings";
import { getTransactions } from "@/lib/transactions";
import type { Category, Transaction } from "@/lib/types";

const isDesktop = isTauriRuntime();

function getPreviewSnapshot() {
  return createDashboardSnapshot([], getPreviewCategories());
}

function chartFormatter(value: unknown) {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return [String(n), ""] as [string, string];
}

export function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(() =>
    isDesktop ? [] : getPreviewCategories(),
  );
  const [currency, setCurrency] = useState(
    isDesktop ? "GHS" : getPreviewSettings().currency,
  );
  const [loading, setLoading] = useState(isDesktop);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      if (!isDesktop) {
        setLoading(false);
        return;
      }

      try {
        const [nextTransactions, nextCategories, settings] = await Promise.all([
          getTransactions(),
          getCategories(),
          getSettings(),
        ]);

        if (cancelled) return;

        setTransactions(nextTransactions);
        setCategories(nextCategories);
        setCurrency(settings.currency ?? "GHS");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDashboardData();
    return () => { cancelled = true; };
  }, []);

  const snapshot = useMemo(() => {
    if (!isDesktop && transactions.length === 0) return getPreviewSnapshot();
    return createDashboardSnapshot(transactions, categories);
  }, [categories, transactions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Card key={i}><CardContent className="p-3"><div className="h-12 animate-pulse rounded bg-secondary" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="p-3"><div className="h-64 animate-pulse rounded bg-secondary" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>;
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PiggyBank className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">No transactions yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">Add your first income or expense to start tracking.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const barData = snapshot.incomeExpenseSeries.map((item) => ({
    month: item.label,
    Income: item.income,
    Expenses: item.expenses,
  }));

  const pieData = snapshot.categoryBreakdown.map((item) => ({
    name: item.categoryName,
    value: item.total,
    color: item.color ?? "#64748b",
  }));

  const stats = [
    { label: "Income", value: formatCurrency(snapshot.summary.totalIncome, currency), tone: "text-emerald-600" as const },
    { label: "Expenses", value: formatCurrency(snapshot.summary.totalExpenses, currency), tone: "text-rose-600" as const },
    { label: "Balance", value: formatCurrency(snapshot.summary.balance, currency), tone: "" as const },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`mt-0.5 text-xs font-medium tracking-tight tabular-nums ${s.tone}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_340px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Income vs Expenses</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">Last six months</p>
                </div>
                <Badge variant="secondary">{snapshot.selectedMonthLabel}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} width={45} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                      formatter={chartFormatter as never}
                    />
                    <Bar dataKey="Income" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="Expenses" fill="#e11d48" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Recent transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                {snapshot.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{tx.description}</span>
                        <Badge variant="secondary" className={tx.type === "income" ? "bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}>
                          {formatTransactionType(tx.type)}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{tx.categoryName} &middot; {formatDate(tx.transactionDate)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(tx.amount, currency)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">No expense data yet.</p>
              ) : (
                <>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                          formatter={chartFormatter as never} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {snapshot.categoryBreakdown.slice(0, 5).map((item) => (
                      <div key={item.categoryId} className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#64748b" }} />
                        <span className="flex-1 truncate">{item.categoryName}</span>
                        <span className="text-muted-foreground tabular-nums">{item.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Spending</p>
                <p className="mt-0.5 text-sm font-semibold tracking-tight tabular-nums">
                  {formatCurrency(snapshot.summary.monthlySpending, currency)}
                </p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground">Top expense</p>
                <p className="mt-0.5 text-sm font-medium">{snapshot.summary.topExpenseCategory ?? "None yet"}</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <p className="text-xs text-muted-foreground">Entries</p>
                <p className="mt-0.5 text-sm font-medium">{transactions.length} recorded</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
