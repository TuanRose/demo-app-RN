import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

// Custom URL scheme — no server-side verification needed (vs Universal Links/App Links)
// Security rule: never pass sensitive data (tokens, amounts) via URL params
// fintrack://transaction/abc123 → TransactionDetailScreen with transactionId = 'abc123'
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['fintrack://'],
  config: {
    screens: {
      Login: 'login',
      Tabs: {
        screens: {
          Dashboard: 'dashboard',
          Transactions: 'transactions',
          Settings: 'settings',
        },
      },
      // Deep link target: fintrack://transaction/:transactionId
      // Only reachable when authenticated (screen not rendered in auth stack)
      TransactionDetail: 'transaction/:transactionId',
    },
  },
};
