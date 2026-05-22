import notifee, { EventType } from '@notifee/react-native';
import { useCallback, useEffect, useState } from 'react';
import { createNotificationChannels } from '../config/channels';
import { requestPermission } from '../services/NotificationService';

export type NotifData = Record<string, string> | undefined;

type Setup = {
  permissionGranted: boolean | null;
  lastTappedData: NotifData;
};

export function useNotificationSetup(): Setup {
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [lastTappedData, setLastTappedData] = useState<NotifData>(undefined);

  const handlePress = useCallback((data: NotifData) => {
    setLastTappedData(data);
    // Production: navigationRef.navigate() theo data.type
    // fintrack://budget → BudgetScreen, fintrack://reminder → HomeScreen
  }, []);

  useEffect(() => {
    async function init() {
      // Channels phải tạo trước khi displayNotification — idempotent
      await createNotificationChannels();
      const granted = await requestPermission();
      setPermissionGranted(granted);
    }
    init();

    const unsubForeground = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        handlePress(detail.notification?.data as NotifData);
      }
    });

    // Kiểm tra notification đã tap khi app ở quit state
    notifee.getInitialNotification().then(initial => {
      if (initial) {
        handlePress(initial.notification.data as NotifData);
      }
    });

    return unsubForeground;
  }, [handlePress]);

  return { permissionGranted, lastTappedData };
}
