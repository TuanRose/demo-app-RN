import notifee, {
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { CHANNEL_IDS } from '../config/channels';

export async function requestPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return (
    settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
    // PROVISIONAL: iOS chỉ gửi notification vào Notification Center, không banner
    settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleDailyReminder(): Promise<void> {
  // Cancel trước để tránh duplicate khi user nhấn nhiều lần
  await notifee.cancelTriggerNotification('daily-reminder');

  const trigger9AM = new Date();
  trigger9AM.setHours(9, 0, 0, 0);
  // Nếu 9 AM hôm nay đã qua → schedule cho ngày mai
  if (trigger9AM.getTime() <= Date.now()) {
    trigger9AM.setDate(trigger9AM.getDate() + 1);
  }

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: trigger9AM.getTime(),
    repeatFrequency: RepeatFrequency.DAILY,
    // allowWhileIdle: fire kể cả khi Android Doze mode (device nằm im lâu)
    alarmManager: { allowWhileIdle: true },
  };

  await notifee.createTriggerNotification(
    {
      id: 'daily-reminder',
      title: '💰 FinTrack Daily',
      body: 'Hôm nay bạn đã ghi chi tiêu chưa?',
      data: { type: 'DAILY_REMINDER' },
      android: {
        channelId: CHANNEL_IDS.DAILY_REMINDER,
        pressAction: { id: 'default' },
      },
      ios: { sound: 'default' },
    },
    trigger,
  );
}

export async function triggerBudgetAlert(
  spent: number,
  budget: number,
  categoryName: string,
): Promise<void> {
  const percent = Math.round((spent / budget) * 100);
  await notifee.displayNotification({
    // ID cố định per category — update notification thay vì spam nhiều cái
    id: `budget-alert-${categoryName}`,
    title: '⚠️ Cảnh báo ngân sách',
    body: `${categoryName}: đã dùng ${percent}% (${spent.toLocaleString('vi-VN')} ₫ / ${budget.toLocaleString('vi-VN')} ₫)`,
    data: { type: 'BUDGET_ALERT', category: categoryName, percent: String(percent) },
    android: {
      channelId: CHANNEL_IDS.BUDGET_ALERT,
      pressAction: { id: 'default' },
    },
    ios: { sound: 'default' },
  });
}

export async function getScheduledNotifications() {
  return notifee.getTriggerNotifications();
}

export async function cancelAllScheduled(): Promise<void> {
  // cancelTriggerNotifications() không có tham số = cancel tất cả
  await notifee.cancelTriggerNotifications();
}
