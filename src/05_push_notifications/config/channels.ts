import notifee, { AndroidImportance } from '@notifee/react-native';

export const CHANNEL_IDS = {
  BUDGET_ALERT: 'budget-alert',
  DAILY_REMINDER: 'daily-reminder',
} as const;

// Gọi một lần khi app khởi động — idempotent, safe to call multiple times
// Android 8+: channel phải tồn tại trước khi displayNotification()
// iOS: createChannel() là no-op (iOS không có channel concept)
export async function createNotificationChannels(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_IDS.BUDGET_ALERT,
    name: 'Budget Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });

  await notifee.createChannel({
    id: CHANNEL_IDS.DAILY_REMINDER,
    name: 'Daily Reminders',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  });
}
