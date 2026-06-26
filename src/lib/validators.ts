import { z } from "zod";
import type { PaymentMethod, TransactionType } from "@/lib/types";

const transactionTypes: [TransactionType, ...TransactionType[]] = [
  "income",
  "expense",
];

const paymentMethods: [PaymentMethod, ...PaymentMethod[]] = [
  "cash",
  "mobile_money",
  "bank_transfer",
  "card",
  "other",
];

export const transactionSchema = z.object({
  type: z.enum(transactionTypes),
  amount: z
    .number({
      message: "Enter a valid amount.",
    })
    .refine((value) => Number.isFinite(value), "Enter a valid amount.")
    .positive("Amount must be greater than zero."),
  categoryId: z.string().min(1, "Choose a category."),
  description: z
    .string()
    .trim()
    .min(1, "Add a short description.")
    .max(120, "Description should stay under 120 characters."),
  paymentMethod: z.enum(paymentMethods),
  transactionDate: z
    .string()
    .min(1, "Select the transaction date.")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Select a valid date.",
    }),
  notes: z
    .string()
    .max(500, "Notes should stay under 500 characters.")
    .optional()
    .or(z.literal("")),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
