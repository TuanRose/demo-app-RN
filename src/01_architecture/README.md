# 01 Architecture — FinTrack Scaffold

## Objectives
- [x] Scaffold FinTrack folder structure: `features/`, `shared/`, `services/`, `domain/`
- [x] Configure path aliases: `tsconfig.json` `paths` + `babel-plugin-module-resolver`
- [x] Define Domain layer: `Transaction`, `Budget`, `Category` entities + repository interfaces
- [x] Write README.md explaining the Clean Architecture decisions (WHY each layer exists)

**Done when:** `npx tsc --noEmit` passes with path aliases resolving correctly.

---

## Folder Structure

```
src/01_architecture/
├── domain/
│   ├── entities/         ← Pure data shapes — no RN, no SQLite, no AsyncStorage
│   ├── repositories/     ← Interfaces only — WHAT data ops exist, not HOW
│   └── usecases/         ← Business rules — compose repo calls, enforce invariants
├── features/
│   ├── auth/
│   ├── transactions/
│   └── budgets/
├── shared/
│   ├── components/       ← Generic UI, no business logic
│   ├── hooks/
│   ├── utils/
│   ├── types/
│   └── constants/
└── services/
    ├── api/              ← HTTP client, interceptors
    └── analytics/
```

---

## WHY Clean Architecture?

### WHY tách Domain layer?

Domain layer chứa business logic thuần TypeScript — không import React, không import SQLite, không import bất kỳ thư viện nào.

**Lợi ích thực tế:**
- Use cases dễ test: không cần mock RN, không cần setup simulator
- Domain logic có thể tái dùng nếu sau này làm web version
- Swap storage backend (SQLite → WatermelonDB) mà không đụng vào business rules

### WHY Repository interfaces ở Domain, implementation ở Data layer?

```
Domain:  TransactionRepository (interface)  ← biết WHAT
Data:    TransactionRepositoryImpl           ← biết HOW (SQLite cụ thể)
```

**Dependency inversion:** Use cases phụ thuộc vào interface, không phụ thuộc vào SQLite.
Khi test, inject mock repository thay vì phải setup database thật.

### WHY `spent` không lưu trong Budget entity?

`spent` là derived value — tính bằng cách aggregate transactions theo budgetId.
Lưu vào DB tạo ra sync problem: mỗi lần thêm/xóa transaction phải update Budget.spent.
Thay vào đó, query time computation: `SELECT SUM(amount) FROM transactions WHERE budget_id = ?`

### WHY path aliases thay vì relative imports?

```ts
// ❌ Relative — brittle khi di chuyển file
import { Transaction } from '../../../domain/entities/Transaction';

// ✅ Alias — stable regardless of file location
import { Transaction } from '@domain/entities/Transaction';
```

`babel-plugin-module-resolver` xử lý runtime resolution. TypeScript `paths` chỉ để type check.

---

## Path Aliases

| Alias | Trỏ đến |
|---|---|
| `@domain/*` | `src/01_architecture/domain/*` |
| `@features/*` | `src/01_architecture/features/*` |
| `@shared/*` | `src/01_architecture/shared/*` |
| `@services/*` | `src/01_architecture/services/*` |
| `@assets/*` | `src/assets/*` |

---

## Module Boundaries

```
features/  →  domain/        ✅
features/  →  shared/        ✅
features/  →  services/      ✅
features/  →  features/      ❌ (tight coupling — share qua shared/types thay thế)
shared/    →  features/      ❌
domain/    →  bất kỳ đâu     ❌ (domain là innermost layer)
```
