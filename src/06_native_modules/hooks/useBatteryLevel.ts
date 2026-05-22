import { useEffect, useState } from 'react';
import DeviceBattery, { batteryEmitter } from '../NativeDeviceBattery.legacy';

export const useBatteryLevel = () => {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // isLowPowerMode: seed từ getConstants() (giá trị lúc app start), update qua event
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(
    DeviceBattery.getConstants().isLowPowerMode,
  );

  useEffect(() => {
    DeviceBattery.getBatteryLevel().then(setLevel).catch(e => setError(e.message));

    const levelSub = batteryEmitter.addListener('batteryLevelChanged', e => setLevel(e.level));
    const powerSub = batteryEmitter.addListener('lowPowerModeChanged', e =>
      setIsLowPowerMode(e.isLowPowerMode),
    );
    return () => {
      levelSub.remove();
      powerSub.remove();
    };
  }, []);

  return { level, error, isLowPowerMode };
};