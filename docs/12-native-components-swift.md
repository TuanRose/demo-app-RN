# Native Component với Swift — Legacy & Fabric

> **Phạm vi**: Cách viết Native UI Component (widget gốc CÓ giao diện) bằng Swift cho React Native, theo cả hai kiến trúc.
> **Phiên bản tham chiếu**: React Native 0.85.2, New Architecture bật mặc định.
> **Tài liệu liên quan**: [11-native-modules-swift.md](11-native-modules-swift.md) (Native Module không UI), [02-native-render-lifecycle.md](02-native-render-lifecycle.md) (render pipeline).

---

## 1. Native Component là gì? Khi nào cần?

**Native Component** = bọc một `UIView` gốc (UIKit) thành component dùng được trong JSX như `<View>`.

**Khi nào cần:**

| Tình huống | Ví dụ |
|---|---|
| Widget UIKit không có bản RN | `UIStepper`, `MKMapView`, `WKWebView`, `UIVisualEffectView` |
| Hiệu năng render cao | Camera preview, video player, canvas vẽ liên tục |
| SDK bên thứ ba chỉ có view native | Maps SDK, Ads banner, Chart SDK |
| Cần hành vi/animation gốc | `UIScrollView` đặc thù, blur tương tác |

**Khi nào KHÔNG cần:** Nếu vẽ được bằng `<View>` + `StyleSheet` + Reanimated → làm bằng JS, đừng đụng native.

> **So với Native Module**: Module chỉ expose *hàm*. Component expose một *view có vòng đời* — RN quản lý layout (Yoga), props, mount/unmount của nó.

---

## 2. Legacy vs Fabric — chọn cái nào?

| Tiêu chí | Legacy (Paper) | Fabric |
|---|---|---|
| Base class iOS | `RCTViewManager` | `RCTViewComponentView` |
| Props | `RCT_EXPORT_VIEW_PROPERTY` (set thẳng vào view) | `updateProps:oldProps:` (so sánh C++ struct) |
| Event | `RCTBubblingEventBlock` (block ObjC) | `eventEmitter` (C++, type-safe) |
| Type safety | Không | Có — CodeGen sinh từ TS spec |
| Layout | UIManager (async, có thể lệch frame) | Fabric (đồng bộ shadow tree) |
| File iOS | `.swift` + `.m` bridge | `.swift` (view) + `.mm` shim |
| Trạng thái | Deprecated, chạy qua interop | Chuẩn hiện tại (RN 0.76+) |

**Khuyến nghị (RN 0.85, New Arch):**
- **Viết mới → Fabric.** Type-safe, layout đồng bộ (không còn cảnh "view nhảy frame").
- **Legacy** vẫn chạy nhờ interop layer — dùng cho prototype nhanh hoặc đọc hiểu thư viện cũ.

> **Swift + Fabric**: Giống Turbo Module — lớp conform `RCTViewComponentView` **bắt buộc** Objective-C++ (`.mm`) vì props/event là kiểu C++. Pattern: **`.mm` là shim, `UIView` thật viết bằng Swift**.

---

## 3. Quy tắc chung cho mọi Native Component

- **KHÔNG** set `frame` hay `backgroundColor` cố định trong code tạo view — RN/Yoga sẽ ghi đè theo layout JS.
- View mặc định kích thước **0×0** → JS phải cho `style={{ width, height }}` hoặc `flex: 1`, nếu không sẽ "không thấy gì".
- Prop event handler **bắt buộc** tiền tố `on` (`onValueChange`, `onPress`...) ở cả TS spec lẫn native.
- Đổi native code → **rebuild**, không có hot reload.

---

# PHẦN A — Legacy Native Component bằng Swift

Ví dụ xuyên suốt: component **`RNStepper`** bọc `UIStepper` — props `value`, `minimumValue`, `maximumValue`, `stepValue`; event `onValueChange`.

## A.1 — Native View (Swift)

View phải là một subclass riêng để giữ event block.

`ios/demo_app/Components/RNStepperView.swift`:

