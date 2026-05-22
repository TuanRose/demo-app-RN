# Reference: Screen Reader — VoiceOver & TalkBack

---

## Bật Screen Reader

### VoiceOver (iOS)
```
Settings → Accessibility → VoiceOver → On
# Hoặc
Settings → Accessibility → Accessibility Shortcut → VoiceOver
# Triple-click side button để toggle

# Simulator
Hardware → Toggle Software Keyboard
Simulator → Device → Accessibility → Toggle VoiceOver
```

### TalkBack (Android)
```
Settings → Accessibility → TalkBack → On
# Hoặc
Settings → Accessibility → Accessibility Button → TalkBack

# Emulator
adb shell settings put secure enabled_accessibility_services \
  com.google.android.marvin.talkback/.TalkBackService
```

---

## Gestures cơ bản

### VoiceOver (iOS)
| Gesture | Action |
|---------|--------|
| Single tap | Focus element, đọc |
| Swipe right/left | Di chuyển next/prev element |
| Double tap | Activate element (như tap) |
| Two-finger swipe up | Đọc từ đầu |
| Three-finger swipe | Scroll |
| Rotor (two-finger rotate) | Thay đổi navigation mode |

### TalkBack (Android)
| Gesture | Action |
|---------|--------|
| Single tap | Focus element |
| Double tap | Activate element |
| Swipe right/left | Di chuyển next/prev element |
| Swipe up then down | Back |
| Swipe down then up | Mở TalkBack menu |

---

## AccessibilityInfo API

```tsx
import { AccessibilityInfo } from 'react-native';

// Kiểm tra screen reader bật không
const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();

// Lắng nghe thay đổi
useEffect(() => {
  const subscription = AccessibilityInfo.addEventListener(
    'screenReaderChanged',
    (isScreenReaderEnabled) => {
      setScreenReaderEnabled(isScreenReaderEnabled);
    }
  );
  return () => subscription.remove();
}, []);

// Hook tiện dụng
function useScreenReader() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(setIsEnabled);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setIsEnabled);
    return () => sub.remove();
  }, []);

  return isEnabled;
}
```

---

## Announce message

```tsx
import { AccessibilityInfo } from 'react-native';

// Đọc message ngay lập tức (không cần user focus)
function announceForScreenReader(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

// Dùng cho: success/error messages, loading states, dynamic content
function handleFormSubmit() {
  submitForm()
    .then(() => {
      AccessibilityInfo.announceForAccessibility('Form submitted successfully');
    })
    .catch(() => {
      AccessibilityInfo.announceForAccessibility('Error: Please check your input');
    });
}
```

---

## setAccessibilityFocus

```tsx
import { AccessibilityInfo, findNodeHandle } from 'react-native';

const ref = useRef(null);

// Set focus về element cụ thể (sau navigation, modal open)
function focusElement() {
  const handle = findNodeHandle(ref.current);
  if (handle) {
    AccessibilityInfo.setAccessibilityFocus(handle);
  }
}

// Dùng sau khi modal mở
useEffect(() => {
  if (isModalVisible) {
    // Delay nhỏ để element render xong
    setTimeout(() => focusElement(), 100);
  }
}, [isModalVisible]);
```

---

## accessibilityLiveRegion

Live regions tự động announce khi content thay đổi.

```tsx
// 'polite' — announce khi screen reader rảnh (cho non-critical updates)
<Text accessibilityLiveRegion="polite">
  {statusMessage}
</Text>

// 'assertive' — announce ngay lập tức, interrupt (cho critical alerts)
<Text accessibilityLiveRegion="assertive">
  {errorMessage}
</Text>

// 'none' — không announce khi thay đổi (default)
<Text accessibilityLiveRegion="none">
  {tickerContent}
</Text>
```

---

## Test với jest-a11y

```tsx
import { render } from '@testing-library/react-native';

test('button has accessible label', () => {
  const { getByRole } = render(
    <TouchableOpacity accessibilityLabel="Submit form" accessibilityRole="button">
      <Text>Submit</Text>
    </TouchableOpacity>
  );

  const button = getByRole('button', { name: 'Submit form' });
  expect(button).toBeTruthy();
});

test('image has alt text', () => {
  const { getByLabelText } = render(
    <Image
      source={logo}
      accessibilityLabel="Company logo"
      accessibilityRole="image"
    />
  );
  expect(getByLabelText('Company logo')).toBeTruthy();
});
```

---

## Các tình huống cần chú ý

### Modal — trap focus
```tsx
<Modal visible={isOpen}>
  <View accessibilityViewIsModal={true}>
    {/* Focus không thoát ra ngoài modal */}
    <Text>Modal title</Text>
    <TouchableOpacity onPress={close} accessibilityLabel="Close modal">
      <Icon name="close" />
    </TouchableOpacity>
  </View>
</Modal>
```

### Loading states
```tsx
<View
  accessible={true}
  accessibilityLabel={isLoading ? 'Loading, please wait' : 'Content loaded'}
  accessibilityState={{ busy: isLoading }}
>
  {isLoading ? <ActivityIndicator /> : <Content />}
</View>
```

### List items
```tsx
<FlatList
  data={items}
  renderItem={({ item, index }) => (
    <TouchableOpacity
      accessibilityLabel={`${item.name}, ${item.description}`}
      accessibilityHint={`Item ${index + 1} of ${items.length}`}
      accessibilityRole="button"
    >
      <ItemContent item={item} />
    </TouchableOpacity>
  )}
/>
```

### Form errors
```tsx
<TextInput
  value={email}
  onChangeText={setEmail}
  accessibilityLabel="Email"
  // iOS: announce invalid state
  accessibilityInvalidated={!!emailError}
/>
{emailError && (
  <Text
    accessibilityLiveRegion="polite"
    role="alert"
  >
    {emailError}
  </Text>
)}
```
