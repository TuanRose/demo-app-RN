# Skill: rn-native-legacy

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

Skill này bao phủ toàn bộ **Legacy Architecture** của React Native:

| Loại | Mục đích |
|------|---------|
| **Native Module** | Logic, API hệ thống (không có UI) — JS gọi Java/Kotlin/ObjC/Swift |
| **Native UI Component** | Widget gốc nhúng vào RN dưới dạng component có giao diện |
| **Direct Manipulation** | Thao tác trực tiếp trên view native (không qua state/props) |

> **Lưu ý chung:** Đây là Legacy Architecture — tương lai thay bởi Turbo Native Modules & Fabric. Mọi thay đổi native code yêu cầu **rebuild**, không dùng Hot Reload.

---

## Routing — đọc reference file nào

Dựa vào yêu cầu người dùng, đọc file tương ứng trong `references/`:

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Native Module trên **Android** (ReactContextBaseJavaModule, @ReactMethod, ReactPackage) | `references/module-android.md` |
| Native Module trên **iOS** (RCTBridgeModule, RCT_EXPORT_MODULE, RCT_EXPORT_METHOD) | `references/module-ios.md` |
| Native UI Component trên **Android** (ViewManager, @ReactProp, events, Fragment) | `references/component-android.md` |
| Native UI Component trên **iOS** (RCTViewManager, RCT_EXPORT_VIEW_PROPERTY, events) | `references/component-ios.md` |
| **Direct Manipulation** (setNativeProps, measure, forwardRef, focus/blur) | `references/component-direct.md` |
| Cả **Android + iOS** cho cùng loại | Đọc cả hai file rồi tổng hợp |

---

## Thiết lập Local Library (dùng chung cho cả hai loại)

Cách khuyến nghị để tổ chức code native — đặt ngoài `android/` và `ios/`, dễ upgrade và tái sử dụng:

```bash
# Tạo local library trong thư mục gốc app
npx create-react-native-library@latest <tên-module>
```

Thêm vào `package.json` của app:
```json
// npm
"<tên-module>": "file:./modules/<tên-module>"

// Yarn
"<tên-module>": "link:./modules/<tên-module>"
```

Chạy `npm install` hoặc `yarn install`. Cấu trúc:
```
MyApp/
├── modules/
│   └── <tên-module>/   ← toàn bộ code native ở đây
├── android/
├── ios/
└── package.json
```

---

## JS/TS Wrapper (bắt buộc — áp dụng cả hai loại)

**Native Module wrapper:**
```typescript
// src/NativeCalendarModule.ts
import {NativeModules, NativeEventEmitter} from 'react-native';
const {CalendarModule} = NativeModules;

interface CalendarModuleInterface {
    createCalendarEventAsync(name: string, location: string): Promise<number>;
    getConstants(): {DEFAULT_EVENT_NAME: string};
    addListener(eventName: string): void;
    removeListeners(count: number): void;
}

export const CalendarModuleEmitter = new NativeEventEmitter(CalendarModule);
export default CalendarModule as CalendarModuleInterface;
```

**Native UI Component wrapper:**
```typescript
// src/components/MyNativeView.tsx
import {requireNativeComponent, ViewStyle} from 'react-native';

type MyNativeViewProps = {
    style?: ViewStyle;
    someprop?: string;
    onSomeEvent?: (event: {nativeEvent: {data: string}}) => void;
};

const RCTMyNativeView = requireNativeComponent<MyNativeViewProps>('RCTMyNativeView');

export default function MyNativeView(props: MyNativeViewProps) {
    return <RCTMyNativeView {...props} />;
}
```

---

## Bảng mapping kiểu dữ liệu

| JavaScript | Android (Kotlin) | iOS (Objective-C) |
|------------|-----------------|-------------------|
| `boolean` | `Boolean` | `BOOL` |
| `number` | `Double` / `Float` / `Int` | `double` / `NSNumber *` |
| `string` | `String` | `NSString *` |
| `Function` (callback) | `Callback` | `RCTResponseSenderBlock` |
| `Promise` | `Promise` | `RCTPromiseResolveBlock` + `RCTPromiseRejectBlock` |
| `Object` | `ReadableMap` | `NSDictionary *` |
| `Array` | `ReadableArray` | `NSArray *` |

---

## Quy tắc chung

- Rebuild bắt buộc sau mọi thay đổi native code.
- iOS: chạy `bundle exec pod install` sau khi thêm file native mới.
- Luôn tạo JS/TS wrapper — không dùng `NativeModules.XYZ` hay `requireNativeComponent` trực tiếp trong component.
- Không gọi callback nhiều hơn một lần.
- Implement `addListener`/`removeListeners` khi phát sự kiện để tránh memory leak.
