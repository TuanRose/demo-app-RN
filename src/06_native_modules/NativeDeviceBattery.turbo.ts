// Turbo Module: import trực tiếp từ spec — không qua NativeModules (legacy bridge)
// TurboModuleRegistry.getEnforcing throw ngay nếu module không tồn tại
import NativeDeviceBattery from '../../specs/NativeDeviceBattery';

export function getBatteryLevel(): Promise<number> {
  return NativeDeviceBattery.getBatteryLevel();
}

export function getConstants(): {isLowPowerMode: boolean} {
  return NativeDeviceBattery.getConstants();
}

// subscribe trả về cleanup function — dùng trực tiếp trong useEffect return
export function subscribeBatteryChange(cb: (level: number) => void): () => void {
  const sub = NativeDeviceBattery.onBatteryChange(e => cb(e.level));
  return () => sub.remove();
}

export function subscribeLowPowerModeChange(cb: (isLowPowerMode: boolean) => void): () => void {
  const sub = NativeDeviceBattery.onLowPowerModeChange(e => cb(e.isLowPowerMode));
  return () => sub.remove();
}
