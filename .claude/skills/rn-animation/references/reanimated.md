# Reference: React Native Reanimated 3

Reanimated 3 là thư viện animation hiệu năng cao nhất cho React Native.
Code trong **worklets** chạy trực tiếp trên **UI thread** — không có JS bridge overhead.

---

## Cài đặt

```bash
npm install react-native-reanimated
# Thêm plugin vào babel.config.js:
# plugins: ['react-native-reanimated/plugin'] — PHẢI là plugin cuối cùng
cd ios && bundle exec pod install
```

`babel.config.js`:
```js
module.exports = {
  plugins: [
    // ... other plugins
    'react-native-reanimated/plugin', // PHẢI là cuối cùng
  ],
};
```

---

## Core hooks

### `useSharedValue` — giá trị chia sẻ giữa JS và UI thread

```tsx
import { useSharedValue, withTiming, withSpring } from 'react-native-reanimated';

const width = useSharedValue(100);

// Đọc và ghi
width.value = 200;           // instant, không animate
width.value = withTiming(200); // animate

// React Compiler safe (RN 0.76+)
width.set(v => v + 10);
const current = width.get();
```

### `useAnimatedStyle` — style phản ứng theo shared values

```tsx
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => ({
  // Hàm này chạy trên UI thread (worklet)
  width: width.value,
  opacity: opacity.value,
  transform: [{ scale: scale.value }],
}));

// Bắt buộc dùng Animated.View (không phải View thường)
<Animated.View style={animatedStyle} />
```

---

## Animation functions

### `withTiming` — easing-based

```tsx
import { withTiming, Easing } from 'react-native-reanimated';

width.value = withTiming(200, {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1), // cubic bezier
  // easing: Easing.out(Easing.quad)
  // easing: Easing.elastic(1.5)
});
```

### `withSpring` — vật lý lò xo

```tsx
import { withSpring } from 'react-native-reanimated';

scale.value = withSpring(1.2, {
  damping: 10,      // lực cản (thấp = bounce nhiều hơn)
  stiffness: 100,   // độ cứng (cao = bounce nhanh hơn)
  mass: 1,
  overshootClamping: false, // true = không vượt quá toValue
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
});
```

### `withDecay` — giảm dần theo velocity

```tsx
import { withDecay } from 'react-native-reanimated';

translateX.value = withDecay({
  velocity: gesture.velocityX,
  deceleration: 0.997,
  clamp: [0, SCREEN_WIDTH], // giới hạn range (tùy chọn)
});
```

### `withDelay` — delay trước khi animate

```tsx
opacity.value = withDelay(200, withTiming(1, { duration: 300 }));
```

### `withSequence` — chạy tuần tự

```tsx
import { withSequence } from 'react-native-reanimated';

scale.value = withSequence(
  withTiming(1.2, { duration: 100 }),
  withSpring(1),
);
```

### `withRepeat` — lặp lại

```tsx
import { withRepeat } from 'react-native-reanimated';

rotation.value = withRepeat(
  withTiming(360, { duration: 1000 }),
  -1,    // -1 = lặp vô hạn; số dương = số lần lặp
  false, // reverse = true → animate ngược lại sau mỗi lần
);
```

---

## Worklets và JS/UI thread communication

```tsx
import { runOnJS, runOnUI } from 'react-native-reanimated';

// Worklet: function chạy trên UI thread
// Thêm 'worklet' directive hoặc dùng trong useAnimatedStyle/useAnimatedGestureHandler
function myWorklet(value: number) {
  'worklet'; // directive bắt buộc nếu định nghĩa ngoài hook
  return value * 2;
}

// Gọi JS function từ worklet (UI thread → JS thread)
// Cần vì setState, navigation, v.v... chỉ chạy trên JS thread
function onAnimationComplete() {
  setIsAnimating(false); // JS function
}

const animatedStyle = useAnimatedStyle(() => {
  if (progress.value >= 1) {
    runOnJS(onAnimationComplete)(); // an toàn để gọi JS từ UI thread
  }
  return { width: progress.value * 300 };
});

// Gọi UI thread function từ JS thread
runOnUI(() => {
  'worklet';
  progress.value = withTiming(1);
})();
```

> **Quan trọng:** Không được gọi JS functions trực tiếp trong worklets — dùng `runOnJS`.
> Không được đọc/ghi React state trong worklets — chỉ shared values.

---

## `interpolate` — map ranges

```tsx
import { interpolate, Extrapolation } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => {
  const opacity = interpolate(
    scrollY.value,
    [0, 100, 200],      // inputRange
    [1, 0.5, 0],        // outputRange
    Extrapolation.CLAMP // không vượt quá range
  );
  return { opacity };
});
```

---

## `useDerivedValue` — derived shared value

```tsx
import { useDerivedValue } from 'react-native-reanimated';

// Tính toán từ shared value khác, auto-update khi dependencies thay đổi
const double = useDerivedValue(() => width.value * 2);
```

---

## Animated components

```tsx
import Animated from 'react-native-reanimated';

// Built-in
<Animated.View style={animatedStyle} />
<Animated.Text style={animatedStyle} />
<Animated.ScrollView onScroll={scrollHandler} />
<Animated.FlatList ... />
<Animated.Image style={animatedStyle} />

// Custom component
import { createAnimatedComponent } from 'react-native-reanimated';
const AnimatedPressable = createAnimatedComponent(Pressable);
```

---

## Scroll handler

```tsx
import { useAnimatedScrollHandler } from 'react-native-reanimated';

const scrollY = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler((event) => {
  // Chạy trên UI thread
  scrollY.value = event.contentOffset.y;
});

<Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16} />
```
