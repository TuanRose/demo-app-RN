import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
};

const MOCK_TRANSACTIONS = [
  { id: 'txn_001', label: 'Café sáng', amount: -35000 },
  { id: 'txn_002', label: 'Lương tháng 5', amount: 25000000 },
  { id: 'txn_003', label: 'Tiền nhà', amount: -4500000 },
];

export default function DashboardScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Số dư hiện tại</Text>
        <Text style={styles.balance}>20,465,000 ₫</Text>
      </View>

      <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
      {MOCK_TRANSACTIONS.map(txn => (
        <TouchableOpacity
          key={txn.id}
          style={styles.row}
          // navigate() — push to stack; TransactionDetail appears above Tabs
          onPress={() =>
            navigation.navigate('TransactionDetail', {
              transactionId: txn.id,
            })
          }>
          <Text style={styles.rowLabel}>{txn.label}</Text>
          <Text
            style={[
              styles.rowAmount,
              txn.amount < 0 ? styles.expense : styles.income,
            ]}>
            {txn.amount.toLocaleString('vi-VN')} ₫
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: {
    margin: 16,
    padding: 24,
    backgroundColor: '#1a73e8',
    borderRadius: 16,
  },
  cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  balance: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  rowLabel: { fontSize: 15, color: '#333' },
  rowAmount: { fontSize: 15, fontWeight: '600' },
  expense: { color: '#e53935' },
  income: { color: '#43a047' },
});
