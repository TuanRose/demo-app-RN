---
paths: src/**/*.tsx, src/**/*.ts
---
# Performance Rules

## Threading model (quan trọng để hiểu trước khi optimize)
- **JS thread**: logic, React reconciliation, state updates
- **UI thread** (native): rendering, gestures, animations với `useNativeDriver`
- **Shadow thread**: layout calculation (Yoga)
- Bridge / JSI là bottleneck — minimize data crossing threads

## Re-render prevention
- `React.memo` cho component nhận props ổn định
- Context value phải memoize: `useMemo(() => ({ a, b }), [a, b])`
- Tách context nếu một phần thay đổi thường xuyên hơn phần còn lại

## JS thread
- Heavy computation → `useMemo` hoặc move ra ngoài component
- Defer non-critical work: `InteractionManager.runAfterInteractions(() => { ... })`
- KHÔNG block JS thread trong animation — dùng Reanimated worklets

## Image
- Dùng `<Image>` từ RN core cho bài học; trong production dùng `expo-image` hoặc `FastImage`
- Set `width` + `height` tường minh để tránh layout reflow

## Debugging performance
- Bật Performance Monitor: Dev Menu → Perf Monitor
- FPS < 60 ở JS = JS thread bận; FPS < 60 ở UI = native thread bận
- Xóa tất cả `console.log` khi đo performance
