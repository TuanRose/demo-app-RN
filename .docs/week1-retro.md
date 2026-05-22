# Week 1 Retrospective — Architecture · Navigation · State Management

Ngày hoàn thành: 2026-05-10

---

## Q1: Can I explain Clean Architecture layers to a junior dev without notes?

**3 layers, 1 rule:**

```
Domain      ← innermost, pure TypeScript, không import bất kỳ thứ gì
Data        ← implement interfaces của Domain (SQLite, API)
Features    ← UI + use cases, phụ thuộc vào Domain interface
```

Rule duy nhất: dependency chỉ đi vào trong — outer biết inner, inner không biết outer.

**Mental model:** "Domain là bộ não — chỉ biết business rules. Data layer là tay — biết cách lấy data. Feature layer là mặt — biết cách hiển thị. Não không cần biết tay dùng SQLite hay API, nên khi đổi database thì não không cần thay đổi."

**Ví dụ từ FinTrack:**
```
Domain:   TransactionRepository (interface) — biết WHAT: getAll(), getById()
Data:     TransactionRepositoryImpl         — biết HOW: SQLite cụ thể
Use case: GetTransactionsByBudget           — chỉ gọi interface, không biết SQLite tồn tại
```

**Gotcha cần nhớ:**
- `Budget.spent` không lưu vào DB — là derived value, tính bằng `SUM(amount)` lúc query. Lưu vào DB tạo sync problem.
- Path aliases (`@domain`, `@features`...) cần 2 config song song: `babel-plugin-module-resolver` (runtime) + `tsconfig paths` (type check). Thiếu một trong hai → crash hoặc type error.

---

## Q2: Can I set up type-safe nested navigation from scratch?

**5 bước từ đầu:**

**1. Khai báo param list:**
```ts
type RootStackParamList = {
  Login: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  TransactionDetail: { transactionId: string };
};
```

**2. Tạo navigator với generic:**
```ts
const Stack = createNativeStackNavigator<RootStackParamList>();
```

**3. Conditional stack — KHÔNG `navigation.navigate()` sau login:**
```tsx
{userToken == null ? (
  <Stack.Screen name="Login" component={LoginScreen} />
) : (
  <Stack.Screen name="Tabs" component={MainTabNavigator} />
)}
```

**4. Typed props trong screen:**
```ts
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionDetail'>;
  route: RouteProp<RootStackParamList, 'TransactionDetail'>;
};
```

**5. Deep link config:**
```ts
const linking = {
  prefixes: ['fintrack://'],
  config: { screens: { TransactionDetail: 'transaction/:transactionId' } },
};
```

**Gotchas cần nhớ:**
- `NavigationContainer` phải nằm *trong* `AuthProvider` — Navigator đọc auth context, đặt ngược lại sẽ undefined.
- Sau `signIn()` không gọi `navigation.navigate('Home')` — screen đó chưa tồn tại trong current stack, sẽ crash hoặc silent fail. Để React Navigation tự transition qua conditional stack.
- `react-native-screens` yêu cầu `RNScreensFragmentFactory` trong `MainActivity.kt` Android — thiếu sẽ crash khi navigate.
- iOS cần khai báo `CFBundleURLTypes` trong `Info.plist`, Android cần `intent-filter` trong `AndroidManifest.xml` — thiếu một trong hai thì platform đó không nhận deep link.

---

## Q3: Can I articulate when to use RTK vs TanStack Query vs Zustand?

**1 câu quyết định:**

> "Data này đến từ server hay do user tạo ra trong app?"

```
Từ server/API?          → TanStack Query
Client state phức tạp?  → Redux Toolkit
Client state đơn giản?  → Zustand
2-3 component?          → Context API
1 component?            → useState / useReducer
```

**Áp dụng FinTrack:**

| State | Library | Lý do |
|---|---|---|
| Transactions | TanStack Query | API data — cache + filter queryKey riêng biệt |
| Auth user/token | Redux | Middleware cần access token (RTK Query headers) |
| Budget limits | Redux | Client state, CRUD phức tạp, cần action history |
| Theme, filter prefs | Zustand | Simple prefs, persist AsyncStorage, không cần DevTools |

**Anti-patterns hay gặp:**
- ❌ Redux store API response → phải tự viết loading/error/cache/retry
- ❌ TanStack Query cho auth token → token là client state, không phải server state
- ❌ Context cho high-frequency update → mọi consumer re-render mỗi lần

**Gotchas cần nhớ:**
- `queryClient` phải là singleton ở module level — khai báo trong component sẽ reset cache mỗi lần re-render.
- `invalidateQueries({ queryKey: ['transactions'] })` là prefix match — invalidate tất cả keys bắt đầu bằng `'transactions'`. Muốn exact thêm `exact: true`.
- Zustand `partialize` bắt buộc khi dùng `persist` — loại functions ra trước khi serialize vào AsyncStorage.
- AppState listener thay cho window focus: `focusManager.setFocused(status === 'active')` — TanStack Query không tự detect app foreground trên React Native.

---

## Tổng kết

| Skill | Bài | Objectives |
|---|---|---|
| Architecture | 01_architecture | 4/4 ✅ |
| Navigation | 02_navigation | 5/5 ✅ |
| State Management | 03_state_management | 6/6 ✅ |

**15/15 objectives — Week 1 hoàn thành.**

Tiếp theo: Week 2 — `rn-storage` · `rn-push-notifications` · `rn-security`
