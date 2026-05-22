import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type TransactionFilter = 'all' | 'income' | 'expense';

type UIState = {
  theme: 'light' | 'dark';
  transactionFilter: TransactionFilter;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setTransactionFilter: (filter: TransactionFilter) => void;
};

// Zustand cho UI prefs vì: không cần Redux DevTools cho theme/filter,
// persist đơn giản với AsyncStorage, không có async side effects
export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      transactionFilter: 'all',

      setTheme: (theme) => set({ theme }),

      // Computed action — đọc state hiện tại qua get() rồi invert
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),

      setTransactionFilter: (filter) => set({ transactionFilter: filter }),
    }),
    {
      name: 'fintrack-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      // Chỉ persist data, không persist actions (functions không serialize được)
      partialize: (state) => ({
        theme: state.theme,
        transactionFilter: state.transactionFilter,
      }),
    },
  ),
);
