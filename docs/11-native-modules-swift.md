# Native Module với Swift — Legacy & Turbo

> **Phạm vi**: Cách viết Native Module (logic/API hệ thống, KHÔNG có UI) bằng Swift cho React Native, theo cả hai kiến trúc.
> **Phiên bản tham chiếu**: React Native 0.85.2, New Architecture bật mặc định.
> **Tài liệu liên quan**: [01-react-native-architecture.md](01-react-native-architecture.md) (Bridge vs JSI), [12-native-components-swift.md](12-native-components-swift.md) (Native Component có UI).

---

## 1. Native Module là gì? Khi nào cần?

**Native Module** = một lớp code native (Swift/Kotlin) expose hàm cho JS gọi. Không có giao diện — chỉ logic.

**Khi nào cần viết Native Module:**

| Tình huống | Ví dụ |
|---|---|
| API hệ thống RN chưa wrap | Battery, Brightness, Haptics, Contacts, Biometrics |
| SDK native của bên thứ ba | Payment SDK, Analytics SDK chỉ có bản native |
| Tính toán nặng cần tốc độ native | Image processing, crypto, parsing nhị phân |
| Truy cập capability đặc thOS | Keychain, WidgetKit, App Clips, Live Activities |

**Khi nào KHÔNG cần:** Nếu đã có thư viện cộng đồng ổn định (`react-native-device-info`, `expo-*`...) → dùng luôn, đừng tự viết lại.

---

## 2. Legacy vs Turbo — chọn cái nào?

```
                JS gọi hàm native
                        │
        ┌───────────────┴───────────────┐
        │                               │
   LEGACY (Bridge)                 TURBO (JSI)
   ────────────────                ──────────────
   JS ──serialize──> JSON          JS ──gọi trực tiếp──> C++ ──> native
        │                               │
   async, batched                  sync được, lazy-load
   không type-safe runtime         type-safe qua CodeGen
```

| Tiêu chí | Legacy Native Module | Turbo Native Module |
|---|---|---|
| Cơ chế giao tiếp | Bridge — serialize JSON, async, batch | JSI — gọi hàm C++ trực tiếp, có thể sync |
| Type safety | Không (lỗi sai kiểu chỉ phát hiện lúc runtime) | Có — CodeGen sinh interface từ TS spec |
| Khởi tạo | Eager (load hết lúc app start) | Lazy (load khi JS gọi lần đầu) |
| Hiệu năng | Overhead serialize mỗi call | Không serialize, nhanh hơn rõ rệt |
| File iOS | `.swift` + `.m` bridge | `.swift` (logic) + `.mm` shim (bắt buộc) |
| Boilerplate | Ít | Nhiều hơn (TS spec + codegenConfig + shim) |
| Trạng thái | Deprecated — chạy qua interop layer | Chuẩn hiện tại (RN 0.76+) |

**Khuyến nghị cho project này (RN 0.85, New Arch):**
- **Viết mới → dùng Turbo.** Đó là hướng chính thức, type-safe, không nợ kỹ thuật.
- **Legacy** vẫn chạy được nhờ *interop layer*, nhưng chỉ nên dùng khi: prototype nhanh, hoặc port code cũ chưa kịp migrate.
- Học cả hai để **đọc hiểu được code thư viện cũ** — phần lớn ecosystem vẫn còn legacy.

> **Sự thật quan trọng về Swift + Turbo**: Turbo Module **bắt buộc** một file Objective-C++ (`.mm`) làm cầu nối JSI, vì lớp `getTurboModule:` trả về kiểu C++ (`std::shared_ptr<TurboModule>`) mà Swift thuần không biểu diễn được. Pattern production: **`.mm` là shim mỏng, logic thật nằm trong class Swift**. Chi tiết ở Phần 5.

---

## 3. Tổ chức code: 2 cách

### Cách A — Đặt thẳng trong app target (đơn giản, hợp learning + app đơn lẻ)

