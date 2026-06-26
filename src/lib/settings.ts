import { DEFAULT_SETTINGS } from "@/lib/constants";
import { getDatabase } from "@/lib/db";
import type { AppSettings, Setting, SettingKey } from "@/lib/types";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

export function getPreviewSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

export async function getSettings() {
  const db = await getDatabase();
  const rows = await db.select<Setting[]>(
    "SELECT key, value FROM settings ORDER BY key ASC",
  );

  return rows.reduce<AppSettings>(
    (acc, row) => {
      acc[row.key] = row.value;
      return acc;
    },
    { ...DEFAULT_SETTINGS },
  );
}

export async function setSetting(key: SettingKey, value: string) {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export async function setSettings(input: Partial<AppSettings>) {
  const db = await getDatabase();
  const entries = Object.entries(input) as Array<[SettingKey, string]>;

  for (const [key, value] of entries) {
    try {
      await db.execute(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value],
      );
    } catch (error) {
      throw new Error(`Failed to save "${key}": ${toErrorMessage(error)}`);
    }
  }
}
