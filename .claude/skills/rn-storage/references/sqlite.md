# Reference: SQLite trong React Native

Dùng cho: dữ liệu có quan hệ (relational), complex queries, large datasets, offline-first apps.

---

## op-sqlite — thư viện được khuyến nghị (RN 0.73+)

```bash
npm install @op-engineering/op-sqlite
cd ios && bundle exec pod install
```

---

## Mở database + WAL mode

```tsx
import { open } from '@op-engineering/op-sqlite';

// Mở (hoặc tạo mới) database
const db = open({
  name: 'myapp.db',
  // location: 'Documents' // iOS, mặc định là Library/Documents
});

// Bật WAL mode — cải thiện performance đáng kể cho concurrent reads
db.execute('PRAGMA journal_mode=WAL;');
db.execute('PRAGMA foreign_keys=ON;');
db.execute('PRAGMA synchronous=NORMAL;'); // balance giữa safety và speed
```

---

## CRUD operations

```tsx
// Execute — không cần kết quả
db.execute(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at INTEGER DEFAULT (unixepoch())
  )
`);

// Insert
db.execute(
  'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
  ['user-1', 'John Doe', 'john@example.com']
);

// Query — trả về rows
const { rows } = db.execute('SELECT * FROM users WHERE id = ?', ['user-1']);
const user = rows?._array[0]; // hoặc rows?.item(0)
const allUsers = rows?._array; // tất cả rows

// Update
db.execute('UPDATE users SET name = ? WHERE id = ?', ['Jane Doe', 'user-1']);

// Delete
db.execute('DELETE FROM users WHERE id = ?', ['user-1']);
```

---

## Transaction

```tsx
// Transaction đảm bảo atomicity — tất cả thành công hoặc tất cả rollback
db.transaction((tx) => {
  tx.execute('INSERT INTO orders (id, user_id, total) VALUES (?, ?, ?)', ['order-1', 'user-1', 99.99]);
  tx.execute('UPDATE users SET order_count = order_count + 1 WHERE id = ?', ['user-1']);
  tx.execute('INSERT INTO order_items (order_id, product_id, qty) VALUES (?, ?, ?)', ['order-1', 'prod-1', 2]);
  // Nếu bất kỳ dòng nào throw → tất cả rollback
});
```

---

## Async operations

```tsx
// executeAsync — không block JS thread
const result = await db.executeAsync(
  'SELECT * FROM users WHERE name LIKE ?',
  [`%${searchTerm}%`]
);
const users = result.rows?._array ?? [];
```

---

## Migrations

```tsx
// Luôn có migration strategy từ đầu
const MIGRATIONS = [
  // v1 — initial schema
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT
  )`,
  // v2 — thêm column
  `ALTER TABLE users ADD COLUMN avatar_url TEXT`,
  // v3 — thêm table mới
  `CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    content TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  )`,
];

async function runMigrations(db: DB) {
  // Lưu version hiện tại
  db.execute('CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER)');
  const { rows } = db.execute('SELECT version FROM _schema_version LIMIT 1');
  const currentVersion = rows?._array[0]?.version ?? 0;

  // Chạy migrations chưa được apply
  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    db.transaction((tx) => {
      tx.execute(MIGRATIONS[i]);
      if (currentVersion === 0) {
        tx.execute('INSERT INTO _schema_version (version) VALUES (?)', [i + 1]);
      } else {
        tx.execute('UPDATE _schema_version SET version = ?', [i + 1]);
      }
    });
  }
}
```

---

## Typed queries với TypeScript

```tsx
interface User {
  id: string;
  name: string;
  email: string | null;
  created_at: number;
}

function getUser(id: string): User | null {
  const { rows } = db.execute('SELECT * FROM users WHERE id = ?', [id]);
  return (rows?._array[0] as User) ?? null;
}

function getUsers(): User[] {
  const { rows } = db.execute('SELECT * FROM users ORDER BY created_at DESC');
  return (rows?._array as User[]) ?? [];
}
```

---

## WatermelonDB — cho apps phức tạp

```bash
npm install @nozbe/watermelondb
npm install @nozbe/with-observables  # cho reactive queries
```

WatermelonDB tốt hơn cho:
- Apps có quan hệ phức tạp (hasMany, belongsTo)
- Cần reactive data (tự update UI khi data thay đổi)
- Offline-first với server sync
- Very large datasets (hàng trăm ngàn records)

```tsx
// Model definition
class Post extends Model {
  static table = 'posts';
  static associations = {
    comments: { type: 'has_many', foreignKey: 'post_id' },
    user: { type: 'belongs_to', key: 'user_id' },
  };

  @field('title') title!: string;
  @field('body') body!: string;
  @date('created_at') createdAt!: Date;
}
```
