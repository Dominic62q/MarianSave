import type { Category, ReportFilter, Transaction } from "@/lib/types";

export type MonthlyReportSnapshot = {
  selectedMonthLabel: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  savingsRate: number;
  topExpenseCategory?: string;
  transactionCount: number;
};

export type CategoryReportItem = {
  categoryId: string;
  categoryName: string;
  totalSpent: number;
  percentage: number;
  transactionCount: number;
  color?: string;
};

export type DailyTrendItem = {
  date: string;
  label: string;
  totalSpent: number;
};

export type RangeSummary = {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  transactionCount: number;
};

export type ReportsSnapshot = {
  monthly: MonthlyReportSnapshot;
  category: CategoryReportItem[];
  dailyTrend: DailyTrendItem[];
  range: RangeSummary;
};

function getMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function getCategoryMap(categories: Category[]) {
  return new Map(categories.map((category) => [category.id, category]));
}

export function filterTransactions(
  transactions: Transaction[],
  filter: ReportFilter,
) {
  return transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transactionDate);
    const matchesMonth =
      filter.month == null ||
      transactionDate.getMonth() + 1 === filter.month;
    const matchesYear =
      filter.year == null || transactionDate.getFullYear() === filter.year;
    const matchesStart =
      !filter.startDate ||
      transactionDate >= new Date(`${filter.startDate}T00:00:00`);
    const matchesEnd =
      !filter.endDate ||
      transactionDate <= new Date(`${filter.endDate}T23:59:59`);
    const matchesCategory =
      !filter.categoryId || transaction.categoryId === filter.categoryId;
    const matchesType = !filter.type || transaction.type === filter.type;

    return (
      matchesMonth &&
      matchesYear &&
      matchesStart &&
      matchesEnd &&
      matchesCategory &&
      matchesType
    );
  });
}

export function createReportsSnapshot(
  transactions: Transaction[],
  categories: Category[],
  options?: {
    month?: number;
    year?: number;
    startDate?: string;
    endDate?: string;
  },
): ReportsSnapshot {
  const now = new Date();
  const selectedMonth = options?.month ?? now.getMonth() + 1;
  const selectedYear = options?.year ?? now.getFullYear();
  const defaultRangeStart = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
  const defaultRangeEnd = new Date(selectedYear, selectedMonth, 0)
    .toISOString()
    .slice(0, 10);

  const startDate = options?.startDate ?? defaultRangeStart;
  const endDate = options?.endDate ?? defaultRangeEnd;

  const categoryMap = getCategoryMap(categories);
  const monthlyTransactions = filterTransactions(transactions, {
    month: selectedMonth,
    year: selectedYear,
  });
  const rangeTransactions = filterTransactions(transactions, {
    startDate,
    endDate,
  });

  const monthlyIncome = monthlyTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const monthlyBalance = monthlyIncome - monthlyExpenses;
  const savingsRate =
    monthlyIncome > 0 ? (monthlyBalance / monthlyIncome) * 100 : 0;

  const monthlyExpenseGroups = new Map<
    string,
    { totalSpent: number; transactionCount: number }
  >();

  for (const transaction of monthlyTransactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const existing = monthlyExpenseGroups.get(transaction.categoryId);
    monthlyExpenseGroups.set(transaction.categoryId, {
      totalSpent: (existing?.totalSpent ?? 0) + transaction.amount,
      transactionCount: (existing?.transactionCount ?? 0) + 1,
    });
  }

  const totalCategorySpend = Array.from(monthlyExpenseGroups.values()).reduce(
    (sum, item) => sum + item.totalSpent,
    0,
  );

  const category = Array.from(monthlyExpenseGroups.entries())
    .map(([categoryId, value]) => {
      const categoryEntry = categoryMap.get(categoryId);
      return {
        categoryId,
        categoryName: categoryEntry?.name ?? "Other",
        totalSpent: value.totalSpent,
        percentage:
          totalCategorySpend > 0 ? (value.totalSpent / totalCategorySpend) * 100 : 0,
        transactionCount: value.transactionCount,
        color: categoryEntry?.color,
      };
    })
    .sort((left, right) => right.totalSpent - left.totalSpent);

  const topExpenseCategory = category[0]?.categoryName;

  const dailyTrendMap = new Map<string, number>();
  for (const transaction of rangeTransactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    const key = transaction.transactionDate;
    dailyTrendMap.set(key, (dailyTrendMap.get(key) ?? 0) + transaction.amount);
  }

  const dailyTrend = Array.from(dailyTrendMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, totalSpent]) => ({
      date,
      label: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
      }).format(new Date(date)),
      totalSpent,
    }));

  const rangeIncome = rangeTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const rangeExpenses = rangeTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    monthly: {
      selectedMonthLabel: getMonthLabel(selectedYear, selectedMonth),
      totalIncome: monthlyIncome,
      totalExpenses: monthlyExpenses,
      balance: monthlyBalance,
      savingsRate,
      topExpenseCategory,
      transactionCount: monthlyTransactions.length,
    },
    category,
    dailyTrend,
    range: {
      startDate,
      endDate,
      totalIncome: rangeIncome,
      totalExpenses: rangeExpenses,
      balance: rangeIncome - rangeExpenses,
      transactionCount: rangeTransactions.length,
    },
  };
}