```
demo_app/
├── ios/demo_app/Modules/        ← file Swift + ObjC ở đây
├── android/app/src/main/java/com/demo_app/modules/
└── specs/                       ← TS spec cho Turbo (codegenConfig trỏ tới)
```

Ưu: không cần setup pod riêng, Swift header `demo_app-Swift.h` dùng được ngay.
Nhược: không tái sử dụng được cho app khác.

### Cách B — Local Library (khuyến nghị production, code dùng lại nhiều nơi)

```bash
npx create-react-native-library@latest my-native-module
```

```json
// package.json của app
"dependencies": {
  "my-native-module": "file:./modules/my-native-module"
}
```

Ưu: tách bạch, dễ tách thành package npm sau này, codegenConfig nằm gọn trong library.
Nhược: setup phức tạp hơn; Swift↔ObjC header đổi tên theo pod (`<PodName>-Swift.h`).

> **Quyết định cho repo học tập này**: Dùng **Cách A** để các bước rõ ràng, ít layer. Khi code lên production và cần share giữa nhiều app → tách sang Cách B.

---

# PHẦN A — Legacy Native Module bằng Swift

Ví dụ xuyên suốt: module **`DeviceBattery`** — đọc mức pin, báo chế độ tiết kiệm pin, và phát event khi pin thay đổi.

## A.0 — Concepts quan trọng trước khi viết code

### Tại sao kế thừa `RCTEventEmitter` thay vì `NSObject`?

`RCTEventEmitter` làm 2 việc cùng lúc:
- **Conform `RCTBridgeModule`** — module tự đăng ký với JS bridge (nếu dùng `NSObject` thuần, phải tự conform protocol này)
- **Cung cấp `sendEvent(withName:body:)`** — cơ chế duy nhất để push event từ native → JS

Nếu module không cần emit events, dùng `NSObject + RCTBridgeModule` protocol là đủ. `DeviceBattery` cần push `batteryLevelChanged` khi pin thay đổi → bắt buộc dùng `RCTEventEmitter`.

### `@objc(DeviceBattery)` làm gì? Tại sao cần?

Swift compiler khi biên dịch sang ObjC runtime **mangle tên class** — class `DeviceBattery` trong Swift được expose dưới tên `demo_app.DeviceBattery` thay vì `DeviceBattery`.

`RCT_EXTERN_MODULE(DeviceBattery, RCTEventEmitter)` trong file `.m` đi tìm class tên **`DeviceBattery`** trong ObjC runtime. Nếu không tìm thấy chính xác tên đó → crash lúc runtime.

`@objc(DeviceBattery)` force Swift expose class với tên cụ thể `DeviceBattery` vào ObjC runtime, khớp với `RCT_EXTERN_MODULE`.

**Rule**: Tên trong `@objc(...)` phải khớp với tên đầu tiên trong `RCT_EXTERN_MODULE(...)`.

---

## A.1 — Class Swift

`ios/demo_app/Modules/DeviceBattery.swift`:

