# Reference: Pure C++ Turbo Native Module

Dùng khi muốn viết logic **một lần bằng C++** dùng chung cho cả Android và iOS.

---

## Bước 1 — TypeScript Spec

`specs/NativeSampleModule.ts`:

```typescript
import {TurboModule, TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  readonly reverseString: (input: string) => string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeSampleModule');
```

---

## Bước 2 — CodeGen config

`package.json`:

```json
"codegenConfig": {
  "name": "AppSpecs",
  "type": "modules",
  "jsSrcsDir": "specs",
  "android": {
    "javaPackageName": "com.sampleapp.specs"
  },
  "ios": {
    "modulesProvider": {
      "NativeSampleModule": "NativeSampleModuleProvider"
    }
  }
}
```

---

## Bước 3 — C++ shared code

Tạo thư mục `shared/` ở root project:

### Header — `shared/NativeSampleModule.h`

```cpp
#pragma once
#include <AppSpecsJSI.h>
#include <memory>
#include <string>

namespace facebook::react {

class NativeSampleModule : public NativeSampleModuleCxxSpec<NativeSampleModule> {
public:
    NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker);
    std::string reverseString(jsi::Runtime& rt, std::string input);
};

} // namespace facebook::react
```

### Implementation — `shared/NativeSampleModule.cpp`

```cpp
#include "NativeSampleModule.h"

namespace facebook::react {

NativeSampleModule::NativeSampleModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSampleModuleCxxSpec(std::move(jsInvoker)) {}

std::string NativeSampleModule::reverseString(jsi::Runtime& rt, std::string input) {
    return std::string(input.rbegin(), input.rend());
}

} // namespace facebook::react
```

---

## Bước 4 — Android registration

### CMakeLists.txt — `android/app/src/main/jni/CMakeLists.txt`

```cmake
cmake_minimum_required(VERSION 3.13)
project(appmodules)

include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Trỏ đến file .cpp trong thư mục shared/
target_sources(${CMAKE_PROJECT_NAME} PRIVATE
    ../../../../../shared/NativeSampleModule.cpp
)
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC
    ../../../../../shared
)
```

### build.gradle — thêm externalNativeBuild

```gradle
android {
    externalNativeBuild {
        cmake {
            path "src/main/jni/CMakeLists.txt"
        }
    }
}
```

### OnLoad.cpp — `android/app/src/main/jni/OnLoad.cpp`

```cpp
#include <NativeSampleModule.h>

std::shared_ptr<TurboModule> cxxModuleProvider(
    const std::string& name,
    const std::shared_ptr<CallInvoker>& jsInvoker) {

    if (name == NativeSampleModule::kModuleName) {
        return std::make_shared<NativeSampleModule>(jsInvoker);
    }

    return autolinking_cxxModuleProvider(name, jsInvoker);
}
```

---

## Bước 5 — iOS registration

### Header — `ios/NativeSampleModuleProvider.h`

```objc
#import <Foundation/Foundation.h>
#import <ReactCommon/RCTTurboModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface NativeSampleModuleProvider : NSObject <RCTModuleProvider>
@end

NS_ASSUME_NONNULL_END
```

### Implementation — `ios/NativeSampleModuleProvider.mm`

```objc
#import "NativeSampleModuleProvider.h"
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>
#import "NativeSampleModule.h"

@implementation NativeSampleModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
    return std::make_shared<facebook::react::NativeSampleModule>(params.jsInvoker);
}

@end
```

Sau đó thêm thư mục `shared/` vào Xcode project (drag & drop, chọn "Create folder references").

---

## Bước 6 — Pod install & Build

```bash
# iOS
cd ios && bundle exec pod install

# Android
npm run android

# iOS
npm run ios
```

---

## Quy tắc C++ Module

- Thư mục `shared/` đặt ở root project — không trong `android/` hay `ios/`.
- iOS dùng `.mm` cho provider file (Objective-C++).
- `kModuleName` là static const trong class C++ — dùng để match trong `OnLoad.cpp`.
- `CallInvoker` là bridge an toàn để gọi JS từ thread bất kỳ.
- `jsi::Runtime&` chỉ được dùng trên JS thread.
