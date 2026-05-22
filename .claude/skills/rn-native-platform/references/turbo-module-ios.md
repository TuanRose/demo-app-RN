# Reference: Turbo Native Module — iOS

## Bước 1 — Tạo group trong Xcode

1. Mở workspace: `cd ios && open <AppName>.xcworkspace`
2. Right-click app trong Xcode → `New Group` → đặt tên (e.g. `NativeLocalStorage`)
3. Trong group: `New File from Template` → `Cocoa Touch Class`
4. Name: `RCTNativeLocalStorage`, Language: `Objective-C`
5. Đổi tên file `.m` thành `.mm` (Objective-C++)

---

## Bước 2 — Header file

`NativeLocalStorage/RCTNativeLocalStorage.h`:

```objc
#import <Foundation/Foundation.h>
#import <NativeLocalStorageSpec/NativeLocalStorageSpec.h>

NS_ASSUME_NONNULL_BEGIN

@interface RCTNativeLocalStorage : NSObject <NativeLocalStorageSpec>
@end

NS_ASSUME_NONNULL_END
```

> Import `<NativeLocalStorageSpec/NativeLocalStorageSpec.h>` — file này được CodeGen sinh ra, không tạo thủ công.

---

## Bước 3 — Implementation file (.mm)

`NativeLocalStorage/RCTNativeLocalStorage.mm`:

```objc
#import "RCTNativeLocalStorage.h"

static NSString *const kStorageKey = @"local-storage";

@interface RCTNativeLocalStorage ()
@property (strong, nonatomic) NSUserDefaults *localStorage;
@end

@implementation RCTNativeLocalStorage

- (instancetype)init {
    if (self = [super init]) {
        _localStorage = [[NSUserDefaults alloc] initWithSuiteName:kStorageKey];
    }
    return self;
}

// Bắt buộc — kết nối với TurboModule runtime
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeLocalStorageSpecJSI>(params);
}

- (NSString * _Nullable)getItem:(NSString *)key {
    return [self.localStorage stringForKey:key];
}

- (void)setItem:(NSString *)value key:(NSString *)key {
    [self.localStorage setObject:value forKey:key];
}

- (void)removeItem:(NSString *)key {
    [self.localStorage removeObjectForKey:key];
}

- (void)clear {
    for (NSString *key in [self.localStorage dictionaryRepresentation]) {
        [self.localStorage removeObjectForKey:key];
    }
}

+ (NSString *)moduleName {
    return @"NativeLocalStorage";
}

@end
```

---

## Bước 4 — Cập nhật package.json

Thêm `modulesProvider` vào `codegenConfig.ios`:

```json
"codegenConfig": {
  "ios": {
    "modulesProvider": {
      "NativeLocalStorage": "RCTNativeLocalStorage"
    }
  }
}
```

> Key (e.g. `"NativeLocalStorage"`) phải khớp với tên module trong TypeScript spec.
> Value (e.g. `"RCTNativeLocalStorage"`) là tên class Objective-C đã implement.

---

## Bước 5 — Pod install & build

```bash
cd ios
bundle exec pod install
```

Sau đó:
```bash
npm run ios
# hoặc
yarn ios
```

---

## So sánh với Legacy

| | Legacy | Turbo Module |
|---|---|---|
| Protocol | `RCTBridgeModule` | CodeGen-generated spec (`NativeXxxSpec`) |
| Đăng ký | `RCT_EXPORT_MODULE()` | `modulesProvider` trong `package.json` |
| Methods | `RCT_EXPORT_METHOD` | `override` methods từ spec |
| File extension | `.m` | `.mm` (Objective-C++) |
| Bridge | Bridge JSON | JSI trực tiếp |
| getTurboModule | — | Bắt buộc implement |

---

## Quy tắc iOS

- File implementation phải là `.mm` (Objective-C++) — bắt buộc cho JSI.
- `getTurboModule:` phải implement và trả về `std::make_shared<NativeXxxSpecJSI>(params)`.
- `moduleName` phải trả về đúng tên trong TypeScript spec.
- Không dùng `RCT_EXPORT_MODULE()` hay `RCT_EXPORT_METHOD` với Turbo Module.
