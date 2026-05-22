---
description: Đánh dấu một mục tiêu đã hoàn thành trong README.md của bài học. Dùng: /project:tick-lesson <folder> [số-thứ-tự]
---

Tick checkbox `- [ ]` → `- [x]` cho một mục tiêu cụ thể trong section `## Mục tiêu` của bài học.

## Input

Từ `$ARGUMENTS`: `<đường-dẫn-folder> [số-thứ-tự]`

Ví dụ:
- `src/01_legacy_native_module 2` → tick mục tiêu số 2
- `src/01_legacy_native_module` → hiển thị danh sách và hỏi chọn

## Quy trình

1. **Đọc `<folder>/README.md`** — tìm section `## Mục tiêu`.

2. **Liệt kê tất cả mục tiêu** trong section đó (cả `- [ ]` lẫn `- [x]`), đánh số từ 1.

3. **Nếu không có số thứ tự** từ arguments: hiển thị danh sách có đánh số và hỏi người dùng chọn mục nào.

4. **Nếu có số thứ tự**: tìm dòng tương ứng.
   - Nếu đã là `- [x]`: thông báo mục này đã được tick rồi.
   - Nếu là `- [ ]`: cập nhật thành `- [x]`.

5. **Cập nhật `src/README.md`** (file index tổng hợp) nếu bài học đó có trong bảng Modules — cập nhật cột Trạng thái thành phần trăm hoàn thành.

6. **Báo cáo:**
   ```
   ✅ Đã tick: "[nội dung mục tiêu]"
   📊 Tiến độ: X/Y mục tiêu hoàn thành (Z%)
   ```
   Nếu tất cả đã tick: thông báo bài học hoàn thành và gợi ý chạy `/project:review-lesson`.
