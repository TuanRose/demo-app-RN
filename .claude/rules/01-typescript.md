# TypeScript Conventions

## Config
Dùng `@react-native/typescript-config` — strict mode bật sẵn (strictNullChecks, noImplicitAny).

## Rules
- KHÔNG dùng `any` — thay bằng `unknown` + type guard, hoặc type cụ thể
- Nếu buộc phải dùng `any`, bắt buộc có comment giải thích lý do
- KHÔNG dùng `as Type` (type assertion) để bypass lỗi — fix kiểu đúng cách
- Props interface phải được khai báo tường minh, không inline anonymous type phức tạp

## Naming
- Components: `PascalCase` (file + function)
- Hooks: `camelCase` bắt đầu bằng `use`
- Utils / helpers: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Types / interfaces: `PascalCase`, prefix `I` không dùng (dùng `UserProps`, không phải `IUserProps`)

## Import
- Import alias `@/` maps tới `src/` (cấu hình trong tsconfig và metro khi cần)
- Nhóm imports: (1) React/RN, (2) third-party, (3) internal `@/...`, (4) relative `./`
- Blank line giữa các nhóm
