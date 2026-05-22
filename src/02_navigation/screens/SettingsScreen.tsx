import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuthActions } from '../context/AuthContext';

export default function SettingsScreen() {
  const { signOut } = useAuthActions();

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Tài khoản</Text>
          <Text style={styles.value}>demo@fintrack.app</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phiên bản</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
      </View>

      {/* After signOut, React Navigation removes authenticated screens from
          the stack and shows Login — no navigation.navigate() needed */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 15, color: '#333' },
  value: { fontSize: 15, color: '#666' },
  signOutButton: {
    backgroundColor: '#e53935',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
