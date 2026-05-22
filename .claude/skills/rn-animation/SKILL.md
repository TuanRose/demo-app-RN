# Skill: rn-animation

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Animated API (core RN) | Animated.Value, timing/spring/decay, interpolate, native driver |
| Reanimated 3 | useSharedValue, useAnimatedStyle, worklets, withTiming/Spring |
| Gesture Handler | GestureDetector, Gesture.Pan/Tap/Pinch, composing gestures |
| Layout Animations | Entering/Exiting/Layout transitions, LayoutAnimation |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Animated.Value, timing, spring, decay, interpolate, native driver, PanResponder | `references/animated-api.md` |
| useSharedValue, useAnimatedStyle, withTiming, withSpring, worklets, runOnJS | `references/reanimated.md` |
| Gesture.Pan, Gesture.Tap, GestureDetector, drag & drop, pinch-to-zoom | `references/gesture-handler.md` |
| Entering/Exiting animations, Layout transitions, shared element, LayoutAnimation | `references/layout-animations.md` |

---

## Quy tắc chung

- `useNativeDriver: true` khi nào có thể — animation chạy trên UI thread, không bị block bởi JS.
- **Animated API**: chỉ animate `transform` và `opacity` với native driver — không animate layout props.
- **Reanimated**: code trong worklet chạy trên UI thread — không gọi JS functions trực tiếp, dùng `runOnJS`.
- Reanimated và Gesture Handler hoạt động tốt nhất khi kết hợp cùng nhau.
- Trên Android, thêm `perspective: 1000` vào transform khi dùng rotateY/X.
