---
paths: src/**/*.ts, src/**/*.tsx
---
# Networking & API Conventions

## Nguyên tắc cơ bản

- KHÔNG hardcode base URL — dùng constants file hoặc env variable
- KHÔNG dùng `console.log` để debug response — xóa sau khi debug
- LUÔN handle 3 state: `loading`, `error`, `success` trong component
- LUÔN type response data — không dùng `any` cho API response

## Cấu trúc fetch wrapper

```typescript
// utils/api.ts — wrapper chuẩn
const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    // Throw với status để caller phân biệt 4xx vs 5xx
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
```

## Typing API response

```typescript
// types/api.ts
type ApiResponse<T> = {
  data: T;
  message: string;
};

type ApiError = {
  code: string;
  message: string;
};
```

## Dùng với TanStack Query (khuyến nghị cho bài học state management)

```typescript
// KHÔNG fetch trong useEffect — dùng useQuery thay thế
// useEffect + fetch gây race condition và không có cache
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => apiFetch<User[]>('/users'),
});
```

## Xử lý lỗi trong component

```typescript
// LUÔN render cả 3 branch
if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorView message={error.message} />;
return <DataView data={data} />;
```

## Bài học demo API

- Không cần server thật — dùng `https://jsonplaceholder.typicode.com` hoặc mock local
- Tách API calls vào `utils/` — không fetch trực tiếp trong component
