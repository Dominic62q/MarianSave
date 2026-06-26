import { useEffect, useMemo, useState } from "react";
import {
  Download,
  PencilLine,
  Plus,
  Power,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { ShellPage } from "@/components/ShellPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirm } from "@tauri-apps/plugin-dialog";
import {
  createCategory,
  disableCategory,
  getCategoryUsage,
  getPreviewCategories,
  updateCategory,
} from "@/lib/categories";
import { applyThemePreference } from "@/lib/appPreferences";
import { exportTransactionsCsv } from "@/lib/csvExport";
import { getPreviewSettings, getSettings, setSettings } from "@/lib/settings";
import { getTransactions } from "@/lib/transactions";
import { isTauriRuntime } from "@/lib/runtime";
import type {
  AppSettings,
  Category,
  CategoryType,
  SettingKey,
  Transaction,
} from "@/lib/types";

const isDesktop = isTauriRuntime();

type ManagedCategory = Category & {
  transactionCount: number;
};

type CategoryDraft = {
  id?: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isActive: boolean;
};

const emptyDraft: CategoryDraft = {
  name: "",
  type: "expense",
  color: "#2563eb",
  icon: "",
  isActive: true,
};

const previewSettings = getPreviewSettings();

export function SettingsPage() {
  const [categories, setCategories] = useState<ManagedCategory[]>(() =>
    isDesktop
      ? []
      : getPreviewCategories().map((category) => ({
          ...category,
          transactionCount: 0,
        })),
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettingsState] = useState<AppSettings>(() =>
    isDesktop ? previewSettings : getPreviewSettings(),
  );
  const [loading, setLoading] = useState(isDesktop);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<CategoryDraft>(emptyDraft);
  const [savingCategory, setSavingCategory] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!isDesktop) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [nextCategories, nextSettings, nextTransactions] = await Promise.all([
          getCategoryUsage(),
          getSettings(),
          getTransactions(),
        ]);

        if (cancelled) {
          return;
        }

        setCategories(nextCategories);
        setSettingsState(nextSettings);
        setTransactions(nextTransactions);
      } catch (error) {
        if (!cancelled) {
          setMessage({
            type: "error",
            text:
              error instanceof Error ? error.message : "Failed to load settings.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense" && category.isActive),
    [categories],
  );
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === "income" && category.isActive),
    [categories],
  );
  const inactiveCategories = useMemo(
    () => categories.filter((category) => !category.isActive),
    [categories],
  );

  async function refreshData() {
    if (!isDesktop) {
      return;
    }

    const [nextCategories, nextTransactions] = await Promise.all([
      getCategoryUsage(),
      getTransactions(),
    ]);

    setCategories(nextCategories);
    setTransactions(nextTransactions);
  }

  function openCreate(type: CategoryType = "expense") {
    setDraft({ ...emptyDraft, type });
    setDialogOpen(true);
  }

  function openEdit(category: ManagedCategory) {
    setDraft({
      id: category.id,
      name: category.name,
      type: category.type,
      color: category.color ?? "#2563eb",
      icon: category.icon ?? "",
      isActive: category.isActive,
    });
    setDialogOpen(true);
  }

  function updateSettingValue(key: SettingKey, value: string) {
    setSettingsState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSavePreferences() {
    setMessage(null);

    if (!isDesktop) {
      setMessage({ type: "error", text: "Requires the desktop app." });
      return;
    }

    setSavingPreferences(true);
    try {
      await setSettings({
        currency: settings.currency.trim() || previewSettings.currency,
        default_view: settings.default_view,
        default_transaction_type: settings.default_transaction_type,
        theme: settings.theme,
      });

      applyThemePreference(settings.theme);

      setMessage({
        type: "success",
        text: "Preferences saved.",
      });
    } catch (error) {
      console.error("Settings save failed", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Could not save preferences.",
      });
    } finally {
      setSavingPreferences(false);
    }
  }

  async function handleExportAllTransactions() {
    setMessage(null);

    if (!isDesktop) {
      setMessage({ type: "error", text: "Requires the desktop app." });
      return;
    }

    setExporting(true);
    try {
      const result = await exportTransactionsCsv({
        title: "Export all transactions",
        defaultFileName: "mariansave-transactions-all.csv",
        transactions,
        categories,
        currency: settings.currency || previewSettings.currency,
      });

      if (result.status === "success") {
        setMessage({
          type: "success",
          text: "All transactions exported successfully.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not export data.",
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveCategory() {
    setMessage(null);

    if (!isDesktop) {
      setMessage({ type: "error", text: "Requires the desktop app." });
      return;
    }

    const name = draft.name.trim();
    if (!name) {
      setMessage({ type: "error", text: "Category name is required." });
      return;
    }

    setSavingCategory(true);
    try {
      if (draft.id) {
        await updateCategory({
          id: draft.id,
          name,
          type: draft.type,
          color: draft.color || undefined,
          icon: draft.icon.trim() || undefined,
          isActive: draft.isActive,
        });
      } else {
        await createCategory({
          id: `custom-${crypto.randomUUID()}`,
          name,
          type: draft.type,
          color: draft.color || undefined,
          icon: draft.icon.trim() || undefined,
        });
      }

      await refreshData();
      setDialogOpen(false);
      setMessage({
        type: "success",
        text: draft.id ? "Category updated." : "Category created.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Could not save category.",
      });
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleToggleCategory(category: ManagedCategory) {
    if (!isDesktop) {
      return;
    }

    try {
      const confirmed = await confirm(
        category.isActive
          ? category.transactionCount > 0
            ? `Disable "${category.name}"? Existing transactions will be kept, but this category will stop appearing for new entries.`
            : `Disable "${category.name}"? It will stop appearing for new entries until you reactivate it.`
          : `Reactivate "${category.name}" so it appears again in transaction forms and filters?`,
        {
          title: category.isActive ? "Disable category" : "Reactivate category",
          kind: category.isActive ? "warning" : "info",
          okLabel: category.isActive ? "Disable" : "Reactivate",
          cancelLabel: "Cancel",
        },
      );

      if (!confirmed) {
        return;
      }

      if (category.isActive) {
        await disableCategory(category.id);
      } else {
        await updateCategory({
          id: category.id,
          name: category.name,
          type: category.type,
          color: category.color,
          icon: category.icon,
          isActive: true,
        });
      }

      await refreshData();
      setMessage({
        type: "success",
        text: category.isActive ? "Category disabled." : "Category reactivated.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error ? error.message : "Could not update category.",
      });
    }
  }

  return (
    <ShellPage
      cards={[
        { label: "Currency", value: settings.currency || previewSettings.currency },
        {
          label: "Default Type",
          value:
            settings.default_transaction_type === "income" ? "Income" : "Expense",
        },
        {
          label: "Active Categories",
          value: String(categories.filter((category) => category.isActive).length),
        },
        { label: "Saved Transactions", value: String(transactions.length) },
      ]}
    >
      {message && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            message.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <CardTitle>Preferences</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="settings-currency">Currency</Label>
                <Input
                  id="settings-currency"
                  value={settings.currency}
                  onChange={(event) =>
                    updateSettingValue("currency", event.target.value.toUpperCase())
                  }
                  placeholder="GHS"
                  maxLength={5}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-default-type">Default type</Label>
                <select
                  id="settings-default-type"
                  className="flex h-8 w-full rounded border border-input bg-background px-2 py-0.5 text-xs"
                  value={settings.default_transaction_type}
                  onChange={(event) =>
                    updateSettingValue("default_transaction_type", event.target.value)
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-default-view">Default view</Label>
                <select
                  id="settings-default-view"
                  className="flex h-8 w-full rounded border border-input bg-background px-2 py-0.5 text-xs"
                  value={settings.default_view}
                  onChange={(event) =>
                    updateSettingValue("default_view", event.target.value)
                  }
                >
                  <option value="this_month">This month</option>
                  <option value="all_time">All time</option>
                  <option value="last_30_days">Last 30 days</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="settings-theme">Theme</Label>
                <select
                  id="settings-theme"
                  className="flex h-8 w-full rounded border border-input bg-background px-2 py-0.5 text-xs"
                  value={settings.theme}
                  onChange={(event) => updateSettingValue("theme", event.target.value)}
                >
                  <option value="light">Light</option>
                  <option value="system">System</option>
                  <option value="dark">Dark</option>
                </select>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => void handleSavePreferences()}
              disabled={savingPreferences || loading}
            >
              <Settings2 className="h-4 w-4" />
              {savingPreferences ? "Saving..." : "Save preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              <CardTitle>Export</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Export all transactions</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Save your ledger as CSV.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleExportAllTransactions()}
                disabled={exporting || loading || !isDesktop}
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="mt-1 text-base font-semibold">{transactions.length}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Categories</p>
                <p className="mt-1 text-base font-semibold">{categories.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Expense Categories</CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => openCreate("expense")}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expense categories.</p>
            ) : (
              expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? "#64748b" }}
                    />
                    <span className="truncate text-sm font-medium">
                      {category.name}
                    </span>
                    {category.transactionCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({category.transactionCount})
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(category)}
                      aria-label="Edit"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => void handleToggleCategory(category)}
                      aria-label="Disable"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>Income Categories</CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => openCreate("income")}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : incomeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No income categories.</p>
            ) : (
              incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? "#64748b" }}
                    />
                    <span className="truncate text-sm font-medium">
                      {category.name}
                    </span>
                    {category.transactionCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        ({category.transactionCount})
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(category)}
                      aria-label="Edit"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => void handleToggleCategory(category)}
                      aria-label="Disable"
                    >
                      <Power className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {inactiveCategories.length > 0 && (
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle>Inactive Categories</CardTitle>
                <Badge variant="secondary">{inactiveCategories.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {inactiveCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? "#64748b" }}
                    />
                    <span className="truncate text-sm">{category.name}</span>
                    <Badge variant="outline">Inactive</Badge>
                    {category.transactionCount > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {category.transactionCount} linked
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => openEdit(category)}
                      aria-label="Edit"
                    >
                      <PencilLine className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void handleToggleCategory(category)}
                    >
                      Reactivate
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="Food, Transport, Freelance..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="cat-type">Type</Label>
                <select
                  id="cat-type"
                  className="flex h-8 w-full rounded border border-input bg-background px-2 py-0.5 text-xs"
                  value={draft.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      type: event.target.value as CategoryType,
                    }))
                  }
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                  <option value="both">Both</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="cat-color">Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cat-color"
                    type="color"
                    value={draft.color}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, color: event.target.value }))
                    }
                    className="h-8 w-10 p-0.5"
                  />
                  <Input
                    value={draft.color}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, color: event.target.value }))
                    }
                    placeholder="#2563eb"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-icon">Icon</Label>
              <Input
                id="cat-icon"
                value={draft.icon}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, icon: event.target.value }))
                }
                placeholder="wallet, bus-front, utensils-crossed..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={savingCategory}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleSaveCategory()}
              disabled={savingCategory}
            >
              {savingCategory ? "Saving..." : draft.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ShellPage>
  );
}
