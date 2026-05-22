import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';
// EventEmitter cho TurboModule spec: nằm trong CodegenTypesNamespace, không re-export từ 'react-native'
import type {EventEmitter} from 'react-native/Libraries/Types/CodegenTypesNamespace';

type BatteryChangeEvent = {level: number};
type LowPowerModeChangeEvent = {isLowPowerMode: boolean};

export interface Spec extends TurboModule {
  getBatteryLevel(): Promise<number>;
  getConstants(): {isLowPowerMode: boolean};

  // CodeGen tự sinh emitOnBatteryChange() và emitOnLowPowerModeChange() ở shim
  readonly onBatteryChange: EventEmitter<BatteryChangeEvent>;
  readonly onLowPowerModeChange: EventEmitter<LowPowerModeChangeEvent>;
}

// getEnforcing: throw ngay nếu module không tồn tại → fail-fast dễ debug
export default TurboModuleRegistry.getEnforcing<Spec>('NativeDeviceBattery');
