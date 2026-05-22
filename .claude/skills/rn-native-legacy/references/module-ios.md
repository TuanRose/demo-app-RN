# Reference: iOS Native Module

## Bước 1 — Header file

`ios/RCTCalendarModule.h`:

```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCTCalendarModule : RCTEventEmitter <RCTBridgeModule>
@end
```

## Bước 2 — Implementation file

`ios/RCTCalendarModule.m`:

```objc
#import "RCTCalendarModule.h"
#import <React/RCTLog.h>

@implementation RCTCalendarModule {
    bool hasListeners;
}

// Tên JS: "RCTCalendarModule"
// Dùng RCT_EXPORT_MODULE(CalendarModule) nếu muốn bỏ tiền tố RCT
RCT_EXPORT_MODULE();

// Hằng số xuất sang JS
- (NSDictionary *)constantsToExport {
    return @{ @"DEFAULT_EVENT_NAME": @"New Event" };
}

// Trả YES nếu module cần chạy trên main thread
+ (BOOL)requiresMainQueueSetup { return NO; }

// Phương thức đơn giản
RCT_EXPORT_METHOD(createCalendarEvent:(NSString *)name location:(NSString *)location) {
    RCTLogInfo(@"Create event %@ at %@", name, location);
}

// Phương thức với Callback
RCT_EXPORT_METHOD(createCalendarEventWithCallback:(NSString *)name
                  location:(NSString *)location
                  callback:(RCTResponseSenderBlock)callback) {
    callback(@[@123]);
}

// Phương thức với Promise (khuyến nghị)
RCT_EXPORT_METHOD(createCalendarEventAsync:(NSString *)name
                  location:(NSString *)location
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    NSInteger eventId = 123;
    if (eventId) {
        resolve(@(eventId));
    } else {
        reject(@"event_failure", @"no event id returned", nil);
    }
}

// Events
- (NSArray<NSString *> *)supportedEvents {
    return @[@"EventReminder"];
}

- (void)startObserving { hasListeners = YES; }
- (void)stopObserving  { hasListeners = NO; }

- (void)sendCalendarEvent:(NSString *)name {
    if (hasListeners) {
        [self sendEventWithName:@"EventReminder" body:@{@"name": name}];
    }
}

@end
```

---

## Dùng Swift thay Objective-C

`CalendarModule.swift`:

```swift
@objc(CalendarModule)
class CalendarModule: NSObject {

    @objc func constantsToExport() -> [String: Any]! {
        return ["DEFAULT_EVENT_NAME": "New Event"]
    }

    @objc(addEvent:location:date:)
    func addEvent(_ name: String, location: String, date: NSNumber) {
        // implementation
    }
}
```

**Bắt buộc** tạo bridge file `CalendarModuleBridge.m`:

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CalendarModule, NSObject)
RCT_EXTERN_METHOD(addEvent:(NSString *)name
                  location:(NSString *)location
                  date:(nonnull NSNumber *)date)
@end
```

---

## Tính năng nâng cao

### Threading
```objc
// Chạy trên main thread
- (dispatch_queue_t)methodQueue {
    return dispatch_get_main_queue();
}

// Custom serial queue
- (dispatch_queue_t)methodQueue {
    return dispatch_queue_create("com.example.queue", DISPATCH_QUEUE_SERIAL);
}
```

### Cleanup khi module bị invalidate
```objc
#import <React/RCTInvalidating.h>

@interface RCTCalendarModule : NSObject <RCTBridgeModule, RCTInvalidating>
@end

- (void)invalidate {
    // cleanup code
}
```

---

## Quy tắc iOS

- `RCT_EXPORT_MODULE()` không tham số → tên JS bỏ tiền tố `RCT` khỏi tên class.
- `RCT_EXPORT_MODULE(CustomName)` → tên JS là `CustomName`.
- Phương thức `RCT_EXPORT_METHOD` luôn là `void` và bất đồng bộ.
- `RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD` dùng khi cần sync — hạn chế dùng.
- Implement `startObserving`/`stopObserving` khi dùng event emitter để tránh memory leak.
- Chạy `bundle exec pod install` sau khi thêm file native mới.
