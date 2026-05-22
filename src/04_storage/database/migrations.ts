// Mỗi entry là một migration — chỉ APPEND, không sửa migration cũ
// Index trong array = version - 1 (index 0 = version 1)
export const MIGRATIONS: string[] = [
  // v1 — initial transactions table
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id TEXT NOT NULL,
    date TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER DEFAULT (unixepoch())
  )`,
  // v2 — index cho date queries (thêm sau khi phát hiện slow query)
  `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC)`,
];
