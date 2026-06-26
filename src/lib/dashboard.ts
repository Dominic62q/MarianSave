import type {
  Category,
  DashboardSummary,
  Transaction,
} from "@/lib/types";

type DashboardBarDatum = {
  label: string;
  income: number;
  expenses: number;
};

type CategoryBreakdownDatum = {
  categoryId: string;
  categoryName: string;
  total: number;
  percentage: number;
  color?: string;
};

type RecentTransactionDatum = Transaction & {
  categoryName: string;
};

export type DashboardSnapshot = {
  summary: DashboardSummary;
  recentTransactions: RecentTransactionDatum[];
  incomeExpenseSeries: DashboardBarDatum[];
  categoryBreakdown: CategoryBreakdownDatum[];
  selectedMonthLabel: string;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "numeric",
  }).format(date);
}

function getCurrentMonthRange(now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return { start, end };
}

export function createDashboardSnapshot(
  transactions: Transaction[],
  categories: Category[],
  now = new Date(),
): DashboardSnapshot {
  const categoryMap = new Map(categories.map((category) => [category.id, category]));

  const totalIncome = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const totalExpenses = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const balance = totalIncome - totalExpenses;
  const currentMonth = getCurrentMonthRange(now);

  const currentMonthExpenses = transactions.filter((transaction) => {
    const transactionDate = new Date(transaction.transactionDate);
    return (
      transaction.type === "expense" &&
      transactionDate >= currentMonth.start &&
      transactionDate < currentMonth.end
    );
  });

  const monthlySpending = currentMonthExpenses.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const expenseCategoryTotals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== "expense") {
      continue;
    }

    expenseCategoryTotals.set(
      transaction.categoryId,
      (expenseCategoryTotals.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  const topExpenseCategoryEntry = Array.from(expenseCategoryTotals.entries()).sort(
    (left, right) => right[1] - left[1],
  )[0];

  const topExpenseCategory = topExpenseCategoryEntry
    ? (categoryMap.get(topExpenseCategoryEntry[0])?.name ?? "Other")
    : undefined;

  const seriesMap = new Map<string, DashboardBarDatum>();
  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    seriesMap.set(getMonthKey(date), {
      label: getMonthLabel(date),
      income: 0,
      expenses: 0,
    });
  }

  for (const transaction of transactions) {
    const date = new Date(transaction.transactionDate);
    const key = getMonthKey(new Date(date.getFullYear(), date.getMonth(), 1));
    const existing = seriesMap.get(key);

    if (!existing) {
      continue;
    }

    if (transaction.type === "income") {
      existing.income += transaction.amount;
    } else {
      existing.expenses += transaction.amount;
    }
  }

  const monthlyCategoryTotals = new Map<string, number>();
  for (const transaction of currentMonthExpenses) {
    monthlyCategoryTotals.set(
      transaction.categoryId,
      (monthlyCategoryTotals.get(transaction.categoryId) ?? 0) + transaction.amount,
    );
  }

  const categorySource =
    monthlyCategoryTotals.size > 0 ? monthlyCategoryTotals : expenseCategoryTotals;

  const categoryTotal = Array.from(categorySource.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  const categoryBreakdown = Array.from(categorySource.entries())
    .map(([categoryId, total]) => {
      const category = categoryMap.get(categoryId);

      return {
        categoryId,
        categoryName: category?.name ?? "Other",
        total,
        percentage: categoryTotal > 0 ? (total / categoryTotal) * 100 : 0,
        color: category?.color,
      };
    })
    .sort((left, right) => right.total - left.total)
    .slice(0, 6);

  const recentTransactions = [...transactions]
    .sort((left, right) => {
      const leftDate = new Date(left.transactionDate).getTime();
      const rightDate = new Date(right.transactionDate).getTime();
      return rightDate - leftDate;
    })
    .slice(0, 6)
    .map((transaction) => ({
      ...transaction,
      categoryName: categoryMap.get(transaction.categoryId)?.name ?? "Unknown category",
    }));

  return {
    summary: {
      totalIncome,
      totalExpenses,
      balance,
      monthlySpending,
      topExpenseCategory,
    },
    recentTransactions,
    incomeExpenseSeries: Array.from(seriesMap.values()),
    categoryBreakdown,
    selectedMonthLabel: getMonthLabel(now),
  };
}
