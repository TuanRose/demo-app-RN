# Chunk: Android Native UI Components

## Quy trình 5 bước

### Bước 1 — Tạo ViewManager class

```kotlin
// android/app/src/main/java/com/<app>/ReactImageManager.kt
class ReactImageManager(
    private val callerContext: ReactApplicationContext
) : SimpleViewManager<ReactImageView>() {

    override fun getName() = REACT_CLASS

    companion object {
        const val REACT_CLASS = "RCTImageView"
    }
}
```

> Dùng `SimpleViewManager<T>` cho hầu hết trường hợp — đã có sẵn background color, opacity, Flexbox.
> Dùng `ViewGroupManager<T>` khi cần bọc Fragment (xem Bước fragment bên dưới).

---

### Bước 2 — Implement `createViewInstance`

```kotlin
override fun createViewInstance(context: ThemedReactContext) =
    ReactImageView(context, Fresco.newDraweeControllerBuilder(), null, callerContext)
```

---

### Bước 3 — Expose props với `@ReactProp`

```kotlin
@ReactProp(name = "src")
fun setSrc(view: ReactImageView, sources: ReadableArray?) {
    view.setSource(sources)
}

@ReactProp(name = "borderRadius", defaultFloat = 0f)
fun setBorderRadius(view: ReactImageView, borderRadius: Float) {
    view.setBorderRadius(borderRadius)
}

@ReactProp(name = "resizeMode")
fun setResizeMode(view: ReactImageView, resizeMode: String?) {
    view.setScaleType(ImageResizeMode.toScaleType(resizeMode))
}
```

**Bảng kiểu dữ liệu `@ReactProp`:**

| Kotlin type | JS type | Tham số default |
|-------------|---------|-----------------|
| `Boolean` | `boolean` | `defaultBoolean` |
| `Int` | `number` | `defaultInt` |
| `Float` | `number` | `defaultFloat` |
| `Double` | `number` | — |
| `String` | `string` | — |
| `ReadableArray` | `Array` | — |
| `ReadableMap` | `Object` | — |

Dùng `@ReactPropGroup` để nhóm nhiều props liên quan:
```kotlin
@ReactPropGroup(names = ["width", "height"], customType = "Style")
fun setStyle(view: FrameLayout, index: Int, value: Int) {
    if (index == 0) propWidth = value
    if (index == 1) propHeight = value
}
```

---

### Bước 4 — Đăng ký trong ReactPackage

```kotlin
// MyAppPackage.kt
override fun createViewManagers(reactContext: ReactApplicationContext) =
    listOf(ReactImageManager(reactContext))
```

Đăng ký package trong `MainApplication.kt`:
```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
        add(MyAppPackage())
    }
```

---

### Bước 5 — JS Wrapper

```typescript
// src/components/RCTImageView.tsx
import {requireNativeComponent} from 'react-native';
export default requireNativeComponent('RCTImageView');
```

---

## Xử lý Events (native → JS)

### Native: phát sự kiện từ View

```kotlin
// MyCustomView.kt
fun onReceiveNativeEvent() {
    val event = Arguments.createMap().apply {
        putString("message", "MyMessage")
    }
    val reactContext = context as ReactContext
    reactContext
        .getJSModule(RCTEventEmitter::class.java)
        .receiveEvent(id, "topChange", event)
}
```

### ViewManager: đăng ký tên sự kiện

```kotlin
override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> {
    return mapOf(
        "topChange" to mapOf(
            "phasedRegistrationNames" to mapOf(
                "bubbled" to "onChange"   // tên prop trong JS
            )
        )
    )
}
```

### JS: nhận sự kiện

```tsx
const onChange = useCallback(event => {
    console.log(event.nativeEvent.message);
}, []);

<RCTMyCustomView onChange={onChange} />
```

---

## Tích hợp Android Fragment (lifecycle nâng cao)

Dùng khi cần `onPause`, `onResume`, `onDestroy` của Fragment.

### 1 — Custom View (container)

