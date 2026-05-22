import React from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBatteryLevel } from '../hooks/useBatteryLevel';
import NewModuleButton from '../Components/NewModuleButton';

export default function DeviceBatteryScreen() {
  const { top } = useSafeAreaInsets();
  // isLowPowerMode từ hook — reactive, update khi user toggle trong Settings
  const { level, error, isLowPowerMode } = useBatteryLevel();

  const batteryColor = level === null
    ? '#9e9e9e'
    : level <= 20
      ? '#e53935'
      : level <= 50
        ? '#fb8c00'
        : '#43a047';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: top + 16 }]}>

      <Text style={styles.title}>Legacy Native Module</Text>
      <Text style={styles.subtitle}>DeviceBattery — Swift (iOS)</Text>

      {/* Battery level */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Battery Level</Text>

        {error ? (
          <Text style={styles.errorText}>❌ {error}</Text>
        ) : level === null ? (
          <ActivityIndicator size="large" color="#1a73e8" style={styles.spinner} />
        ) : (
          <>
            <Text style={[styles.levelText, { color: batteryColor }]}>
              {level}%
            </Text>
            <BatteryBar level={level} color={batteryColor} />
            <Text style={styles.note}>
              Live — cập nhật qua NativeEventEmitter khi thay đổi
            </Text>
          </>
        )}
      </View>

      {/* Low Power Mode constant */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Low Power Mode</Text>
        <View style={[styles.badge, isLowPowerMode ? styles.badgeWarn : styles.badgeOk]}>
          <Text style={styles.badgeText}>
            {isLowPowerMode ? '⚡ BẬT' : '✅ TẮT'}
          </Text>
        </View>
        <Text style={styles.note}>
          Từ getConstants() — đọc lúc module init, không reactive
        </Text>
      </View>

      {/* Platform info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Module info</Text>
        <InfoRow label="Platform" value={Platform.OS} />
        <InfoRow label="Module type" value="Legacy (RCT_EXTERN_MODULE)" />
        <InfoRow label="Language" value="Swift + ObjC bridge (.m)" />
        <InfoRow label="Events" value="batteryLevelChanged" />
      </View>

      {/* Architecture note */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>⚠️ Legacy Architecture</Text>
        <Text style={styles.infoText}>
          Module này dùng Bridge — JS gọi qua async message queue.{'\n'}
          New Architecture (Turbo Module) dùng JSI: sync call, zero serialization.
        </Text>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>CalendarModule</Text>
        <NewModuleButton/>
      </View>
    </ScrollView>
  );
}

function BatteryBar({ level, color }: { level: number; color: string }) {
  return (
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${level}%` as `${number}%`, backgroundColor: color }]} />
    </View>
  );
}

type InfoRowProps = { label: string; value: string };

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#111', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#666', marginBottom: 20 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLabel: { fontSize: 11, fontWeight: '600', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  levelText: { fontSize: 64, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  spinner: { marginVertical: 24 },
  errorText: { fontSize: 14, color: '#e53935', textAlign: 'center', paddingVertical: 12 },

  barTrack: { height: 12, backgroundColor: '#e0e0e0', borderRadius: 6, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: '100%', borderRadius: 6 },

  note: { fontSize: 11, color: '#9e9e9e', fontStyle: 'italic' },

  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 },
  badgeOk: { backgroundColor: '#e8f5e9' },
  badgeWarn: { backgroundColor: '#fff3e0' },
  badgeText: { fontSize: 13, fontWeight: '600', color: '#333' },

  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  infoTitle: { fontSize: 12, fontWeight: '700', color: '#1565c0', marginBottom: 8 },
  infoText: { fontSize: 12, color: '#1565c0', lineHeight: 18 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  infoLabel: { fontSize: 12, color: '#1565c0' },
  infoValue: { fontSize: 12, color: '#1565c0', fontWeight: '600', fontFamily: 'monospace' },
});
