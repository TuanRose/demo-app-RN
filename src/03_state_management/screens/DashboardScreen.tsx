import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTransactions } from '../queries/useTransactions';
import { useAppSelector } from '../store';
import { useUIStore } from '../stores/useUIStore';

export default function DashboardScreen() {
  const budgets = useAppSelector(state => state.budget.items);
  const user = useAppSelector(state => state.auth.user);

  const filter = useUIStore(state => state.transactionFilter);
  const setFilter = useUIStore(state => state.setTransactionFilter);
  const theme = useUIStore(state => state.theme);

  // TanStack Query: filter là phần của queryKey → cache riêng cho mỗi filter
  const { data: transactions, isLoading, isError, refetch } = useTransactions(filter);

  const isDark = theme === 'dark';
  const bg = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#fff';
  const textColor = isDark ? '#fff' : '#333';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Redux: auth state */}
      <View style={[styles.header, { backgroundColor: '#1a73e8' }]}>
        <Text style={styles.greeting}>
          Xin chào, {user?.name ?? 'Demo User'}
        </Text>
        <Text style={styles.subtext}>FinTrack Dashboard</Text>
      </View>

      {/* Redux: budget slice */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Budgets (từ Redux)
      </Text>
      <View style={styles.budgetRow}>
        {budgets.map(b => (
          <View key={b.id} style={[styles.budgetChip, { backgroundColor: cardBg }]}>
            <Text style={[styles.budgetName, { color: textColor }]}>{b.name}</Text>
            <Text style={styles.budgetLimit}>
              {(b.limit / 1000000).toFixed(1)}M
            </Text>
          </View>
        ))}
      </View>

      {/* Zustand: filter prefs */}
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        Giao dịch (từ TanStack Query)
      </Text>
      <View style={styles.filterRow}>
        {(['all', 'income', 'expense'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'Tất cả' : f === 'income' ? 'Thu' : 'Chi'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading && <ActivityIndicator style={styles.loader} color="#1a73e8" />}
      {isError && (
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={styles.error}>Lỗi tải dữ liệu — nhấn để thử lại</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.txnRow, { backgroundColor: cardBg }]}>
            <Text style={[styles.txnLabel, { color: textColor }]}>{item.label}</Text>
            <Text
              style={[
                styles.txnAmount,
                item.amount < 0 ? styles.expense : styles.income,
              ]}>
              {item.amount.toLocaleString('vi-VN')} ₫
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 16 },
  greeting: { color: '#fff', fontSize: 18, fontWeight: '600' },
  subtext: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', marginHorizontal: 16, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  budgetRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8 },
  budgetChip: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  budgetName: { fontSize: 12 },
  budgetLimit: { fontSize: 15, fontWeight: '700', color: '#1a73e8', marginTop: 4 },
  filterRow: { flexDirection: 'row', marginHorizontal: 16, gap: 8, marginBottom: 8 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: '#e0e0e0' },
  filterActive: { backgroundColor: '#1a73e8' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  loader: { marginTop: 24 },
  error: { textAlign: 'center', color: '#e53935', marginTop: 24 },
  list: { padding: 16, paddingTop: 0 },
  txnRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 10, marginBottom: 8 },
  txnLabel: { fontSize: 14 },
  txnAmount: { fontSize: 14, fontWeight: '600' },
  expense: { color: '#e53935' },
  income: { color: '#43a047' },
});
