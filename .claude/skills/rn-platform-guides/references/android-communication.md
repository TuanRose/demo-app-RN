# Reference: Communication Native ↔ React Native (Android)

React Native dùng unidirectional data flow: data chảy từ trên xuống qua properties, callback để gửi ngược lên.

---

## Properties — Native → RN

Dùng để truyền initial props hoặc cập nhật props từ native vào React Native component.

### Initial props (khi khởi động)

Override `getLaunchOptions()` trong `ReactActivityDelegate`:

**Kotlin:**
```kotlin
class MainActivity : ReactActivity() {
    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return object : ReactActivityDelegate(this, mainComponentName) {
            override fun getLaunchOptions(): Bundle {
                val imageList = arrayListOf(
                    "https://dummyimage.com/600x400/ffffff/000000.png",
                    "https://dummyimage.com/600x400/000000/ffffff.png"
                )
                return Bundle().apply { putStringArrayList("images", imageList) }
            }
        }
    }
}
```

**Java:**
```java
public class MainActivity extends ReactActivity {
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new ReactActivityDelegate(this, getMainComponentName()) {
            @Override
            protected Bundle getLaunchOptions() {
                Bundle props = new Bundle();
                ArrayList<String> imageList = new ArrayList<>(Arrays.asList(
                    "https://dummyimage.com/600x400/ffffff/000000.png"
                ));
                props.putStringArrayList("images", imageList);
                return props;
            }
        };
    }
}
```

### Cập nhật props tại runtime

```java
Bundle updatedProps = mReactRootView.getAppProperties();
updatedProps.putStringArrayList("images", newImageList);
mReactRootView.setAppProperties(updatedProps); // phải gọi trên main thread
```

**Lưu ý:**
- `setAppProperties()` phải gọi trên **main thread**.
- Getter có thể gọi từ bất kỳ thread nào.
- Chỉ hỗ trợ full update — không update từng prop riêng lẻ.

---

## Properties — RN → Native

Export setter methods trong ViewManager với annotation `@ReactProp` hoặc `@ReactPropGroup`. RN sẽ treat native component như React component bình thường.

---

## Events — Native → RN

Dùng khi native cần trigger handler function trong JS mà không giữ reference đến component.

**Cách dùng:** Dispatch event qua `EventDispatcher` với `reactTag` là identifier của view.

**Lưu ý:**
- Event handlers chạy trên thread riêng — không đảm bảo thứ tự và thời gian thực thi.
- Tất cả events dùng chung **global namespace** — tránh đặt tên trùng.
- Dùng `reactTag` để phân biệt khi có nhiều instance của cùng component.
- Có thể gây spaghetti dependencies nếu lạm dụng.

---

## Native Modules — RN → Native

Gọi hàm native từ JavaScript. Xem skill `rn-native-legacy` (module-android) hoặc `rn-native-platform` (turbo-module-android).

---

## So sánh các cơ chế

| Cơ chế | Hướng | Dùng khi |
|--------|-------|---------|
| Properties | Native → RN | Top-down data, initial config |
| `setAppProperties` | Native → RN | Cập nhật props tại runtime |
| Events | Native → RN | Native muốn trigger JS handler |
| Native Modules | RN → Native | JS gọi hàm native |
| `@ReactProp` | RN → Native | Bind prop vào native view |