```swift
import UIKit
import React

class RNStepperView: UIView {

  private let stepper = UIStepper()

  // Event block: tiền tố "on" bắt buộc. RCTBubblingEventBlock = closure RN bơm vào.
  @objc var onValueChange: RCTBubblingEventBlock?

  // --- Props: RN set thẳng vào các @objc property này ---
  // didSet áp giá trị xuống UIStepper. NSNumber vì RN truyền number dạng NSNumber.
  @objc var value: NSNumber = 0 {
    didSet { stepper.value = value.doubleValue }
  }
  @objc var minimumValue: NSNumber = 0 {
    didSet { stepper.minimumValue = minimumValue.doubleValue }
  }
  @objc var maximumValue: NSNumber = 100 {
    didSet { stepper.maximumValue = maximumValue.doubleValue }
  }
  @objc var stepValue: NSNumber = 1 {
    didSet { stepper.stepValue = stepValue.doubleValue }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    addSubview(stepper)
    stepper.addTarget(self, action: #selector(stepperChanged), for: .valueChanged)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

  // Căn UIStepper theo bounds RN cấp — KHÔNG hardcode frame
  override func layoutSubviews() {
    super.layoutSubviews()
    stepper.center = CGPoint(x: bounds.midX, y: bounds.midY)
  }

  @objc private func stepperChanged() {
    // Gọi event block → RN gửi xuống JS dưới dạng e.nativeEvent
    onValueChange?(["value": stepper.value])
  }
}
```

## A.2 — ViewManager (Swift)

`RCTViewManager` chịu trách nhiệm *tạo* view cho RN.

`ios/demo_app/Components/RNStepperManager.swift`:

```swift
import React

@objc(RNStepperManager)
class RNStepperManager: RCTViewManager {

  // RN gọi để tạo một instance view mới
  override func view() -> UIView! {
    return RNStepperView()
  }

  // Component đụng UIKit → bắt buộc khởi tạo trên main thread
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
```

## A.3 — File bridge Objective-C (BẮT BUỘC)

Khai báo manager + danh sách props/event cho RN runtime.

`ios/demo_app/Components/RNStepperManager.m`:

```objc
#import <React/RCTViewManager.h>
#import <React/RCTBridgeModule.h>

// Tên "RNStepper" = tên dùng ở requireNativeComponent('RNStepper')
@interface RCT_EXTERN_MODULE(RNStepperManager, RCTViewManager)

// Mỗi prop @objc trong RNStepperView phải khai báo đúng tên + kiểu ở đây
RCT_EXPORT_VIEW_PROPERTY(value, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(minimumValue, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(maximumValue, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(stepValue, NSNumber)

// Event handler khai báo kiểu RCTBubblingEventBlock
RCT_EXPORT_VIEW_PROPERTY(onValueChange, RCTBubblingEventBlock)

@end
```

> **Tên class vs tên JS**: `RCT_EXTERN_MODULE(RNStepperManager, ...)` → RN bỏ hậu tố `Manager` → tên component JS là `RNStepper`.

## A.4 — JS Wrapper

`src/06_native_modules/RNStepper.legacy.tsx`:

```tsx
import { requireNativeComponent, ViewStyle } from 'react-native';

type ValueChangeEvent = { nativeEvent: { value: number } };

type StepperNativeProps = {
  style?: ViewStyle;
  value?: number;
  minimumValue?: number;
  maximumValue?: number;
  stepValue?: number;
  onValueChange?: (e: ValueChangeEvent) => void;
};

const RNStepperNative = requireNativeComponent<StepperNativeProps>('RNStepper');

type StepperProps = Omit<StepperNativeProps, 'onValueChange'> & {
  onValueChange?: (value: number) => void; // API sạch hơn cho người dùng
};

export default function Stepper({ onValueChange, style, ...rest }: StepperProps) {
  return (
    <RNStepperNative
      {...rest}
      // UIStepper kích thước cố định ~94×29pt — cho style mặc định để không bị 0×0
      style={[{ width: 94, height: 29 }, style]}
      onValueChange={e => onValueChange?.(e.nativeEvent.value)}
    />
  );
}
```

---

# PHẦN B — Fabric Native Component bằng Swift

Cùng component `RNStepper`, viết lại theo New Architecture. **TS spec là nguồn chân lý**; CodeGen sinh props/event kiểu C++.

## B.1 — TypeScript Spec

`specs/RNStepperNativeComponent.ts`:

