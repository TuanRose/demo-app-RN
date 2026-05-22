# Reference: Firebase Cloud Messaging (FCM) — Android & iOS

---

## Cài đặt

```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
cd ios && bundle exec pod install
```

**Android** — thêm `google-services.json` vào `android/app/`.
**iOS** — thêm `GoogleService-Info.plist` vào Xcode project.

---

## Xin quyền (bắt buộc iOS, Android 13+)

```tsx
import messaging from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';

async function requestNotificationPermission() {
  if (Platform.OS === 'ios') {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;
    return enabled;
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true; // Android < 13 không cần xin quyền
}
```

---

## Lấy FCM Token (đăng ký device với server)

```tsx
async function getFCMToken(): Promise<string | null> {
  // iOS: kiểm tra có APNs token không
  if (Platform.OS === 'ios') {
    const apnsToken = await messaging().getAPNSToken();
    if (!apnsToken) return null;
  }

  const token = await messaging().getToken();

  // Lưu token vào MMKV và sync lên server
  storage.set('fcmToken', token);
  await api.updateDeviceToken(token);

  return token;
}

// Lắng nghe khi token thay đổi (app reinstall, token expire)
messaging().onTokenRefresh((newToken) => {
  storage.set('fcmToken', newToken);
  api.updateDeviceToken(newToken);
});
```

---

## Xử lý messages theo trạng thái app

```
App States:
├── Foreground  → onMessage() handler
├── Background  → setBackgroundMessageHandler() + notification tray
└── Quit        → setBackgroundMessageHandler() + getInitialNotification()
```

### Foreground — `index.js` (TRƯỚC AppRegistry)

```tsx
// index.js — đăng ký TRƯỚC khi app load
import messaging from '@react-native-firebase/messaging';

// PHẢI đăng ký ở đây, không phải trong component
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('Background message:', remoteMessage);
  // Không thể update UI ở đây — chỉ xử lý data
  await saveNotificationToStorage(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
```

### Foreground — trong App component

```tsx
useEffect(() => {
  // Khi app đang mở và nhận message
  const unsubscribe = messaging().onMessage(async (remoteMessage) => {
    // Firebase KHÔNG tự hiển thị notification khi foreground
    // Phải dùng Notifee để hiển thị
    await notifee.displayNotification({
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      android: { channelId: 'default' },
    });
  });

  return unsubscribe;
}, []);
```

---

## Notification vs Data messages

```json
// Notification message — Firebase tự hiển thị khi background/quit
{
  "to": "FCM_TOKEN",
  "notification": {
    "title": "New message",
    "body": "John: Hello!"
  },
  "data": { "chatId": "123" }
}

// Data-only message — không tự hiển thị, handler luôn được gọi
// Phải set priority để wake device
{
  "to": "FCM_TOKEN",
  "data": {
    "type": "NEW_MESSAGE",
    "chatId": "123"
  },
  "android": { "priority": "high" },
  "apns": {
    "headers": { "apns-priority": "10" },
    "payload": { "aps": { "content-available": 1 } }
  }
}
```

| | Notification | Data-only |
|--|--|--|
| Foreground | onMessage() | onMessage() |
| Background | Notification tray, không gọi handler | setBackgroundMessageHandler() |
| Quit | Notification tray | setBackgroundMessageHandler() (cần priority) |

---

## Topic subscriptions

```tsx
// Subscribe user vào topics
await messaging().subscribeToTopic('breaking-news');
await messaging().subscribeToTopic(`user-${userId}`);

// Unsubscribe
await messaging().unsubscribeFromTopic('breaking-news');
```

---

## Firebase config (firebase.json)

```json
{
  "react-native": {
    "messaging_android_notification_channel_id": "default",
    "messaging_android_notification_color": "#007AFF",
    "messaging_ios_auto_register_for_remote_messages": true
  }
}
```
