# 04 Storage — MMKV + SQLite + Offline-First

## Objectives
- [x] Cài đặt react-native-mmkv, @op-engineering/op-sqlite, @react-native-community/netinfo
- [x] MMKV: migrate Zustand `useUIStore` từ AsyncStorage sang MMKV
- [x] SQLite: `transactions` table với migrations + WAL mode + index
- [x] `TransactionRepositoryImpl` wiring Clean Arch interface từ Day 1
- [x] Offline-first: add transaction → ghi SQLite ngay → enqueue sync
- [x] Sync queue: flush khi network trở lại (NetInfo listener)
- [x] Replace TanStack Query mock với SQLite reads thực tế

**Done when:** Add transaction → close app → reopen → data vẫn còn. Bật Airplane mode → thêm transaction → tắt Airplane mode → ⏳ biến mất (đã sync).

---

## Folder Structure

```
src/04_storage/
├── database/
│   ├── db.ts                      ← SQLite singleton + WAL + runMigrations
│   └── migrations.ts              ← append-only migration array
├── repositories/
│   └── TransactionRepositoryImpl.ts  ← getAll/create/delete/markSynced
├── stores/
│   └── useUIStore.ts              ← Zustand + MMKV (thay AsyncStorage)
├── sync/
│   └── syncQueue.ts               ← MMKV-backed offline action queue
├── hooks/
│   ├── useNetworkStatus.ts        ← NetInfo + auto flush khi online
│   └── useTransactions.ts         ← TanStack Query wrapping SQLite
└── screens/
    └── TransactionsScreen.tsx     ← list + add + offline banner
```

---

## WHY mỗi storage cho mỗi use case

| Data | Storage | WHY |
|---|---|---|
| UI prefs (theme, filter) | MMKV | Key-value, sync API, ~30x nhanh hơn AsyncStorage |
| Transactions (relational) | SQLite | Cần filter/sort/query phức tạp theo date, category |
| Sync queue | MMKV | Sync write quan trọng khi app có thể bị kill bất cứ lúc nào |

## WHY WAL mode?

WAL (Write-Ahead Logging) cho phép concurrent reads không block nhau. Quan trọng vì TanStack Query có thể đang đọc data ở background thread trong khi user đang mutate ở main thread. Default journal mode (DELETE) sẽ lock toàn bộ file khi write.

## Offline flow

```
User thêm transaction
    ↓
Ghi vào SQLite (syncStatus = 'pending')   ← immediate, không đợi network
    ↓
Enqueue vào MMKV sync queue
    ↓
UI invalidate TanStack Query → re-read SQLite → hiển thị ⏳
    ↓
Network trở lại (NetInfo) → flushQueue()
    ↓
POST lên server → markSynced() → ⏳ biến mất
```
