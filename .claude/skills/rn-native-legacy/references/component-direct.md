# Chunk: Direct Manipulation

## Khái niệm

Direct Manipulation cho phép thay đổi thuộc tính component mà **không trigger re-render** — tương đương việc sửa trực tiếp DOM node trong browser.

**Chỉ dùng khi:** animation liên tục, phản hồi gesture tức thì, hoặc khi `setState`/`shouldComponentUpdate` vẫn chưa đủ nhanh.

**Cảnh báo:** Trạng thái lưu ở native layer, không phải trong React — dễ xung đột với hàm `render` nếu dùng không cẩn thận.

---

## `setNativeProps`

### Cập nhật style trực tiếp

```tsx
const viewRef = useRef<View>(null);

// Thay đổi opacity mà không re-render
const setOpacity = (value: number) => {
    viewRef.current?.setNativeProps({opacity: value});
};

return <View ref={viewRef} />;
```

### Xóa text của TextInput

```tsx
const inputRef = useRef<TextInput>(null);

const clearInput = () => {
    inputRef.current?.setNativeProps({text: ''});
};

return (
    <>
        <TextInput ref={inputRef} />
        <Button title="Clear" onPress={clearInput} />
    </>
);
```

---

## `forwardRef` cho Composite Components

Không thể gọi `setNativeProps` trực tiếp trên component do người dùng định nghĩa vì chúng không có native view tương ứng. Dùng `React.forwardRef` để forward ref xuống native view con:

```tsx
import React, {forwardRef} from 'react';
import {View, ViewProps} from 'react-native';

// Bọc component tùy chỉnh với forwardRef
const MyButton = forwardRef<View, ViewProps>((props, ref) => (
    <View ref={ref} {...props} />
));

// Dùng được với TouchableOpacity
<TouchableOpacity>
    <MyButton />
</TouchableOpacity>
```

Luôn spread `{...props}` để giữ touch handling và các prop khác hoạt động đúng.

---

## Các phương thức đo lường

Tất cả đều bất đồng bộ, nhận callback.

### `measure(callback)`

Trả về vị trí và kích thước của view trong **viewport**:

```tsx
viewRef.current?.measure((x, y, width, height, pageX, pageY) => {
    // x, y: vị trí tương đối so với parent
    // pageX, pageY: vị trí tuyệt đối trên màn hình
    console.log(`Size: ${width}x${height}, Screen pos: ${pageX},${pageY}`);
});
```

### `measureInWindow(callback)`

Trả về vị trí trong **cửa sổ ứng dụng** (dùng khi app nhúng trong native app có nhiều root view):

```tsx
viewRef.current?.measureInWindow((x, y, width, height) => {
    console.log(`Window position: ${x},${y}`);
});
```

### `measureLayout(relativeToRef, onSuccess, onFail)`

Đo vị trí view **tương đối so với một ancestor**:

```tsx
const childRef = useRef<View>(null);
const parentRef = useRef<View>(null);

childRef.current?.measureLayout(
    parentRef.current,
    (x, y, width, height) => {
        console.log(`Relative to parent: x=${x}, y=${y}`);
    },
    () => console.error('measureLayout failed'),
);
```

---

## `focus()` và `blur()`

Dùng với input hoặc view hỗ trợ focus:

```tsx
const inputRef = useRef<TextInput>(null);

// Yêu cầu focus (mở bàn phím)
inputRef.current?.focus();

// Bỏ focus (đóng bàn phím)
inputRef.current?.blur();
```

---

## Khi nào dùng gì

| Tình huống | Giải pháp |
|-----------|----------|
| Animation liên tục (opacity, transform) | `setNativeProps` |
| Xóa text input không muốn re-render | `setNativeProps({text: ''})` |
| Lấy kích thước/vị trí sau khi render | `measure` hoặc `measureInWindow` |
| Đo vị trí tương đối với parent | `measureLayout` |
| Mở/đóng keyboard theo programmatic | `focus()` / `blur()` |
| Component tùy chỉnh cần nhận ref | `React.forwardRef` |

---

## Quy tắc

- **Không** dùng `setNativeProps` cho prop mà `render` cũng đang quản lý — sẽ gây xung đột khi component re-render.
- Ưu tiên `onLayout` callback thay vì `measure` nếu chỉ cần kích thước ngay sau khi layout.
- `measureLayout` yêu cầu `relativeToRef` phải là **ancestor** thực sự trong cây view.