```swift
import UIKit
// Dùng `import React` (Swift module import) thay vì bridging header — xem A.3 để biết lý do
import React

// @objc(DeviceBattery) — tên này phải khớp với RCT_EXTERN_MODULE ở file bridge
// Kế thừa RCTEventEmitter để phát event xuống JS (nếu chỉ cần hàm thường thì kế thừa NSObject)
@objc(DeviceBattery)
class DeviceBattery: RCTEventEmitter {

  private var hasListeners = false

  override init() {
    super.init()
    UIDevice.current.isBatteryMonitoringEnabled = true
  }

  // requiresMainQueueSetup: trả false nếu module không đụng UIKit lúc khởi tạo.
  // Bắt buộc override — nếu không, RN log warning và mặc định chạy main thread (chậm hơn).
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }

  // Tên các event mà module này có thể phát — JS subscribe theo tên này
  override func supportedEvents() -> [String]! {
    return ["batteryLevelChanged"]
  }

  // Constants: giá trị tĩnh, JS đọc một lần lúc load — KHÔNG dùng cho dữ liệu thay đổi
  override func constantsToExport() -> [AnyHashable: Any]! {
    return ["isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled]
  }

  // --- Phương thức Promise (KHUYẾN NGHỊ cho mọi API bất đồng bộ) ---
  // Signature phải khớp y hệt với RCT_EXTERN_METHOD ở file bridge
  @objc(getBatteryLevel:rejecter:)
  func getBatteryLevel(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    let level = UIDevice.current.batteryLevel
    // batteryLevel = -1 khi không đọc được (vd: simulator cũ)
    if level < 0 {
      reject("E_BATTERY_UNAVAILABLE", "Không đọc được mức pin trên thiết bị này", nil)
      return
    }
    resolve(Int(level * 100)) // 0.0–1.0 → phần trăm
  }

  // --- Bắt đầu/dừng quan sát: RN gọi tự động khi JS add/remove listener ---
  override func startObserving() {
    hasListeners = true
    NotificationCenter.default.addObserver(
      self, selector: #selector(batteryLevelDidChange),
      name: UIDevice.batteryLevelDidChangeNotification, object: nil)
  }

  override func stopObserving() {
    hasListeners = false
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func batteryLevelDidChange() {
    guard hasListeners else { return } // không phát khi không ai nghe → tránh crash/leak
    sendEvent(withName: "batteryLevelChanged",
              body: ["level": Int(UIDevice.current.batteryLevel * 100)])
  }
}
```

## A.2 — File bridge Objective-C (BẮT BUỘC)

Swift không tự expose sang RN runtime được — cần một file `.m` khai báo bằng macro ObjC.

`ios/demo_app/Modules/DeviceBattery.m`:

```objc
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
```

> **Vì sao cần file bridge?** RN quét các macro `RCT_EXTERN_MODULE`/`RCT_EXTERN_METHOD` ở compile time để biết module nào tồn tại và hàm nào gọi được. Swift thuần không có macro tương đương → phải mượn một file ObjC.

## A.3 — Bridging Header: KHÔNG dùng trong RN 0.74+

> ⚠️ **Đây là pitfall phổ biến và nguy hiểm. Làm theo hướng dẫn cũ sẽ break build.**

### Vấn đề với bridging header trong RN 0.75+

Tài liệu cũ hướng dẫn tạo file `*-Bridging-Header.h` với nội dung:
```objc
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
```
rồi set `SWIFT_OBJC_BRIDGING_HEADER` trong Build Settings.

**Điều này FAIL trên RN 0.74+ vì:**

`RCTBridgeModule.h` import `<RCTDeprecation/RCTDeprecation.h>`. Với `CLANG_ENABLE_MODULES = YES` (mặc định), Clang chuyển đổi này thành `@import RCTDeprecation` — một module dependency. Khi Clang biên dịch bridging header thành PCH, module này được baked vào. Sau đó khi Swift compiler validate PCH, nó không tìm thấy `RCTDeprecation` module map theo đúng con đường, dẫn đến:

```
error: module 'RCTDeprecation' ... is not defined in any loaded module map file
error: Cannot find type 'RCTEventEmitter' in scope
```

Xóa cache (`ModuleCache.noindex` + `DerivedData`) cũng không giúp vì đây là structural issue.

### Giải pháp đúng: `import React` (Swift module import)

```swift
// DeviceBattery.swift
import UIKit
import React  // ← Swift module import, KHÔNG phải bridging header
```

**Tại sao cách này work:**
- `AppDelegate.swift` đã dùng pattern này thành công (`import React`, `import React_RCTAppDelegate`...)
- Swift module import đi qua Swift module system, sử dụng `-Xcc -fmodule-map-file` flags từ `OTHER_SWIFT_FLAGS` trong xcconfig — con đường này hoạt động đúng
- Bridging header PCH compilation đi qua một con đường khác và bị stuck ở RCTDeprecation module resolution

`import React` trong Swift expose toàn bộ `React-Core` module, bao gồm `RCTEventEmitter`, `RCTBridgeModule`, `RCTBundleURLProvider`, v.v. — đủ cho mọi Legacy Native Module.

### Rule: khi nào cần bridging header?

