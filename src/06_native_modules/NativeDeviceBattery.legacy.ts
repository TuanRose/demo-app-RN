import { NativeModules, NativeEventEmitter } from 'react-native';

interface DeviceBatteryLegacy {
  getBatteryLevel(): Promise<number>;
  getConstants(): { isLowPowerMode: boolean };
}

const { DeviceBattery } = NativeModules;

if (!DeviceBattery) {
  // Fail-fast: thiếu rebuild native hoặc tên module sai
  throw new Error(
    'Native module "DeviceBattery" chưa được link. Chạy lại pod install + rebuild app.',
  );
}

export const batteryEmitter = new NativeEventEmitter(DeviceBattery);
export default DeviceBattery as DeviceBatteryLegacy;