import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { focusManager } from '@tanstack/react-query';
import TransactionsScreen from './screens/TransactionsScreen';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: Infinity, // SQLite local data không stale theo time
    },
  },
});

function useAppFocusManager() {
  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }
    }
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, []);
}

// Minimal wrapper — không cần NavigationContainer vì lesson này
// demo từng feature riêng lẻ (SQLite + MMKV + sync queue)
export default function StorageDemo() {
  useAppFocusManager();

  return (
    <QueryClientProvider client={queryClient}>
      <TransactionsScreen />
    </QueryClientProvider>
  );
}