**KHÔNG bao giờ** cần `SWIFT_OBJC_BRIDGING_HEADER` cho React Native headers.  
Chỉ cần nếu Swift file của bạn muốn dùng code ObjC **của chính app** (không phải Pods) — và ngay cả khi đó hãy cân nhắc dùng `@objc`/`public` class trong Swift + auto-generated `demo_app-Swift.h` thay thế.

## A.4 — JS/TS Wrapper (BẮT BUỘC — không gọi `NativeModules.X` trực tiếp trong component)

`src/06_native_modules/NativeDeviceBattery.legacy.ts`:

```typescript
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
```

Dùng trong component:

```tsx
import { useEffect, useState } from 'react';
import DeviceBattery, { batteryEmitter } from './NativeDeviceBattery.legacy';

function useBatteryLevel() {
  const [level, setLevel] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    DeviceBattery.getBatteryLevel().then(setLevel).catch(e => setError(e.message));

    const sub = batteryEmitter.addListener('batteryLevelChanged', e => setLevel(e.level));
    return () => sub.remove(); // BẮT BUỘC remove — nếu không sẽ leak listener
  }, []);

  return { level, error };
}
```

---

# PHẦN B — Turbo Native Module bằng Swift

Cùng module `DeviceBattery`, viết lại theo New Architecture. Khác biệt cốt lõi: **TypeScript spec là nguồn chân lý** — CodeGen đọc spec sinh ra interface C++/ObjC type-safe.

## B.1 — TypeScript Spec

File spec **bắt buộc** đặt tên bắt đầu bằng `Native`.

`specs/NativeDeviceBattery.ts`:

```typescript
import type { TurboModule, EventEmitter } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

type BatteryChangeEvent = { level: number };

export interface Spec extends TurboModule {
  // Hàm bất đồng bộ → Promise
  getBatteryLevel(): Promise<number>;

  // getConstants: giá trị tĩnh đọc lúc khởi tạo
  getConstants(): { isLowPowerMode: boolean };

  // Event kiểu mới của Turbo (RN 0.76+): CodeGen tự sinh hàm emitOnBatteryChange ở native
  readonly onBatteryChange: EventEmitter<BatteryChangeEvent>;
}

// getEnforcing: throw ngay nếu module không tồn tại (fail-fast).
// Dùng get() nếu module có thể vắng mặt (vd: chỉ có trên 1 platform).
export default TurboModuleRegistry.getEnforcing<Spec>('NativeDeviceBattery');
```

**Quy tắc spec:**
- Kiểu dữ liệu phải nằm trong tập CodeGen hỗ trợ: `string`, `number`, `boolean`, `object` literal, array, `Promise<T>`, `EventEmitter<T>`. KHÔNG dùng `any`, `Date`, union phức tạp, generic tự định nghĩa.
- Tên truyền vào `getEnforcing('NativeDeviceBattery')` chính là tên module — native phải trả đúng tên này.

## B.2 — CodeGen config trong `package.json`

Project hiện CHƯA có `codegenConfig`. Thêm vào `package.json` của app:

```json
"codegenConfig": {
  "name": "AppModulesSpec",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.demo_app.specs"
  },
  "ios": {
    "modulesProvider": {
      "NativeDeviceBattery": "RCTNativeDeviceBattery"
    }
  }
}
```

| Field | Ý nghĩa |
|---|---|
| `name` | Tên framework/header CodeGen sinh ra → `#import <AppModulesSpec/AppModulesSpec.h>` |
| `type` | `modules` cho Turbo Module (`components` cho Fabric — xem doc 12) |
| `jsSrcsDir` | Thư mục chứa file spec `Native*.ts` |
| `modulesProvider` | `key` = tên module trong spec; `value` = tên class ObjC implement |

> `modulesProvider` giúp `RCTAppDependencyProvider` (đã có sẵn trong `AppDelegate.swift` của project) tự động đăng ký module — không cần viết `ReactPackage` thủ công trên iOS.

## B.3 — Class logic bằng Swift

