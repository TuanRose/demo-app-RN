# Reference: Performance Overview

---

## Threading Model

React Native có 2 thread quan trọng:

| Thread | Chạy gì | Vấn đề khi lag |
|--------|---------|---------------|
| **JS Thread** | Business logic, React, API calls, xử lý touch | Heavy re-renders, console.log, animations dùng JS |
| **UI Thread (Main)** | Native animations, layout, draw | GPU overload, tạo views trong khi animate |

> Hai thread độc lập: JS thread lag **không ảnh hưởng** native animations (ví dụ `ScrollView` cuộn vẫn mượt khi JS bận).

---

## Perf Monitor

Bật từ Dev Menu → **Show Perf Monitor**. Hiển thị:
- JS FPS — frame rate của JS thread
- UI FPS — frame rate của UI thread

---

## Target

- 60 FPS = 16.67ms/frame
- Luôn **test trong release build** — dev mode (`dev=true`) chậm hơn đáng kể do runtime warnings.

---

## Các vấn đề phổ biến & cách fix

### 1. Dev mode chậm

**Vấn đề:** `dev=true` bật runtime warnings/errors, làm chậm JS thread.
**Fix:** Test performance trong release build.

---

### 2. `console.log` quá nhiều

**Vấn đề:** Bottleneck lớn trên JS thread, đặc biệt trong production bundle.
**Fix:** Xóa trước production, hoặc dùng Babel plugin tự động remove:

```bash
npm i babel-plugin-transform-remove-console --save-dev
```

`babel.config.js`:
```json
{
  "env": {
    "production": {
      "plugins": ["transform-remove-console"]
    }
  }
}
```

---

### 3. FlatList chậm

**Fix:** Xem `references/flatlist.md` để tối ưu props và item components.

---

### 4. Animation lag trong Navigator transitions

**Vấn đề:** JS thread bận làm task nặng cùng lúc với animation.

**Fix A — InteractionManager:** Defer heavy work đến sau khi animation xong:
```tsx
InteractionManager.runAfterInteractions(() => {
  // code nặng chạy sau khi animation kết thúc
});
```

**Fix B — LayoutAnimation:** Dùng Core Animation của iOS/Android, không qua JS:
```tsx
import {LayoutAnimation} from 'react-native';
LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
```
> Chỉ dùng cho fire-and-forget animation. Dùng `Animated` nếu cần interruptible.

**Fix C — `useNativeDriver: true`:** Chạy animation hoàn toàn trên UI thread:
```tsx
Animated.timing(value, {
  toValue: 1,
  useNativeDriver: true, // bắt buộc khi có thể
}).start();
```

---

### 5. UI thread lag khi scroll, translate, rotate

**Vấn đề:** Đặc biệt trên Android với text/transparent backgrounds trên images.

**Fix:**
```tsx
// Android
<View renderToHardwareTextureAndroid={true}>
  {/* content đang animate */}
</View>
```
> Trên iOS `shouldRasterizeIOS` đã bật mặc định.
> **Cảnh báo:** Monitor memory — tắt khi animation kết thúc.

---

### 6. Animate image size bị lag

**Vấn đề:** Thay đổi `width`/`height` làm re-crop/scale mỗi frame.
**Fix:** Dùng `transform: [{scale}]` thay thế:
```tsx
<Animated.Image
  style={{transform: [{scale: scaleValue}]}}
  source={...}
/>
```

---

### 7. TouchableX không responsive

**Vấn đề:** `onPress` trigger heavy re-render, làm trễ hiệu ứng opacity/highlight.
**Fix:**
```tsx
function handleOnPress() {
  requestAnimationFrame(() => {
    doExpensiveAction();
  });
}
```
