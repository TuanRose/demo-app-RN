import {useEffect, useState} from 'react';
import {
  getBatteryLevel,
  getConstants,
  subscribeBatteryChange,
  subscribeLowPowerModeChange,
} from '../NativeDeviceBattery.turbo';

export function useBatteryLevelTurbo() {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // seed từ getConstants() (sync JSI call), sau đó reactive qua event
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(
    () => getConstants().isLowPowerMode,
  );

  useEffect(() => {
    getBatteryLevel().then(setLevel).catch((e: Error) => setError(e.message));

    const unsubBattery = subscribeBatteryChange(setLevel);
    const unsubPower = subscribeLowPowerModeChange(setIsLowPowerMode);
    return () => {
      unsubBattery();
      unsubPower();
    };
  }, []);

  return {level, error, isLowPowerMode};
}