Toàn bộ nghiệp vụ nằm ở đây. Class này độc lập với JSI — dễ unit test.

`ios/demo_app/Modules/DeviceBatteryImpl.swift`:

```swift
import Foundation
import UIKit

// public + @objc: để file .mm (Objective-C++) nhìn thấy qua header demo_app-Swift.h
@objc(DeviceBatteryImpl)
public class DeviceBatteryImpl: NSObject {

  // Closure để shim .mm bơm event ra JS — Swift không tự gọi JSI được
  @objc public var onBatteryChange: (([String: Any]) -> Void)?

  @objc public override init() {
    super.init()
    UIDevice.current.isBatteryMonitoringEnabled = true
    NotificationCenter.default.addObserver(
      self, selector: #selector(batteryChanged),
      name: UIDevice.batteryLevelDidChangeNotification, object: nil)
  }

  @objc public var isLowPowerMode: Bool {
    ProcessInfo.processInfo.isLowPowerModeEnabled
  }

  // Trả NSNumber để ObjC++ chuyển đổi dễ dàng; -1 = lỗi
  @objc public func currentBatteryLevel() -> NSNumber {
    let level = UIDevice.current.batteryLevel
    return NSNumber(value: level < 0 ? -1 : Int(level * 100))
  }

  @objc private func batteryChanged() {
    let level = UIDevice.current.batteryLevel
    onBatteryChange?(["level": level < 0 ? -1 : Int(level * 100)])
  }

  deinit { NotificationCenter.default.removeObserver(self) }
}
```

## B.4 — Shim Objective-C++ (cầu nối JSI — BẮT BUỘC)

Đây là lớp mỏng nối CodeGen spec ↔ class Swift. Không chứa nghiệp vụ.

`ios/demo_app/Modules/RCTNativeDeviceBattery.h`:

```objc
#import <Foundation/Foundation.h>
// Header do CodeGen sinh — tên = "name" trong codegenConfig
#import <AppModulesSpec/AppModulesSpec.h>

NS_ASSUME_NONNULL_BEGIN

// Conform protocol NativeDeviceBatterySpec do CodeGen sinh từ TS spec
@interface RCTNativeDeviceBattery : NSObject <NativeDeviceBatterySpec>
@end

NS_ASSUME_NONNULL_END
```

`ios/demo_app/Modules/RCTNativeDeviceBattery.mm`:

```objc
#import "RCTNativeDeviceBattery.h"
// Header Swift→ObjC tự sinh: <ProductModuleName>-Swift.h
// ProductModuleName của app này = demo_app
#import "demo_app-Swift.h"

@implementation RCTNativeDeviceBattery {
  DeviceBatteryImpl *_impl; // giữ instance class Swift
}

- (instancetype)init {
  if (self = [super init]) {
    _impl = [DeviceBatteryImpl new];

    __weak __typeof(self) weakSelf = self;
    _impl.onBatteryChange = ^(NSDictionary *body) {
      // emitOnBatteryChange: do CodeGen sinh từ "onBatteryChange" trong spec
      [weakSelf emitOnBatteryChange:body];
    };
  }
  return self;
}

// BẮT BUỘC — nối module vào TurboModule runtime qua JSI.
// Boilerplate giống nhau ở mọi Turbo Module, chỉ đổi tên ...SpecJSI.
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeDeviceBatterySpecJSI>(params);
}

// Method Promise — CodeGen sinh signature getBatteryLevel:reject: từ spec
- (void)getBatteryLevel:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  NSNumber *level = [_impl currentBatteryLevel];
  if (level.intValue < 0) {
    reject(@"E_BATTERY_UNAVAILABLE", @"Không đọc được mức pin", nil);
  } else {
    resolve(level);
  }
}

// getConstants — map tới getConstants() trong spec
- (NSDictionary *)getConstants {
  return @{ @"isLowPowerMode": @(_impl.isLowPowerMode) };
}

// Tên module — phải khớp getEnforcing('NativeDeviceBattery') ở JS
+ (NSString *)moduleName {
  return @"NativeDeviceBattery";
}

@end
```