```typescript
import type { CodegenTypes, HostComponent, ViewProps } from 'react-native';
import { codegenNativeComponent } from 'react-native';

type ValueChangeEvent = { value: CodegenTypes.Double };

export interface NativeProps extends ViewProps {
  value?: CodegenTypes.Double;
  minimumValue?: CodegenTypes.Double;
  maximumValue?: CodegenTypes.Double;
  stepValue?: CodegenTypes.Double;
  // BubblingEventHandler: event nổi bọt theo cây view; prop phải có tiền tố "on"
  onValueChange?: CodegenTypes.BubblingEventHandler<ValueChangeEvent> | null;
}

// 'RNStepper' = tên component, phải khớp componentProvider + native
export default codegenNativeComponent<NativeProps>(
  'RNStepper',
) as HostComponent<NativeProps>;
```

**Quy tắc spec component:**
- Số dùng `CodegenTypes.Double` / `CodegenTypes.Int32` — KHÔNG dùng `number` trần.
- Event: `BubblingEventHandler<T>` (nổi bọt) hoặc `DirectEventHandler<T>` (chỉ tới đúng view).
- Prop event bắt buộc tiền tố `on`.

## B.2 — CodeGen config

Thêm/gộp vào `codegenConfig` trong `package.json`. Component dùng `type: "components"`:

```json
"codegenConfig": {
  "name": "AppComponentsSpec",
  "type": "components",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.demo_app.specs"
  },
  "ios": {
    "componentProvider": {
      "RNStepper": "RNStepperComponentView"
    }
  }
}
```

> **Lưu ý**: một `package.json` chỉ khai báo **một** `codegenConfig`. Nếu app vừa có Turbo Module (`type: modules`) vừa có Fabric Component (`type: components`), giải pháp chuẩn là **tách phần native thành local library riêng** (mỗi library một `codegenConfig`). Xem [11-native-modules-swift.md](11-native-modules-swift.md) Phần 3, Cách B.

| Field | Ý nghĩa |
|---|---|
| `type` | `components` cho Fabric Component |
| `componentProvider` | `key` = tên trong `codegenNativeComponent`; `value` = class ObjC++ implement |

## B.3 — Native View (Swift)

`UIView` thật — viết Swift, không dính C++.

`ios/demo_app/Components/RNStepperUIView.swift`:

```swift
import UIKit

@objc(RNStepperUIView)
public class RNStepperUIView: UIView {

  private let stepper = UIStepper()

  // Closure để shim .mm nhận sự kiện rồi đẩy qua C++ eventEmitter
  @objc public var onValueChange: ((Double) -> Void)?

  @objc public override init(frame: CGRect) {
    super.init(frame: frame)
    addSubview(stepper)
    stepper.addTarget(self, action: #selector(changed), for: .valueChanged)
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

  // Các setter @objc để shim .mm gọi khi props đổi
  @objc public func setValue(_ v: Double) { stepper.value = v }
  @objc public func setMinimumValue(_ v: Double) { stepper.minimumValue = v }
  @objc public func setMaximumValue(_ v: Double) { stepper.maximumValue = v }
  @objc public func setStepValue(_ v: Double) { stepper.stepValue = v }

  public override func layoutSubviews() {
    super.layoutSubviews()
    stepper.center = CGPoint(x: bounds.midX, y: bounds.midY)
  }

  @objc private func changed() {
    onValueChange?(stepper.value)
  }
}
```

## B.4 — Shim Objective-C++ (BẮT BUỘC)

Lớp conform `RCTViewComponentView`, dịch props/event C++ ↔ view Swift.

`ios/demo_app/Components/RNStepperComponentView.h`:

```objc
#import <React/RCTViewComponentView.h>
#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@interface RNStepperComponentView : RCTViewComponentView
@end

NS_ASSUME_NONNULL_END
```

`ios/demo_app/Components/RNStepperComponentView.mm`:

