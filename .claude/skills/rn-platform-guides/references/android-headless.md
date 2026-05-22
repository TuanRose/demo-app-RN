# Reference: Headless JS (Android)

Headless JS cho phép chạy JavaScript ở background khi app không ở foreground. Dùng cho: sync data, push notification handling, phát nhạc.

**Giới hạn:** task không được đụng đến UI.

---

## Bước 1 — Đăng ký task trong JS

`SomeTaskName.js`:
```js
module.exports = async taskData => {
  // xử lý background, không dùng UI
};
```

`index.js` (hoặc entry point):
```tsx
import {AppRegistry} from 'react-native';
AppRegistry.registerHeadlessTask('SomeTaskName', () => require('./SomeTaskName'));
```

---

## Bước 2 — Tạo Service Android

**Kotlin:**
```kotlin
class MyTaskService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        return intent?.extras?.let {
            HeadlessJsTaskConfig(
                "SomeTaskName",
                Arguments.fromBundle(it),
                5000,  // timeout ms
                false  // false = không chạy khi app ở foreground
            )
        }
    }
}
```

**Java:**
```java
public class MyTaskService extends HeadlessJsTaskService {
  @Override
  protected @Nullable HeadlessJsTaskConfig getTaskConfig(Intent intent) {
    Bundle extras = intent.getExtras();
    if (extras != null) {
      return new HeadlessJsTaskConfig("SomeTaskName", Arguments.fromBundle(extras), 5000, false);
    }
    return null;
  }
}
```

---

## Bước 3 — Đăng ký trong AndroidManifest.xml

```xml
<service android:name="com.example.MyTaskService" />
```

---

## Bước 4 — Khởi động Service từ Native

**Kotlin:**
```kotlin
val service = Intent(applicationContext, MyTaskService::class.java)
val bundle = Bundle()
bundle.putString("foo", "bar")
service.putExtras(bundle)
applicationContext.startForegroundService(service)
```

---

## Retry Policy

Dùng `LinearCountingRetryPolicy` để tự động retry:

**Kotlin:**
```kotlin
val retryPolicy = LinearCountingRetryPolicy(3, 1000) // 3 lần, cách nhau 1000ms
return HeadlessJsTaskConfig("SomeTaskName", Arguments.fromBundle(extras), 5000, false, retryPolicy)
```

Throw `HeadlessJsTaskError` trong JS để trigger retry:
```tsx
import {HeadlessJsTaskError} from 'HeadlessJsTask';

module.exports = async taskData => {
  if (!someCondition) {
    throw new HeadlessJsTaskError();
  }
};
```

---

## Wake Lock (BroadcastReceiver)

Khi start service từ `BroadcastReceiver`, phải acquire wake lock **trước** khi trả về:

```kotlin
class NetworkChangeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (!isAppOnForeground(context)) {
            val serviceIntent = Intent(context, MyTaskService::class.java)
            serviceIntent.putExtra("hasInternet", isNetworkAvailable(context))
            context.startForegroundService(serviceIntent)
            HeadlessJsTaskService.acquireWakeLockNow(context) // bắt buộc
        }
    }
}
```

**AndroidManifest.xml** cho broadcast receiver:
```xml
<receiver android:name=".NetworkChangeReceiver">
  <intent-filter>
    <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
  </intent-filter>
</receiver>
```

---

## Lưu ý

- 4th argument của `HeadlessJsTaskConfig` (`allowInForeground`) mặc định `false` — app crash nếu task chạy khi foreground. Set `true` nếu muốn cho phép.
- `acquireWakeLockNow()` chỉ cần thiết khi start từ BroadcastReceiver.
