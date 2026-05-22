#import "RCTNativeDeviceBattery.h"
// RCTEventEmitter và RCTDefaultReactNativeFactoryDelegate phải được import trước demo_app-Swift.h
// vì Swift.h khai báo @interface DeviceBattery : RCTEventEmitter — cần biết superclass
#import <React/RCTEventEmitter.h>
#import <RCTDefaultReactNativeFactoryDelegate.h>
// Header Swift→ObjC tự sinh khi build: <ProductModuleName>-Swift.h
// ProductModuleName của app này = demo_app
#import "demo_app-Swift.h"

@implementation RCTNativeDeviceBattery {
  DeviceBatteryImpl *_impl;
}

- (instancetype)init {
  if (self = [super init]) {
    _impl = [DeviceBatteryImpl new];

    // Bơm event từ Swift lên JS — weakSelf tránh retain cycle
    __weak __typeof(self) weakSelf = self;
    _impl.onBatteryChange = ^(NSDictionary *body) {
      [weakSelf emitOnBatteryChange:body];
    };
    _impl.onLowPowerModeChange = ^(NSDictionary *body) {
      // emitOnLowPowerModeChange sinh bởi CodeGen từ "onLowPowerModeChange" trong TS spec
      [weakSelf emitOnLowPowerModeChange:body];
    };
  }
  return self;
}

// BẮT BUỘC — nối module vào TurboModule runtime qua JSI
// Boilerplate này giống nhau ở mọi Turbo Module, chỉ đổi tên SpecJSI
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeDeviceBatterySpecJSI>(params);
}

// CodeGen sinh signature getBatteryLevel:reject: từ Promise<number> trong spec
- (void)getBatteryLevel:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject {
  NSNumber *level = [_impl currentBatteryLevel];
  if (level.intValue < 0) {
    reject(@"E_BATTERY_UNAVAILABLE", @"Cannot read battery level on this device", nil);
  } else {
    resolve(level);
  }
}

// getConstants: phải trả ModuleConstants<T> — kiểu type-safe do CodeGen sinh
// typedConstants dùng struct Input từ JS::NativeDeviceBattery::Constants::Builder
- (facebook::react::ModuleConstants<JS::NativeDeviceBattery::Constants>)getConstants {
  return facebook::react::typedConstants<JS::NativeDeviceBattery::Constants>({
    .isLowPowerMode = static_cast<bool>(_impl.isLowPowerMode)
  });
}

// constantsToExport: bắt buộc implement cùng getConstants (protocol yêu cầu cả hai)
- (facebook::react::ModuleConstants<JS::NativeDeviceBattery::Constants>)constantsToExport {
  return [self getConstants];
}

// Tên module phải khớp getEnforcing('NativeDeviceBattery') ở JS
+ (NSString *)moduleName {
  return @"NativeDeviceBattery";
}

@end