```kotlin
class CustomView(context: Context) : FrameLayout(context) {
    init {
        addView(TextView(context).apply { text = "Fragment content" })
    }
}
```

### 2 — Fragment

```kotlin
class MyFragment : Fragment() {
    private lateinit var customView: CustomView

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        customView = CustomView(requireNotNull(context))
        return customView
    }

    override fun onResume()  { super.onResume()  /* resume logic  */ }
    override fun onPause()   { super.onPause()   /* pause logic   */ }
    override fun onDestroy() { super.onDestroy() /* cleanup logic */ }
}
```

### 3 — ViewGroupManager

```kotlin
class MyViewManager(
    private val reactContext: ReactApplicationContext
) : ViewGroupManager<FrameLayout>() {
    private var propWidth: Int? = null
    private var propHeight: Int? = null

    override fun getName() = REACT_CLASS
    override fun createViewInstance(reactContext: ThemedReactContext) = FrameLayout(reactContext)
    override fun getCommandsMap() = mapOf("create" to COMMAND_CREATE)

    override fun receiveCommand(root: FrameLayout, commandId: String, args: ReadableArray?) {
        super.receiveCommand(root, commandId, args)
        val reactNativeViewId = requireNotNull(args).getInt(0)
        if (commandId.toInt() == COMMAND_CREATE) createFragment(root, reactNativeViewId)
    }

    @ReactPropGroup(names = ["width", "height"], customType = "Style")
    fun setStyle(view: FrameLayout, index: Int, value: Int) {
        if (index == 0) propWidth = value
        if (index == 1) propHeight = value
    }

    fun createFragment(root: FrameLayout, reactNativeViewId: Int) {
        val parentView = root.findViewById<ViewGroup>(reactNativeViewId)
        setupLayout(parentView)
        val activity = reactContext.currentActivity as FragmentActivity
        activity.supportFragmentManager
            .beginTransaction()
            .replace(reactNativeViewId, MyFragment(), reactNativeViewId.toString())
            .commit()
    }

    fun setupLayout(view: View) {
        Choreographer.getInstance().postFrameCallback(object : Choreographer.FrameCallback {
            override fun doFrame(frameTimeNanos: Long) {
                val w = requireNotNull(propWidth)
                val h = requireNotNull(propHeight)
                view.measure(
                    View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY),
                    View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY)
                )
                view.layout(0, 0, w, h)
                view.viewTreeObserver.dispatchOnGlobalLayout()
                Choreographer.getInstance().postFrameCallback(this)
            }
        })
    }

    companion object {
        private const val REACT_CLASS = "MyViewManager"
        private const val COMMAND_CREATE = 1
    }
}
```

### 4 — JS side (Fragment)

```typescript
// MyViewManager.tsx
import {requireNativeComponent} from 'react-native';
export const MyViewManager = requireNativeComponent('MyViewManager');

// MyView.tsx
import React, {useEffect, useRef} from 'react';
import {PixelRatio, UIManager, findNodeHandle} from 'react-native';
import {MyViewManager} from './MyViewManager';

export function MyView() {
    const ref = useRef(null);

    useEffect(() => {
        const viewId = findNodeHandle(ref.current);
        UIManager.dispatchViewManagerCommand(
            viewId,
            UIManager.MyViewManager.Commands.create.toString(),
            [viewId],
        );
    }, []);

    return (
        <MyViewManager
            ref={ref}
            style={{
                height: PixelRatio.getPixelSizeForLayoutSize(200),
                width: PixelRatio.getPixelSizeForLayoutSize(200),
            }}
        />
    );
}
```

---

## Quy tắc Android

- Tên trả về từ `getName()` phải khớp với tên truyền vào `requireNativeComponent('...')` ở JS.
- Khi prop bị xóa khỏi JS, setter sẽ được gọi với giá trị default (`defaultFloat`, `defaultBoolean`, v.v.).
- Sự kiện native dùng tên `topXxx` → map sang `onChange`, `onPress`, v.v. trong JS.
- Khi dùng Fragment: phải gọi `setupLayout` với `Choreographer` để React Native layout đúng kích thước.
