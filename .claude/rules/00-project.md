# Project Context

## Đây là repo học tập — không phải production app

Mục tiêu: thực hành và ôn luyện React Native theo từng skill domain.  
Mỗi bài học nằm trong `src/{02d}_{tên_skill}/`.

## Quy tắc bắt buộc

### Comments
- **Repo học tập → comments phải giải thích WHY (TẠI SAO), không phải WHAT.**
- WHAT đã có tên hàm/biến nói rồi — WHY mới là kiến thức cần ghi lại.
- Ưu tiên giải thích: ràng buộc ẩn, trade-off, lý do chọn API này thay API kia.

```tsx
// ✅ Đúng — WHY không hiển nhiên
// useNativeDriver: true chạy animation trên UI thread → tránh jank khi JS thread bận
Animated.timing(val, { toValue: 1, useNativeDriver: true }).start();

// ❌ Sai — chỉ WHAT, code đã tự nói
// Start animation
Animated.timing(val, { toValue: 1, useNativeDriver: true }).start();
```

### Non-negotiable
- KHÔNG commit secrets, hardcoded URLs, API keys
- KHÔNG dùng `console.log` trong code bài học — dùng comment hoặc xóa sau debug
- LUÔN handle loading + error states trong component demo
- TypeScript strict — KHÔNG dùng `any` không có lý do
