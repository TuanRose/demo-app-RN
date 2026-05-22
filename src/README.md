# src/ — Learning Modules

Thư mục này chứa tất cả code học tập, thực hành và demo cho từng chủ đề React Native.

---

## Quy ước đặt tên folder

```
{số_thứ_tự:02d}_{tên_skill}

Ví dụ:
01_legacy_native_module
02_legacy_native_component
03_new_architecture_turbo_module
04_fabric_component
05_performance_flatlist
```

- Số thứ tự 2 chữ số để sort đúng thứ tự
- Tên dùng `snake_case`, ngắn gọn, mô tả rõ chủ đề
- Tạo folder mới bằng lệnh `/project:new-lesson <tên>`

---

## Cấu trúc mỗi folder bài học

```
{số}_{tên}/
├── README.md          ← BẮT BUỘC: mục tiêu, ghi chú, checklist học tập
├── specs/             ← TypeScript specs (dùng với New Architecture)
├── components/        ← React Native components demo
├── screens/           ← Demo screens (dùng để test trong app)
└── utils/             ← Utility / helper functions
```

> Chỉ tạo những subfolder thực sự cần — đừng tạo folder rỗng.

---

## Quy ước comments (BẮT BUỘC cho repo học tập)

Vì đây là repo **học tập và ôn tập**, code phải có chú thích giải thích **TẠI SAO** (why), không chỉ WHAT.

```tsx
// ✅ Đúng — giải thích TẠI SAO
// useNativeDriver: true chạy animation trên UI thread thay vì JS thread
// → tránh lag khi JS thread bận (API calls, heavy computation)
Animated.timing(opacity, { toValue: 1, useNativeDriver: true }).start();

// ❌ Sai — chỉ mô tả WHAT (code đã tự nói lên điều này)
// Start animation
Animated.timing(opacity, { toValue: 1, useNativeDriver: true }).start();
```

```tsx
// ✅ Đúng — giải thích ràng buộc không hiển nhiên
// getItemLayout bắt buộc khi dùng scrollToIndex() — không có nó RN
// không thể tính offset mà không render tất cả items trước
getItemLayout={(_, index) => ({
  length: ITEM_HEIGHT,
  offset: ITEM_HEIGHT * index,
  index,
})}
```

---

## Commands hữu ích

```bash
# Tạo bài học mới
/project:new-lesson turbo_module_android

# Review code trong folder hiện tại
/project:review-lesson src/03_turbo_module
```

---

## Modules hiện có

| # | Folder | Skill | Trạng thái |
|---|--------|-------|-----------|
| — | *(chưa có bài nào)* | — | — |
