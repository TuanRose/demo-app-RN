import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { flushQueue } from '../sync/syncQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  // Ref để detect transition từ offline → online (không trigger flush khi luôn online)
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      setIsOnline(online);

      if (online && wasOffline.current) {
        // Network vừa trở lại — flush pending actions
        flushQueue();
        wasOffline.current = false;
      } else if (!online) {
        wasOffline.current = true;
      }
    });

    return unsubscribe;
  }, []);

  return isOnline;
}
