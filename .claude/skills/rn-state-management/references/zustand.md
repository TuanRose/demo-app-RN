# Reference: Zustand

Lightweight state management — ít boilerplate, dễ học, hiệu năng tốt. Không cần Provider.

---

## Cài đặt

```bash
npm install zustand
npm install @react-native-async-storage/async-storage # cho persist
```

---

## Basic store

```tsx
// stores/useAuthStore.ts
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  user: { id: string; name: string } | null;
  setToken: (token: string) => void;
  setUser: (user: { id: string; name: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,

  setToken: (token) => set({ token }),

  setUser: (user) => set({ user }),

  logout: () => set({ token: null, user: null }),

  // Computed / derived
  isAuthenticated: () => get().token !== null,
}));

// Dùng trong component — không cần Provider!
function ProfileScreen() {
  const { user, logout } = useAuthStore();
  return (
    <View>
      <Text>{user?.name}</Text>
      <Button onPress={logout} title="Logout" />
    </View>
  );
}
```

---

## Chỉ subscribe một phần (tránh re-render thừa)

```tsx
// ❌ Sai — re-render khi BẤT KỲ field nào trong store thay đổi
const store = useAuthStore();

// ✅ Đúng — chỉ re-render khi user thay đổi
const user = useAuthStore(state => state.user);
const token = useAuthStore(state => state.token);

// Lấy nhiều giá trị — dùng useShallow tránh re-render thừa
import { useShallow } from 'zustand/react/shallow';

const { user, token } = useAuthStore(
  useShallow(state => ({ user: state.user, token: state.token }))
);
```

---

## Persist middleware — lưu vào AsyncStorage

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  theme: 'light' | 'dark';
  language: string;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'light',
      language: 'vi',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'settings-storage',                          // key trong AsyncStorage
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({                          // chỉ persist một số fields
        theme: state.theme,
        language: state.language,
        // setTheme không persist vì là function
      }),
    }
  )
);
```

**Với MMKV (nhanh hơn AsyncStorage ~30x):**
```tsx
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV();

const mmkvStorage = {
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
};

persist(fn, { name: 'settings', storage: createJSONStorage(() => mmkvStorage) })
```

---

## Immer middleware — mutable style updates

```tsx
import { immer } from 'zustand/middleware/immer';

interface CartState {
  items: { id: string; qty: number }[];
  addItem: (id: string) => void;
  incrementQty: (id: string) => void;
}

export const useCartStore = create<CartState>()(
  immer((set) => ({
    items: [],
    addItem: (id) =>
      set((state) => {
        state.items.push({ id, qty: 1 }); // có thể mutate trực tiếp
      }),
    incrementQty: (id) =>
      set((state) => {
        const item = state.items.find(i => i.id === id);
        if (item) item.qty += 1; // mutation ok với immer
      }),
  }))
);
```

---

## Slice pattern — tổ chức store lớn

```tsx
// stores/slices/createUserSlice.ts
import { StateCreator } from 'zustand';

interface UserSlice {
  user: User | null;
  setUser: (user: User) => void;
}

export const createUserSlice: StateCreator<
  UserSlice & PostSlice, // tất cả slices
  [],
  [],
  UserSlice
> = (set) => ({
  user: null,
  setUser: (user) => set({ user }),
});

// stores/useBoundStore.ts
import { create } from 'zustand';

export const useBoundStore = create<UserSlice & PostSlice>()((...a) => ({
  ...createUserSlice(...a),
  ...createPostSlice(...a),
}));
```

---

## DevTools

```tsx
import { devtools } from 'zustand/middleware';

export const useStore = create<MyState>()(
  devtools(
    (set) => ({ /* state */ }),
    { name: 'MyStore' } // tên hiển thị trong Redux DevTools
  )
);
```

---

## Dùng ngoài component (service, utils)

```tsx
// Truy cập state không cần hook
const token = useAuthStore.getState().token;

// Subscribe to changes
const unsubscribe = useAuthStore.subscribe(
  state => state.token, // selector
  (token, prevToken) => {
    if (!token && prevToken) {
      // token bị xóa → user logged out
    }
  }
);
```
