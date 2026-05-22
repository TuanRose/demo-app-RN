import React from 'react';
import {
  ActivityIndicator,
  // Linking,
  Platform,
  ScrollView,
  StyleSheet,
  // Switch,
  Text,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useBatteryLevel} from '../hooks/useBatteryLevel';
import {useBatteryLevelTurbo} from '../hooks/useBatteryLevelTurbo';

export default function TurboModuleScreen() {
  const {top, bottom} = useSafeAreaInsets();
  const legacy = useBatteryLevel();
  const turbo = useBatteryLevelTurbo();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {paddingTop: top + 24, paddingBottom: bottom + 32},
      ]}>
      <Text style={styles.title}>Legacy vs Turbo</Text>
      <Text style={styles.subtitle}>NativeDeviceBattery · Swift · iOS</Text>

      <ModuleCard
        label="LEGACY"
        accent="#C84B11"
        arch="Bridge  ·  JSON serialize  ·  Eager load"
        level={legacy.level}
        error={legacy.error}
        isLowPowerMode={legacy.isLowPowerMode}
      />

      <ModuleCard
        label="TURBO"
        accent="#1452CC"
        arch="JSI  ·  No serialize  ·  Lazy load"
        level={turbo.level}
        error={turbo.error}
        isLowPowerMode={turbo.isLowPowerMode}
      />

      <View style={styles.table}>
        <Text style={styles.tableTitle}>Key differences</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.colFeature, styles.tableHeaderText]}>Feature</Text>
          <Text style={[styles.colValue, styles.tableHeaderText, styles.colLegacyText]}>Legacy</Text>
          <Text style={[styles.colValue, styles.tableHeaderText, styles.colTurboText]}>Turbo</Text>
        </View>
        <DiffRow feature="Type safety"  legacy="Runtime"            turbo="Compile-time" />
        <DiffRow feature="Interface"    legacy="RCT_EXTERN_METHOD"  turbo="TS spec → CodeGen" />
        <DiffRow feature="Events"       legacy="NativeEventEmitter" turbo="EventEmitter<T>" />
        <DiffRow feature="ObjC shim"    legacy=".m"                 turbo=".mm (ObjC++)" />
        <DiffRow feature="Platform"     legacy={Platform.OS}        turbo={Platform.OS} />
      </View>
    </ScrollView>
  );
}

type ModuleCardProps = {
  label: string;
  accent: string;
  arch: string;
  level: number | null;
  error: string | null;
  isLowPowerMode: boolean;
};

function ModuleCard({label, accent, arch, level, error, isLowPowerMode}: ModuleCardProps) {
  const batteryColor =
    level === null ? '#9e9e9e'
    : level <= 20  ? '#D32F2F'
    : level <= 50  ? '#E65100'
    : '#2E7D32';

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.chip, {backgroundColor: accent + '18', borderColor: accent + '40'}]}>
          <Text style={[styles.chipText, {color: accent}]}>{label}</Text>
        </View>
        <Text style={styles.archText}>{arch}</Text>
      </View>

      <View style={styles.divider} />

      {/* Battery level */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : level === null ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={accent} size="large" />
          <Text style={styles.loadingText}>Reading…</Text>
        </View>
      ) : (
        <View style={styles.levelBox}>
          <Text style={[styles.levelText, {color: batteryColor}]}>{level}</Text>
          <Text style={styles.levelUnit}>%</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, {width: `${level}%` as `${number}%`, backgroundColor: batteryColor}]} />
          </View>
        </View>
      )}

      <View style={styles.divider} />

      {/* Low Power Switch */}
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>Low Power Mode</Text>
          <Text style={styles.switchHint}>Tap to open iOS Battery Settings</Text>
        </View>
        {/* iOS không cho app set Low Power Mode — onValueChange mở Settings
            reactive event tự cập nhật Switch khi user quay lại app */}
        {/* <Switch
          value={isLowPowerMode}
          onValueChange={() => Linking.openURL('App-Prefs:BATTERY_USAGE')}
          trackColor={{false: '#D0D0D0', true: '#FFB300'}}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D0D0D0"
        /> */}
        <View >
          <Text style={isLowPowerMode? styles.active:styles.inactive}>{isLowPowerMode?'ON': 'OFF'}</Text>
        </View>
      </View>
    </View>
  );
}

type DiffRowProps = {feature: string; legacy: string; turbo: string};

function DiffRow({feature, legacy, turbo}: DiffRowProps) {
  return (
    <View style={styles.diffRow}>
      <Text style={styles.colFeature}>{feature}</Text>
      <Text style={[styles.colValue, styles.colLegacyText]} numberOfLines={2}>{legacy}</Text>
      <Text style={[styles.colValue, styles.colTurboText]} numberOfLines={2}>{turbo}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F0F2F5'},
  content: {paddingHorizontal: 16, gap: 14},

  title: {fontSize: 26, fontWeight: '800', color: '#0D0D0D', letterSpacing: -0.5},
  subtitle: {fontSize: 13, color: '#888', marginTop: 2, marginBottom: 4},
  active: {
    color: 'green',
    backgroundColor: '#c4ecc3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 30
  },
  inactive: {
    color: 'red',
    backgroundColor: '#ecc3c3',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 30
  },
  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  cardHeader: {paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12, gap: 8},
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  chipText: {fontSize: 11, fontWeight: '800', letterSpacing: 1.2},
  archText: {fontSize: 12, color: '#999', lineHeight: 17},

  divider: {height: 1, backgroundColor: '#F0F0F0'},

  // Battery level
  levelBox: {paddingHorizontal: 18, paddingVertical: 20},
  levelText: {fontSize: 72, fontWeight: '800', lineHeight: 80, letterSpacing: -2},
  levelUnit: {fontSize: 22, fontWeight: '600', color: '#AAA', marginTop: -8, marginBottom: 12},
  barTrack: {height: 10, backgroundColor: '#EFEFEF', borderRadius: 5, overflow: 'hidden'},
  barFill: {height: '100%', borderRadius: 5},

  loadingBox: {alignItems: 'center', paddingVertical: 28, gap: 10},
  loadingText: {fontSize: 13, color: '#AAA'},

  errorBox: {flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 18, paddingVertical: 20},
  errorIcon: {fontSize: 16, color: '#E53935', lineHeight: 20},
  errorText: {flex: 1, fontSize: 13, color: '#E53935', lineHeight: 20},

  // Switch row
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  switchLabel: {fontSize: 15, fontWeight: '600', color: '#1A1A1A'},
  switchHint: {fontSize: 11, color: '#BBB', marginTop: 2},

  // Comparison table
  table: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: {width: 0, height: 4},
    elevation: 3,
  },
  tableTitle: {fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12},
  tableHeader: {flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginBottom: 4},
  tableHeaderText: {fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5},
  diffRow: {flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F7F7F7', alignItems: 'center'},
  colFeature: {width: 90, fontSize: 12, fontWeight: '600', color: '#555'},
  colValue: {flex: 1, fontSize: 12, fontFamily: 'monospace'},
  colLegacyText: {color: '#C84B11'},
  colTurboText: {color: '#1452CC'},
});
