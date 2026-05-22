# rn-navigation

## What I built

Implement navigation layer cho FinTrack: Auth flow + bottom tab navigator + deep linking. App có 2 trạng thái hoàn toàn tách biệt — unauthenticated (Login) và authenticated (Dashboard / Transactions / Settings / TransactionDetail). Deep link `fintrack://transaction/:transactionId` mở thẳng màn hình chi tiết giao dịch từ bên ngoài app.

## Key concepts

- **Conditional stack pattern**: Navigator render tập hợp screens khác nhau dựa trên `userToken`. Khi token thay đổi, React Navigation tự transition — không cần gọi `navigation.navigate()` sau login/logout
- **`createNativeStackNavigator` vs `createStackNavigator`**: native-stack chạy animation trực tiếp trên native layer (UINavigationController / Fragment), không qua JS thread — ít jank hơn, dùng mặc định
- **`NavigationContainer` phải nằm trong `AuthProvider`**: vì `Navigator` component cần đọc auth state từ context — nếu đặt ngược lại sẽ context undefined
- **Deep link URL scheme**: iOS cần khai báo `CFBundleURLTypes` trong Info.plist, Android cần `intent-filter` trong AndroidManifest — thiếu một trong hai thì platform đó không nhận được link

## Decisions & trade-offs

- **In-memory token vs Keychain**: dùng in-memory (`useReducer` state) cho demo — đủ để học navigation pattern mà không cần native dependency thêm. Production bắt buộc dùng `react-native-keychain`: token trong memory mất khi app bị kill.
- **Custom URL scheme (`fintrack://`) vs Universal Links**: custom scheme không cần server setup, phù hợp cho học tập. Production nên dùng Universal Links (iOS) / App Links (Android) vì verified qua domain — app khác không thể hijack.
- **Tách `useAuth` vs `useAuthActions`**: `useAuthActions` trả về stable `signIn`/`signOut` callback — dùng khi component chỉ cần dispatch mà không cần re-render theo `userToken`. Tránh re-render không cần thiết.

## Gotchas

- Gọi `navigation.navigate('Home')` sau `signIn()` → crash hoặc silent fail vì screen đó chưa tồn tại trong current navigator tree. Pattern đúng: chỉ dispatch state change, để React Navigation xử lý transition.
- Deep link vào protected screen khi chưa login → React Navigation redirect về Login đúng, nhưng sau khi login **không** tự navigate đến intended screen. Cần lưu `initialURL` và handle thủ công nếu muốn behavior "redirect về intended screen sau login".
- `react-native-screens` yêu cầu setup `RNScreensFragmentFactory` trong `MainActivity.kt` (Android) — nếu thiếu sẽ crash khi navigate giữa các screens trên Android.

## Code patterns to remember

```tsx
// Conditional stack — KHÔNG gọi navigation.navigate() sau signIn
<Stack.Navigator>
  {userToken == null ? (
    <Stack.Screen name="Login" component={LoginScreen} />
  ) : (
    <>
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
    </>
  )}
</Stack.Navigator>
```

```tsx
// AuthContext — useMemo bắt buộc để tránh re-render toàn bộ tree
const value = useMemo(() => ({
  userToken: state.userToken,
  signIn: (token) => dispatch({ type: 'SIGN_IN', token }),
  signOut: () => dispatch({ type: 'SIGN_OUT' }),
}), [state.userToken]);
```

```tsx
// Deep link config — nested navigators phải map đúng hierarchy
const linking = {
  prefixes: ['fintrack://'],
  config: {
    screens: {
      Tabs: {
        screens: { Dashboard: 'dashboard', Transactions: 'transactions' },
      },
      TransactionDetail: 'transaction/:transactionId', // fintrack://transaction/txn_001
    },
  },
};
```

```bash
# Test deep link iOS Simulator
xcrun simctl openurl booted "fintrack://transaction/txn_001"

# Test deep link Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "fintrack://transaction/txn_001" com.demo_app
```

## References

- [Skill reference: core-navigators.md](.claude/skills/rn-navigation/references/core-navigators.md)
- [Skill reference: auth-flow.md](.claude/skills/rn-navigation/references/auth-flow.md)
- [Skill reference: deep-linking.md](.claude/skills/rn-navigation/references/deep-linking.md)
- [Lesson README](src/02_navigation/README.md)
