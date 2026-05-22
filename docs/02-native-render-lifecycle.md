# Native Render Lifecycle — iOS, Android, và React Native

> Nguồn tham khảo:
> - https://developer.apple.com/documentation/uikit/uiview
> - https://developer.android.com/reference/android/view/View
> - https://reactnative.dev/architecture/render-pipeline
> - https://developer.android.com/develop/ui/views/layout/how-android-draws

---

## 1. Tổng quan: render pipeline trên mobile

Mọi nền tảng UI (iOS, Android, RN) đều đi qua 3 giai đoạn lớn:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Layout    │ →  │    Paint    │ →  │  Composite  │
│  (đo + xếp) │    │  (vẽ ra)    │    │ (gộp + GPU) │
└─────────────┘    └─────────────┘    └─────────────┘
```

- **Layout**: tính kích thước (size) và vị trí (position) của từng view.
- **Paint / Draw**: vẽ pixel của từng view vào buffer (CALayer trên iOS, Canvas trên Android).
- **Composite**: GPU gộp tất cả layer/buffer thành 1 frame, gửi tới màn hình ở 60/120Hz.

Mục tiêu: **hoàn thành trong < 16.67ms** (60Hz) hoặc **< 8.33ms** (120Hz). Trễ → dropped frame → lag/jank.

---

## 2. iOS — UIView render lifecycle (UIKit)

### 2.1. View hierarchy & CALayer

```
┌────────────────────────────────────────┐
│ UIWindow                               │
│  └─ UIViewController.view (UIView)     │
│      ├─ UIView (subview)               │
│      │   └─ UIView                     │
│      └─ UILabel                        │
└────────────────────────────────────────┘

Mỗi UIView được "back" bởi 1 CALayer (Core Animation).
GPU thực ra chỉ thấy CALayer, không thấy UIView.
```

### 2.2. Lifecycle của 1 frame trên iOS

```
                  Run Loop iteration (16.67ms)
   ┌──────────────────────────────────────────────────────┐
   │                                                      │
   │  [1] Event handling                                  │
   │      - Touch, gesture, keyboard, timer               │
   │                                                      │
   │  [2] Update phase                                    │
   │      - Bạn gọi setNeedsLayout, setNeedsDisplay       │
   │      - Set frame, transform, ...                     │
   │                                                      │
   │  [3] Layout phase                                    │
   │      - layoutSubviews() recursively                  │
   │      - Auto Layout solve constraints                 │
   │                                                      │
   │  [4] Display phase (paint)                           │
   │      - draw(_:) cho UIView nào setNeedsDisplay       │
   │      - Vẽ vào CALayer.contents (CGImage backing)     │
   │                                                      │
   │  [5] Prepare phase                                   │
   │      - Core Animation gom CALayer tree               │
   │      - Encode commands cho Render Server             │
   │                                                      │
   │  [6] Commit transaction                              │
   │      - Gửi tới backboardd → Render Server            │
   │                                                      │
   └──────────────────────────────────────────────────────┘
                            │
                            ▼ IPC
   ┌──────────────────────────────────────────────────────┐
   │  Render Server (process riêng, GPU compositing)      │
   │  - Đọc CALayer tree                                  │
   │  - Apply animation interpolation                     │
   │  - Composite → frame buffer → display                │
   └──────────────────────────────────────────────────────┘
```

### 2.3. UIViewController lifecycle

```
init                                  ─ tạo VC, chưa có view
  │
  ▼
loadView                              ─ tạo root view
  │
  ▼
viewDidLoad                           ─ view đã load lần đầu (1 lần duy nhất)
  │
  ▼
viewWillAppear        ◄──┐             ─ trước khi xuất hiện (mỗi lần)
  │                      │
  ▼                      │
viewWillLayoutSubviews   │             ─ trước layout
  │                      │
  ▼                      │
viewDidLayoutSubviews    │             ─ sau layout
  │                      │
  ▼                      │
viewDidAppear            │             ─ đã hiện (animation xong)
  │                      │
  ▼                      │
... user interacts ...   │
  │                      │
  ▼                      │
viewWillDisappear        │             ─ chuẩn bị biến mất
  │                      │
  ▼                      │
viewDidDisappear ────────┘
  │
  ▼
deinit                                 ─ giải phóng
```

### 2.4. SwiftUI vs UIKit

```
       UIKit (imperative)              SwiftUI (declarative)
    ┌─────────────────────┐         ┌─────────────────────┐
    │ self.view.addSubview│         │ var body: some View │
    │ button.frame = ...  │         │   { Button(...) }   │
    │ button.setTitle(...)│         │                     │
    └─────────────────────┘         └─────────────────────┘
            │                                 │
            ▼                                 ▼
        UIView tree                     diff-based render
                                        (giống React)
