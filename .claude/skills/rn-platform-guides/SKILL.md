# Skill: rn-platform-guides

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

Skill này bao phủ các **platform guides** cho Android và iOS trong React Native:

| Chủ đề | Platform |
|--------|---------|
| Headless JS — background tasks | Android |
| APK / AAB signing + release build | Android |
| React Native Gradle Plugin config | Android |
| Communication native ↔ JS | Android & iOS |
| Linking libraries, Simulator | iOS |
| App Extensions | iOS |
| Publishing to App Store | iOS |

---

## Routing — đọc reference file nào

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Headless JS, background task, BroadcastReceiver, wake lock | `references/android-headless.md` |
| APK / AAB signing, keystore, ProGuard, Gradle Plugin config | `references/android-release.md` |
| Communication (properties, events) từ native → JS trên Android | `references/android-communication.md` |
| Linking libraries iOS, Simulator, App Extensions, App Store publishing | `references/ios-release.md` |
| Communication (properties, events, RCTRootView) từ native → JS trên iOS | `references/ios-communication.md` |

---

## Quy tắc chung

- Headless JS chỉ chạy trên Android.
- Release build Android: dùng AAB (`.aab`) cho Play Store, APK cho sideload.
- iOS release: phải archive qua Xcode (Product → Archive) rồi upload qua App Store Connect.
- Communication: properties dùng cho top-down data flow; events dùng khi native cần trigger JS.
- Wake lock: gọi `HeadlessJsTaskService.acquireWakeLockNow()` trong `BroadcastReceiver.onReceive()` trước khi trả về.
