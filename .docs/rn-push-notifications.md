# rn-push-notifications — Notifee Local Notifications

**Ngày:** 2026-05-11 | **Bài:** Day 10–11, Week 2

---

## Key Concepts

### FCM vs Notifee — phân chia trách nhiệm

```
FCM (Firebase)          Notifee
──────────────          ───────
Nhận remote push   →    Display foreground notification
Token management        Channel management
Topic subscriptions     Scheduling (local)
                        Quick actions, inline reply
                        Badge count
```

Trong thực tế dùng cả hai: FCM để nhận remote push từ server, Notifee để hiển thị và xử lý interaction. Bài này chỉ dùng Notifee vì FCM cần Firebase project + real device.

### Android Channels — bắt buộc Android 8+ (API 26+)

```ts
await notifee.createChannel({
  id: 'budget-alert',
  name: 'Budget Alerts',
  importance: AndroidImportance.HIGH, // HIGH = heads-up notification
});
```

- Phải tạo channel **trước** `displayNotification()` — nếu channel không tồn tại, notification bị drop silently
- `createChannel()` là **idempotent** — safe to call nhiều lần khi app khởi động
- Một khi đã tạo, `importance` không thể thay đổi bằng code — user phải vào Settings
- iOS: `createChannel()` là no-op (iOS không có channel concept)

### Permission request

```ts
const settings = await notifee.requestPermission();
const granted =
  settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
  settings.authorizationStatus === AuthorizationStatus.PROVISIONAL;
// PROVISIONAL: iOS — notification vào Notification Center, không hiện banner
```

- iOS: phải gọi `requestPermission()` trước khi nhận notification
- Android 13+ (API 33): cần `POST_NOTIFICATIONS` permission — Notifee handle tự động
- Android < 13: không cần xin quyền

### Scheduled notifications

```ts
const trigger: TimestampTrigger = {
  type: TriggerType.TIMESTAMP,
  timestamp: trigger9AM.getTime(),
  repeatFrequency: RepeatFrequency.DAILY,
  // allowWhileIdle: fire kể cả khi Android Doze mode
  alarmManager: { allowWhileIdle: true },
};

await notifee.createTriggerNotification({ id: 'daily-reminder', ... }, trigger);
```

- Cancel trước khi schedule lại để tránh duplicate: `cancelTriggerNotification('daily-reminder')`
- `getTriggerNotifications()` để list scheduled
- `cancelTriggerNotifications()` (không tham số) = cancel tất cả

### Foreground notification handling — 3 states

```
App States:
├── Foreground  → notifee.onForegroundEvent() — Firebase KHÔNG tự hiển thị
├── Background  → notification tray + onBackgroundEvent()
└── Quit        → notification tray + getInitialNotification()
```

```ts
// Foreground events — trong useEffect
const unsub = notifee.onForegroundEvent(({ type, detail }) => {
  if (type === EventType.PRESS) {
    handleNavigation(detail.notification?.data);
  }
});

// Background events — module level (không trong component)
notifee.onBackgroundEvent(async ({ type, detail }) => { ... });

// Quit state — check khi app mount
const initial = await notifee.getInitialNotification();
if (initial) handleNavigation(initial.notification.data);
```

### Navigate from notification — pattern

```ts
function handleNotificationNavigation(data?: Record<string, string>) {
  if (!data || !navigationRef.isReady()) return;
  switch (data.type) {
    case 'BUDGET_ALERT': navigationRef.navigate('Budget'); break;
    case 'DAILY_REMINDER': navigationRef.navigate('Home'); break;
  }
}
```

`navigationRef` từ `navigation/ref.ts` — dùng khi navigate ngoài component tree.

---

## Gotchas

### `cancelAllTriggerNotifications` không tồn tại

Notifee đổi tên: `cancelAllTriggerNotifications()` → `cancelTriggerNotifications()` (không tham số = cancel tất cả). Luôn đọc `.d.ts` trong `node_modules` thay vì tin docs cũ.

### Background handler phải đăng ký ở module level

```ts
// ✅ Đúng — ngoài component, ở module level
notifee.onBackgroundEvent(async ({ type, detail }) => { ... });

// ❌ Sai — trong component bị unmount khi app background
function App() {
  useEffect(() => {
    notifee.onBackgroundEvent(...); // không hoạt động ở background
  }, []);
}
```

