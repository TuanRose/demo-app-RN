# Reference: Local Notifications với Notifee

---

## Setup Android Channels

Android 8+ (API 26+) bắt buộc tạo channel trước khi hiển thị notification.

```tsx
import notifee, { AndroidImportance, AndroidVisibility } from '@notifee/react-native';

async function createNotificationChannels() {
  // Channel mặc định
  await notifee.createChannel({
    id: 'default',
    name: 'General Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500],
    lights: true,
    lightColor: AndroidColor.BLUE,
  });

  // Channel cho messages (ưu tiên cao hơn)
  await notifee.createChannel({
    id: 'messages',
    name: 'Messages',
    importance: AndroidImportance.HIGH,
    badge: true,
  });

  // Channel im lặng (không âm thanh, không rung)
  await notifee.createChannel({
    id: 'silent',
    name: 'Silent Updates',
    importance: AndroidImportance.LOW,
    sound: '',
    vibration: false,
  });
}

// Gọi khi app khởi động
createNotificationChannels();
```

---

## Hiển thị notification

```tsx
import notifee, { AndroidImportance } from '@notifee/react-native';

async function displayLocalNotification() {
  await notifee.displayNotification({
    id: 'notif-1',                  // để update hoặc cancel sau này
    title: '<b>New Message</b>',    // HTML bold (Android)
    body: 'You have a new message from John',
    subtitle: 'Direct Message',     // iOS only
    data: {
      type: 'CHAT_MESSAGE',
      chatId: 'chat-123',
      senderId: 'user-456',
    },

    android: {
      channelId: 'messages',
      smallIcon: 'ic_notification', // drawable resource name
      largeIcon: 'https://...',     // URL hoặc drawable
      color: '#007AFF',
      badge: true,                  // hiển thị badge trên app icon
      showTimestamp: true,
      timestamp: Date.now(),
      ongoing: false,               // true = không thể swipe dismiss
      autoCancel: true,             // tự cancel khi tap
      groupId: 'messages',          // group notifications
      groupSummary: false,

      pressAction: {
        id: 'default',              // action khi tap notification
        launchActivity: 'default',  // mở app
      },

      actions: [
        {
          title: 'Reply',
          pressAction: { id: 'reply' },
          input: { allowFreeFormInput: true, placeholder: 'Type a reply...' },
        },
        {
          title: 'Mark as Read',
          pressAction: { id: 'mark-read' },
        },
      ],
    },

    ios: {
      sound: 'default',
      badgeCount: 3,
      threadId: 'chat-123',         // group notifications (iOS)
      categoryId: 'chat',           // link đến notification category
      attachments: [
        {
          url: 'https://...',        // image preview
          thumbnailClippingRect: { x: 0, y: 0, width: 1, height: 0.5 },
        },
      ],
      foregroundPresentationOptions: {
        banner: true,
        sound: true,
        badge: true,
      },
    },
  });
}
```

---

## Update notification đang hiển thị

```tsx
// Update notification theo ID (tạo hoặc cập nhật nếu đã tồn tại)
await notifee.displayNotification({
  id: 'progress-notif',
  title: 'Downloading...',
  body: 'Progress: 50%',
  android: {
    channelId: 'default',
    progress: {
      max: 100,
      current: 50,
      indeterminate: false,
    },
    ongoing: true,   // không thể swipe dismiss khi đang download
    autoCancel: false,
  },
});

// Cancel notification
await notifee.cancelNotification('progress-notif');
await notifee.cancelAllNotifications();

// Cancel chỉ displayed notifications (không cancel scheduled)
await notifee.cancelDisplayedNotifications();
```

---

## Scheduled Notifications

