---
description: Xem tổng quan tiến độ hoàn thành tất cả bài học trong src/. Dùng: /project:progress
---

Quét toàn bộ folder bài học trong `src/` và hiển thị báo cáo tiến độ học tập.

## Quy trình

1. **Liệt kê tất cả folder** trong `src/` khớp format `{02d}_{tên}`:
   ```bash
   ls -d src/*/
   ```

2. **Với mỗi folder**, đọc `README.md` và đếm trong section `## Mục tiêu`:
   - Tổng mục tiêu = số dòng `- [ ]` + `- [x]`
   - Đã hoàn thành = số dòng `- [x]`
   - Phần trăm = `(đã hoàn thành / tổng) * 100`

3. **Hiển thị báo cáo:**

   ```
   ## Tiến độ học tập — React Native

   | # | Bài học | Hoàn thành | % |
   |---|---------|-----------|---|
   | 01 | legacy_native_module | 3/5 | 60% |
   | 02 | turbo_module | 0/4 | 0% |

   **Tổng cộng: X/Y mục tiêu (Z%)**
   **Bài đang học: XX** ← folder cuối cùng có tiến độ > 0% nhưng < 100%
   ```

4. **Đề xuất tiếp theo:**
   - Nếu có bài chưa bắt đầu (0%): gợi ý `/project:new-lesson` hoặc tiếp tục bài hiện tại
   - Nếu bài hiện tại > 0% và < 100%: nhắc `/project:tick-lesson` khi hoàn thành mục tiêu
   - Nếu tất cả 100%: chúc mừng và gợi ý `/project:review-lesson` tổng kết
