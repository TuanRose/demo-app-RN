# Reference: Chọn State Management Solution

---

## Phân loại state

| Loại State | Ví dụ | Solution |
|-----------|-------|---------|
| **Server state** | API data, pagination, cache | TanStack Query |
| **Global client state** | Auth, theme, cart, user prefs | Zustand hoặc Redux |
| **URL / Navigation state** | Route params, active tab | React Navigation |
| **Form state** | Input values, validation errors | React Hook Form |
| **Local component state** | Modal open/close, loading spinner | useState / useReducer |

---

## Decision Tree

```
Cần state này ở đây?
    ├── Chỉ trong 1 component → useState / useReducer
    ├── 2-3 component liền nhau → prop drilling hoặc Context
    └── Nhiều nơi trong app → tiếp tục...

Là dữ liệu từ server/API?
    └── YES → TanStack Query (không cần thêm gì)

Là client state?
    ├── App nhỏ / prototype → Zustand
    ├── Team lớn, cần time-travel debug → Redux Toolkit
    ├── Có nhiều async side effects phức tạp → Redux Toolkit + createAsyncThunk
    └── Cần ít boilerplate, dễ học → Zustand
```

---

## TanStack Query — cho Server State

```tsx
// ✅ Phù hợp
const { data } = useQuery({ queryKey: ['users'], queryFn: getUsers });

// ❌ Không phù hợp cho client state
// Không dùng TanStack Query để store auth token, UI state, theme
```

**Strengths:**
- Automatic background refetch, caching, deduplication
- Loading/error states tự động
- Pagination, infinite scroll
- Optimistic updates
- Offline support

---

## Zustand — cho Global Client State

```tsx
// ✅ Phù hợp: auth, theme, shopping cart, user preferences
const useAuthStore = create(set => ({
  token: null,
  setToken: token => set({ token }),
}));

// ✅ Setup nhanh, ít code
// ✅ Không cần Provider
// ✅ Dễ test (gọi getState() / setState() trực tiếp)
```

**Strengths:**
- Bundle nhỏ (1.2kB)
- Không cần Provider wrapper
- Dễ dùng ngoài component (service, utils)
- DevTools support

**Weaknesses:**
- Không có built-in time-travel debugging
- Middleware pattern ít familiar hơn Redux

---

## Redux Toolkit — cho Complex Global State

```tsx
// ✅ Phù hợp khi
// - Team đã quen Redux
// - Cần Redux DevTools (time-travel, action history)
// - Nhiều async flows phức tạp, cần middleware
// - Large team cần strict patterns
// - Tích hợp RTK Query

// ✅ RTK đã giải quyết boilerplate của Redux
const postsSlice = createSlice({ name: 'posts', ... });
```

**Strengths:**
- Mature ecosystem
- Excellent DevTools
- RTK Query tích hợp sẵn
- Predictable, strict patterns

**Weaknesses:**
- Boilerplate nhiều hơn Zustand (dù RTK đã giảm đáng kể)
- Learning curve cao hơn

---

## Context API — cho Shared State đơn giản

```tsx
// ✅ Phù hợp khi state ít thay đổi và không cần optimize
// Theme, locale, authenticated user

// ❌ Không phù hợp
// - State thay đổi thường xuyên → mọi consumer re-render
// - Cần selector (chỉ lấy một phần state)
const ThemeContext = createContext<Theme>('light');
```

---

## React Hook Form — cho Form State

```bash
npm install react-hook-form
```

```tsx
// ✅ Phù hợp: forms với validation
// ❌ Không dùng useState cho từng input field

const { control, handleSubmit, formState: { errors } } = useForm({
  defaultValues: { email: '', password: '' },
  resolver: zodResolver(loginSchema), // yup hoặc zod
});
```

---

## Kết hợp thực tế

```
App điển hình:
├── TanStack Query     → API data (users, posts, products)
├── Zustand            → Auth state, cart, UI preferences
├── React Navigation   → Navigation state
├── React Hook Form    → Form inputs
└── useState           → Local component state (modals, toggles)
```

**Không nên:**
- Dùng Redux cho server data (dùng RTK Query hoặc TanStack Query)
- Dùng TanStack Query cho auth token (client state, không phải server state)
- Persist toàn bộ Redux state (chọn lọc fields cần thiết)
- Dùng Context cho high-frequency updates (sẽ gây re-render toàn bộ tree)
