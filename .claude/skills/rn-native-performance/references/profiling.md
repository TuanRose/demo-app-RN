# Reference: Profiling React Native Apps

> **Bắt buộc:** Tắt Development Mode trước khi profile — dev mode làm chậm kết quả đo.

---

## Công cụ theo platform

| Công cụ | Platform | Dùng cho |
|---------|----------|---------|
| Android Studio Profiler | Android | System tracing, UI/frame analysis |
| Perfetto | Android | Phân tích trace chi tiết |
| CPU Hotspot Recorder | Android | Java/Kotlin method profiling |
| Firefox Profiler | Android | Xem kết quả CPU hotspot |
| Instruments | iOS | Performance profiling toàn diện |
| Perf Monitor | Cả hai | Real-time FPS trong app |

---

## Android — System Tracing (Phân tích frame drops)

### Thu thập trace

1. Kết nối thiết bị qua USB
2. Mở Android project trong Android Studio
3. Chọn thiết bị ở góc phải trên
4. Run project ở chế độ **profileable** (Product → Profile)
5. Điều hướng đến màn hình/animation cần profile
6. Bắt đầu task **"Capture System Activities"** trong Profiler
7. Thực hiện animation/interaction
8. Nhấn **Stop recording**
9. Phân tích trong Android Studio, hoặc export → mở trong [Perfetto](https://perfetto.dev/)

### Điều hướng trong trace

- **WASD keys:** strafe và zoom
- **Bật VSync Highlighting:** checkbox góc phải trên — highlight ranh giới 16ms

### Các threads cần theo dõi

| Thread | Tên trong trace | Events tiêu biểu |
|--------|-----------------|-----------------|
| **UI Thread** | package name hoặc "UI Thread" | `Choreographer`, `traversals`, `DispatchUI` |
| **JS Thread** | `mqt_js` | `JSCall`, `Bridge.executeJSCall` |
| **Native Modules** | `mqt_native_modules` | `NativeCall`, `callJavaModuleMethod`, `onBatchComplete` |
| **Render Thread** | `RenderThread` | `DrawFrame`, `queueBuffer` |

---

## Đọc trace — Nhận diện vấn đề

### Animation mượt (60 FPS)

- Mỗi frame hoàn thành trong 16ms
- Không có thread nào vượt ranh giới frame

### JS thread quá tải

**Dấu hiệu:**
- JS thread chạy liên tục
- `RCTEventEmitter` được gọi nhiều lần mỗi frame

**Fix:**
- Review logic JS trong frame đó
- Implement `shouldComponentUpdate` / `React.memo`
- Giảm state updates và re-renders

### UI thread / Render thread lag

#### A. GPU Overload

**Dấu hiệu:** `DrawFrame` dài, vượt frame boundary

**Fix:**
```tsx
// Rasterize static content đang được animate
<View renderToHardwareTextureAndroid={true}>
  {/* content */}
</View>
```
- Kiểm tra và tắt `needsOffscreenAlphaCompositing` nếu không cần
- Tối ưu Navigator slide/alpha animations

#### B. Tạo views mới trong khi animate

**Dấu hiệu:** JS thread → Native modules → UI thread traversal tốn kém xảy ra đồng thời với animation

**Fix:**
- Dùng `InteractionManager.runAfterInteractions()` để defer UI creation
- Đơn giản hóa UI đang được tạo

---

## Android — CPU Hotspot Profiling (Java/Kotlin Methods)

Tìm methods nào đang ngốn CPU nhất.

1. Android Studio Profiler → **"Find CPU Hotspots (Java/Kotlin Method Recording)"**
2. Bắt đầu record
3. Thực hiện **interaction ngắn** (recording nặng hơn normal)
4. Stop recording
5. Xem trong Android Studio hoặc export sang [Firefox Profiler](https://profiler.firefox.com/)

> Chọn **Java/Kotlin Recording**, không phải Callstack Sample.
> Kết quả là tỉ lệ tương đối, không phải thời gian tuyệt đối.

---

## iOS — Instruments

Dùng Xcode Instruments để profile iOS:
1. **Xcode → Product → Profile** (Cmd+I)
2. Chọn template **Time Profiler** hoặc **Core Animation**
3. Record trong khi thực hiện interaction cần profile
4. Phân tích call tree để tìm hotspot

---

## Perf Monitor (Quick check)

Bật từ **Dev Menu → Show Perf Monitor** để xem FPS real-time mà không cần tool ngoài.

- **JS:** FPS của JS thread
- **UI:** FPS của UI thread

> Chú ý: Perf Monitor chạy trong dev mode — con số thấp hơn release build thực tế.

---

## Deprecated

`systrace` standalone tool đã bị xóa khỏi Android platform-tools. Dùng **Android Studio Profiler** thay thế.
