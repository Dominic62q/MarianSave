import { confirm, message, save } from "@tauri-apps/plugin-dialog";
import { exists, writeTextFile } from "@tauri-apps/plugin-fs";
import { formatPaymentMethod, formatTransactionType } from "@/lib/formatters";
import { filterTransactions, type CategoryReportItem } from "@/lib/reports";
import type { Category, ReportFilter, Transaction } from "@/lib/types";

type ExportFileResult =
  | { status: "success"; path: string }
  | { status: "cancelled" };

type TransactionExportOptions = {
  title: string;
  defaultFileName: string;
  transactions: Transaction[];
  categories: Category[];
  currency: string;
  filter?: ReportFilter;
};

type CategorySummaryExportOptions = {
  title: string;
  defaultFileName: string;
  items: CategoryReportItem[];
  monthLabel: string;
  currency: string;
};

function escapeCsvValue(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function createCsvContent(rows: Array<Array<string | number | null | undefined>>) {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

function formatAmount(amount: number) {
  return amount.toFixed(2);
}

function getCategoryName(categoryMap: Map<string, Category>, categoryId: string) {
  return categoryMap.get(categoryId)?.name ?? "Unknown";
}

async function saveCsvFile(options: {
  title: string;
  defaultFileName: string;
  csvContent: string;
}) {
  const path = await save({
    title: options.title,
    defaultPath: options.defaultFileName,
    filters: [{ name: "CSV", extensions: ["csv"] }],
  });

  if (!path) {
    return { status: "cancelled" } satisfies ExportFileResult;
  }

  const pathExists = await exists(path);
  if (pathExists) {
    const confirmed = await confirm(
      "A file already exists at this location. Overwrite it?",
      {
        title: "Overwrite export",
        kind: "warning",
        okLabel: "Overwrite",
        cancelLabel: "Cancel",
      },
    );

    if (!confirmed) {
      return { status: "cancelled" } satisfies ExportFileResult;
    }
  }

  await writeTextFile(path, `\uFEFF${options.csvContent}`);
  await message(`CSV export saved successfully.\n\n${path}`, {
    title: "Export complete",
    kind: "info",
  });

  return { status: "success", path } satisfies ExportFileResult;
}

export async function exportTransactionsCsv(options: TransactionExportOptions) {
  const filteredTransactions = options.filter
    ? filterTransactions(options.transactions, options.filter)
    : options.transactions;
  const categoryMap = new Map(options.categories.map((category) => [category.id, category]));

  const rows = [
    [
      "Transaction ID",
      "Date",
      "Type",
      "Category",
      "Amount",
      "Currency",
      "Payment Method",
      "Description",
      "Notes",
      "Created At",
      "Updated At",
    ],
    ...filteredTransactions.map((transaction) => [
      transaction.id,
      transaction.transactionDate,
      formatTransactionType(transaction.type),
      getCategoryName(categoryMap, transaction.categoryId),
      formatAmount(transaction.amount),
      options.currency,
      formatPaymentMethod(transaction.paymentMethod),
      transaction.description,
      transaction.notes ?? "",
      transaction.createdAt,
      transaction.updatedAt,
    ]),
  ];

  return saveCsvFile({
    title: options.title,
    defaultFileName: options.defaultFileName,
    csvContent: createCsvContent(rows),
  });
}

export async function exportCategorySummaryCsv(options: CategorySummaryExportOptions) {
  const rows = [
    [
      "Month",
      "Category",
      "Total Spent",
      "Currency",
      "Percentage of Expenses",
      "Transaction Count",
      "Color",
    ],
    ...options.items.map((item) => [
      options.monthLabel,
      item.categoryName,
      formatAmount(item.totalSpent),
      options.currency,
      item.percentage.toFixed(2),
      item.transactionCount,
      item.color ?? "",
    ]),
  ];

  return saveCsvFile({
    title: options.title,
    defaultFileName: options.defaultFileName,
    csvContent: createCsvContent(rows),
  });
}
