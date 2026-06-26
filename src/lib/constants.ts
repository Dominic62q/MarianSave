import type { AppSettings, CategorySeed, PaymentMethod } from "@/lib/types";

export const DATABASE_URL = "sqlite:mariansave.db";

export const DEFAULT_CATEGORY_SEEDS: CategorySeed[] = [
  { id: "income-salary", name: "Salary", type: "income", color: "#16a34a", icon: "briefcase-business" },
  { id: "income-allowance", name: "Allowance", type: "income", color: "#0f766e", icon: "wallet" },
  { id: "income-freelance", name: "Freelance", type: "income", color: "#0891b2", icon: "laptop" },
  { id: "income-gift", name: "Gift", type: "income", color: "#7c3aed", icon: "gift" },
  { id: "income-business", name: "Business", type: "income", color: "#1d4ed8", icon: "store" },
  { id: "income-refund", name: "Refund", type: "income", color: "#0f766e", icon: "receipt" },
  { id: "income-other", name: "Other", type: "income", color: "#475569", icon: "sparkles" },
  { id: "expense-food", name: "Food", type: "expense", color: "#ef4444", icon: "utensils-crossed" },
  { id: "expense-transport", name: "Transport", type: "expense", color: "#f97316", icon: "bus-front" },
  { id: "expense-rent", name: "Rent", type: "expense", color: "#dc2626", icon: "house" },
  { id: "expense-utilities", name: "Utilities", type: "expense", color: "#2563eb", icon: "lightbulb" },
  { id: "expense-internet", name: "Internet", type: "expense", color: "#0284c7", icon: "wifi" },
  { id: "expense-airtime", name: "Airtime", type: "expense", color: "#7c2d12", icon: "smartphone" },
  { id: "expense-school", name: "School", type: "expense", color: "#7c3aed", icon: "graduation-cap" },
  { id: "expense-health", name: "Health", type: "expense", color: "#db2777", icon: "heart-pulse" },
  { id: "expense-shopping", name: "Shopping", type: "expense", color: "#9333ea", icon: "shopping-bag" },
  { id: "expense-entertainment", name: "Entertainment", type: "expense", color: "#c026d3", icon: "film" },
  { id: "expense-subscriptions", name: "Subscriptions", type: "expense", color: "#6366f1", icon: "badge-dollar-sign" },
  { id: "expense-family", name: "Family", type: "expense", color: "#ec4899", icon: "users" },
  { id: "expense-savings", name: "Savings", type: "expense", color: "#059669", icon: "piggy-bank" },
  { id: "expense-other", name: "Other", type: "expense", color: "#64748b", icon: "folder" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  currency: "GHS",
  default_view: "this_month",
  default_transaction_type: "expense",
  theme: "light",
};

export const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
}> = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];
