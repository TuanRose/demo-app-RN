# 02 Navigation — FinTrack Auth Flow & Deep Linking

## Objectives
- [x] Cài đặt React Navigation (native-stack + bottom-tabs) + native dependencies
- [x] Implement Auth flow: conditional stack pattern (không dùng navigation.navigate sau login/logout)
- [x] Build RootNavigator: Login screen → MainTabNavigator (Dashboard, Transactions, Settings)
- [x] Configure deep link `fintrack://transaction/:transactionId` → TransactionDetailScreen
- [x] Kiểm tra deep link trên Simulator/Emulator

**Done when:** Login → navigate được toàn bộ tab + TransactionDetail. `fintrack://transaction/txn_001` mở đúng screen.

---

## Folder Structure

```
src/02_navigation/
├── types/
│   └── navigation.ts          ← RootStackParamList, TabParamList
├── context/
│   └── AuthContext.tsx         ← authReducer + AuthProvider + useAuth hook
├── config/
│   └── linking.ts              ← deep link: fintrack://transaction/:id
├── navigators/
│   ├── RootNavigator.tsx       ← conditional auth/main stack
│   └── MainTabNavigator.tsx    ← Dashboard + Transactions + Settings tabs
└── screens/
    ├── LoginScreen.tsx
    ├── DashboardScreen.tsx
    ├── TransactionsScreen.tsx
    ├── TransactionDetailScreen.tsx
    └── SettingsScreen.tsx
```

---

## WHY Conditional Stack (không phải navigation.navigate sau login)?

```tsx
// ❌ KHÔNG làm — gây "navigate to route that doesn't exist" error
const handleLogin = async () => {
  await signIn(token);
  navigation.navigate('Home'); // Home chỉ tồn tại trong authenticated stack
};

// ✅ ĐÚNG — dispatch thay đổi userToken → React Navigation tự re-render stack
const handleLogin = async () => {
  signIn(token); // dispatch → userToken != null → Navigator re-renders với Main screens
};
```

React Navigation theo dõi navigator tree. Khi `userToken` thay đổi → stack re-renders → screens mới mount tự động.

---

## WHY useMemo cho AuthContext value?

AuthProvider render lại mỗi khi state thay đổi. Không `useMemo` → `authContext` object mới mỗi lần → toàn bộ consumer re-render dù `signIn`/`signOut` không đổi.

---

## WHY custom scheme thay vì Universal Links cho demo?

| | Custom Scheme (`fintrack://`) | Universal Links (`https://`) |
|---|---|---|
| Setup | Chỉ cần AndroidManifest + Info.plist | Cần server + `.well-known/` file |
| Security | App khác có thể hijack | Verify qua domain owner |
| Demo | ✅ Dùng được không cần server | ❌ Cần domain thật |

Cho bài học → custom scheme. Production → Universal Links.

---

## Test deep link

```bash
# iOS Simulator
xcrun simctl openurl booted "fintrack://transaction/txn_001"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "fintrack://transaction/txn_001" com.demo_app
```
