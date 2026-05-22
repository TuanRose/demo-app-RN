import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

// MMKV v4 (Nitro): createMMKV() thay vì new MMKV() — Nitro Modules API
// MMKV nhanh hơn AsyncStorage ~30x — synchronous, binary mmap format
const mmkvStorage = createMMKV({ id: 'fintrack-ui' });

const zustandMmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => mmkvStorage.getString(name) ?? null,
  setItem: (name: string, value: string) => mmkvStorage.set(name, value),
  removeItem: (name: string) => mmkvStorage.remove(name),
}));

type TransactionFilter = 'all' | 'income' | 'expense';

type UIState = {
  theme: 'light' | 'dark';
  transactionFilter: TransactionFilter;
  currency: string;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
  setCurrency: (currency: string) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      transactionFilter: 'all',
      currency: 'VND',

      setTheme: theme => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setTransactionFilter: filter => set({ transactionFilter: filter }),
      setCurrency: currency => set({ currency }),
    }),
    {
      name: 'fintrack-ui-prefs',
      storage: zustandMmkvStorage,
      partialize: state => ({
        theme: state.theme,
        transactionFilter: state.transactionFilter,
        currency: state.currency,
      }),
    },
  ),
);
