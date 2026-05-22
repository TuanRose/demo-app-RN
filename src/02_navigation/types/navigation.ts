import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  Settings: undefined;
};

// Root stack merges auth + main screens — React Navigation renders only the
// relevant subset based on auth state (conditional stack pattern)
export type RootStackParamList = {
  // Auth group
  Login: undefined;
  // Main group
  Tabs: NavigatorScreenParams<TabParamList>;
  TransactionDetail: { transactionId: string };
};
