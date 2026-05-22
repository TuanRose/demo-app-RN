import notifee, { EventType } from '@notifee/react-native';
import React from 'react';
import NotificationsScreen from './screens/NotificationsScreen';

// Background handler: đăng ký ở module level (không trong component)
// Notifee gọi handler này khi app ở background và user interact với notification action
notifee.onBackgroundEvent(async ({ type }) => {
  if (type === EventType.PRESS) {
    // Production: dùng navigationRef hoặc lưu pending navigation vào MMKV
    // để handle khi app foreground trở lại
  }
});

export default function NotificationsDemo() {
  return <NotificationsScreen />;
}