> **Vì sao `.mm` chứ không `.m`?** `getTurboModule:` trả về `std::shared_ptr` — kiểu C++. File phải là Objective-C++ (`.mm`) để compiler hiểu cú pháp C++.
>
> **Vì sao không viết thẳng `.mm` cho tiện?** Được — nhưng tách logic sang Swift giúp: (1) code nghiệp vụ Swift sạch, không lẫn C++; (2) unit test `DeviceBatteryImpl` độc lập; (3) tận dụng API Swift hiện đại. `.mm` chỉ làm nhiệm vụ "phiên dịch".

## B.5 — Build

```sh
# CodeGen chạy tự động trong pod install — sinh header AppModulesSpec
cd ios && RCT_USE_PREBUILT_RNCORE=0 bundle exec pod install

# Rebuild — BẮT BUỘC sau mọi thay đổi native, không có hot reload
cd .. && npm run ios:sim
```

> `RCT_USE_PREBUILT_RNCORE=0` đã được set sẵn trong Podfile của project này (xem [10-splash-screen-bootsplash.md](10-splash-screen-bootsplash.md) phần troubleshooting).

Kiểm tra CodeGen đã sinh header:

```sh
ls ios/build/generated/ios/AppModulesSpec/
# Mong đợi: AppModulesSpec.h, AppModulesSpec-generated.mm ...
```

## B.6 — JS Wrapper

`src/06_native_modules/NativeDeviceBattery.ts`:

```typescript
import NativeDeviceBattery from '../../specs/NativeDeviceBattery';

export function getBatteryLevel(): Promise<number> {
  return NativeDeviceBattery.getBatteryLevel();
}

export const isLowPowerMode = (): boolean =>
  NativeDeviceBattery.getConstants().isLowPowerMode;

export function subscribeBattery(cb: (level: number) => void): () => void {
  // Event kiểu Turbo: subscribe trả về EmitterSubscription
  const sub = NativeDeviceBattery.onBatteryChange(e => cb(e.level));
  return () => sub.remove();
}
```

---

## 4. Bảng mapping kiểu dữ liệu

| JavaScript / TS | Swift | Objective-C(++) bridge |
|---|---|---|
| `boolean` | `Bool` | `BOOL` |
| `number` | `Int` / `Double` | `NSNumber *` / `double` |
| `string` | `String` | `NSString *` |
| `object` | `[String: Any]` | `NSDictionary *` |
| `Array<T>` | `[Any]` | `NSArray *` |
| `Promise<T>` | `RCTPromiseResolveBlock` + `RCTPromiseRejectBlock` | giống |
| `() => void` callback | `RCTResponseSenderBlock` | giống |
| `null` / `undefined` | optional `?` | `nil` |

> Turbo Module: kiểu được **CodeGen kiểm tra lúc build** — sai kiểu sẽ lỗi compile, không phải lỗi runtime như Legacy.

---

## 5. Threading & Concurrency

```swift
// Legacy: chỉ định queue cho mọi method của module
@objc func methodQueue() -> DispatchQueue {
  return DispatchQueue(label: "com.demo_app.battery", qos: .userInitiated)
}
```

Quy tắc:
- **Đụng UIKit** (đọc `UIScreen`, present view...) → phải về **main thread**.
- **I/O nặng** (file, network, DB) → đẩy sang **background queue**, đừng block JS.
- Promise `resolve`/`reject` có thể gọi từ **bất kỳ thread nào** — RN tự điều phối.
- Turbo Module: mặc định method chạy trên **JS thread**; tự `DispatchQueue.global()` nếu cần nền.

---

## 6. Error handling chuẩn production

```swift
// 1. Mã lỗi có cấu trúc — JS phân loại được, không dùng string mơ hồ
reject("E_PERMISSION_DENIED", "Người dùng từ chối quyền truy cập", nil)

// 2. Bọc lỗi hệ thống vào tham số thứ 3 để giữ stack trace gốc
do {
  try riskyOperation()
} catch {
  reject("E_OPERATION_FAILED", error.localizedDescription, error as NSError)
}
```

