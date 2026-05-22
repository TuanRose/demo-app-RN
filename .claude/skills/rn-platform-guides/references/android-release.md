# Reference: Android Release — APK/AAB Signing + Gradle Plugin

---

## Phần 1 — Ký APK/AAB cho Play Store

### Bước 1 — Tạo keystore

**macOS:**
```bash
sudo keytool -genkey -v -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Windows** (chạy từ `C:\Program Files\Java\jdkx.x.x_x\bin` với quyền admin):
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-upload-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

### Bước 2 — Đặt keystore vào `android/app/`

### Bước 3 — Cấu hình `gradle.properties`

Lưu ở `~/.gradle/gradle.properties` (tránh commit vào git):
```properties
MYAPP_UPLOAD_STORE_FILE=my-upload-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=*****
MYAPP_UPLOAD_KEY_PASSWORD=*****
```

### Bước 4 — Cấu hình `android/app/build.gradle`

```groovy
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### Bước 5 — Build release AAB

```bash
npx react-native build-android --mode=release
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

**Test release build trên thiết bị:**
```bash
npm run android -- --mode="release"
```

### Lưu ý bảo mật

- **Không commit** file `.keystore` và mật khẩu vào git.
- Lưu credentials ở `~/.gradle/gradle.properties` thay vì `android/gradle.properties`.
- macOS: có thể dùng Keychain Access để lưu password.
- Không dùng `org.gradle.configureondemand=true` — ngăn JS/asset bundling.
- Nếu mất upload key, dùng [Google's key reset instructions](https://support.google.com/googleplay/android-developer/answer/7384423#reset).

### ProGuard (tùy chọn)

```groovy
// android/app/build.gradle
def enableProguardInReleaseBuilds = true
```

---

## Phần 2 — React Native Gradle Plugin (RNGP)

Plugin tự động cấu hình Android build cho React Native. Được cài sẵn cùng `react-native`.

### Cấu hình trong `android/app/build.gradle`

```groovy
apply plugin: "com.facebook.react"

react {
  // tùy chỉnh ở đây
}
```

### Các option cấu hình

| Option | Default | Mô tả |
|--------|---------|-------|
| `root` | `..` | Folder root của project (chứa `package.json`) |
| `reactNativeDir` | `../node_modules/react-native` | Folder của package `react-native` |
| `debuggableVariants` | `["debug"]` | Variants chạy qua Metro (không bundle JS) |
| `bundleCommand` | `bundle` | Lệnh bundle (`ram-bundle` cho RAM Bundles) |
| `bundleAssetName` | `index.android.bundle` | Tên file bundle output |
| `entryFile` | auto-detect `index.js` | Entry file cho bundle |
| `hermesFlags` | `["-O", "-output-source-map"]` | Flags truyền vào Hermes compiler |
| `enableBundleCompression` | `false` | Nén bundle trong `.apk` (tắt = startup nhanh hơn) |
| `extraPackagerArgs` | `[]` | Flags thêm cho lệnh `bundle` |

### Custom build flavors

Khi dùng custom build types, khai báo debuggable variants:

```groovy
react {
  debuggableVariants = ["fullStaging", "fullDebug"]
}
```

> **Lưu ý:** Debuggable variants cần Metro chạy và không có bundle shipped. Non-debuggable variants cần bundle để publish lên store.

### Plugin tự động xử lý

- Tạo task `createBundle<Variant>JsAndAssets` cho non-debuggable variants
- Cấu hình dependencies `react-android` và `hermes-android` từ `package.json`
- Setup Maven repositories, NDK cho New Architecture
- Invoke CodeGen cho New Architecture libraries
