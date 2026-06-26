use tauri_plugin_sql::{Migration, MigrationKind};

fn migrations() -> Vec<Migration> {
    vec![Migration {
        version: 1,
        description: "create_initial_finance_schema",
        sql: r#"
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
  color TEXT,
  icon TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_type
  ON categories(name, type);

CREATE INDEX IF NOT EXISTS idx_categories_type_active
  ON categories(type, is_active);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount REAL NOT NULL CHECK (amount > 0),
  category_id TEXT NOT NULL,
  description TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions(category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_type
  ON transactions(type);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO categories (id, name, type, color, icon, is_active, created_at, updated_at) VALUES
  ('income-salary', 'Salary', 'income', '#16a34a', 'briefcase-business', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('income-allowance', 'Allowance', 'income', '#0f766e', 'wallet', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('income-freelance', 'Freelance', 'income', '#0891b2', 'laptop', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('income-gift', 'Gift', 'income', '#7c3aed', 'gift', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('income-business', 'Business', 'income', '#1d4ed8', 'store', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('income-refund', 'Refund', 'income', '#0f766e', 'receipt', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('income-other', 'Other', 'income', '#475569', 'sparkles', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-food', 'Food', 'expense', '#ef4444', 'utensils-crossed', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-transport', 'Transport', 'expense', '#f97316', 'bus-front', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-rent', 'Rent', 'expense', '#dc2626', 'house', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-utilities', 'Utilities', 'expense', '#2563eb', 'lightbulb', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-internet', 'Internet', 'expense', '#0284c7', 'wifi', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-airtime', 'Airtime', 'expense', '#7c2d12', 'smartphone', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-school', 'School', 'expense', '#7c3aed', 'graduation-cap', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-health', 'Health', 'expense', '#db2777', 'heart-pulse', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-shopping', 'Shopping', 'expense', '#9333ea', 'shopping-bag', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-entertainment', 'Entertainment', 'expense', '#c026d3', 'film', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-subscriptions', 'Subscriptions', 'expense', '#6366f1', 'badge-dollar-sign', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-family', 'Family', 'expense', '#ec4899', 'users', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-savings', 'Savings', 'expense', '#059669', 'piggy-bank', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ('expense-other', 'Other', 'expense', '#64748b', 'folder', 1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('currency', 'GHS'),
  ('default_view', 'this_month'),
  ('default_transaction_type', 'expense'),
  ('theme', 'light');
"#,
        kind: MigrationKind::Up,
    }]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:mariansave.db", migrations())
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
