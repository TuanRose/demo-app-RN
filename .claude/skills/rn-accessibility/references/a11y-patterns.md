# Reference: Accessibility Patterns

---

## Focus Management

```tsx
import { AccessibilityInfo, findNodeHandle, useRef } from 'react';

function useFocusOnMount() {
  const ref = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const node = findNodeHandle(ref.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    }, 100); // nhỏ delay để ensure render xong

    return () => clearTimeout(timeout);
  }, []);

  return ref;
}

// Dùng trong screen mới hoặc modal
function NewScreen() {
  const headingRef = useFocusOnMount();

  return (
    <View>
      <Text ref={headingRef} accessibilityRole="header">
        Screen Title
      </Text>
    </View>
  );
}
```

---

## Accessible Custom Components

### Toggle Switch
```tsx
function AccessibleToggle({ value, onChange, label }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={value ? 'Tap to disable' : 'Tap to enable'}
      onPress={() => onChange(!value)}
      style={styles.toggle}
    >
      <View style={[styles.thumb, value && styles.thumbActive]} />
    </TouchableOpacity>
  );
}
```

### Accordion
```tsx
function AccessibleAccordion({ title, children }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={title}
        accessibilityHint={isExpanded ? 'Tap to collapse' : 'Tap to expand'}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text>{title}</Text>
        <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} />
      </TouchableOpacity>

      {isExpanded && (
        <View accessibilityLiveRegion="polite">
          {children}
        </View>
      )}
    </View>
  );
}
```

### Rating Stars
```tsx
function AccessibleRating({ rating, onRate, maxRating = 5 }: Props) {
  return (
    <View
      accessible={true}
      accessibilityRole="adjustable"
      accessibilityLabel="Rating"
      accessibilityValue={{
        min: 1,
        max: maxRating,
        now: rating,
        text: `${rating} out of ${maxRating} stars`,
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Increase rating' },
        { name: 'decrement', label: 'Decrease rating' },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment') {
          onRate(Math.min(rating + 1, maxRating));
        } else if (event.nativeEvent.actionName === 'decrement') {
          onRate(Math.max(rating - 1, 1));
        }
      }}
    >
      {Array.from({ length: maxRating }, (_, i) => (
        <TouchableOpacity
          key={i}
          accessible={false} // parent group handles a11y
          onPress={() => onRate(i + 1)}
        >
          <Icon name={i < rating ? 'star' : 'star-outline'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}
```

---

## Keyboard Navigation (React Native Web / physical keyboards)

```tsx
// Trap focus trong modal với keyboard navigation
function FocusTrap({ children, isActive }: Props) {
  const firstRef = useRef(null);
  const lastRef = useRef(null);

  // Khi Tab press trên last element → jump về first
  // Khi Shift+Tab press trên first element → jump về last
  // Implement bằng onKeyPress + manual focus management

  return (
    <View>
      {React.cloneElement(React.Children.toArray(children)[0] as React.ReactElement, {
        ref: firstRef,
      })}
      {children}
      {React.cloneElement(React.Children.toArray(children)[children.length - 1] as React.ReactElement, {
        ref: lastRef,
      })}
    </View>
  );
}
```

---

## Color Contrast

```tsx
import { Appearance } from 'react-native';

// WCAG AA: 4.5:1 cho text thường, 3:1 cho large text (18sp+)
// WCAG AAA: 7:1 cho text thường

const Colors = {
  // ✅ Contrast ratio > 4.5:1
  textPrimary: '#1A1A1A',    // trên #FFFFFF background
  textSecondary: '#6B7280',  // contrast 4.6:1 trên #FFFFFF
  textDisabled: '#9CA3AF',   // contrast 2.6:1 (chấp nhận cho disabled)

  // ❌ Contrast quá thấp
  textLight: '#C4C4C4',      // contrast 1.6:1 trên #FFFFFF
};

// Check contrast trong code
function getContrastRatio(foreground: string, background: string): number {
  // Implement WCAG contrast calculation
  // Dùng thư viện: color-contrast (npm)
}
```

---

## Reduce Motion

```tsx
import { AccessibilityInfo } from 'react-native';

function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  return reduceMotion;
}

// Trong animation
function AnimatedComponent() {
  const reduceMotion = useReduceMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX: reduceMotion
        ? withTiming(0, { duration: 0 })    // instant khi reduce motion
        : withSpring(offset.value),
    }],
  }));
}
```

---

## Dynamic Type / Font Scaling

```tsx
import { Text, StyleSheet } from 'react-native';

// ✅ Cho phép text scale theo system font size
<Text style={styles.body}>Content</Text>

// ❌ Lock font size (không nên)
<Text allowFontScaling={false} style={styles.body}>Content</Text>

// ✅ Nếu cần giới hạn, set maxFontSizeMultiplier
<Text maxFontSizeMultiplier={1.5}>Content</Text>

// Kiểm tra font scale hiện tại
import { PixelRatio } from 'react-native';
const fontScale = PixelRatio.getFontScale(); // 1.0 = default, 1.3 = large
```

---

## Accessible Navigation

```tsx
// Screen reader announce screen changes
function useScreenA11yFocus(screenName: string) {
  useFocusEffect(
    useCallback(() => {
      AccessibilityInfo.announceForAccessibility(`${screenName} screen`);
    }, [screenName])
  );
}

// Dùng trong mỗi screen
function HomeScreen() {
  useScreenA11yFocus('Home');
  // ...
}
```

---

## A11y Testing Checklist

```
□ Tất cả interactive elements có accessibilityLabel
□ Icons không có text → có accessibilityLabel
□ Images có nghĩa → có accessibilityLabel
□ Images trang trí → accessible={false}
□ Form fields có label (qua accessibilityLabel hoặc <Text> kề)
□ Error messages có liveRegion="polite"
□ Modals có accessibilityViewIsModal={true}
□ Disabled elements có accessibilityState={{ disabled: true }}
□ Loading states có accessibilityState={{ busy: true }}
□ Color contrast đạt WCAG AA (4.5:1)
□ Text không lock font scale
□ Animations tôn trọng Reduce Motion preference
□ Test thực tế với VoiceOver và TalkBack
```