```

SwiftUI có pipeline diff/reconcile tương tự React → kế thừa nhiều ý tưởng từ React Native.

---

## 3. Android — View render lifecycle

### 3.1. View hierarchy

```
┌────────────────────────────────────────┐
│ Window (PhoneWindow)                   │
│  └─ DecorView (FrameLayout)            │
│      └─ ViewGroup (root)               │
│          ├─ View                       │
│          └─ ViewGroup                  │
│              └─ View                   │
└────────────────────────────────────────┘
```

### 3.2. Render pipeline — 3 pass

Android render đi qua **3 pass** chính, gọi từ root xuống cây:

```
                  invalidate() / requestLayout()
                            │
                            ▼
   ┌────────────────────────────────────────────────────┐
   │ [1] MEASURE pass — onMeasure()                     │
   │    - Parent gửi MeasureSpec (size + mode) xuống    │
   │    - Mode: EXACTLY / AT_MOST / UNSPECIFIED         │
   │    - Mỗi View tính measuredWidth/Height            │
   │    - Có thể chạy 2 lần (vd: weight trong Linear)   │
   └────────────────────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────┐
   │ [2] LAYOUT pass — onLayout()                       │
   │    - Parent đặt left, top, right, bottom cho child │
   │    - ViewGroup phân bổ vị trí cho từng child       │
   └────────────────────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────┐
   │ [3] DRAW pass — onDraw(Canvas)                     │
   │    - Background → onDraw → children → decorations  │
   │    - DisplayList được tạo (RecyclerView ops)       │
   └────────────────────────────────────────────────────┘
                            │
                            ▼
   ┌────────────────────────────────────────────────────┐
   │ Hardware-accelerated rendering                     │
   │    - DisplayList → RenderThread → OpenGL/Vulkan    │
   │    - GPU composite → SurfaceFlinger → display      │
   └────────────────────────────────────────────────────┘
```

### 3.3. Activity lifecycle

```
   onCreate ─→ onStart ─→ onResume ──┐  active
                                     │
                                     ▼
                                 user uses
                                     │
   onDestroy ◄─ onStop ◄─ onPause ◄──┘
       │
       ▼
     killed
```

### 3.4. Jetpack Compose

Compose là declarative UI framework mới (giống SwiftUI / React):

```
       Old View (XML + onMeasure/onLayout/onDraw)
                       VS
       Compose
       @Composable
       fun Greeting(name: String) {
         Text("Hello $name")
       }
```

Compose có 3 phase tương đương:
1. **Composition** — gọi composable, tạo cây UI node.
2. **Layout** — đo + xếp.
3. **Drawing** — vẽ.

Khi state thay đổi, chỉ phần nào đọc state đó mới recompose → giống React rendering.

---

## 4. React Native render pipeline

### 4.1. Pipeline tổng quát (New Architecture / Fabric)

```
   ┌──────────────────────────────────────────────────────────┐
   │ 1. RENDER (JS thread)                                    │
   │    - React reconciler chạy                               │
   │    - Tạo / diff React Element tree                       │
   │    - Output: lệnh "create/update/delete" component       │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼ JSI (zero-copy ref)
   ┌──────────────────────────────────────────────────────────┐
   │ 2. COMMIT (C++ Fabric)                                   │
   │    - Build/update Shadow Tree (immutable C++ object)     │
   │    - Yoga tính layout (flexbox)                          │
   │    - Diff Shadow Tree mới vs cũ                          │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 3. MOUNT (UI thread, native)                             │
   │    - Áp diff vào native view tree                        │
   │    - iOS: tạo/update UIView                              │
   │    - Android: tạo/update android.view.View               │
   └──────────────────────────────────────────────────────────┘
                              │
                              ▼
   ┌──────────────────────────────────────────────────────────┐
   │ 4. NATIVE RENDER (UI thread / Render Server / GPU)       │
   │    - iOS: Core Animation → Render Server → GPU           │
   │    - Android: measure/layout/draw → RenderThread → GPU   │
   └──────────────────────────────────────────────────────────┘
