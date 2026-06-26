import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  CircleDollarSign,
  LoaderCircle,
  ReceiptText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import type { Category, NewTransaction } from "@/lib/types";
import {
  transactionSchema,
  type TransactionFormValues,
} from "@/lib/validators";

const today = new Date().toISOString().slice(0, 10);

const typeCards = [
  { value: "income" as const, icon: CircleDollarSign, label: "Income" },
  { value: "expense" as const, icon: ReceiptText, label: "Expense" },
];

type TransactionFormProps = {
  mode: "create" | "edit";
  currency: string;
  categories: Category[];
  loadingCategories?: boolean;
  initialValues?: Partial<NewTransaction>;
  submitLabel?: string;
  pendingLabel?: string;
  disabled?: boolean;
  message?: {
    type: "error" | "success";
    text: string;
  } | null;
  onCancel?: () => void;
  onSubmit: (values: TransactionFormValues) => Promise<void> | void;
};

export function TransactionForm({
  mode,
  currency,
  categories,
  loadingCategories = false,
  initialValues,
  submitLabel,
  pendingLabel,
  disabled = false,
  message,
  onCancel,
  onSubmit,
}: TransactionFormProps) {
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initialValues?.type ?? "expense",
      amount: initialValues?.amount,
      categoryId: initialValues?.categoryId ?? "",
      description: initialValues?.description ?? "",
      paymentMethod: initialValues?.paymentMethod ?? "cash",
      transactionDate: initialValues?.transactionDate ?? today,
      notes: initialValues?.notes ?? "",
    },
    mode: "onBlur",
  });

  useEffect(() => {
    form.reset({
      type: initialValues?.type ?? "expense",
      amount: initialValues?.amount,
      categoryId: initialValues?.categoryId ?? "",
      description: initialValues?.description ?? "",
      paymentMethod: initialValues?.paymentMethod ?? "cash",
      transactionDate: initialValues?.transactionDate ?? today,
      notes: initialValues?.notes ?? "",
    });
  }, [form, initialValues]);

  const selectedType = form.watch("type");
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both",
  );

  useEffect(() => {
    const currentCategoryId = form.getValues("categoryId");
    if (currentCategoryId && !filteredCategories.some((c) => c.id === currentCategoryId)) {
      form.setValue("categoryId", "", { shouldValidate: true });
    }
  }, [filteredCategories, form]);

  const fieldSelect =
    "flex h-8 w-full rounded border border-input bg-background px-2 py-0.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

  return (
    <form
      className="space-y-3"
      onSubmit={form.handleSubmit(async (values) => {
        await onSubmit(values);
      })}
      noValidate
    >
      <div className="grid gap-2 md:grid-cols-2">
        {typeCards.map(({ value, icon: Icon, label }) => {
          const active = selectedType === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() =>
                form.setValue("type", value, {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                })
              }
              className={`flex items-center gap-2.5 rounded border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                active
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-background hover:border-primary/40"
              }`}
              aria-pressed={active}
              disabled={disabled}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${mode}-amount`}>Amount</Label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {currency.toUpperCase()}
            </span>
            <Input
              id={`${mode}-amount`}
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              className="pl-14"
              placeholder="0.00"
              {...form.register("amount", { valueAsNumber: true })}
              disabled={disabled}
            />
          </div>
          {form.formState.errors.amount && (
            <p className="text-xs text-rose-600">{form.formState.errors.amount.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-transactionDate`}>Date</Label>
          <Input
            id={`${mode}-transactionDate`}
            type="date"
            max="9999-12-31"
            {...form.register("transactionDate")}
            disabled={disabled}
          />
          {form.formState.errors.transactionDate && (
            <p className="text-xs text-rose-600">{form.formState.errors.transactionDate.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`${mode}-categoryId`}>Category</Label>
          <select
            id={`${mode}-categoryId`}
            className={fieldSelect}
            {...form.register("categoryId")}
            disabled={disabled || loadingCategories || filteredCategories.length === 0}
          >
            <option value="">
              {loadingCategories
                ? "Loading..."
                : filteredCategories.length === 0
                  ? "No categories available"
                  : "Select a category"}
            </option>
            {filteredCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {form.formState.errors.categoryId && (
            <p className="text-xs text-rose-600">{form.formState.errors.categoryId.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${mode}-paymentMethod`}>Payment Method</Label>
          <select
            id={`${mode}-paymentMethod`}
            className={fieldSelect}
            {...form.register("paymentMethod")}
            disabled={disabled}
          >
            {PAYMENT_METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {form.formState.errors.paymentMethod && (
            <p className="text-xs text-rose-600">{form.formState.errors.paymentMethod.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-description`}>Description</Label>
        <Input
          id={`${mode}-description`}
          placeholder="Lunch, transport to school, freelance payment..."
          {...form.register("description")}
          disabled={disabled}
        />
        {form.formState.errors.description && (
          <p className="text-xs text-rose-600">{form.formState.errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${mode}-notes`}>
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={`${mode}-notes`}
          placeholder="Any extra context..."
          {...form.register("notes")}
          disabled={disabled}
        />
        {form.formState.errors.notes && (
          <p className="text-xs text-rose-600">{form.formState.errors.notes.message}</p>
        )}
      </div>

      {message && (
        <div
          className={`rounded border px-3 py-1.5 text-xs ${
            message.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={disabled}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={disabled || loadingCategories}>
          {disabled ? (
            <>
              <LoaderCircle className="animate-spin" />
              {pendingLabel ?? "Saving..."}
            </>
          ) : (
            submitLabel ?? "Save"
          )}
        </Button>
      </div>
    </form>
  );
}
