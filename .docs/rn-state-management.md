# rn-state-management

## What I built

Implement state management layer cho FinTrack dùng 3 libraries song song — mỗi cái cho đúng loại state của nó. Redux Toolkit quản lý auth state và budget limits (client state phức tạp); TanStack Query fetch transactions từ mock API với caching và filter; Zustand persist theme + filter preferences qua AsyncStorage. Dashboard đọc từ cả 3 nguồn, Settings dispatch Redux actions và toggle Zustand store.

## Key concepts

- **Server state vs Client state**: ranh giới này quyết định library. Transactions đến từ API → TanStack Query. Budget limits user tự set trong app → Redux. Không mix: để Redux "sync" API data là anti-pattern — phải tự viết loading/error/cache/retry mà TanStack Query đã làm sẵn.
- **queryKey là cache key**: `['transactions', filter]` và `['transactions', 'all']` là 2 cache entries khác nhau — React Query không merge chúng. Khi filter thay đổi, hook refetch đúng bucket, cache cũ vẫn còn (stale) → switch filter nhanh không loading lại.
- **Selector riêng lẻ trong Zustand**: `useUIStore(state => state.theme)` chỉ re-render khi `theme` thay đổi. `useUIStore()` (không selector) re-render khi BẤT KỲ field nào thay đổi — tránh pattern này.
- **Immer trong RTK**: `createSlice` bọc reducer bằng Immer → có thể "mutate" state trực tiếp trong reducer (`state.user = action.payload`). Nhìn như mutation nhưng thực ra Immer tạo immutable copy.
- **AppState thay cho window focus**: TanStack Query dùng window focus event để refetch stale data trên web. React Native không có window — phải dùng `AppState.addEventListener('change')` + `focusManager.setFocused()` để trigger cùng behavior khi app về foreground.

## Decisions & trade-offs

- **Typed hooks `useAppSelector` / `useAppDispatch`**: wrap `useSelector` / `useDispatch` với generic types một lần → mọi chỗ dùng không cần khai báo type lại. Nếu không làm, phải viết `useSelector<RootState>` mỗi lần.
- **`partialize` trong Zustand persist**: chỉ serialize data fields, không serialize actions (functions). Thiếu `partialize` → Zustand cố serialize function → crash hoặc silent failure.
- **QueryClient là singleton ngoài component**: khai báo `const queryClient = new QueryClient()` ở module level, không trong component. Nếu khai báo trong component → mỗi lần re-render tạo client mới → toàn bộ cache bị reset.
- **Provider order**: Redux outermost vì RTK Query (nếu dùng sau) cần access Redux store qua middleware. QueryClient bọc bên trong. NavigationContainer trong cùng để có thể dùng `useNavigation` từ screen bên trong query hooks nếu cần.

## Gotchas

- `invalidateQueries({ queryKey: ['transactions'] })` invalidate tất cả keys bắt đầu bằng `'transactions'` (bao gồm `['transactions', 'all']`, `['transactions', 'income']`...) — đây là prefix matching, không phải exact match. Muốn exact: thêm `exact: true`.
- `useMutation` không có `queryKey` — không cache kết quả. Sau mutation thành công phải gọi `invalidateQueries` để trigger refetch, hoặc dùng `setQueryData` để update cache manually (optimistic update).
- Zustand `persist` hydrate async từ AsyncStorage → lần đầu mount, state vẫn là `initialState`. Nếu UI phụ thuộc vào persisted state (ví dụ: theme), có thể thấy flash of wrong theme. Fix: check `useUIStore.persist.hasHydrated()` trước khi render.

## Code patterns to remember

```ts
// Typed Redux hooks — khai báo 1 lần, dùng khắp nơi
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

```ts
// TanStack Query — filter trong queryKey để cache riêng biệt
export function useTransactions(filter: 'all' | 'income' | 'expense' = 'all') {
  return useQuery({
    queryKey: ['transactions', filter], // cache key
    queryFn: () => fetchTransactions(filter),
    staleTime: 1000 * 60 * 5,
  });
}
```

```ts
// Zustand persist — partialize bắt buộc để exclude functions
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({ theme: 'light', toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }) }),
    {
      name: 'fintrack-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ theme: state.theme }), // exclude functions
    }
  )
);
```

```tsx
// AppState focus manager — thay cho window focus event trên RN
useEffect(() => {
  const sub = AppState.addEventListener('change', (status) => {
    focusManager.setFocused(status === 'active');
  });
  return () => sub.remove();
}, []);
```

## References

- [Skill reference: when-to-use.md](.claude/skills/rn-state-management/references/when-to-use.md)
- [Skill reference: redux-toolkit.md](.claude/skills/rn-state-management/references/redux-toolkit.md)
- [Skill reference: tanstack-query.md](.claude/skills/rn-state-management/references/tanstack-query.md)
- [Skill reference: zustand.md](.claude/skills/rn-state-management/references/zustand.md)
- [Lesson README](src/03_state_management/README.md)
