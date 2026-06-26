import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  PencilLine,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ShellPage } from "@/components/ShellPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { getCategories, getPreviewCategories } from "@/lib/categories";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { formatCurrency, formatDate, formatPaymentMethod, formatTransactionType } from "@/lib/formatters";
import { isTauriRuntime } from "@/lib/runtime";
import { getPreviewSettings, getSettings } from "@/lib/settings";
import { createTransaction, deleteTransaction, getTransactions, updateTransaction } from "@/lib/transactions";
import type { Category, PaymentMethod, Transaction, TransactionType } from "@/lib/types";
import type { TransactionFormValues } from "@/lib/validators";

const isDesktop = isTauriRuntime();
const pageSize = 10;

type SortKey = "date" | "amount" | "category" | "type";
type SortDirection = "asc" | "desc";
type PanelState = { mode: "empty" } | { mode: "view"; transactionId: string } | { mode: "edit"; transactionId: string } | { mode: "delete"; transactionId: string };
type EnrichedTransaction = Transaction & { categoryName: string };

const sortKeys: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "type", label: "Type" },
  { key: "category", label: "Category" },
  { key: "amount", label: "Amount" },
];

function SortIcon({ sortKey, activeKey, direction }: { sortKey: SortKey; activeKey: SortKey; direction: SortDirection }) {
  if (sortKey !== activeKey) return <ArrowUpDown className="ml-0.5 h-3 w-3 text-muted-foreground/50" />;
  return direction === "asc" ? <ArrowUp className="ml-0.5 h-3 w-3" /> : <ArrowDown className="ml-0.5 h-3 w-3" />;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => isDesktop ? [] : getPreviewCategories());
  const [currency, setCurrency] = useState(isDesktop ? "GHS" : getPreviewSettings().currency);
  const [loading, setLoading] = useState(isDesktop);
  const [panelState, setPanelState] = useState<PanelState>({ mode: "empty" });
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState<"" | TransactionType>("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"" | PaymentMethod>("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addMessage, setAddMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [addFormKey, setAddFormKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isDesktop) { setLoading(false); return; }
      try {
        const [tx, cats, settings] = await Promise.all([getTransactions(), getCategories(), getSettings()]);
        if (cancelled) return;
        setTransactions(tx);
        setCategories(cats);
        setCurrency(settings.currency ?? "GHS");
      } catch (e) {
        if (!cancelled) setActionMessage({ type: "error", text: e instanceof Error ? e.message : "Could not load." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const enrichedTransactions = useMemo<EnrichedTransaction[]>(
    () => transactions.map((t) => ({ ...t, categoryName: categoryMap.get(t.categoryId)?.name ?? "Unknown" })),
    [categoryMap, transactions],
  );

  const yearOptions = useMemo(() => {
    const yrs = new Set(enrichedTransactions.map((t) => new Date(t.transactionDate).getFullYear().toString()));
    yrs.add(new Date().getFullYear().toString());
    return Array.from(yrs).sort((a, b) => Number(b) - Number(a));
  }, [enrichedTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return enrichedTransactions.filter((t) => {
      const d = new Date(t.transactionDate);
      if (month && String(d.getMonth() + 1).padStart(2, "0") !== month) return false;
      if (year && String(d.getFullYear()) !== year) return false;
      if (type && t.type !== type) return false;
      if (categoryId && t.categoryId !== categoryId) return false;
      if (paymentMethod && t.paymentMethod !== paymentMethod) return false;
      if (q && ![t.description, t.categoryName, t.paymentMethod, t.notes ?? ""].join(" ").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [categoryId, enrichedTransactions, month, paymentMethod, searchText, type, year]);

  const sortedTransactions = useMemo(() => {
    const next = [...filteredTransactions];
    next.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
      else if (sortKey === "amount") cmp = a.amount - b.amount;
      else if (sortKey === "category") cmp = a.categoryName.localeCompare(b.categoryName);
      else if (sortKey === "type") cmp = a.type.localeCompare(b.type);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return next;
  }, [filteredTransactions, sortDirection, sortKey]);

  useEffect(() => setPage(1), [searchText, month, year, type, categoryId, paymentMethod, sortKey, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(sortedTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [currentPage, sortedTransactions]);

  const activeTransaction = useMemo(() => {
    if (panelState.mode === "empty") return null;
    return transactions.find((t) => t.id === panelState.transactionId) ?? null;
  }, [panelState, transactions]);

  async function refresh() { if (!isDesktop) return; const next = await getTransactions(); setTransactions(next); }

  async function handleAddSubmit(values: TransactionFormValues) {
    setIsAdding(true); setAddMessage(null);
    try {
      await createTransaction({ type: values.type, amount: values.amount, categoryId: values.categoryId, description: values.description.trim(), paymentMethod: values.paymentMethod, transactionDate: values.transactionDate, notes: values.notes?.trim() || undefined });
      await refresh();
      setAddMessage({ type: "success", text: "Added." });
      setAddFormKey((k) => k + 1);
      setTimeout(() => setAddDialogOpen(false), 600);
    } catch (e) {
      setAddMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally { setIsAdding(false); }
  }

  async function handleEditSubmit(values: TransactionFormValues) {
    if (!activeTransaction) return;
    setSavingEdit(true); setActionMessage(null);
    try {
      await updateTransaction({ id: activeTransaction.id, type: values.type, amount: values.amount, categoryId: values.categoryId, description: values.description.trim(), paymentMethod: values.paymentMethod, transactionDate: values.transactionDate, notes: values.notes?.trim() || undefined });
      await refresh();
      setPanelState({ mode: "view", transactionId: activeTransaction.id });
      setActionMessage({ type: "success", text: "Updated." });
    } catch (e) {
      setActionMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally { setSavingEdit(false); }
  }

  async function handleDeleteConfirm() {
    if (!activeTransaction) return;
    setDeleting(true); setActionMessage(null);
    try {
      await deleteTransaction(activeTransaction.id);
      await refresh();
      setPanelState({ mode: "empty" });
      setActionMessage({ type: "success", text: "Deleted." });
    } catch (e) {
      setActionMessage({ type: "error", text: e instanceof Error ? e.message : "Failed." });
    } finally { setDeleting(false); }
  }

  function toggleSort(nextKey: SortKey) {
    if (sortKey === nextKey) setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(nextKey); setSortDirection(nextKey === "amount" ? "desc" : "asc"); }
  }

  const activeFilterCount = [month, year, type, categoryId, paymentMethod].filter(Boolean).length;
  function clearFilters() { setMonth(""); setYear(""); setType(""); setCategoryId(""); setPaymentMethod(""); setSearchText(""); }

  const pages = useMemo(() => {
    const r: (number | "...")[] = [];
    if (totalPages <= 7) for (let i = 1; i <= totalPages; i++) r.push(i);
    else {
      r.push(1);
      if (currentPage > 3) r.push("...");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) r.push(i);
      if (currentPage < totalPages - 2) r.push("...");
      r.push(totalPages);
    }
    return r;
  }, [currentPage, totalPages]);

  const sCls = "flex h-7 w-full rounded border border-input bg-background px-2 py-0.5 text-xs";

  return (
    <ShellPage
      cards={[
        { label: "Total", value: String(transactions.length) },
        { label: "Filtered", value: String(filteredTransactions.length) },
        { label: "Categories", value: String(categories.length) },
        { label: "Methods", value: "5" },
      ]}
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.55fr)_320px]">
        <div className="space-y-2">
          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchText} onChange={(e) => setSearchText(e.target.value)} className="pl-8 h-8 text-xs" placeholder="Search..." />
            </div>
            <Button variant={showFilters || activeFilterCount > 0 ? "secondary" : "outline"} size="sm" className="h-8 gap-1 text-xs" onClick={() => setShowFilters((s) => !s)}>
              <Filter className="h-3 w-3" />
              Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
            <Button size="sm" className="h-8 gap-1 text-xs" onClick={() => { setAddMessage(null); setAddDialogOpen(true); }}>
              <Plus className="h-3 w-3" />Add
            </Button>
          </div>

          {/* Filter chips */}
          {activeFilterCount > 0 && !showFilters && (
            <div className="flex flex-wrap items-center gap-1">
              {month && <Badge variant="secondary" className="gap-0.5 text-[11px]">{new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, Number(month) - 1, 1))}<button onClick={() => setMonth("")} aria-label="Remove"><X className="h-2.5 w-2.5" /></button></Badge>}
              {year && <Badge variant="secondary" className="gap-0.5 text-[11px]">{year}<button onClick={() => setYear("")} aria-label="Remove"><X className="h-2.5 w-2.5" /></button></Badge>}
              {type && <Badge variant="secondary" className="gap-0.5 text-[11px]">{type === "income" ? "Income" : "Expense"}<button onClick={() => setType("")} aria-label="Remove"><X className="h-2.5 w-2.5" /></button></Badge>}
              {categoryId && <Badge variant="secondary" className="gap-0.5 text-[11px]">{categoryMap.get(categoryId)?.name ?? "Category"}<button onClick={() => setCategoryId("")} aria-label="Remove"><X className="h-2.5 w-2.5" /></button></Badge>}
              {paymentMethod && <Badge variant="secondary" className="gap-0.5 text-[11px]">{PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label ?? paymentMethod}<button onClick={() => setPaymentMethod("")} aria-label="Remove"><X className="h-2.5 w-2.5" /></button></Badge>}
              <button onClick={clearFilters} className="text-[11px] text-muted-foreground hover:text-foreground ml-1">Clear all</button>
            </div>
          )}

          {/* Collapsible filter panel */}
          {showFilters && (
            <div className="grid gap-1.5 rounded border bg-background p-2 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Month</label>
                <select className={sCls} value={month} onChange={(e) => setMonth(e.target.value)}>
                  <option value="">All</option>
                  {Array.from({ length: 12 }, (_, i) => { const v = String(i + 1).padStart(2, "0"); return <option key={v} value={v}>{new Intl.DateTimeFormat("en-GB", { month: "short" }).format(new Date(2026, i, 1))}</option>; })}
                </select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Year</label>
                <select className={sCls} value={year} onChange={(e) => setYear(e.target.value)}><option value="">All</option>{yearOptions.map((v) => <option key={v} value={v}>{v}</option>)}</select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Type</label>
                <select className={sCls} value={type} onChange={(e) => setType(e.target.value as "" | TransactionType)}><option value="">All</option><option value="income">Income</option><option value="expense">Expense</option></select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Category</label>
                <select className={sCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">All</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              </div>
              <div className="space-y-0.5">
                <label className="text-[10px] font-medium text-muted-foreground">Payment</label>
                <select className={sCls} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "" | PaymentMethod)}><option value="">All</option>{PAYMENT_METHOD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
              </div>
              <div className="flex items-end">
                <Button variant="ghost" size="sm" className="h-7 text-[11px]" onClick={clearFilters}><X className="h-3 w-3 mr-1" />Clear</Button>
              </div>
            </div>
          )}

          {/* Messages */}
          {actionMessage && (
            <div className={`rounded border px-3 py-1.5 text-xs ${actionMessage.type === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
              {actionMessage.text}
            </div>
          )}

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {sortKeys.map(({ key, label }) => (
                        <th key={key} className={key === "amount" ? "px-3 py-2 text-right" : "px-3 py-2"}>
                          <button type="button" onClick={() => toggleSort(key)} className="inline-flex items-center gap-0.5 hover:text-foreground">
                            {label}<SortIcon sortKey={key} activeKey={sortKey} direction={sortDirection} />
                          </button>
                        </th>
                      ))}
                      <th className="px-3 py-2">Payment</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="w-8 px-1 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }, (_, i) => (
                        <tr key={i} className="border-b last:border-0"><td colSpan={7} className="px-3 py-2"><div className="h-4 w-full animate-pulse rounded bg-secondary" /></td></tr>
                      ))
                    ) : paginatedTransactions.length === 0 ? (
                      <tr><td colSpan={7} className="px-3 py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Search className="h-5 w-5 text-muted-foreground/50" />
                          <p className="text-xs font-medium">No results</p>
                          <p className="text-[11px] text-muted-foreground">{searchText || activeFilterCount > 0 ? "Try adjusting your filters." : "Add a transaction to get started."}</p>
                        </div>
                      </td></tr>
                    ) : (
                      paginatedTransactions.map((t) => (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-secondary/50 cursor-pointer" onClick={() => setPanelState({ mode: "view", transactionId: t.id })}>
                          <td className="px-3 py-1.5 align-top whitespace-nowrap">{formatDate(t.transactionDate)}</td>
                          <td className="px-3 py-1.5 align-top whitespace-nowrap">
                            <Badge variant={t.type === "income" ? "secondary" : "outline"}
                              className={t.type === "income" ? "bg-emerald-50 text-emerald-700 text-[11px]" : "border-rose-200 bg-rose-50 text-rose-700 text-[11px]"}>
                              {formatTransactionType(t.type)}
                            </Badge>
                          </td>
                          <td className="px-3 py-1.5 align-top whitespace-nowrap">{t.categoryName}</td>
                          <td className="px-3 py-1.5 text-right align-top whitespace-nowrap font-medium tabular-nums">
                            {formatCurrency(t.amount, currency)}
                          </td>
                          <td className="px-3 py-1.5 align-top whitespace-nowrap text-muted-foreground">{formatPaymentMethod(t.paymentMethod)}</td>
                          <td className="max-w-48 px-3 py-1.5 align-top">
                            <p className="truncate font-medium">{t.description}</p>
                            {t.notes && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{t.notes}</p>}
                          </td>
                          <td className="px-1 py-1.5 align-top" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-0">
                              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" aria-label="Edit" onClick={() => setPanelState({ mode: "edit", transactionId: t.id })}>
                                <PencilLine className="h-3 w-3" />
                              </Button>
                              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-rose-600" aria-label="Delete" onClick={() => setPanelState({ mode: "delete", transactionId: t.id })}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t px-3 py-1.5">
                  <p className="text-[11px] text-muted-foreground">{(currentPage - 1) * pageSize + 1}&ndash;{Math.min(currentPage * pageSize, sortedTransactions.length)} of {sortedTransactions.length}</p>
                  <div className="flex items-center gap-0.5">
                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-3 w-3" /></Button>
                    {pages.map((p, i) => p === "..." ? <span key={`d${i}`} className="px-0.5 text-[11px] text-muted-foreground">...</span> : (
                      <Button key={p} type="button" variant={currentPage === p ? "default" : "outline"} size="icon" className="h-6 w-6 text-[11px]" onClick={() => setPage(p)}>{p}</Button>
                    ))}
                    <Button type="button" variant="outline" size="icon" className="h-6 w-6" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-3 w-3" /></Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detail panel */}
        <Card>
          <CardHeader className="pb-1 flex-row items-center justify-between">
            <CardTitle>Details</CardTitle>
            {panelState.mode !== "empty" && <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPanelState({ mode: "empty" })} aria-label="Close"><X className="h-3.5 w-3.5" /></Button>}
          </CardHeader>
          <CardContent>
            {panelState.mode === "empty" || !activeTransaction ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Eye className="h-5 w-5 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">Select a transaction to see details.</p>
              </div>
            ) : panelState.mode === "view" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={activeTransaction.type === "income" ? "secondary" : "outline"}
                    className={activeTransaction.type === "income" ? "bg-emerald-50 text-emerald-700 text-[11px]" : "border-rose-200 bg-rose-50 text-rose-700 text-[11px]"}>
                    {formatTransactionType(activeTransaction.type)}
                  </Badge>
                  <Badge variant="secondary" className="text-[11px]">{formatPaymentMethod(activeTransaction.paymentMethod)}</Badge>
                </div>
                <h3 className="text-sm font-semibold">{activeTransaction.description}</h3>
                <p className="text-base font-semibold tabular-nums">{formatCurrency(activeTransaction.amount, currency)}</p>
                <Separator />
                <dl className="grid gap-1.5 sm:grid-cols-2 text-xs">
                  <div><dt className="text-[11px] text-muted-foreground">Date</dt><dd className="mt-0.5">{formatDate(activeTransaction.transactionDate)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Category</dt><dd className="mt-0.5">{categoryMap.get(activeTransaction.categoryId)?.name ?? "Unknown"}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Payment</dt><dd className="mt-0.5">{formatPaymentMethod(activeTransaction.paymentMethod)}</dd></div>
                  <div><dt className="text-[11px] text-muted-foreground">Recorded</dt><dd className="mt-0.5">{formatDate(activeTransaction.createdAt)}</dd></div>
                </dl>
                {activeTransaction.notes && (
                  <>
                    <Separator />
                    <div><p className="text-[11px] text-muted-foreground">Notes</p><p className="mt-0.5 text-xs">{activeTransaction.notes}</p></div>
                  </>
                )}
                <Separator />
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setPanelState({ mode: "edit", transactionId: activeTransaction.id })}>
                    <PencilLine className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1 h-7 text-xs text-rose-600" onClick={() => setPanelState({ mode: "delete", transactionId: activeTransaction.id })}>
                    <Trash2 className="h-3 w-3 mr-1" />Delete
                  </Button>
                </div>
              </div>
            ) : panelState.mode === "edit" ? (
              <TransactionForm mode="edit" currency={currency} categories={categories.filter((c) => c.isActive)} initialValues={activeTransaction} disabled={savingEdit}
                submitLabel="Save" pendingLabel="Saving..." message={actionMessage}
                onCancel={() => setPanelState({ mode: "view", transactionId: activeTransaction.id })} onSubmit={handleEditSubmit} />
            ) : (
              <div className="space-y-2">
                <div className="rounded border border-rose-200 bg-rose-50 p-2 text-[11px] text-rose-700">Delete this transaction? This cannot be undone.</div>
                <div className="rounded border p-2">
                  <p className="text-xs font-medium">{activeTransaction.description}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(activeTransaction.transactionDate)} &middot; {formatCurrency(activeTransaction.amount, currency)} &middot; {categoryMap.get(activeTransaction.categoryId)?.name ?? "Unknown"}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={() => setPanelState({ mode: "view", transactionId: activeTransaction.id })} disabled={deleting}>Cancel</Button>
                  <Button type="button" variant="destructive" size="sm" className="flex-1 h-7 text-xs" onClick={() => void handleDeleteConfirm()} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
          <TransactionForm key={addFormKey} mode="create" currency={currency}
            categories={categories.filter((c) => c.isActive)} loadingCategories={loading}
            disabled={isAdding} initialValues={{ type: "expense" }}
            submitLabel="Save" pendingLabel="Saving..." message={addMessage} onSubmit={handleAddSubmit} />
        </DialogContent>
      </Dialog>
    </ShellPage>
  );
}
