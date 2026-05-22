---
paths: src/**/*.tsx, src/**/*.ts, ios/**/*.swift, ios/**/*.m, android/**/*.kt, android/**/*.java
---
# iOS / Android Platform Rules

## Platform branching
- Dùng `Platform.OS === 'ios'` hoặc `Platform.select({})` cho logic rẽ nhánh
- File platform-specific: `Component.ios.tsx` / `Component.android.tsx` — Metro tự pick đúng file
- Tránh quá nhiều `Platform.OS` lồng nhau — tách thành platform-specific file nếu logic phức tạp

## iOS specific
- Safe area: luôn account for notch/Dynamic Island — dùng `useSafeAreaInsets`
- Keyboard: `KeyboardAvoidingView behavior="padding"` trên iOS, `behavior="height"` trên Android
- Haptics: `react-native-haptic-feedback` hoặc `expo-haptics`
- Back navigation: iOS dùng swipe gesture — đảm bảo `gestureEnabled` không bị disable tùy tiện

## Android specific
- Back button: `BackHandler.addEventListener('hardwareBackPress', handler)` — nhớ remove listener
- Ripple effect: dùng `TouchableNativeFeedback` trên Android để đúng Material Design
- Status bar: `<StatusBar translucent backgroundColor="transparent" />` để content kéo dài dưới status bar
- Keyboard: `android:windowSoftInputMode="adjustResize"` trong AndroidManifest.xml

## Native modules / New Architecture
- Legacy: `ReactContextBaseJavaModule` (Android), `RCTBridgeModule` (iOS)
- New Arch: TurboModule với TypeScript spec → CodeGen → native impl
- Tham khảo skill `/rn-native-legacy` hoặc `/rn-native-platform`
