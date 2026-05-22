# Reference: FlatList / VirtualizedList Optimization

---

## Các khái niệm

| Khái niệm | Ý nghĩa |
|-----------|---------|
| **Viewport** | Vùng content đang hiển thị |
| **Window** | Vùng được mount (lớn hơn viewport) |
| **Blank areas** | Vùng trắng khi render không kịp scroll |
| **Memory consumption** | Tổng thông tin list giữ trong bộ nhớ |

---

## Props hiệu năng của FlatList

| Prop | Default | Mô tả |
|------|---------|-------|
| `removeClippedSubviews` | Android: `true`, khác: `false` | Detach views ngoài viewport khỏi native hierarchy |
| `maxToRenderPerBatch` | `10` | Số items render mỗi batch khi scroll |
| `updateCellsBatchingPeriod` | `50ms` | Khoảng thời gian giữa các batch render |
| `initialNumToRender` | `10` | Số items render lần đầu |
| `windowSize` | `21` | Kích thước window tính theo viewport height (10 trên + 1 giữa + 10 dưới) |

### Trade-offs

**`removeClippedSubviews`**
- ✅ Giảm thời gian main thread, ít dropped frames
- ❌ Có thể mất content với complex transforms hoặc absolute positioning

**`maxToRenderPerBatch`**
- ✅ Tăng → ít blank areas, fill rate cao hơn
- ❌ Tăng → JS chạy lâu hơn mỗi batch, block event processing (giảm responsiveness)

**`updateCellsBatchingPeriod`**
- ✅ Kết hợp với `maxToRenderPerBatch` để điều chỉnh rendering
- ❌ Ít batch → nhiều blank areas; nhiều batch → giảm responsiveness

**`initialNumToRender`**
- ✅ Đủ lớn = không có blank area lúc load
- ❌ Quá nhỏ = blank areas trên initial render

**`windowSize`**
- ✅ Lớn hơn → ít blank areas khi scroll nhanh
- ❌ Lớn hơn → tốn memory nhiều hơn

---

## Tối ưu Item Component

### 1. Memoize với `React.memo()`

```tsx
import React, {memo} from 'react';

const MyListItem = memo(
  ({title}: {title: string}) => (
    <View>
      <Text>{title}</Text>
    </View>
  ),
  (prevProps, nextProps) => prevProps.title === nextProps.title,
  // trả về true → skip re-render
);
```

### 2. Dùng `getItemLayout` (nếu items có chiều cao cố định)

Tránh async layout measurement — tăng tốc scroll đáng kể:

```tsx
<FlatList
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### 3. Dùng `keyExtractor`

```tsx
<FlatList keyExtractor={(item) => item.id} />
```

### 4. Tránh anonymous function trong `renderItem`

```tsx
// Sai
<FlatList renderItem={({item}) => <MyItem title={item.title} />} />

// Đúng
const renderItem = useCallback(
  ({item}) => <MyItem title={item.title} />,
  [],
);
<FlatList renderItem={renderItem} />
```

### 5. Dùng cached images

Dùng `@d11/react-native-fast-image` thay `Image` để tăng tốc load và giảm JS thread blocking.

### 6. Giữ item component nhẹ

- Tránh heavy images — dùng thumbnail/cropped
- Minimize effects, interactions trong item
- Hiển thị chi tiết ở detail screen

---

## Thư viện thay thế FlatList

Khi FlatList vẫn không đủ:

| Thư viện | Điểm mạnh |
|----------|----------|
| [FlashList](https://github.com/shopify/flash-list) | Tái sử dụng cell views, gần native performance |
| [Legend List](https://github.com/legendapp/legend-list) | Hiệu năng cao cho danh sách lớn |
