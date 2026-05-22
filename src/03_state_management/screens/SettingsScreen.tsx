import React from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import { signIn, signOut, updateProfile } from '../store/slices/authSlice';
import { addBudget, updateLimit } from '../store/slices/budgetSlice';
import { useUIStore } from '../stores/useUIStore';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const budgets = useAppSelector(state => state.budget.items);

  // Selector riêng lẻ thay vì toàn bộ store — tránh re-render khi thay đổi khác
  const theme = useUIStore(state => state.theme);
  const toggleTheme = useUIStore(state => state.toggleTheme);

  const isDark = theme === 'dark';
  const bg = isDark ? '#1a1a1a' : '#f5f5f5';
  const cardBg = isDark ? '#2a2a2a' : '#fff';
  const textColor = isDark ? '#fff' : '#333';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Zustand: theme toggle — persist qua AsyncStorage */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={styles.sectionHeader}>Giao diện (Zustand + AsyncStorage)</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: textColor }]}>
            Dark mode {isDark ? '🌙' : '☀️'}
          </Text>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>
      </View>

      {/* Redux: auth state + actions */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={styles.sectionHeader}>Auth State (Redux)</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: textColor }]}>
            {user ? `${user.name} (${user.email})` : 'Chưa đăng nhập'}
          </Text>
        </View>
        {!user ? (
          <TouchableOpacity
            style={styles.btn}
            onPress={() =>
              dispatch(
                signIn({
                  user: { id: 'u1', name: 'Antonio Vu', email: 'demo@fintrack.app' },
                  token: 'redux_token_demo',
                }),
              )
            }>
            <Text style={styles.btnText}>Dispatch signIn</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => dispatch(updateProfile({ name: 'Antonio Updated' }))}>
              <Text style={styles.btnText}>Dispatch updateProfile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={() => dispatch(signOut())}>
              <Text style={styles.btnText}>Dispatch signOut</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Redux: budget slice */}
      <View style={[styles.section, { backgroundColor: cardBg }]}>
        <Text style={styles.sectionHeader}>Budget Slice (Redux)</Text>
        {budgets.map(b => (
          <View key={b.id} style={styles.row}>
            <Text style={[styles.label, { color: textColor }]}>{b.name}</Text>
            <TouchableOpacity
              onPress={() =>
                dispatch(updateLimit({ id: b.id, limit: b.limit + 500000 }))
              }>
              <Text style={styles.updateText}>
                {(b.limit / 1000000).toFixed(1)}M +500k
              </Text>
            </TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            dispatch(
              addBudget({
                name: 'Budget mới',
                limit: 1000000,
                categoryId: 'cat_other',
              }),
            )
          }>
          <Text style={styles.btnText}>Dispatch addBudget</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  section: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
    padding: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1a73e8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  label: { fontSize: 14, flex: 1 },
  updateText: { fontSize: 13, color: '#1a73e8', fontWeight: '600' },
  btn: {
    backgroundColor: '#1a73e8',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnSecondary: { backgroundColor: '#43a047' },
  btnDanger: { backgroundColor: '#e53935' },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
