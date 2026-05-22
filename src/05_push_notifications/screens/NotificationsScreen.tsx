import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotificationSetup } from '../hooks/useNotificationSetup';
import {
  cancelAllScheduled,
  getScheduledNotifications,
  scheduleDailyReminder,
  triggerBudgetAlert,
} from '../services/NotificationService';

const MOCK_BUDGET = 2_000_000;
const MOCK_SPENT = 1_750_000; // 87.5% — vượt 80% threshold

export default function NotificationsScreen() {
  const { top } = useSafeAreaInsets();
  const { permissionGranted, lastTappedData } = useNotificationSetup();
  const [loading, setLoading] = useState<string | null>(null);
  const [_, setScheduledCount] = useState<number | null>(null);
  async function run(key: string, fn: () => Promise<void>) {
    setLoading(key);
    try {
      await fn();
    } catch (e) {
      Alert.alert('Lỗi', String(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleCheckScheduled() {
    const list = await getScheduledNotifications();
    setScheduledCount(list.length);
    Alert.alert('Scheduled', `${list.length} notification đang được lên lịch`);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: top + 16 }]}>
      {/* Permission status */}
      <View style={[styles.badge, permissionGranted ? styles.badgeOk : styles.badgeDeny]}>
        <Text style={styles.badgeText}>
          {permissionGranted === null
            ? '⏳ Đang xin quyền...'
            : permissionGranted
              ? '✅ Notification permission: GRANTED'
              : '❌ Notification permission: DENIED'}
        </Text>
      </View>

      <Text style={styles.section}>Local Notifications</Text>

      <ActionButton
        label="📅 Schedule Daily Reminder (9:00 AM)"
        subLabel="Lặp lại hàng ngày"
        loading={loading === 'reminder'}
        onPress={() =>
          run('reminder', async () => {
            await scheduleDailyReminder();
            Alert.alert('Đã lên lịch', 'Reminder sẽ fire lúc 9:00 AM hàng ngày');
          })
        }
      />

      <ActionButton
        label="⚠️ Test Budget Alert (87.5%)"
        subLabel={`Chi ${MOCK_SPENT.toLocaleString('vi-VN')} ₫ / ${MOCK_BUDGET.toLocaleString('vi-VN')} ₫`}
        loading={loading === 'budget'}
        onPress={() =>
          run('budget', () => triggerBudgetAlert(MOCK_SPENT, MOCK_BUDGET, 'Ăn uống'))
        }
      />

      <ActionButton
        label="📋 Xem scheduled notifications"
        loading={loading === 'check'}
        onPress={handleCheckScheduled}
      />

      <ActionButton
        label="🗑 Huỷ tất cả scheduled"
        loading={loading === 'cancel'}
        danger
        onPress={() =>
          run('cancel', async () => {
            await cancelAllScheduled();
            setScheduledCount(0);
            Alert.alert('Đã huỷ', 'Tất cả scheduled notifications đã bị huỷ');
          })
        }
      />

      {/* Last tapped notification data */}
      {lastTappedData && (
        <View style={styles.tapResult}>
          <Text style={styles.tapTitle}>📬 Notification vừa tap:</Text>
          <Text style={styles.tapType}>type: {lastTappedData.type}</Text>
          {lastTappedData.category && (
            <Text style={styles.tapType}>category: {lastTappedData.category}</Text>
          )}
          <Text style={styles.tapNote}>
            → Production: navigationRef.navigate() theo type
          </Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.infoTitle}>FCM (Remote Push)</Text>
        <Text style={styles.infoText}>
          Bị qua trong bài học này — cần Firebase project + real device.{'\n'}
          Pattern: FCM nhận remote message → Notifee display foreground.
        </Text>
      </View>
    </ScrollView>
  );
}

type ActionButtonProps = {
  label: string;
  subLabel?: string;
  loading: boolean;
  danger?: boolean;
  onPress: () => void;
};

function ActionButton({ label, subLabel, loading, danger, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.btn, danger && styles.btnDanger]}
      onPress={onPress}
      disabled={loading}>
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          <Text style={styles.btnText}>{label}</Text>
          {subLabel && <Text style={styles.btnSub}>{subLabel}</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  badge: { borderRadius: 8, padding: 12, marginBottom: 20 },
  badgeOk: { backgroundColor: '#e8f5e9' },
  badgeDeny: { backgroundColor: '#ffebee' },
  badgeText: { fontSize: 13, fontWeight: '500', color: '#333' },
  section: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  btn: {
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  btnDanger: { backgroundColor: '#e53935' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  btnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  tapResult: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    marginBottom: 10,
  },
  tapTitle: { fontSize: 13, fontWeight: '700', color: '#e65100', marginBottom: 6 },
  tapType: { fontSize: 13, color: '#333', fontFamily: 'monospace' },
  tapNote: { fontSize: 12, color: '#999', marginTop: 6, fontStyle: 'italic' },
  info: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#1565c0', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#1565c0', lineHeight: 18 },
});
