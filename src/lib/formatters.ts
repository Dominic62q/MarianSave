import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import type { PaymentMethod } from "@/lib/types";

export function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatPaymentMethod(value: PaymentMethod) {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
}

export function formatTransactionType(value: "income" | "expense") {
  return value === "income" ? "Income" : "Expense";
}
