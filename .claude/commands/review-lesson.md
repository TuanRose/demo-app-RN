---
description: Review và đánh giá code trong folder bài học hiện tại. Dùng: /project:review-lesson <đường-dẫn-folder>
---

Review toàn bộ code trong folder bài học được chỉ định (từ $ARGUMENTS, hoặc folder hiện tại nếu không có argument).

## Quy trình review

1. **Đọc `README.md`** của bài học để hiểu mục tiêu và các checklist.

2. **Đọc toàn bộ code** trong folder (`.ts`, `.tsx`, `.js`, native files).

3. **Đánh giá theo các tiêu chí:**

   ### Correctness
   - Code có hoạt động đúng theo mục tiêu bài học không?
   - Có edge cases nào bị bỏ sót không?

   ### React Native Best Practices
   - Dùng đúng API (Legacy vs New Architecture)?
   - `useNativeDriver: true` khi animate?
   - Tránh anonymous functions trong render?
   - `keyExtractor` trong lists?

   ### TypeScript
   - Types đầy đủ, không dùng `any` tùy tiện?
   - Props interface được định nghĩa rõ ràng?

   ### Comments & Documentation
   - Vì đây là **repo học tập**, comments phải giải thích **TẠI SAO** (why), không chỉ WHAT.
   - README.md mục tiêu có được tick off chưa?
   - Ghi chú học tập có đầy đủ không?

   ### Performance
   - Có vấn đề performance rõ ràng nào không (re-render thừa, missing memo, v.v.)?

4. **Output theo format:**

   ```
   ## Kết quả Review: {tên folder}

   ### ✅ Làm tốt
   - ...

   ### ⚠️ Cần cải thiện
   - [file:line] Vấn đề → Gợi ý fix

   ### 📚 Gợi ý học thêm
   - Skill/topic liên quan nên đọc thêm

   ### Điểm tổng thể: X/10
   ```

5. **Hỏi** người dùng có muốn fix ngay các vấn đề được chỉ ra không.
