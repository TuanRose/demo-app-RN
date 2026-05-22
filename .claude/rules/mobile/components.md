---
paths: src/**/*.tsx, App.tsx
---
# React Native Component Rules

## Structure mỗi component
1. Imports
2. Types / interfaces
3. Component function
4. `StyleSheet.create({...})`
5. Export default

## Styling
- LUÔN dùng `StyleSheet.create` — KHÔNG inline style objects (`style={{ margin: 8 }}` trong render)
- Ngoại lệ duy nhất: dynamic value không thể pre-define (ví dụ: `{ width: dynamicWidth }`)

## Performance
- Wrap component với `React.memo` nếu nhận props phức tạp và được render nhiều lần
- KHÔNG tạo inline arrow functions trong JSX khi là list items
- Dùng `useCallback` cho event handlers pass xuống children
- Dùng `useMemo` cho derived data tính toán nặng

## Animations
- LUÔN set `useNativeDriver: true` trừ khi animate layout property (width, height, margin)
- `useNativeDriver: true` chạy trên UI thread → tránh drop frame khi JS thread bận

## Lists
- `keyExtractor` phải trả về stable ID, KHÔNG dùng index
- Set `removeClippedSubviews={true}` cho list dài
- Cân nhắc `getItemLayout` nếu item có fixed height và cần `scrollToIndex`

## SafeArea
- Dùng `useSafeAreaInsets()` từ `react-native-safe-area-context` cho manual inset
- Wrap màn hình ngoài cùng với `SafeAreaProvider` (đã có trong App.tsx)
