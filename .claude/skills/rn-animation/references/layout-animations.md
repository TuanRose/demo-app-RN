# Reference: Layout Animations (Reanimated 3)

Layout Animations cho phép animate các thay đổi về vị trí/kích thước khi component mount/unmount/update.

---

## Entering — animation khi component xuất hiện

```tsx
import Animated, { FadeIn, SlideInLeft, ZoomIn, BounceIn } from 'react-native-reanimated';

// Component sẽ fade in khi mount
<Animated.View entering={FadeIn.duration(400)}>
  <Text>Hello</Text>
</Animated.View>

// Với config
<Animated.View entering={SlideInLeft.duration(300).delay(100).springify()}>
  <Text>Slide in</Text>
</Animated.View>
```

**Built-in entering animations:**

| Category | Examples |
|----------|---------|
| Fade | `FadeIn`, `FadeInUp`, `FadeInDown`, `FadeInLeft`, `FadeInRight` |
| Slide | `SlideInLeft`, `SlideInRight`, `SlideInUp`, `SlideInDown` |
| Zoom | `ZoomIn`, `ZoomInDown`, `ZoomInEasyUp` |
| Bounce | `BounceIn`, `BounceInDown`, `BounceInUp` |
| Flip | `FlipInEasyX`, `FlipInEasyY` |
| Roll | `RollInLeft`, `RollInRight` |

---

## Exiting — animation khi component biến mất

```tsx
import { FadeOut, SlideOutRight, ZoomOut } from 'react-native-reanimated';

<Animated.View exiting={FadeOut.duration(300)}>
  <Text>Bye</Text>
</Animated.View>
```

> Khi `exiting` được set, Reanimated sẽ giữ component lại cho đến khi animation xong,
> sau đó mới unmount thật sự.

---

## Layout — animate khi vị trí/kích thước thay đổi

```tsx
import { Layout } from 'react-native-reanimated';

// Khi component thay đổi vị trí (do re-render thay đổi layout)
<Animated.View layout={Layout.springify()}>
  <Text>I will animate position changes</Text>
</Animated.View>
```

**Ví dụ thực tế — list reordering:**
```tsx
{items.map(item => (
  <Animated.View
    key={item.id}
    entering={FadeInDown}
    exiting={FadeOutUp}
    layout={Layout.springify()}  // animate khi item dịch chuyển
  >
    <Text>{item.title}</Text>
  </Animated.View>
))}
```

---

## Keyframe animations

```tsx
import { Keyframe } from 'react-native-reanimated';

const enteringAnimation = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0.5 }],
  },
  50: {
    opacity: 0.8,
    transform: [{ scale: 1.1 }],
    easing: Easing.out(Easing.quad),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
}).duration(400);

<Animated.View entering={enteringAnimation} />
```

---

## Custom entering/exiting animations

```tsx
import { BaseAnimationBuilder } from 'react-native-reanimated';

// Tạo custom entering animation
const CustomFadeScale = () => {
  'worklet';
  const animations = {
    opacity: withTiming(1, { duration: 400 }),
    transform: [{ scale: withSpring(1) }],
  };
  const initialValues = {
    opacity: 0,
    transform: [{ scale: 0.3 }],
  };
  return { animations, initialValues };
};

<Animated.View entering={CustomFadeScale} />
```

---

## LayoutAnimation (Core RN — đơn giản hơn)

LayoutAnimation là API đơn giản hơn của core React Native, không cần Reanimated.

```tsx
import { LayoutAnimation, UIManager, Platform } from 'react-native';

// Android yêu cầu bật manually
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function MyComponent() {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    // Animate TẤT CẢ layout changes trong render tiếp theo
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  return (
    <View>
      <Button onPress={toggleExpand} title="Toggle" />
      {expanded && <View style={{ height: 200 }} />}
    </View>
  );
}
```

**Presets có sẵn:**
- `LayoutAnimation.Presets.easeInEaseOut`
- `LayoutAnimation.Presets.linear`
- `LayoutAnimation.Presets.spring`

**Custom config:**
```tsx
LayoutAnimation.configureNext({
  duration: 300,
  create: { type: 'spring', property: 'scaleXY', springDamping: 0.7 },
  update: { type: 'easeInEaseOut' },
  delete: { type: 'easeInEaseOut', property: 'opacity' },
});
```

> **So sánh:** Reanimated Layout Animations kiểm soát chi tiết hơn, chạy tốt hơn.
> LayoutAnimation đơn giản hơn nhưng ít control hơn — tốt cho quick prototyping.
