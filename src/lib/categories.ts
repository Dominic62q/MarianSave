import { DEFAULT_CATEGORY_SEEDS } from "@/lib/constants";
import { getDatabase, type SqliteBoolean } from "@/lib/db";
import type { Category, CategorySeed, CategoryType } from "@/lib/types";

type CategoryRow = {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  is_active: SqliteBoolean;
  created_at: string;
  updated_at: string;
};

type CategoryWithUsageRow = CategoryRow & {
  transaction_count: number;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPreviewCategories() {
  const timestamp = new Date().toISOString();
  return DEFAULT_CATEGORY_SEEDS.map((seed) => mapSeed(seed, timestamp));
}

function mapSeed(seed: CategorySeed, timestamp: string): Category {
  return {
    id: seed.id,
    name: seed.name,
    type: seed.type,
    color: seed.color,
    icon: seed.icon,
    isActive: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function getCategories() {
  const db = await getDatabase();
  const rows = await db.select<CategoryRow[]>(
    "SELECT id, name, type, color, icon, is_active, created_at, updated_at FROM categories ORDER BY type DESC, name ASC",
  );

  return rows.map(mapCategory);
}

export async function getActiveCategories(type?: CategoryType) {
  const db = await getDatabase();

  const rows = type
    ? await db.select<CategoryRow[]>(
        "SELECT id, name, type, color, icon, is_active, created_at, updated_at FROM categories WHERE is_active = 1 AND (type = $1 OR type = 'both') ORDER BY name ASC",
        [type],
      )
    : await db.select<CategoryRow[]>(
        "SELECT id, name, type, color, icon, is_active, created_at, updated_at FROM categories WHERE is_active = 1 ORDER BY type DESC, name ASC",
      );

  return rows.map(mapCategory);
}

export async function getCategoryUsage() {
  const db = await getDatabase();
  const rows = await db.select<CategoryWithUsageRow[]>(
    `SELECT
      c.id,
      c.name,
      c.type,
      c.color,
      c.icon,
      c.is_active,
      c.created_at,
      c.updated_at,
      COUNT(t.id) AS transaction_count
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
    GROUP BY c.id
    ORDER BY c.type DESC, c.name ASC`,
  );

  return rows.map((row) => ({
    ...mapCategory(row),
    transactionCount: row.transaction_count,
  }));
}

export async function createCategory(input: {
  id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
}) {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();

  await db.execute(
    `INSERT INTO categories (id, name, type, color, icon, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, $6, $7)`,
    [
      input.id,
      input.name,
      input.type,
      input.color ?? null,
      input.icon ?? null,
      timestamp,
      timestamp,
    ],
  );
}

export async function updateCategory(input: {
  id: string;
  name: string;
  type: CategoryType;
  color?: string;
  icon?: string;
  isActive: boolean;
}) {
  const db = await getDatabase();

  await db.execute(
    `UPDATE categories
     SET name = $1, type = $2, color = $3, icon = $4, is_active = $5, updated_at = $6
     WHERE id = $7`,
    [
      input.name,
      input.type,
      input.color ?? null,
      input.icon ?? null,
      input.isActive ? 1 : 0,
      new Date().toISOString(),
      input.id,
    ],
  );
}

export async function disableCategory(id: string) {
  const db = await getDatabase();

  await db.execute(
    "UPDATE categories SET is_active = 0, updated_at = $1 WHERE id = $2",
    [new Date().toISOString(), id],
  );
}

export async function categoryHasTransactions(id: string) {
  const db = await getDatabase();
  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM transactions WHERE category_id = $1",
    [id],
  );

  return (rows[0]?.count ?? 0) > 0;
}
