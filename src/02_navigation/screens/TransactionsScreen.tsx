import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RootStackParamList } from '../types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Tabs'>;
};

type Transaction = {
  id: string;
  label: string;
  amount: number;
  date: string;
};

const TRANSACTIONS: Transaction[] = [
  { id: 'txn_001', label: 'Café sáng', amount: -35000, date: '08/05' },
  { id: 'txn_002', label: 'Lương tháng 5', amount: 25000000, date: '07/05' },
  { id: 'txn_003', label: 'Tiền nhà', amount: -4500000, date: '05/05' },
  { id: 'txn_004', label: 'Siêu thị', amount: -320000, date: '04/05' },
  { id: 'txn_005', label: 'Freelance', amount: 3000000, date: '02/05' },
];

export default function TransactionsScreen({ navigation }: Props) {
  const renderItem = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() =>
        navigation.navigate('TransactionDetail', { transactionId: item.id })
      }>
      <View>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.date}>{item.date}</Text>
      </View>
      <Text
        style={[
          styles.amount,
          item.amount < 0 ? styles.expense : styles.income,
        ]}>
        {item.amount.toLocaleString('vi-VN')} ₫
      </Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      style={styles.container}
      data={TRANSACTIONS}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  label: { fontSize: 15, color: '#333', fontWeight: '500' },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '600' },
  expense: { color: '#e53935' },
  income: { color: '#43a047' },
});