```tsx
import notifee, {
  TimestampTrigger,
  IntervalTrigger,
  TriggerType,
  TimeUnit,
} from '@notifee/react-native';

// 1. Tại thời điểm cụ thể
const timestampTrigger: TimestampTrigger = {
  type: TriggerType.TIMESTAMP,
  timestamp: new Date('2024-12-25T09:00:00').getTime(),
  alarmManager: {
    allowWhileIdle: true,  // Android — hoạt động khi Doze mode
  },
  repeatFrequency: RepeatFrequency.DAILY, // lặp lại hàng ngày
};

await notifee.createTriggerNotification(
  {
    id: 'daily-reminder',
    title: 'Daily Reminder',
    body: "Don't forget your goals today!",
    android: { channelId: 'default' },
  },
  timestampTrigger
);

// 2. Lặp lại theo interval
const intervalTrigger: IntervalTrigger = {
  type: TriggerType.INTERVAL,
  interval: 30,
  timeUnit: TimeUnit.MINUTES,
};

await notifee.createTriggerNotification(
  { title: 'Break reminder', body: 'Time for a break!', android: { channelId: 'default' } },
  intervalTrigger
);

// Lấy danh sách scheduled
const scheduled = await notifee.getTriggerNotifications();
const ids = scheduled.map(n => n.notification.id);

// Cancel specific scheduled
await notifee.cancelTriggerNotification('daily-reminder');
await notifee.cancelAllTriggerNotifications();
```

---

## Foreground Service (Android) — notifications persistent

Cho background tasks dài hạn (tracking location, music player, download).

```tsx
import notifee, { AndroidForegroundServiceType } from '@notifee/react-native';

// Đăng ký foreground service handler (index.js)
notifee.registerForegroundService((notification) => {
  return new Promise(async (resolve) => {
    // Task chạy khi foreground service active
    await performLongRunningTask();
    resolve(); // kết thúc service
  });
});

// Bắt đầu foreground service
await notifee.displayNotification({
  title: 'Tracking location',
  body: 'Your route is being recorded',
  android: {
    channelId: 'tracking',
    asForegroundService: true,
    foregroundServiceTypes: [AndroidForegroundServiceType.LOCATION],
    ongoing: true,
    actions: [{ title: 'Stop', pressAction: { id: 'stop' } }],
  },
});

// Kết thúc foreground service
await notifee.stopForegroundService();
```

---

## Nhóm notifications (Android)

```tsx
// Hiển thị nhiều notifications cùng group
for (const message of messages) {
  await notifee.displayNotification({
    id: `msg-${message.id}`,
    title: message.senderName,
    body: message.text,
    android: {
      channelId: 'messages',
      groupId: 'chat-group',
      groupSummary: false,
    },
  });
}

// Tạo group summary (notification tổng hợp)
await notifee.displayNotification({
  id: 'group-summary',
  title: '5 new messages',
  body: 'John, Jane, and 3 others',
  android: {
    channelId: 'messages',
    groupId: 'chat-group',
    groupSummary: true, // đây là summary notification
  },
});
```

---

## Event handling

```tsx
// Foreground events — trong App component
const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
  switch (type) {
    case EventType.DISMISSED:
      console.log('User dismissed notification', detail.notification);
      break;
    case EventType.PRESS:
      console.log('User pressed notification', detail.notification);
      handleNotificationPress(detail.notification?.data);
      break;
    case EventType.ACTION_PRESS:
      console.log('User pressed action:', detail.pressAction?.id);
      handleActionPress(detail.pressAction?.id, detail.notification?.data);
      break;
    case EventType.DELIVERED:
      console.log('Notification delivered', detail.notification?.id);
      break;
  }
});

// Background events — ngoài component (index.js hoặc top level)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  const { notification, pressAction } = detail;

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'mark-read') {
    await markAsRead(notification?.data?.messageId as string);
    await notifee.cancelNotification(notification!.id!);
  }

  if (type === EventType.ACTION_PRESS && pressAction?.id === 'reply') {
    const inputText = detail.input; // text từ inline reply
    await sendReply(notification?.data?.chatId as string, inputText);
    await notifee.cancelNotification(notification!.id!);
  }
});
```
