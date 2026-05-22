# Skill: rn-push-notifications

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| FCM Android | Firebase Cloud Messaging setup, permissions, message handling |
| APNs iOS | Apple Push Notification service, certificates, silent push |
| Local notifications | Notifee — scheduling, channels, foreground display |
| Notification handling | Foreground/background/quit state, deep link từ notification |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| FCM Android setup, onMessage, setBackgroundMessageHandler, getToken | `references/fcm-setup.md` |
| APNs iOS, certificates, entitlements, silent push, categories | `references/apns-ios.md` |
| Local notifications, Notifee channels, scheduling, foreground service | `references/local-notifications.md` |
| Foreground/background/quit state handling, navigate từ notification | `references/notification-handling.md` |

---

## Quy tắc chung

- `setBackgroundMessageHandler` phải đăng ký ở `index.js` **trước** `AppRegistry.registerComponent`.
- **Foreground**: Firebase không tự hiển thị notification — phải dùng Notifee để hiển thị.
- **Data-only messages**: set `priority: 'high'` (Android) và `contentAvailable: true` (iOS) để wake device.
- iOS: phải gọi `requestPermission()` trước khi nhận notifications.
- Android 13+ (API 33): phải request `POST_NOTIFICATIONS` permission.
- Test push notifications phải dùng real device — simulator/emulator không đủ reliable.
