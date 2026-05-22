# rn-architecture

## What I built

Scaffolded FinTrack — một personal finance tracker — theo Clean Architecture với 3 layers rõ ràng: Domain (entities + repository interfaces + use cases), feature modules, và shared utilities. Cấu hình path aliases (`@domain`, `@features`, `@shared`, `@services`) qua `babel-plugin-module-resolver` + TypeScript `paths`.

## Key concepts

- **Dependency Rule**: outer layers depend on inner layers, không ngược lại. Domain không import bất cứ thứ gì từ ngoài — đây là điểm cốt lõi, không phải convention
- **Repository interface ở Domain**: use cases chỉ biết về interface, không biết SQLite hay API tồn tại — swap implementation mà không đụng business logic
- **Feature-based structure** thay vì type-based (`screens/`, `components/`): mọi thứ liên quan đến một feature nằm cùng nhau, dễ xóa hoặc disable độc lập
- **Barrel exports** (`index.ts`): public API của mỗi module — internal details không leak ra ngoài

## Decisions & trade-offs

- **Clean Architecture vs Feature + Hooks**: chọn Clean Architecture vì FinTrack có business rules thực (budget alert, spending aggregation) cần test độc lập với UI. Feature + Hooks đủ cho CRUD đơn giản.
- **`Budget.spent` không lưu vào DB**: computed at query time (`SUM(amount) WHERE budget_id = ?`) — tránh sync bug khi thêm/xóa transaction không update được spent.
- **`babel-plugin-module-resolver` + TypeScript `paths`**: hai cấu hình cần dùng song song — Babel xử lý runtime bundle, TypeScript paths chỉ để type check. Thiếu một trong hai thì hoặc compile error hoặc runtime crash.

## Gotchas

- `ignoreDeprecations: "6.0"` trong `tsconfig.json` không hợp lệ với TypeScript 5.x (chỉ valid từ TS 6+). IDE language server dùng TS mới hơn nên hiện warning, nhưng `tsc --noEmit` với TS 5.9.3 vẫn pass bình thường với `baseUrl`.
- Path aliases scope theo bài học — `@domain` trỏ vào `src/01_architecture/domain`, không phải global. Khi các bài sau dùng chung, cần điều chỉnh lại alias.

## Code patterns to remember

```ts
// Repository interface — Domain layer, không import storage
export interface TransactionRepository {
  getAll(filter?: TransactionFilter): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>;
  update(id: string, changes: Partial<Transaction>): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

// Use case — chỉ biết interface, không biết SQLite
export class GetTransactionsByBudget {
  constructor(private transactionRepository: TransactionRepository) {}
  async execute(budgetId: string): Promise<Transaction[]> {
    return this.transactionRepository.getAll({ budgetId });
  }
}
```

```js
// babel.config.js — runtime alias resolution
['module-resolver', {
  alias: {
    '@domain': './src/01_architecture/domain',
    '@features': './src/01_architecture/features',
  },
}]
```

## References

- [Skill reference: folder-structure.md](.claude/skills/rn-architecture/references/folder-structure.md)
- [Skill reference: clean-architecture.md](.claude/skills/rn-architecture/references/clean-architecture.md)
- [Lesson README](src/01_architecture/README.md)
