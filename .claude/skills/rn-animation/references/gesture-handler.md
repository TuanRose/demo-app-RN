# Reference: React Native Gesture Handler

Gesture Handler cung cấp native-driven gestures, hoạt động hoàn toàn trên UI thread.
Kết hợp với Reanimated để tạo interactions mượt nhất.

---

## Cài đặt

```bash
npm install react-native-gesture-handler
cd ios && bundle exec pod install
```

**Wrap app với `GestureHandlerRootView`** — bắt buộc:

```tsx
// index.js hoặc App.tsx (ngoài cùng)
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    // flex: 1 để fill toàn màn hình
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
```

> Gestures không hoạt động bên ngoài `GestureHandlerRootView`.
> Modals cũng cần wrap riêng với `GestureHandlerRootView`.

---

## GestureDetector + Gesture API (v2)

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

function DraggableBox() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const context = useSharedValue({ x: 0, y: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      // Lưu vị trí hiện tại để tính offset
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
      translateY.value = event.translationY + context.value.y;
    })
    .onEnd(() => {
      // Spring về origin khi thả
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.box, animatedStyle]} />
    </GestureDetector>
  );
}
```

---

## Các loại Gesture

### `Gesture.Tap()` — nhấn

```tsx
const tap = Gesture.Tap()
  .numberOfTaps(2)           // double tap
  .maxDuration(250)          // ms
  .onStart(() => { /* ... */ })
  .onEnd((event, success) => {
    if (success) {
      scale.value = withSpring(1.2);
    }
  });
```

### `Gesture.LongPress()` — giữ lâu

```tsx
const longPress = Gesture.LongPress()
  .minDuration(500) // ms
  .onStart(() => { scale.value = withSpring(0.95); })
  .onEnd(() => { scale.value = withSpring(1); });
```

### `Gesture.Pinch()` — zoom

```tsx
const savedScale = useSharedValue(1);

const pinch = Gesture.Pinch()
  .onStart(() => {
    savedScale.value = scale.value;
  })
  .onUpdate((event) => {
    scale.value = savedScale.value * event.scale;
  })
  .onEnd(() => {
    scale.value = withSpring(1); // reset về 1 hoặc giữ giá trị
  });
```

### `Gesture.Rotation()` — xoay

```tsx
const rotation = Gesture.Rotation()
  .onUpdate((event) => {
    rotationValue.value = event.rotation;
  });
```

### `Gesture.Fling()` — vuốt nhanh

```tsx
import { Directions } from 'react-native-gesture-handler';

const fling = Gesture.Fling()
  .direction(Directions.RIGHT | Directions.LEFT)
  .onEnd((event) => {
    if (event.velocityX > 0) {
      // Vuốt phải
      translateX.value = withDecay({ velocity: event.velocityX });
    }
  });
```

---

## Composing gestures

### `Gesture.Simultaneous` — hai gesture cùng lúc

```tsx
// Pinch + Rotation cùng lúc (pinch-to-zoom + rotate)
const composed = Gesture.Simultaneous(pinch, rotation);
```

### `Gesture.Race` — gesture thắng là gesture kích hoạt đầu tiên

```tsx
// Tap HOẶC LongPress (ai kích hoạt trước)
const tapOrLongPress = Gesture.Race(tap, longPress);
```

### `Gesture.Exclusive` — gesture có priority cao hơn thắng

```tsx
// DoubleTap có priority cao hơn SingleTap
const doubleTap = Gesture.Tap().numberOfTaps(2);
const singleTap = Gesture.Tap().numberOfTaps(1);

// Double tap được check trước, nếu fail thì single tap chạy
const gesture = Gesture.Exclusive(doubleTap, singleTap);
```

---

## Gesture state

| Trạng thái | Ý nghĩa |
|-----------|---------|
| `UNDETERMINED` | Chưa bắt đầu |
| `BEGAN` | Touch đã bắt đầu |
| `ACTIVE` | Gesture đang active |
| `FAILED` | Không đáp ứng điều kiện |
| `CANCELLED` | Bị cancel (ví dụ: ScrollView intercept) |
| `END` | Gesture kết thúc thành công |

---

## Kết hợp với ScrollView

```tsx
// Gesture Handler ScrollView để nhận gestures trong ScrollView
import { ScrollView } from 'react-native-gesture-handler';

<ScrollView>
  <GestureDetector gesture={panGesture}>
    <Animated.View />
  </GestureDetector>
</ScrollView>
```

---

## Lưu ý quan trọng

- Tất cả callbacks trong Gesture API (onStart, onUpdate, onEnd) **chạy trên UI thread** — là worklets.
- Gọi `runOnJS(myFunction)()` để trigger JS code (setState, navigation...) từ gesture callbacks.
- Trên Android: `GestureHandlerRootView` phải có `style={{ flex: 1 }}` để fill đúng.