```objc
#import "RNStepperComponentView.h"

// Header do CodeGen sinh — tên = "name" trong codegenConfig (AppComponentsSpec)
#import <react/renderer/components/AppComponentsSpec/ComponentDescriptors.h>
#import <react/renderer/components/AppComponentsSpec/EventEmitters.h>
#import <react/renderer/components/AppComponentsSpec/Props.h>
#import <react/renderer/components/AppComponentsSpec/RCTComponentViewHelpers.h>

#import "demo_app-Swift.h" // để thấy RNStepperUIView

using namespace facebook::react;

@interface RNStepperComponentView () <RCTRNStepperViewProtocol>
@end

@implementation RNStepperComponentView {
  RNStepperUIView *_view; // view Swift thật
}

// BẮT BUỘC — nối component vào Fabric renderer
+ (ComponentDescriptorProvider)componentDescriptorProvider {
  return concreteComponentDescriptorProvider<RNStepperComponentDescriptor>();
}

- (instancetype)initWithFrame:(CGRect)frame {
  if (self = [super initWithFrame:frame]) {
    // Props mặc định khởi tạo từ C++ struct
    static const auto defaultProps = std::make_shared<const RNStepperProps>();
    _props = defaultProps;

    _view = [[RNStepperUIView alloc] initWithFrame:frame];

    __weak __typeof(self) weakSelf = self;
    _view.onValueChange = ^(double value) {
      [weakSelf emitValueChange:value];
    };

    self.contentView = _view; // RCTViewComponentView hiển thị contentView
  }
  return self;
}

// updateProps: Fabric gọi mỗi khi props đổi. So sánh old vs new để chỉ áp phần thay đổi.
- (void)updateProps:(Props::Shared const &)props
           oldProps:(Props::Shared const &)oldProps {
  const auto &oldP = *std::static_pointer_cast<RNStepperProps const>(_props);
  const auto &newP = *std::static_pointer_cast<RNStepperProps const>(props);

  if (oldP.minimumValue != newP.minimumValue) {
    [_view setMinimumValue:newP.minimumValue];
  }
  if (oldP.maximumValue != newP.maximumValue) {
    [_view setMaximumValue:newP.maximumValue];
  }
  if (oldP.stepValue != newP.stepValue) {
    [_view setStepValue:newP.stepValue];
  }
  if (oldP.value != newP.value) {
    [_view setValue:newP.value];
  }

  [super updateProps:props oldProps:oldProps];
}

// Phát event qua C++ eventEmitter — type-safe, CodeGen sinh struct OnValueChange
- (void)emitValueChange:(double)value {
  if (!_eventEmitter) return;
  auto emitter = std::static_pointer_cast<RNStepperEventEmitter const>(_eventEmitter);
  emitter->onValueChange(RNStepperEventEmitter::OnValueChange{.value = value});
}

@end

// BẮT BUỘC — đăng ký class với Fabric (cho phép tra cứu theo tên "RNStepper")
Class<RCTComponentViewProtocol> RNStepperCls(void) {
  return RNStepperComponentView.class;
}
```

> **`.mm` chứ không `.m`**: props (`RNStepperProps`), event emitter (`RNStepperEventEmitter`) đều là kiểu C++ do CodeGen sinh → cần Objective-C++.

## B.5 — Build

```sh
cd ios && RCT_USE_PREBUILT_RNCORE=0 bundle exec pod install
cd .. && npm run ios:sim
```

Kiểm tra CodeGen sinh artifacts:

```sh
ls ios/build/generated/ios/react/renderer/components/AppComponentsSpec/
# Mong đợi: ComponentDescriptors.h, Props.h, EventEmitters.h ...
```

## B.6 — JS Wrapper

```tsx
import RNStepper from '../../specs/RNStepperNativeComponent';
import type { ViewStyle } from 'react-native';

type StepperProps = {
  style?: ViewStyle;
  value?: number;
  minimumValue?: number;
  maximumValue?: number;
  stepValue?: number;
  onValueChange?: (value: number) => void;
};

export default function Stepper({ onValueChange, style, ...rest }: StepperProps) {
  return (
    <RNStepper
      {...rest}
      style={[{ width: 94, height: 29 }, style]}
      onValueChange={e => onValueChange?.(e.nativeEvent.value)}
    />
  );
}
```

---

## 4. Props phức tạp & Commands

### Prop kiểu custom (Legacy)

Kiểu RN không tự convert được (vd `MKCoordinateRegion`) → tự convert trong manager:

```objc
// Trong file bridge .m
RCT_CUSTOM_VIEW_PROPERTY(region, NSDictionary, RNMapView) {
  // json = dữ liệu từ JS; áp thủ công vào view
}
```

