# Splash Screen với react-native-bootsplash

> **Phiên bản đã test**: react-native-bootsplash 7.3.1 + React Native 0.85.2 (New Architecture)

---

## 1. Tại sao dùng react-native-bootsplash?

RN có built-in `LaunchScreen.storyboard` (iOS) và `android:windowBackground` (Android), nhưng chúng **không được kiểm soát từ JS**. Khi JS bundle load xong, native splash biến mất đột ngột → màn hình trắng flash.

`react-native-bootsplash` giải quyết bằng cách:
- Inject một "loading view" lên trên rootView ngay trong `application:didFinishLaunching`
- View đó chỉ tắt khi JS gọi `BootSplash.hide()` — bạn kiểm soát timing từ JS
- Có animation `fade` để transition mượt

---

## 2. Các bước thực hiện

### Bước 1 — Install

```bash
npm install react-native-bootsplash
```

### Bước 2 — Fix build trên RN 0.85 (prebuilt mode)

RN 0.85 mặc định dùng prebuilt `React-Core-prebuilt`, vốn không export đủ C++ Fabric symbols (`Sealable`, `ShadowNode` debug methods). Cần build từ source:

**Podfile** — thêm trước `target 'demo_app' do`:

```ruby
# Prebuilt mode thiếu C++ renderer symbols mà react-native-screens cần
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'

target 'demo_app' do
  ...
end
```

### Bước 3 — Generate assets

Dùng CLI để auto-generate tất cả assets (iOS storyboard, Android drawables) và tự cập nhật `project.pbxproj`, `AndroidManifest.xml`, `Info.plist`:

```bash
node node_modules/react-native-bootsplash/cli.js generate \
  "<đường-dẫn-logo>.png" \
  --platforms ios,android \
  --background "#FFFFFF" \
  --logo-width 100 \
  --assets-output assets/bootsplash
```

> **Logo**: Nên dùng PNG tối thiểu 512x512 (hoặc SVG). Có thể tạm dùng AppIcon làm logo demo:
> `ios/demo_app/Images.xcassets/AppIcon.appiconset/ItunesArtwork@2x.png`

**CLI tự động tạo:**

| Platform | Files được tạo/cập nhật |
|---|---|
| iOS | `BootSplash.storyboard`, image sets trong `xcassets`, `project.pbxproj`, `Info.plist` |
| Android | `drawable-*/bootsplash_logo.png` (5 densities), `colors.xml`, `styles.xml`, `AndroidManifest.xml` |
| Assets | `assets/bootsplash/manifest.json`, logo PNG nhiều sizes |

### Bước 4 — iOS: AppDelegate.swift

```swift
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RNBootSplash  // thêm import này

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "demo_app",
      in: window,
      launchOptions: launchOptions
    )

    // Phải gọi SAU startReactNative — lúc này window.rootViewController.view mới tồn tại
    RNBootSplash.initWithStoryboard("BootSplash", rootView: window?.rootViewController?.view)

    return true
  }
}
```

> **Tại sao import được?** RNBootSplash podspec có `DEFINES_MODULE = YES` → Swift import trực tiếp mà không cần bridging header.

### Bước 5 — Android: MainActivity.kt

```kotlin
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
import com.zoontek.rnbootsplash.RNBootSplash  // thêm import này

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Phải gọi TRƯỚC super.onCreate để attach vào native splash window
    RNBootSplash.init(this, R.style.BootTheme)
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }

  override fun getMainComponentName(): String = "demo_app"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
```

> **Thứ tự quan trọng**: `RNBootSplash.init` → `fragmentFactory` → `super.onCreate`. Đảo thứ tự sẽ crash hoặc splash không hiển thị.

### Bước 6 — JS: App.tsx

```tsx
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';

export default function App() {
  useEffect(() => {
    // useEffect đảm bảo component đã mount trước khi hide
    BootSplash.hide({ fade: true });
  }, []);

  return (
    <SafeAreaProvider>
      {/* ... */}
    </SafeAreaProvider>
  );
}
```

**Dùng khi nào thì hide:**
- `useEffect` trong root App: hide ngay sau khi render đầu tiên — đủ cho hầu hết app
- Sau khi fetch data khởi tạo (token, config): `await fetchConfig(); BootSplash.hide()`
- Sau khi fonts/assets load xong: tránh FOUC (flash of unstyled content)

### Bước 7 — Pod install

```bash
# Luôn dùng RCT_USE_PREBUILT_RNCORE=0 nếu chưa set trong Podfile
cd ios && bundle exec pod install
```

---

## 3. Troubleshooting

### `ld: symbol(s) not found for architecture arm64` (libRNScreens.a)

**Root cause**: RN 0.85 prebuilt mode không export `facebook::react::Sealable` và các C++ debug virtual methods mà `react-native-screens` cần khi link.

**Fix**: Set `ENV['RCT_USE_PREBUILT_RNCORE'] = '0'` trong Podfile (xem Bước 2).

### `The sandbox is not in sync with the Podfile.lock`

```bash
cd ios && bundle exec pod install
```

Xảy ra khi thêm package mới mà chưa chạy pod install.

### Splash không hiển thị trên iOS

Kiểm tra:
1. `BootSplash.storyboard` đã được add vào Xcode project (kiểm tra `project.pbxproj` có `BootSplash.storyboard in Resources`)
2. `Info.plist` có `UILaunchStoryboardName = BootSplash`
3. `RNBootSplash.initWithStoryboard` được gọi SAU `factory.startReactNative`

### Splash không tắt (JS không gọi hide)

Kiểm tra `BootSplash.hide()` có được gọi trong mọi code path (kể cả error state).

---

## 4. API reference

```ts
// Hide với animation
BootSplash.hide({ fade: true });

// Hide ngay lập tức
BootSplash.hide();

// Check trạng thái (hiếm dùng)
const { visible } = await BootSplash.getVisibilityStatus();
// "visible" | "hidden" | "transitioning"

// Constants (dark mode detection)
const { darkModeEnabled } = BootSplash;
```

---

## 5. Dark mode & brand logo (tính năng trả phí)

CLI hỗ trợ dark mode assets và brand logo nhưng cần license key từ [zoontek.gumroad.com](https://zoontek.gumroad.com/l/bootsplash-generator):

```bash
node node_modules/react-native-bootsplash/cli.js generate logo.png \
  --license-key <key> \
  --background "#FFFFFF" \
  --dark-background "#000000" \
  --dark-logo dark-logo.png \
  --brand brand.png
```
