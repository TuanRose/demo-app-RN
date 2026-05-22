import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAddTransaction, useDeleteTransaction, useTransactions } from '../hooks/useTransactions';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useUIStore } from '../stores/useUIStore';
import { getQueueLength } from '../sync/syncQueue';

export default function TransactionsScreen() {
  const { top } = useSafeAreaInsets();
  const isOnline = useNetworkStatus();
  const filter = useUIStore(state => state.transactionFilter);
  const setFilter = useUIStore(state => state.setTransactionFilter);
  const theme = useUIStore(state => state.theme);

  const { data: transactions = [], isLoading } = useTransactions(filter);
  const addTransaction = useAddTransaction(isOnline);
  const deleteTransaction = useDeleteTransaction();

  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  const isDark = theme === 'dark';
  const bg = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#fff';
  const textColor = isDark ? '#fff' : '#333';

  const handleAdd = () => {
    const parsedAmount = parseFloat(amount);
    if (!label.trim() || isNaN(parsedAmount)) {
      Alert.alert('Lỗi', 'Nhập tên và số tiền hợp lệ');
      return;
    }
    addTransaction.mutate({
      label: label.trim(),
      amount: parsedAmount,
      categoryId: parsedAmount < 0 ? 'cat_expense' : 'cat_income',
      date: new Date().toISOString().slice(0, 10),
    });
    setLabel('');
    setAmount('');
  };

  const queueLength = getQueueLength();

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: top }]}>
      {/* Network + sync status banner */}
      <View style={[styles.banner, isOnline ? styles.bannerOnline : styles.bannerOffline]}>
        <Text style={styles.bannerText}>
          {isOnline ? '🟢 Online' : '🔴 Offline — dữ liệu lưu local'}
          {queueLength > 0 ? `  •  ${queueLength} chờ sync` : ''}
        </Text>
      </View>

      {/* Add transaction form */}
      <View style={[styles.form, { backgroundColor: cardBg }]}>
        <TextInput
          style={[styles.input, { color: textColor, borderColor: isDark ? '#444' : '#ddd' }]}
          placeholder="Tên giao dịch"
          placeholderTextColor="#999"
          value={label}
          onChangeText={setLabel}
        />
        <TextInput
          style={[styles.input, { color: textColor, borderColor: isDark ? '#444' : '#ddd' }]}
          placeholder="Số tiền (âm = chi, dương = thu)"
          placeholderTextColor="#999"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
        />
        <TouchableOpacity
          style={[styles.addBtn, addTransaction.isPending && styles.addBtnDisabled]}
          onPress={handleAdd}
          disabled={addTransaction.isPending}>
          {addTransaction.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.addBtnText}>
              {isOnline ? 'Thêm giao dịch' : 'Thêm (offline)'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter */}
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

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color="#1a73e8" />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: textColor }]}>
              Chưa có giao dịch nào
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: cardBg }]}>
              <View style={styles.rowLeft}>
                <Text style={[styles.rowLabel, { color: textColor }]}>
                  {item.label}
                  {item.syncStatus === 'pending' ? ' ⏳' : ''}
                </Text>
                <Text style={styles.rowDate}>{item.date}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={[styles.rowAmount, item.amount < 0 ? styles.expense : styles.income]}>
                  {item.amount.toLocaleString('vi-VN')} ₫
                </Text>
                <TouchableOpacity onPress={() => deleteTransaction.mutate(item.id)}>
                  <Text style={styles.deleteBtn}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { paddingVertical: 6, paddingHorizontal: 16 },
  bannerOnline: { backgroundColor: '#e8f5e9' },
  bannerOffline: { backgroundColor: '#fff3e0' },
  bannerText: { fontSize: 12, fontWeight: '500', color: '#333' },
  form: { margin: 16, padding: 16, borderRadius: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  filterActive: { backgroundColor: '#1a73e8' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  loader: { marginTop: 32 },
  list: { padding: 16, paddingTop: 0 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowLeft: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500' },
  rowDate: { fontSize: 12, color: '#999', marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowAmount: { fontSize: 14, fontWeight: '600' },
  expense: { color: '#e53935' },
  income: { color: '#43a047' },
  deleteBtn: { color: '#e53935', fontSize: 16, fontWeight: '600' },
});