### Foreground: Firebase KHÔNG tự hiển thị notification

Khi app đang mở, Firebase chỉ gọi `onMessage()` — không tự hiện banner. Phải gọi `notifee.displayNotification()` trong handler đó.

### Notification ID cố định để tránh spam

```ts
// ✅ ID cố định per category — update notification thay vì tạo mới
id: `budget-alert-${categoryName}`

// ❌ ID random mỗi lần → stack nhiều notification
id: `budget-alert-${Date.now()}`
```

---

## Code Patterns

### Budget alert threshold check

```ts
function checkBudgetThreshold(spent: number, budget: number) {
  const percent = spent / budget;
  if (percent >= 0.8) {
    triggerBudgetAlert(spent, budget, 'Ăn uống');
  }
}
// Gọi trong useAddTransaction mutationFn sau khi ghi SQLite
```

### Tách channels ra config riêng

```ts
export const CHANNEL_IDS = {
  BUDGET_ALERT: 'budget-alert',
  DAILY_REMINDER: 'daily-reminder',
} as const;
```

Dùng `as const` để TypeScript infer literal type — tránh typo khi pass `channelId`.

---

## Architecture — JS → Native Flow

### Local Notification (Notifee): JS → JSI → Native

```
JS Thread                    JSI (synchronous)           Native Thread
─────────────────────────    ─────────────────           ──────────────────────────────

notifee.displayNotification()
         │
         ▼
   Notifee JS layer          ══════════════════►   NotifeePlugin (C++)
   (serialize payload)                                    │
                                                          ▼
                                               ┌─────────────────────┐
                                               │  iOS                │
                                               │  UNUserNotification │
                                               │  Center.add()       │
                                               └────────┬────────────┘
                                                        │
                                               ┌────────▼────────────┐
                                               │  OS renders banner  │
                                               └─────────────────────┘
```

### Remote Push (FCM): Server → OS → JS

```
Backend Server
      │  POST /send (FCM token + payload)
      ▼
 FCM Servers (Google)
      ├──────────────────────────────────────┐
      │ iOS                                  │ Android
      ▼                                      ▼
 APNs (Apple)                          FCM Android
      │                                      │
      ▼                                      ▼
 AppDelegate                      FirebaseMessagingService
 didReceiveRemoteNotification        (background process)
      └──────────────┬───────────────────────┘
                     ▼
            Firebase RN SDK
                     │
           ┌─────────┴──────────┐
           │ App state?         │
    Foreground              Background/Quit
           │                    │
           ▼                    ▼
     onMessage()        setBackgroundMessageHandler()
    (phải gọi                   │
  notifee.display()      Notification tray → tap
     tay)               onNotificationOpenedApp()
                        hoặc getInitialNotification()
```

### JSI vs Old Bridge — tại sao Notifee nhanh

```
Old Bridge:  JS ──[serialize JSON]──► queue (async) ──[deserialize]──► Native
JSI:         JS ──[C++ function ptr]────────────────────────────────► Native
                  synchronous, no serialization, shared memory
```

Notifee v9+ dùng JSI — `displayNotification()` gọi thẳng C++ layer, không qua JSON bridge.

### App State × Notification type matrix

```
                    │ Foreground      │ Background      │ Quit             │
────────────────────┼─────────────────┼─────────────────┼──────────────────┤
Local (Notifee)     │ onForeground    │ tray +          │ tray +           │
                    │ Event()         │ onBackground    │ getInitial       │
                    │                 │ Event()         │ Notification()   │
────────────────────┼─────────────────┼─────────────────┼──────────────────┤
Remote notification │ onMessage() +   │ tray (auto)     │ tray (auto)      │
(FCM)               │ display() tay   │                 │                  │
────────────────────┼─────────────────┼─────────────────┼──────────────────┤
Remote data-only    │ onMessage()     │ bgMessage       │ bgMessage        │
(FCM)               │                 │ Handler()       │ Handler()        │
                    │                 │                 │ (cần high prio)  │
```

**Rule quan trọng nhất:** foreground = Firebase im lặng, Notifee phải display tay. Background/quit = OS tự handle, JS chỉ xử lý tap event.

---

## References

- [Notifee docs](https://notifee.app/react-native/docs)
- [FCM + Notifee pattern](https://notifee.app/react-native/docs/integrations/firebase)