- Tiền tố `E_` cho mọi mã lỗi → JS `catch (e) { if (e.code === 'E_PERMISSION_DENIED') ... }`.
- **Không** để promise treo: mọi nhánh code phải gọi `resolve` *hoặc* `reject` đúng một lần.
- **Không** gọi callback/`resolve` quá một lần → crash "callback called twice".

---

## 7. Testing

- **Class Swift logic** (`DeviceBatteryImpl`) → unit test bằng XCTest, không cần RN runtime. Đây là lợi ích chính của việc tách logic khỏi shim.
- **Tầng JS wrapper** → mock module trong Jest:

```typescript
jest.mock('../../specs/NativeDeviceBattery', () => ({
  getBatteryLevel: jest.fn().mockResolvedValue(85),
  getConstants: () => ({ isLowPowerMode: false }),
  onBatteryChange: jest.fn(() => ({ remove: jest.fn() })),
}));
```

---

## 8. Checklist production

- [ ] TS spec là nguồn chân lý — đặt tên `Native*.ts`, không dùng `any`
- [ ] `codegenConfig` khai báo đúng `modulesProvider` (Turbo)
- [ ] Tên module khớp 3 nơi: TS spec ↔ `moduleName` native ↔ `modulesProvider`
- [ ] Mọi async API trả `Promise`, không dùng callback kiểu cũ
- [ ] Mã lỗi có cấu trúc, tiền tố `E_`
- [ ] Promise/callback gọi đúng **một lần** trên mọi nhánh
- [ ] Event: implement `startObserving`/`stopObserving` (Legacy) hoặc dọn observer trong `deinit`
- [ ] JS luôn `.remove()` listener khi unmount
- [ ] `requiresMainQueueSetup` override tường minh (Legacy)
- [ ] Logic Swift tách khỏi shim `.mm` → unit test được
- [ ] Có JS/TS wrapper, component KHÔNG gọi `NativeModules.X` trực tiếp
- [ ] Đã rebuild app (không phải chỉ reload JS)

---

## 9. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| `NativeModules.DeviceBattery` là `undefined` | Chưa rebuild, hoặc thiếu file bridge `.m` | Rebuild; kiểm tra `RCT_EXTERN_MODULE` |
| `Cannot find type 'RCTEventEmitter'` (Swift) | Thiếu `import React` trong Swift file, hoặc sai lầm dùng bridging header | Thêm `import React` vào Swift file. **KHÔNG** dùng `SWIFT_OBJC_BRIDGING_HEADER` — xem A.3 |
| `module 'RCTDeprecation' ... not defined in any loaded module map` | Đã set `SWIFT_OBJC_BRIDGING_HEADER` — bridging header conflict với module system | Xóa `SWIFT_OBJC_BRIDGING_HEADER` khỏi Build Settings, dùng `import React` trong Swift |
| `RCTNativeDeviceBattery.mm` không thấy `demo_app-Swift.h` | Class Swift thiếu `public`/`@objc`, hoặc chưa build target | Thêm `@objc public`; build app target một lần |
| `Unknown TurboModule NativeDeviceBattery` | `modulesProvider` sai, hoặc `moduleName` lệch | Đồng bộ tên ở 3 nơi |
| Header `AppModulesSpec/AppModulesSpec.h` not found | CodeGen chưa chạy | `bundle exec pod install` lại |
| `callback called twice` crash | `resolve`/`reject` gọi >1 lần | Audit mọi nhánh return |
| Event không tới JS | `hasListeners` false / quên `startObserving` | Kiểm tra add listener phía JS |

---

## 10. Đọc thêm

- React Native — Turbo Native Modules: https://reactnative.dev/docs/turbo-native-modules-introduction
- React Native — Legacy Native Modules (iOS): https://reactnative.dev/docs/legacy/native-modules-ios
- CodeGen: https://reactnative.dev/docs/the-new-architecture/what-is-codegen
- Skill nội bộ: `.claude/skills/rn-native-legacy`, `.claude/skills/rn-native-platform`
