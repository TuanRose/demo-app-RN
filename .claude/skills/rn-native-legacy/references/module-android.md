# Reference: Android Native Module

## Bước 1 — Tạo class module

`android/app/src/main/java/com/<app>/CalendarModule.kt`:

```kotlin
package com.<app>

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Callback
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Arguments
import android.util.Log

class CalendarModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "CalendarModule"

    // Hằng số xuất sang JS
    override fun getConstants(): MutableMap<String, Any> =
        hashMapOf("DEFAULT_EVENT_NAME" to "New Event")

    // Phương thức đơn giản
    @ReactMethod
    fun createCalendarEvent(name: String, location: String) {
        Log.d("CalendarModule", "Create event: $name at $location")
    }

    // Phương thức với Callback
    @ReactMethod
    fun createCalendarEventWithCallback(name: String, location: String, callback: Callback) {
        val eventId = 123
        callback.invoke(eventId)
    }

    // Phương thức với Promise (khuyến nghị — dùng async/await phía JS)
    @ReactMethod
    fun createCalendarEventAsync(name: String, location: String, promise: Promise) {
        try {
            val eventId = 123
            promise.resolve(eventId)
        } catch (e: Throwable) {
            promise.reject("Create Event Error", e)
        }
    }

    // Gửi sự kiện lên JS
    private var listenerCount = 0

    @ReactMethod
    fun addListener(eventName: String) {
        if (listenerCount == 0) { /* Set up native listeners */ }
        listenerCount += 1
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        listenerCount -= count
        if (listenerCount == 0) { /* Clean up */ }
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }
}
```

## Bước 2 — Tạo ReactPackage

`android/app/src/main/java/com/<app>/MyAppPackage.kt`:

```kotlin
package com.<app>

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class MyAppPackage : ReactPackage {
    override fun createViewManagers(reactContext: ReactApplicationContext):
        MutableList<ViewManager<*, *>> = mutableListOf()

    override fun createNativeModules(reactContext: ReactApplicationContext):
        MutableList<NativeModule> = listOf(CalendarModule(reactContext)).toMutableList()
}
```

## Bước 3 — Đăng ký trong MainApplication

`android/app/src/main/java/com/<app>/MainApplication.kt`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(MyAppPackage())
    }
```

---

## Tính năng nâng cao

### Synchronous method (hạn chế dùng — tắt Chrome debugger)
```kotlin
@ReactMethod(isBlockingSynchronousMethod = true)
fun getSomethingSync(): String = "value"
```

### Lifecycle (onResume / onPause / onDestroy)
```kotlin
import com.facebook.react.bridge.LifecycleEventListener

class MyModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    init { reactContext.addLifecycleEventListener(this) }

    override fun onHostResume()  { /* Activity onResume  */ }
    override fun onHostPause()   { /* Activity onPause   */ }
    override fun onHostDestroy() { /* Activity onDestroy */ }
}
```

### Activity Result (startActivityForResult)
```kotlin
import com.facebook.react.bridge.BaseActivityEventListener

class ImagePickerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mPickerPromise: Promise? = null
    private val activityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, intent: Intent?) {
            if (requestCode == IMAGE_PICKER_REQUEST) {
                if (resultCode == Activity.RESULT_OK) {
                    mPickerPromise?.resolve(intent?.data?.toString())
                } else {
                    mPickerPromise?.reject("CANCELLED", "Picker cancelled")
                }
                mPickerPromise = null
            }
        }
    }

    init { reactContext.addActivityEventListener(activityEventListener) }

    override fun getName() = "ImagePickerModule"

    @ReactMethod
    fun pickImage(promise: Promise) {
        val activity = currentActivity ?: run {
            promise.reject("NO_ACTIVITY", "Activity doesn't exist"); return
        }
        mPickerPromise = promise
        val intent = Intent(Intent.ACTION_PICK).apply { type = "image/*" }
        activity.startActivityForResult(Intent.createChooser(intent, "Pick image"), IMAGE_PICKER_REQUEST)
    }

    companion object { private const val IMAGE_PICKER_REQUEST = 1 }
}
```

---

## Quy tắc Android

- `getName()` phải trả về tên khớp với `NativeModules.XYZ` trong JS.
- Callback chỉ được invoke **một lần**.
- Không giả định thread — dispatch thủ công nếu cần background work.
- Implement `addListener`/`removeListeners` khi module phát sự kiện.
