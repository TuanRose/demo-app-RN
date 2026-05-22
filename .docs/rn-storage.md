# rn-storage — MMKV + SQLite + Offline-First

**Ngày:** 2026-05-11 | **Bài:** Day 8–9, Week 2

---

## Key Concepts

### Chọn storage cho đúng use case

| Data | Storage | WHY |
|---|---|---|
| UI prefs (theme, filter) | MMKV | Key-value, sync API, ~30x nhanh AsyncStorage |
| Transactions (relational) | SQLite | Filter/sort/query phức tạp theo date, category |
| Sync queue | MMKV | Sync write quan trọng khi app bị kill bất cứ lúc nào |

### MMKV v4 (Nitro) — Breaking changes

```ts
// v3 (cũ)
const storage = new MMKV({ id: 'x' });
storage.delete('key');

// v4 (Nitro) — MMKV chỉ còn là TypeScript interface
import { createMMKV } from 'react-native-mmkv';
const storage = createMMKV({ id: 'x' });
storage.remove('key'); // rename: delete → remove
```

Cài thêm `react-native-nitro-modules` là peer dependency bắt buộc của v4.

### op-sqlite v15 — Breaking changes

```ts
// v14: execute() trả về object có ._array
const result = db.execute('SELECT * FROM t');
result.rows._array.map(...);

// v15: executeSync() trả về plain array
const { rows } = db.executeSync('SELECT * FROM t');
rows.map(...); // rows là Array trực tiếp

// transaction callback phải async
db.transaction(async tx => {
  await tx.execute('INSERT ...');
});
```

### WAL mode — tại sao bật

```ts
db.executeSync('PRAGMA journal_mode=WAL;');
db.executeSync('PRAGMA synchronous=NORMAL;');
```

WAL cho phép concurrent reads không block nhau — TanStack Query đọc background trong khi user mutate main thread. Default journal mode (DELETE) lock toàn bộ file khi write.

### Migration strategy — append-only

```ts
export const MIGRATIONS: string[] = [
  `CREATE TABLE transactions (...)`,  // v1
  `CREATE INDEX idx_date ON transactions(date)`, // v2 — thêm sau, không sửa v1
];
```

Chỉ append, không sửa migration cũ. `_schema_version` table track version hiện tại.

### Offline-first flow

```
User thêm transaction
  ↓
Ghi SQLite (syncStatus = 'pending') ← immediate
  ↓
Enqueue MMKV sync queue
  ↓
TanStack Query invalidate → re-read SQLite → hiển thị ⏳
  ↓
NetInfo offline→online → flushQueue()
  ↓
POST server → markSynced() → ⏳ biến mất
```

### Zustand + MMKV persist

```ts
// partialize BẮT BUỘC — loại functions ra khỏi serialization
partialize: state => ({
  theme: state.theme,
  transactionFilter: state.transactionFilter,
  currency: state.currency,
}),
```

### TanStack Query wrapping SQLite

```ts
queryFn: () => transactionRepo.getAll(filter),
staleTime: Infinity, // local SQLite — chỉ stale khi user mutate
```

`staleTime: Infinity` vì SQLite chỉ thay đổi khi user thêm/xoá — không cần background refetch theo thời gian.

---

## Gotchas

### `NativeModule.RNCNetInfo is null`

**Nguyên nhân**: `npm install` chạy sau `pod install` cuối cùng → native module chưa được link.

**Fix**:
```bash
bundle install          # nếu gem thiếu
bundle exec pod install # link native
npm run ios:sim         # rebuild hoàn toàn
```

### `rows._array` không tồn tại

op-sqlite v15 đổi `rows` từ object-with-`_array` thành plain array. Đọc `.d.ts` trong `node_modules` khi reference doc cũ.

### `MMKV only refers to a type`

v4 rename runtime class — phải dùng `createMMKV()` factory function.

### `Promise<void>` trong setTimeout (TypeScript strict)

```ts
// ❌ TypeScript strict reject
new Promise(resolve => setTimeout(resolve, 300));

// ✅
new Promise<void>(resolve => setTimeout(() => resolve(), 300));
```

---

## Code Patterns

### Sync queue với retry

```ts
export async function flushQueue(): Promise<void> {
  const failed: SyncAction[] = [];
  for (const action of getQueue()) {
    try {
      await executeAction(action);
    } catch {
      if (action.retries < 3) {
        failed.push({ ...action, retries: action.retries + 1 });
      }
      // discard sau 3 lần — tránh queue tích lũy vô hạn
    }
  }
  saveQueue(failed);
}
```

### NetInfo offline→online detection

```ts
const wasOffline = useRef(false);
NetInfo.addEventListener(state => {
  const online = state.isConnected ?? false;
  if (online && wasOffline.current) {
    flushQueue();
  }
  wasOffline.current = !online;
});
```

### Safe area — dùng insets thay SafeAreaView

```ts
const { top } = useSafeAreaInsets();
// <View style={{ paddingTop: top }}>
// Linh hoạt hơn SafeAreaView khi cần kiểm soát từng edge
```

---

## References

- [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv)
- [op-sqlite](https://github.com/OP-Engineering/op-sqlite)
- [@react-native-community/netinfo](https://github.com/react-native-community/react-native-netinfo)
