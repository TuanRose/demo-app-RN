# Reference: Notification Handling — Navigate từ Notification

---

## Pattern đầy đủ — Foreground + Background + Quit

```tsx
// App.tsx
import messaging from '@react-native-firebase/messaging';
import notifee, { EventType } from '@notifee/react-native';
import { navigationRef } from './navigation/ref';

function App() {
  useEffect(() => {
    // 1. CHECK INITIAL NOTIFICATION (app mở từ quit state)
    const checkInitialNotification = async () => {
      // Firebase notification (user tap notification)
      const remoteMessage = await messaging().getInitialNotification();
      if (remoteMessage) {
        handleNotificationNavigation(remoteMessage.data);
      }

      // Notifee (local notification hoặc FCM qua Notifee)
      const initialNotification = await notifee.getInitialNotification();
      if (initialNotification) {
        handleNotificationNavigation(initialNotification.notification.data);
      }
    };

    checkInitialNotification();

    // 2. BACKGROUND → FOREGROUND (user tap notification khi app ở background)
    const unsubscribeFCM = messaging().onNotificationOpenedApp((remoteMessage) => {
      handleNotificationNavigation(remoteMessage.data);
    });

    // 3. FOREGROUND interactions
    const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handleNotificationNavigation(detail.notification?.data);
      }
      if (type === EventType.ACTION_PRESS) {
        // Quick action từ notification
        handleQuickAction(detail.pressAction?.id, detail.notification?.data);
      }
    });

    return () => {
      unsubscribeFCM();
      unsubscribeNotifee();
    };
  }, []);
}

// 4. BACKGROUND events (notifee)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS) {
    await saveNotificationAction(detail);
  }
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'mark-as-read') {
    await markMessageAsRead(detail.notification?.data?.messageId);
    await notifee.cancelNotification(detail.notification!.id!);
  }
});
```

---

## handleNotificationNavigation

```tsx
function handleNotificationNavigation(data?: Record<string, string>) {
  if (!data || !navigationRef.isReady()) return;

  switch (data.type) {
    case 'CHAT_MESSAGE':
      navigationRef.navigate('Chat', { chatId: data.chatId });
      break;
    case 'ORDER_UPDATE':
      navigationRef.navigate('OrderDetail', { orderId: data.orderId });
      break;
    case 'NEW_FOLLOWER':
      navigationRef.navigate('Profile', { userId: data.userId });
      break;
    default:
      navigationRef.navigate('Notifications');
  }
}
```

---

## Notification counter / badge

```tsx
import notifee from '@notifee/react-native';
import { AppState } from 'react-native';

// Set badge count (iOS)
async function updateBadgeCount(count: number) {
  await notifee.setBadgeCount(count);
}

// Clear badge khi app foreground
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    notifee.setBadgeCount(0);
    // Cập nhật server về unread count
    api.markAllNotificationsAsRead();
  }
});
```

---

## Local notification với Notifee

```bash
npm install @notifee/react-native
cd ios && bundle exec pod install
```

```tsx
import notifee, { AndroidImportance } from '@notifee/react-native';

// Android: tạo channel (bắt buộc Android 8+)
await notifee.createChannel({
  id: 'default',
  name: 'Default Channel',
  importance: AndroidImportance.HIGH,
  sound: 'default',
  vibration: true,
});

// Hiển thị notification
await notifee.displayNotification({
  id: 'unique-id',          // để update hoặc cancel
  title: 'New message',
  body: 'John: Hello!',
  data: { type: 'CHAT_MESSAGE', chatId: '123' },
  android: {
    channelId: 'default',
    smallIcon: 'ic_notification',
    color: '#007AFF',
    pressAction: { id: 'default' },  // action khi tap
    actions: [
      { title: 'Reply', pressAction: { id: 'reply' } },
      { title: 'Mark as Read', pressAction: { id: 'mark-as-read' } },
    ],
  },
  ios: {
    sound: 'default',
    badgeCount: unreadCount,
    categoryId: 'chat',     // iOS notification category
  },
});
```

---

## Scheduled notifications

```tsx
import notifee, { TimestampTrigger, TriggerType } from '@notifee/react-native';

// Trigger tại thời điểm cụ thể
const trigger: TimestampTrigger = {
  type: TriggerType.TIMESTAMP,
  timestamp: new Date().getTime() + 60 * 60 * 1000, // 1 giờ sau
  alarmManager: { allowWhileIdle: true }, // Android — hoạt động khi Doze mode
};

await notifee.createTriggerNotification(
  {
    title: 'Reminder',
    body: 'Don\'t forget your appointment',
    android: { channelId: 'reminders' },
  },
  trigger
);

// Huỷ scheduled notification
await notifee.cancelTriggerNotification('notification-id');

// Lấy danh sách scheduled
const scheduled = await notifee.getTriggerNotifications();
```
