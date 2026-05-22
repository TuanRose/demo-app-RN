#import <Foundation/Foundation.h>
// Header do CodeGen sinh từ codegenConfig.name = "AppModulesSpec"
// Chỉ có sau khi chạy pod install
#import <AppModulesSpec/AppModulesSpec.h>

NS_ASSUME_NONNULL_BEGIN

// Kế thừa NativeDeviceBatterySpecBase (không phải NSObject) để có emitOnBatteryChange:
// NativeDeviceBatterySpecBase do CodeGen sinh — chứa _eventEmitterCallback và emit method
@interface RCTNativeDeviceBattery : NativeDeviceBatterySpecBase <NativeDeviceBatterySpec>
@end

NS_ASSUME_NONNULL_END
