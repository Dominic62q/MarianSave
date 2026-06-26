import { getDatabase } from "@/lib/db";
import type { NewTransaction, Transaction, UpdateTransaction } from "@/lib/types";

type TransactionRow = {
  id: string;
  type: Transaction["type"];
  amount: number;
  category_id: string;
  description: string;
  payment_method: Transaction["paymentMethod"];
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    description: row.description,
    paymentMethod: row.payment_method,
    transactionDate: row.transaction_date,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTransactions() {
  const db = await getDatabase();
  const rows = await db.select<TransactionRow[]>(
    `SELECT
      id,
      type,
      amount,
      category_id,
      description,
      payment_method,
      transaction_date,
      notes,
      created_at,
      updated_at
    FROM transactions
    ORDER BY transaction_date DESC, created_at DESC`,
  );

  return rows.map(mapTransaction);
}

export async function createTransaction(input: NewTransaction) {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();
  const id = crypto.randomUUID();

  await db.execute(
    `INSERT INTO transactions (
      id, type, amount, category_id, description, payment_method, transaction_date, notes, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      id,
      input.type,
      input.amount,
      input.categoryId,
      input.description,
      input.paymentMethod,
      input.transactionDate,
      input.notes ?? null,
      timestamp,
      timestamp,
    ],
  );

  return id;
}

export async function updateTransaction(input: UpdateTransaction) {
  const db = await getDatabase();
  const current = await db.select<TransactionRow[]>(
    `SELECT
      id,
      type,
      amount,
      category_id,
      description,
      payment_method,
      transaction_date,
      notes,
      created_at,
      updated_at
    FROM transactions
    WHERE id = $1`,
    [input.id],
  );

  const existing = current[0];

  if (!existing) {
    throw new Error("Transaction not found.");
  }

  await db.execute(
    `UPDATE transactions
     SET type = $1,
         amount = $2,
         category_id = $3,
         description = $4,
         payment_method = $5,
         transaction_date = $6,
         notes = $7,
         updated_at = $8
     WHERE id = $9`,
    [
      input.type ?? existing.type,
      input.amount ?? existing.amount,
      input.categoryId ?? existing.category_id,
      input.description ?? existing.description,
      input.paymentMethod ?? existing.payment_method,
      input.transactionDate ?? existing.transaction_date,
      input.notes ?? existing.notes,
      new Date().toISOString(),
      input.id,
    ],
  );
}

export async function deleteTransaction(id: string) {
  const db = await getDatabase();
  await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
}
