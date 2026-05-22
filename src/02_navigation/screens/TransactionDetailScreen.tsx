import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
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
  navigation: NativeStackNavigationProp<RootStackParamList, 'TransactionDetail'>;
  route: RouteProp<RootStackParamList, 'TransactionDetail'>;
};

// Mock data keyed by ID — simulates what a real repo/store would provide
const DETAIL_MAP: Record<string, { label: string; amount: number; category: string; note: string }> = {
  txn_001: { label: 'Café sáng', amount: -35000, category: 'Ăn uống', note: 'Highlands Coffee' },
  txn_002: { label: 'Lương tháng 5', amount: 25000000, category: 'Thu nhập', note: 'Công ty FPT' },
  txn_003: { label: 'Tiền nhà', amount: -4500000, category: 'Nhà ở', note: 'Tháng 5/2026' },
  txn_004: { label: 'Siêu thị', amount: -320000, category: 'Ăn uống', note: 'WinMart' },
  txn_005: { label: 'Freelance', amount: 3000000, category: 'Thu nhập', note: 'Thiết kế UI' },
};

export default function TransactionDetailScreen({ navigation, route }: Props) {
  const { transactionId } = route.params;
  const detail = DETAIL_MAP[transactionId];

  if (!detail) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Không tìm thấy giao dịch: {transactionId}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isExpense = detail.amount < 0;

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.hero, isExpense ? styles.heroExpense : styles.heroIncome]}>
        <Text style={styles.heroLabel}>{detail.label}</Text>
        <Text style={styles.heroAmount}>
          {detail.amount.toLocaleString('vi-VN')} ₫
        </Text>
        <Text style={styles.heroId}>ID: {transactionId}</Text>
      </View>

      <View style={styles.section}>
        <Row label="Danh mục" value={detail.category} />
        <Row label="Ghi chú" value={detail.note} />
        <Row label="Loại" value={isExpense ? 'Chi tiêu' : 'Thu nhập'} />
      </View>

      <Text style={styles.deepLinkHint}>
        Deep link: fintrack://transaction/{transactionId}
      </Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  hero: {
    padding: 32,
    alignItems: 'center',
  },
  heroExpense: { backgroundColor: '#e53935' },
  heroIncome: { backgroundColor: '#43a047' },
  heroLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 18, marginBottom: 8 },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: 'bold' },
  heroId: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 8 },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  rowLabel: { color: '#666', fontSize: 15 },
  rowValue: { color: '#333', fontSize: 15, fontWeight: '500' },
  deepLinkHint: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 32,
    fontFamily: 'monospace',
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#666', marginBottom: 16 },
  link: { color: '#1a73e8', fontSize: 16 },
});
