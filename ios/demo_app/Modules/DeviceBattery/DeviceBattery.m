//
//  DeviceBattery.m
//  demo_app
//
//  Created by Vu MinhTuan on 21/5/26.
//
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

// Tham số 1: tên class Swift (khớp @objc(DeviceBattery))
// Tham số 2: class cha — RCTEventEmitter vì có phát event
@interface RCT_EXTERN_MODULE(DeviceBattery, RCTEventEmitter)

// Mỗi RCT_EXTERN_METHOD phải khớp CHÍNH XÁC signature @objc của hàm Swift
RCT_EXTERN_METHOD(getBatteryLevel:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// requiresMainQueueSetup khai báo ở đây để RN không cảnh báo
+ (BOOL)requiresMainQueueSetup { return NO; }

@end
