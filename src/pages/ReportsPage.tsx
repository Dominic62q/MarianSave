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
import { Download } from "lucide-react";
import { ShellPage } from "@/components/ShellPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildReportDefaults } from "@/lib/appPreferences";
import { getCategories, getPreviewCategories } from "@/lib/categories";
import {
  exportCategorySummaryCsv,
  exportTransactionsCsv,
} from "@/lib/csvExport";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { createReportsSnapshot } from "@/lib/reports";
import { isTauriRuntime } from "@/lib/runtime";
import { getPreviewSettings, getSettings } from "@/lib/settings";
import { getTransactions } from "@/lib/transactions";
import type { Category, Transaction } from "@/lib/types";

const isDesktop = isTauriRuntime();

function chartFmt(v: unknown) {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return [String(n), ""] as [string, string];
}

const selectCls = "flex h-8 w-full rounded border border-input bg-background px-2 py-1 text-xs";

export function ReportsPage() {
  const previewDefaults = buildReportDefaults(getPreviewSettings().default_view, []);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(() =>
    isDesktop ? [] : getPreviewCategories(),
  );
  const [currency, setCurrency] = useState(isDesktop ? "GHS" : getPreviewSettings().currency);
  const [loading, setLoading] = useState(isDesktop);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(previewDefaults.month);
  const [selectedYear, setSelectedYear] = useState(previewDefaults.year);
  const [startDate, setStartDate] = useState(previewDefaults.startDate);
  const [endDate, setEndDate] = useState(previewDefaults.endDate);
  const [activeExport, setActiveExport] = useState<string | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isDesktop) { setLoading(false); return; }
      try {
        const [tx, cats, settings] = await Promise.all([getTransactions(), getCategories(), getSettings()]);
        if (cancelled) return;
        const defs = buildReportDefaults(settings.default_view, tx);
        setTransactions(tx);
        setCategories(cats);
        setCurrency(settings.currency ?? "GHS");
        setSelectedMonth(defs.month);
        setSelectedYear(defs.year);
        setStartDate(defs.startDate);
        setEndDate(defs.endDate);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const yearOptions = useMemo(() => {
    const yrs = new Set(transactions.map((t) => new Date(t.transactionDate).getFullYear()));
    yrs.add(new Date().getFullYear());
    return Array.from(yrs).sort((a, b) => b - a);
  }, [transactions]);

  const reports = useMemo(
    () => createReportsSnapshot(transactions, categories, { month: selectedMonth, year: selectedYear, startDate, endDate }),
    [categories, endDate, selectedMonth, selectedYear, startDate, transactions],
  );

  function buildFileName(prefix: string) {
    return `mariansave-${prefix}-${selectedYear}-${String(selectedMonth).padStart(2, "0")}.csv`;
  }

  async function runExport(key: string, action: () => Promise<{ status: "success"; path: string } | { status: "cancelled" }>) {
    setActiveExport(key);
    setExportMsg(null);
    try {
      const r = await action();
      if (r.status === "success") setExportMsg("Done.");
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : "Failed.");
    } finally {
      setActiveExport(null);
    }
  }

  const pieData = reports.category.map((item) => ({
    name: item.categoryName,
    value: item.totalSpent,
    color: item.color ?? "#64748b",
  }));

  const trendData = reports.dailyTrend.map((item) => ({
    day: item.label,
    spent: item.totalSpent,
  }));

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}><CardContent className="p-3"><div className="h-20 animate-pulse rounded bg-secondary" /></CardContent></Card>
        ))}
      </div>
    );
  }

  if (error) return <div className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div>;

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">No transactions yet. Add income or expenses first to see reports.</CardContent>
      </Card>
    );
  }

  const summary = [
    { label: "Income", value: formatCurrency(reports.monthly.totalIncome, currency), tone: "text-emerald-600" },
    { label: "Expenses", value: formatCurrency(reports.monthly.totalExpenses, currency), tone: "text-rose-600" },
    { label: "Balance", value: formatCurrency(reports.monthly.balance, currency), tone: "" },
    { label: "Savings", value: `${reports.monthly.savingsRate.toFixed(1)}%`, tone: "" },
    { label: "Top expense", value: reports.monthly.topExpenseCategory ?? "N/A", tone: "" },
    { label: "Entries", value: String(reports.monthly.transactionCount), tone: "" },
  ];

  return (
    <ShellPage
      cards={[
        { label: "Period", value: reports.monthly.selectedMonthLabel },
        { label: "Categories", value: String(reports.category.length) },
        { label: "Range entries", value: String(reports.range.transactionCount) },
      ]}
    >
      <div className="space-y-3">
        {/* Summary row */}
        <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
          {summary.map((s) => (
            <div key={s.label} className="rounded bg-secondary/50 p-2">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className={`mt-0.5 text-xs font-medium truncate ${s.tone}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground" htmlFor="rm">Month</label>
            <select id="rm" className={selectCls} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, i, 1))}</option>
              ))}
            </select>
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground" htmlFor="ry">Year</label>
            <select id="ry" className={selectCls} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground" htmlFor="rs">From</label>
            <Input id="rs" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-muted-foreground" htmlFor="re">To</label>
            <Input id="re" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="flex items-end gap-1.5">
            {[
              ["all", "All"],
              ["month", "Month"],
              ["range", "Range"],
              ["cats", "Categories"],
            ].map(([key, label]) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={!isDesktop || activeExport !== null}
                onClick={() => {
                  if (key === "all") void runExport(key, () => exportTransactionsCsv({ title: "All", defaultFileName: "mariansave-all.csv", transactions, categories, currency }));
                  else if (key === "month") void runExport(key, () => exportTransactionsCsv({ title: "Month", defaultFileName: buildFileName("transactions"), transactions, categories, currency, filter: { month: selectedMonth, year: selectedYear } }));
                  else if (key === "range") void runExport(key, () => exportTransactionsCsv({ title: "Range", defaultFileName: `mariansave-${startDate}-to-${endDate}.csv`, transactions, categories, currency, filter: { startDate, endDate } }));
                  else void runExport(key, () => exportCategorySummaryCsv({ title: "Categories", defaultFileName: buildFileName("categories"), items: reports.category, monthLabel: reports.monthly.selectedMonthLabel, currency }));
                }}
              >
                <Download className="mr-1 h-3 w-3" />
                {activeExport === key ? "..." : label}
              </Button>
            ))}
            {exportMsg && <span className="text-[11px] text-muted-foreground">{exportMsg}</span>}
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-3 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Income vs Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} barGap={2} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false}
                      tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} width={35} />
                    <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                      formatter={chartFmt as never} />
                    <Bar dataKey="spent" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Categories</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length === 0 ? (
                <p className="text-xs text-muted-foreground">No expense data for this period.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <div className="h-32">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={52} paddingAngle={1} dataKey="value">
                          {pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "11px" }}
                          formatter={chartFmt as never} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-0.5">
                    {reports.category.slice(0, 8).map((item) => (
                      <div key={item.categoryId} className="flex items-center gap-1.5 text-[11px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: item.color ?? "#64748b" }} />
                        <span className="flex-1 truncate">{item.categoryName}</span>
                        <span className="text-muted-foreground tabular-nums">{item.percentage.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Date range summary */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>Date range</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
              <div className="rounded bg-secondary/50 p-2">
                <p className="text-[10px] text-muted-foreground">Period</p>
                <p className="mt-0.5 text-[11px] font-medium">{formatDate(reports.range.startDate)} &ndash; {formatDate(reports.range.endDate)}</p>
              </div>
              {[
                { label: "Income", value: formatCurrency(reports.range.totalIncome, currency), tone: "text-emerald-600" },
                { label: "Expenses", value: formatCurrency(reports.range.totalExpenses, currency), tone: "text-rose-600" },
                { label: "Balance", value: formatCurrency(reports.range.balance, currency), tone: "" },
                { label: "Entries", value: String(reports.range.transactionCount), tone: "" },
              ].map((s) => (
                <div key={s.label} className="rounded bg-secondary/50 p-2">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className={`mt-0.5 text-xs font-medium ${s.tone}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </ShellPage>
  );
}
