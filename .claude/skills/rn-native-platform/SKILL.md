# Skill: rn-native-platform

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

Skill này bao phủ **New Architecture** của React Native (RN 0.76+):

| Loại | Mục đích |
|------|---------|
| **Turbo Native Module** | Logic/API không có UI — thay thế Legacy Native Module |
| **Fabric Native Component** | Widget gốc có UI — thay thế Legacy Native Component |
| **Pure C++ Module** | Logic dùng chung Android + iOS, viết một lần bằng C++ |

> **Ưu điểm so với Legacy:** JSI (không qua bridge), CodeGen tự sinh type-safe interface, lazy loading, hiệu năng cao hơn.

---

## Routing — đọc reference file nào

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Turbo Module trên **Android** (Kotlin, BaseReactPackage) | `references/turbo-module-android.md` |
| Turbo Module trên **iOS** (Objective-C++, .mm) | `references/turbo-module-ios.md` |
| **Pure C++ Module** (shared code, CMakeLists, OnLoad.cpp) | `references/turbo-module-cxx.md` |
| **Fabric Native Component** (Android Java + iOS Objective-C++) | `references/fabric-component.md` |
| Cả Android + iOS cho cùng loại | Đọc cả hai file rồi tổng hợp |

---

## Bước 1 — TypeScript Spec (dùng chung cho mọi loại)

### Turbo Native Module spec

`specs/NativeLocalStorage.ts`:
```typescript
import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  setItem(value: string, key: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
  clear(): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeLocalStorage');
```

### Fabric Native Component spec

`specs/WebViewNativeComponent.ts`:
```typescript
import type {CodegenTypes, HostComponent, ViewProps} from 'react-native';
import {codegenNativeComponent} from 'react-native';

type WebViewScriptLoadedEvent = {
  result: 'success' | 'error';
};

export interface NativeProps extends ViewProps {
  sourceURL?: string;
  onScriptLoaded?: CodegenTypes.BubblingEventHandler<WebViewScriptLoadedEvent> | null;
}

export default codegenNativeComponent<NativeProps>('CustomWebView') as HostComponent<NativeProps>;
```

**Quy tắc spec:**
- File phải đặt tên bắt đầu bằng `Native` (e.g. `NativeStorage.ts`, `NativeUserDefaults.ts`).
- Module: dùng `TurboModule` + `TurboModuleRegistry.getEnforcing`.
- Component: dùng `codegenNativeComponent` + `HostComponent`.
- Event handler dùng `BubblingEventHandler<T>` và prop phải có tiền tố `on`.

---

## Bước 2 — CodeGen config trong `package.json`

### Cho Turbo Module
```json
"codegenConfig": {
  "name": "NativeLocalStorageSpec",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.nativelocalstorage"
  },
  "ios": {
    "modulesProvider": {
      "NativeLocalStorage": "RCTNativeLocalStorage"
    }
  }
}
```

### Cho Fabric Component
```json
"codegenConfig": {
  "name": "AppSpec",
  "type": "components",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.webview"
  },
  "ios": {
    "componentProvider": {
      "CustomWebView": "RCTWebView"
    }
  }
}
```

**Chạy CodeGen thủ công:**
```bash
# Android
cd android && ./gradlew generateCodegenArtifactsFromSchema

# iOS (tự động khi pod install)
cd ios && bundle exec pod install
```

---

## Bước 3 — Sử dụng trong JS

### Turbo Module
```typescript
import NativeLocalStorage from './specs/NativeLocalStorage';

// getEnforcing → throw nếu không tìm thấy
// get → trả null nếu không tìm thấy (dùng optional chaining)
NativeLocalStorage?.setItem('value', 'key');
const val = NativeLocalStorage?.getItem('key');
```

### Fabric Component
```tsx
import WebView from './specs/WebViewNativeComponent';

<WebView
  sourceURL="https://react.dev/"
  style={{flex: 1}}
  onScriptLoaded={() => console.log('loaded')}
/>
```

---

## Quy tắc chung

- Rebuild bắt buộc sau mọi thay đổi native code.
- iOS: chạy `bundle exec pod install` sau khi thêm file native.
- Android: CodeGen tự chạy khi build; chạy thủ công để kiểm tra schema sớm.
- Tên component trong `codegenNativeComponent('...')` phải khớp với `getName()` / `REACT_CLASS` trong native.
- Turbo Module key trong `modulesProvider` phải khớp với tên trả về từ `moduleName`.
