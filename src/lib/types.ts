export type TransactionType = "income" | "expense";

export type PaymentMethod =
  | "cash"
  | "mobile_money"
  | "bank_transfer"
  | "card"
  | "other";

export type CategoryType = "income" | "expense" | "both";

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategorySeed = {
  id: string;
  name: string;
  type: Extract<CategoryType, "income" | "expense">;
  color: string;
  icon: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  paymentMethod: PaymentMethod;
  transactionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewTransaction = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

export type UpdateTransaction = Partial<NewTransaction> & { id: string };

export type SettingKey =
  | "currency"
  | "default_view"
  | "default_transaction_type"
  | "theme";

export type Setting = {
  key: SettingKey;
  value: string;
};

export type AppSettings = Record<SettingKey, string>;

export type DashboardSummary = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlySpending: number;
  topExpenseCategory?: string;
};

export type ReportFilter = {
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
  categoryId?: string;
  type?: TransactionType;
};
