---
paths: __tests__/**/*.ts, __tests__/**/*.tsx, src/**/*.test.ts, src/**/*.test.tsx
---
# Testing Rules (Jest)

Config: `@react-native/jest-preset` — xem `jest.config.js`.

## Test file naming
- Unit test: `ComponentName.test.tsx` hoặc `functionName.test.ts`
- Đặt cạnh file nguồn (co-located) hoặc trong `__tests__/`

## Structure
```ts
describe('ComponentName', () => {
  it('should render without errors', () => { ... });
  it('should handle [specific behavior]', () => { ... });
});
```

## Mocking
- Mock native modules trong `jest.config.js` hoặc `__mocks__/`
- RN core modules đã được mock bởi `@react-native/jest-preset`
- Thêm custom mock: `jest.mock('@/utils/storage', () => ({ get: jest.fn() }))`

## Assertions
- Prefer `expect(fn).toHaveBeenCalledWith(...)` over `toHaveBeenCalled()`
- Test behavior, không test implementation details
- Trong repo học tập: viết comment giải thích **TẠI SAO** test này quan trọng

## React Native Testing Library (khi dùng)
- Install: `@testing-library/react-native`
- Query priority: `getByRole` > `getByText` > `getByTestId`
- Tham khảo skill `/rn-testing` → `rntl.md`
