// RCTCalendarModule.m — Bridge file: khai báo cho ObjC biết về Swift class CalendarModule
#import <React/RCTBridgeModule.h>

// Tham số 1: tên class Swift (khớp @objc(CalendarModule))
// Tham số 2: class cha — NSObject vì không phát event (khác DeviceBattery dùng RCTEventEmitter)
@interface RCT_EXTERN_MODULE(CalendarModule, NSObject)

// Signature phải khớp CHÍNH XÁC với @objc annotation của hàm Swift
RCT_EXTERN_METHOD(createCalendarEvent:(NSString *)name
                  location:(NSString *)location
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return NO; }

@end