Fabric: prop phức tạp khai báo struct trong TS spec → CodeGen tự sinh struct C++, đọc trong `updateProps`.

### Imperative Commands (gọi method lên một view cụ thể)

Khi cần ra lệnh trực tiếp (vd `.focus()`, `.scrollToTop()`) thay vì qua props:
- **Fabric**: thêm `Commands` trong TS spec (`codegenNativeCommands`), CodeGen sinh handler, implement `handleCommand:args:` trong `.mm`.
- **Legacy**: `RCT_EXPORT_METHOD` trong manager + `UIManager.dispatchViewManagerCommand` ở JS.

> Ưu tiên **props** hơn commands — props khai báo, dễ test, đúng tinh thần React. Chỉ dùng command cho hành động mệnh lệnh thật sự (focus, play, capture).

---

## 5. Checklist production

- [ ] TS spec đặt trong `jsSrcsDir`, dùng `CodegenTypes.Double`/`Int32`, không `number` trần
- [ ] Tên component khớp 3 nơi: `codegenNativeComponent('RNStepper')` ↔ `componentProvider` ↔ native
- [ ] Prop event handler có tiền tố `on` ở cả spec lẫn native
- [ ] KHÔNG hardcode `frame`/`backgroundColor` trong code tạo view
- [ ] JS wrapper cho `style` mặc định (width/height hoặc `flex`) — tránh view 0×0
- [ ] `requiresMainQueueSetup` trả `true` (component luôn đụng UIKit)
- [ ] Fabric: có `componentDescriptorProvider` + hàm đăng ký `...Cls()`
- [ ] Fabric: `updateProps` so sánh old/new, chỉ áp phần đổi (tránh set thừa)
- [ ] `UIView` Swift tách khỏi shim `.mm` → tái sử dụng/test được
- [ ] JS wrapper bọc `nativeEvent` thành API sạch cho người dùng
- [ ] Đã rebuild app sau khi đổi native code

---

## 6. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Cách sửa |
|---|---|---|
| Component không hiển thị | View 0×0 — thiếu kích thước | Cho `style` width/height hoặc `flex: 1` |
| `Unimplemented component 'RNStepper'` | CodeGen chưa sinh / chưa rebuild | `pod install` + rebuild |
| Props không áp dụng | Tên prop lệch giữa spec ↔ native | Đồng bộ tên prop |
| Event không tới JS | Prop thiếu tiền tố `on`, hoặc `eventEmitter` null | Đặt tên `onXxx`; kiểm tra null trước khi emit |
| `.mm` không thấy `demo_app-Swift.h` | View Swift thiếu `@objc public`, hoặc chưa build | Thêm `@objc public`; build target một lần |
| Header `AppComponentsSpec/...` not found | CodeGen chưa chạy / sai `name` | Chạy lại `pod install`, kiểm tra `codegenConfig.name` |
| View "nhảy" frame (Legacy) | UIManager async cập nhật layout trễ | Migrate sang Fabric (layout đồng bộ) |

---

## 7. So sánh tổng kết: 4 loại native code

| | Module Legacy | Module Turbo | Component Legacy | Component Fabric |
|---|---|---|---|---|
| Có UI? | Không | Không | Có | Có |
| Base iOS | `NSObject`/`RCTEventEmitter` | spec `Native*Spec` | `RCTViewManager` | `RCTViewComponentView` |
| File chính | `.swift` + `.m` | `.swift` + `.mm` shim | `.swift` + `.m` | `.swift` + `.mm` shim |
| Nguồn chân lý | file bridge `.m` | TS spec + CodeGen | file bridge `.m` | TS spec + CodeGen |
| Giao tiếp | Bridge JSON | JSI | Bridge | Fabric (JSI) |

---

## 8. Đọc thêm

- React Native — Fabric Native Components: https://reactnative.dev/docs/fabric-native-components-introduction
- React Native — Legacy Native Components (iOS): https://reactnative.dev/docs/legacy/native-components-ios
- React Native — render lifecycle: [02-native-render-lifecycle.md](02-native-render-lifecycle.md)
- Skill nội bộ: `.claude/skills/rn-native-legacy`, `.claude/skills/rn-native-platform`
