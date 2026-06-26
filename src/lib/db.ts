import Database from "@tauri-apps/plugin-sql";
import { DATABASE_URL } from "@/lib/constants";
import { isTauriRuntime } from "@/lib/runtime";

let databasePromise: Promise<Database> | null = null;

export async function getDatabase() {
  if (!isTauriRuntime()) {
    throw new Error("SQLite is only available inside the Tauri desktop runtime.");
  }

  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }

  return databasePromise;
}

export async function initializeDatabase() {
  if (!isTauriRuntime()) {
    return { available: false as const };
  }

  await getDatabase();
  return { available: true as const };
}

export type SqliteBoolean = 0 | 1;
