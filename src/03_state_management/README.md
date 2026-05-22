# 03 State Management — FinTrack Redux + TanStack Query + Zustand

## Objectives
- [x] Cài đặt @reduxjs/toolkit, react-redux, @tanstack/react-query, zustand, async-storage
- [x] Redux Toolkit: `authSlice` (user, token) + `budgetSlice` (local budgets) + typed hooks
- [x] TanStack Query: `useTransactions` hook với mock API + filter queryKey
- [x] Zustand: `useUIStore` cho theme + transactionFilter với AsyncStorage persist
- [x] Wiring: Dashboard đọc transactions từ TanStack Query + budgets từ Redux; Settings đọc theme từ Zustand
- [x] Verify theme toggle persist sau khi kill + reopen app

**Done when:** Dashboard renders mock transactions từ TanStack Query; theme toggle via Zustand persist qua reopen app; dispatch signIn/signOut trong Settings cập nhật UI.

---

## Architecture decision: WHY mỗi library cho mỗi use case

| State | Library | WHY |
|---|---|---|
| Transactions (API data) | TanStack Query | Server state — cần cache, background refetch, dedup. Redux sẽ phải tự implement những này. |
| Auth (user, token) | Redux | Cần access từ middleware (RTK Query headers), predictable với DevTools |
| Budgets (local limits) | Redux | Client state có update phức tạp (add/update/remove), cần action history |
| Theme, filter prefs | Zustand | Simple client state, cần persist, không cần DevTools, không có async side effects |

---

## Folder Structure

```
src/03_state_management/
├── store/
│   ├── index.ts              ← configureStore + RootState + typed hooks
│   └── slices/
│       ├── authSlice.ts      ← user, token
│       └── budgetSlice.ts    ← budget limits
├── queries/
│   └── useTransactions.ts    ← useQuery + useMutation
├── stores/
│   └── useUIStore.ts         ← Zustand + AsyncStorage persist
├── screens/
│   ├── DashboardScreen.tsx   ← TanStack Query + Redux + Zustand
│   └── SettingsScreen.tsx    ← Redux dispatch + Zustand toggle
└── StateManagementDemo.tsx   ← Provider tree + tab navigator
```

---

## Provider order (quan trọng)

```tsx
<Provider store={store}>          // Redux outermost — RTK Query cần Redux store
  <QueryClientProvider client={…}> // TanStack Query
    <NavigationContainer>          // Navigation
      <AppTabs />
    </NavigationContainer>
  </QueryClientProvider>
</Provider>
```
