# Reference: Turbo Native Module — Android

## Bước 1 — Implement module class

Class phải kế thừa từ class generated bởi CodeGen (`NativeXxxSpec`):

`android/app/src/main/java/com/nativelocalstorage/NativeLocalStorageModule.kt`:

```kotlin
package com.nativelocalstorage

import android.content.Context
import com.nativelocalstorage.NativeLocalStorageSpec
import com.facebook.react.bridge.ReactApplicationContext

class NativeLocalStorageModule(reactContext: ReactApplicationContext) :
    NativeLocalStorageSpec(reactContext) {

    override fun getName() = NAME

    override fun setItem(value: String, key: String) {
        getReactApplicationContext()
            .getSharedPreferences("my_prefs", Context.MODE_PRIVATE)
            .edit().putString(key, value).apply()
    }

    override fun getItem(key: String): String? {
        return getReactApplicationContext()
            .getSharedPreferences("my_prefs", Context.MODE_PRIVATE)
            .getString(key, null)
    }

    override fun removeItem(key: String) {
        getReactApplicationContext()
            .getSharedPreferences("my_prefs", Context.MODE_PRIVATE)
            .edit().remove(key).apply()
    }

    override fun clear() {
        getReactApplicationContext()
            .getSharedPreferences("my_prefs", Context.MODE_PRIVATE)
            .edit().clear().apply()
    }

    companion object {
        const val NAME = "NativeLocalStorage"
    }
}
```

> Khác Legacy: kế thừa `NativeLocalStorageSpec` (CodeGen sinh ra) thay vì `ReactContextBaseJavaModule`. Không dùng `@ReactMethod`.

---

## Bước 2 — Tạo Package

Dùng `BaseReactPackage` thay vì `ReactPackage`:

`android/app/src/main/java/com/nativelocalstorage/NativeLocalStoragePackage.kt`:

```kotlin
package com.nativelocalstorage

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class NativeLocalStoragePackage : BaseReactPackage() {

    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? =
        if (name == NativeLocalStorageModule.NAME) {
            NativeLocalStorageModule(reactContext)
        } else {
            null
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        mapOf(
            NativeLocalStorageModule.NAME to ReactModuleInfo(
                name              = NativeLocalStorageModule.NAME,
                className         = NativeLocalStorageModule.NAME,
                canOverrideExistingModule = false,
                needsEagerInit    = false,
                isCxxModule       = false,
                isTurboModule     = true          // bắt buộc true
            )
        )
    }
}
```

---

## Bước 3 — Đăng ký trong MainApplication

`android/app/src/main/java/com/<app>/MainApplication.kt`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(NativeLocalStoragePackage())
    }
```

---

## Build

```bash
npm run android
# hoặc
yarn android
```

---

## So sánh với Legacy

| | Legacy | Turbo Module |
|---|---|---|
| Base class | `ReactContextBaseJavaModule` | `NativeXxxSpec` (CodeGen) |
| Package | `ReactPackage` | `BaseReactPackage` |
| Method annotation | `@ReactMethod` | `override fun` |
| isTurboModule | — | `true` bắt buộc |
| Type safety | Thủ công | CodeGen sinh interface |

---

## Quy tắc Android

- Tên trong `companion object { const val NAME }` phải khớp với tên trong TypeScript spec.
- `isTurboModule = true` trong `ReactModuleInfo` là bắt buộc.
- CodeGen chạy tự động khi build; nếu cần chạy sớm: `./gradlew generateCodegenArtifactsFromSchema`.
