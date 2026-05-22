# Reference: Accessibility Props

---

## Props cơ bản

```tsx
<TouchableOpacity
  accessible={true}                    // default true cho interactive elements
  accessibilityLabel="Send message"    // VoiceOver/TalkBack đọc text này
  accessibilityHint="Double tap to send your message" // mô tả thêm hành động
  accessibilityRole="button"           // loại element
  accessibilityState={{ disabled: false }} // trạng thái
>
  <Text>Send</Text>
</TouchableOpacity>

// Text không cần accessibilityLabel nếu nội dung đủ rõ
// Icon buttons BẮT BUỘC phải có accessibilityLabel
<TouchableOpacity accessibilityLabel="Search">
  <Icon name="search" />
</TouchableOpacity>
```

---

## accessibilityRole

```tsx
// Các role phổ biến
accessibilityRole="button"       // tap để thực hiện action
accessibilityRole="link"         // mở URL
accessibilityRole="image"        // hình ảnh
accessibilityRole="imagebutton"  // hình ảnh có thể tap
accessibilityRole="header"       // tiêu đề section
accessibilityRole="text"         // text thường
accessibilityRole="search"       // search field
accessibilityRole="checkbox"     // checkbox
accessibilityRole="radio"        // radio button
accessibilityRole="switch"       // toggle switch
accessibilityRole="tab"          // tab item
accessibilityRole="tablist"      // container của tabs
accessibilityRole="menu"         // menu
accessibilityRole="menuitem"     // menu item
accessibilityRole="combobox"     // dropdown
accessibilityRole="progressbar"  // progress indicator
accessibilityRole="alert"        // thông báo quan trọng
accessibilityRole="none"         // không announce (ẩn khỏi a11y tree)
```

---

## accessibilityState

```tsx
// Trạng thái checkbox
<TouchableOpacity
  accessibilityRole="checkbox"
  accessibilityState={{ checked: isChecked }}
  onPress={toggleCheck}
>

// Trạng thái disabled
<TouchableOpacity
  accessibilityState={{ disabled: !isValid }}
  disabled={!isValid}
>

// Trạng thái selected (tabs, list items)
<TouchableOpacity
  accessibilityRole="tab"
  accessibilityState={{ selected: isActive }}
>

// Trạng thái expanded (accordion)
<TouchableOpacity
  accessibilityState={{ expanded: isOpen }}
  onPress={toggleOpen}
>

// Trạng thái busy (loading)
<View accessibilityState={{ busy: isLoading }}>
```

---

## accessibilityValue

```tsx
// Slider
<Slider
  accessibilityRole="adjustable"
  accessibilityValue={{
    min: 0,
    max: 100,
    now: volume,       // current value
    text: `${volume}%`, // text description
  }}
/>

// Progress bar
<View
  accessibilityRole="progressbar"
  accessibilityValue={{
    min: 0,
    max: 100,
    now: progress,
    text: `${progress}% complete`,
  }}
/>
```

---

## importantForAccessibility (Android)

```tsx
// Android-specific: kiểm soát a11y tree
<View importantForAccessibility="yes">       // luôn accessible
<View importantForAccessibility="no">        // bỏ qua element này
<View importantForAccessibility="no-hide-descendants"> // ẩn cả cây con
```

---

## accessibilityViewIsModal (iOS)

```tsx
// Modal — VoiceOver chỉ focus trong modal
<Modal visible={isVisible}>
  <View accessibilityViewIsModal={true}>
    {/* VoiceOver không thể ra ngoài modal */}
  </View>
</Modal>
```

---

## accessibilityElementsHidden

```tsx
// Ẩn element và tất cả children khỏi a11y tree
<View accessibilityElementsHidden={isHidden}>
  <Text>Decorative content</Text>
</View>
```

---

## Grouping elements

```tsx
// Nhóm nhiều elements thành một accessible element
<View
  accessible={true}
  accessibilityLabel="John Doe, Developer, Online"
  // Screen reader đọc cả group thay vì từng element riêng
>
  <Text>John Doe</Text>
  <Text>Developer</Text>
  <Text>Online</Text>
</View>
```

---

## accessibilityActions

```tsx
// Custom actions — xuất hiện trong VoiceOver rotor / TalkBack menu
<View
  accessibilityActions={[
    { name: 'activate', label: 'Open' },
    { name: 'delete', label: 'Delete item' },
    { name: 'longpress', label: 'Show options' },
  ]}
  onAccessibilityAction={(event) => {
    switch (event.nativeEvent.actionName) {
      case 'activate':
        openItem();
        break;
      case 'delete':
        deleteItem();
        break;
    }
  }}
>
```

---

## Image accessibility

```tsx
// Image có nghĩa → mô tả
<Image
  source={productImage}
  accessibilityLabel="Red Nike running shoes, size 42"
  accessibilityRole="image"
/>

// Image trang trí → ẩn khỏi screen reader
<Image
  source={decorativeBackground}
  accessible={false}
  importantForAccessibility="no" // Android
/>
```

---

## TextInput accessibility

```tsx
<TextInput
  accessibilityLabel="Email address"       // đọc khi focus
  accessibilityHint="Enter your email"     // đọc sau label
  accessibilityRequired={true}             // iOS — announce required field
  accessibilityInvalidated={hasError}      // iOS — announce validation error
  placeholder="email@example.com"         // cũng đọc nếu không có label
  returnKeyType="next"
  blurOnSubmit={false}
  onSubmitEditing={() => passwordRef.current?.focus()}
/>

{hasError && (
  <Text
    accessibilityLiveRegion="polite"       // tự động announce khi text thay đổi
    style={styles.error}
  >
    {errorMessage}
  </Text>
)}
```