```

### 4.2. Diagram so sánh Old vs New Architecture pipeline

```
   OLD (Bridge + UIManager async):

   JS                Bridge          Native UIManager       UI thread
   ─────             ──────          ────────────────       ────────
   render            JSON queue       create/update view    measure/layout/draw
   diff   ──batch──►──────────────►  (async)               (async)
                                      ▲
                                      │ có thể delay
                                      │ vài frame so với JS

   NEW (Fabric):

   JS               JSI/C++ Fabric    UI thread (mounting)   GPU
   ─────            ──────────────    ─────────────────────  ───
   render           shadow tree       sync / scheduled       composite
   diff   ────────► Yoga layout    ──► áp diff ──────────►   60/120Hz
                    diff
                       (immutable, có thể chạy concurrent)
```

### 4.3. Threading trong RN

```
   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
   │  JS Thread   │   │ Fabric C++   │   │  UI Thread   │
   │              │   │   Thread     │   │  (Main)      │
   │ React render │   │ Shadow tree  │   │ Native views │
   │ Reconciler   │   │ Yoga layout  │   │ Touch events │
   │ Hooks/state  │   │ Diff         │   │ Animations   │
   └──────────────┘   └──────────────┘   └──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                  Có thể chạy song song
```

### 4.4. Re-render flow chi tiết khi `setState`

```
[1] setState({ count: 1 })   (JS thread)
        │
        ▼
[2] React schedule update   (queue micro-task)
        │
        ▼
[3] Reconciler chạy        (JS thread)
    - Diff React element tree
    - Output operations: create/update/delete props
        │
        ▼ JSI call
[4] Fabric commit           (C++ thread)
    - Clone shadow tree (immutable)
    - Apply changes
    - Yoga layout (nếu cần)
    - Diff vs previous tree
        │
        ▼
[5] Mount (UI thread)
    - iOS: setNeedsLayout / addSubview / setFrame
    - Android: requestLayout / addView / setLayoutParams
        │
        ▼
[6] Native pipeline         (UI thread → GPU)
    - iOS: layoutSubviews → draw → CA commit → Render Server
    - Android: measure → layout → draw → RenderThread
        │
        ▼
[7] GPU composite → display
```

---

## 5. Vấn đề performance phổ biến và root cause theo lifecycle

| Triệu chứng | Layer gây ra | Cách fix |
|---|---|---|
| App start chậm | JS bundle parse + module init | Hermes bytecode, lazy Turbo Module |
| Tap → delay | Bridge async (old arch) | Migrate New Architecture, dùng JSI |
| Scroll list giật | JS thread block khi diff list lớn | `FlashList`, `getItemLayout`, memoize |
| Animation jank | Animation chạy trên JS thread | `useNativeDriver: true`, Reanimated |
| Re-render thừa | React không memo hoá | `memo`, `useMemo`, `useCallback` |
| Layout shift | Yoga tính lại nhiều lần | Tránh nested flex phức tạp, cố định `width/height` |
| Black/white screen lúc mount | Mount trước khi paint xong | `InteractionManager.runAfterInteractions` |

---

## 6. Công cụ profile theo từng giai đoạn

```
   ┌──────────────────────────────────────────────────┐
   │ JS thread                                        │
   │  - React DevTools Profiler                       │
   │  - Hermes Sampling Profiler                      │
   │  - Flipper > React DevTools                      │
   └──────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────┐
   │ Bridge / JSI                                     │
   │  - Flipper > Network/Bridge plugin (old arch)    │
   │  - Systrace (cross-platform)                     │
   └──────────────────────────────────────────────────┘
   ┌──────────────────────────────────────────────────┐
   │ Native render                                    │
   │  iOS:                                            │
   │   - Xcode Instruments > Time Profiler            │
   │   - Instruments > Core Animation                 │
   │  Android:                                        │
   │   - Android Studio Profiler (CPU/GPU)            │
   │   - Perfetto / Systrace                          │
   │   - GPU Rendering profile (Developer options)    │
   └──────────────────────────────────────────────────┘
```

---

## 7. Đọc thêm

| Tài liệu | Link |
|---|---|
| Apple — UIView lifecycle | https://developer.apple.com/documentation/uikit/uiview |
| Apple — Core Animation | https://developer.apple.com/documentation/quartzcore |
| Android — How Android draws | https://developer.android.com/develop/ui/views/layout/how-android-draws |
| Android — Custom view drawing | https://developer.android.com/develop/ui/views/layout/custom-views/custom-drawing |
| RN — Render pipeline | https://reactnative.dev/architecture/render-pipeline |
| Yoga layout engine | https://www.yogalayout.dev |
| Jetpack Compose phases | https://developer.android.com/jetpack/compose/phases |
