# Reference: Animated API (Core React Native)

Animated API là cách gốc của React Native để tạo animations. Chạy tốt với `useNativeDriver: true`.

---

## Khởi tạo

```tsx
import { Animated, useRef, useEffect } from 'react';

// Giá trị 1 chiều
const opacity = useRef(new Animated.Value(0)).current;

// Giá trị 2 chiều (panning, dragging)
const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
```

---

## Các loại animation

### `Animated.timing` — chạy theo thời gian + easing

```tsx
Animated.timing(opacity, {
  toValue: 1,
  duration: 300,           // ms
  easing: Easing.out(Easing.quad), // từ react-native
  delay: 0,
  useNativeDriver: true,   // bắt buộc khi có thể
}).start(() => {
  // callback khi xong
});
```

### `Animated.spring` — vật lý lò xo

```tsx
Animated.spring(scale, {
  toValue: 1,
  tension: 40,       // độ cứng lò xo (mặc định 40)
  friction: 7,       // lực cản (mặc định 7) — giá trị cao hơn = ít bounce
  useNativeDriver: true,
}).start();
```

### `Animated.decay` — giảm dần theo velocity (ném ra rồi trượt)

```tsx
Animated.decay(pan, {
  velocity: { x: gestureState.vx, y: gestureState.vy },
  deceleration: 0.997, // gần 1 = trượt xa hơn
  useNativeDriver: true,
}).start();
```

---

## Composing animations

```tsx
// Chạy tuần tự
Animated.sequence([
  Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
  Animated.timing(scale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
]).start();

// Chạy song song
Animated.parallel([
  Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
  Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
]).start();

// Lặp lại
Animated.loop(
  Animated.sequence([
    Animated.timing(rotation, { toValue: 1, duration: 800, useNativeDriver: true }),
    Animated.timing(rotation, { toValue: 0, duration: 800, useNativeDriver: true }),
  ])
).start();

// Stagger — parallel với delay tăng dần
Animated.stagger(100, items.map(item =>
  Animated.spring(item.opacity, { toValue: 1, useNativeDriver: true })
)).start();
```

---

## Interpolate — map giá trị sang range khác

```tsx
// Số → số
const width = opacity.interpolate({
  inputRange: [0, 1],
  outputRange: [0, 300],
});

// Số → string (màu, đơn vị)
const rotation = progress.interpolate({
  inputRange: [0, 1],
  outputRange: ['0deg', '360deg'],
});

// Số → màu (cần extrapolate: 'clamp')
const backgroundColor = scrollY.interpolate({
  inputRange: [0, 200],
  outputRange: ['rgba(255,255,255,0)', 'rgba(0,0,0,0.9)'],
  extrapolate: 'clamp', // không vượt quá range
});

// Multiple ranges (dead zones, snap points)
const translateX = scrollX.interpolate({
  inputRange: [-300, -100, 0, 100, 300],
  outputRange: [300, 0, 0, 0, -300],
});
```

---

## Dùng với components

```tsx
// Chỉ Animated.View, Animated.Text, Animated.Image, Animated.ScrollView
// Animated.FlatList, Animated.SectionList mới animate được

<Animated.View style={{ opacity, transform: [{ scale }] }}>
  <Text>Content</Text>
</Animated.View>

// Custom component
const AnimatedButton = Animated.createAnimatedComponent(TouchableOpacity);
```

---

## Native Driver — quan trọng nhất

```tsx
// ✅ Có thể dùng useNativeDriver: true
// transform: scale, rotate, translate
// opacity

// ❌ KHÔNG thể dùng useNativeDriver: true
// width, height, top, left, margin, padding (layout props)
// backgroundColor, borderRadius (không phải tất cả)
```

> **Tại sao quan trọng:** `useNativeDriver: true` chạy animation hoàn toàn trên UI thread,
> không qua JS bridge → 60fps ngay cả khi JS thread bận (API calls, heavy computation).

---

## Theo dõi gestures với PanResponder

```tsx
const pan = useRef(new Animated.ValueXY()).current;

const panResponder = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x, dy: pan.y }],
      { useNativeDriver: false } // PanResponder không hỗ trợ native driver
    ),
    onPanResponderRelease: () => {
      // Spring về origin
      Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
    },
  })
).current;

return (
  <Animated.View
    {...panResponder.panHandlers}
    style={{ transform: pan.getTranslateTransform() }}
  />
);
```

---

## Android: thêm perspective cho 3D transforms

```tsx
// Android yêu cầu perspective khi dùng rotateX/Y
<Animated.View
  style={{
    transform: [
      { rotateY: rotateAnim },
      { perspective: 1000 }, // bắt buộc trên Android
    ],
  }}
/>
```
