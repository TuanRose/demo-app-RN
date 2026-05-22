# 05 Push Notifications — Notifee Local Notifications

## Objectives
- [x] Cài đặt @notifee/react-native
- [x] Tạo Notifee channels: `budget-alert` (HIGH) + `daily-reminder` (DEFAULT)
- [x] Permission request flow (iOS + Android 13+)
- [x] Local notification: daily spending reminder scheduled lúc 9:00 AM
- [x] Budget alert: trigger khi chi tiêu vượt 80% ngân sách
- [x] Tap notification → navigate tới screen liên quan

**Done when:** Schedule reminder → nhận notification; vượt budget threshold → alert fires; tap notification → đúng screen.

> **Note:** FCM (remote push) bị qua vì cần Firebase project thật + real device.
> Notifee local notifications hoạt động hoàn toàn trên simulator.

---

## Folder Structure

```
src/05_push_notifications/
├── config/
│   └── channels.ts              ← Notifee channel definitions
├── services/
│   └── NotificationService.ts  ← requestPermission, schedule, trigger
├── hooks/
│   └── useNotificationSetup.ts ← permission state, channel init, foreground events
├── screens/
│   └── NotificationsScreen.tsx ← demo UI
└── NotificationsDemo.tsx        ← entry point + background handler
```

---

## WHY Notifee thay vì Firebase Notifications trực tiếp

| | Firebase Notifications | Notifee |
|---|---|---|
| Foreground display | KHÔNG tự hiển thị | Có full control |
| Local scheduling | Không có | `createTriggerNotification` |
| Channel control | Hạn chế | Full Android channel API |
| Quick actions | Hạn chế | Action buttons + inline reply |

Trong thực tế: dùng cả hai — FCM để nhận remote push, Notifee để hiển thị và xử lý.

## Android Channels — bắt buộc Android 8+ (API 26+)

Channel phải tạo trước khi `displayNotification()`. Một khi đã tạo, importance không thể thay đổi bằng code — user phải vào Settings.
