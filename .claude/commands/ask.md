---
description: Hỏi kỹ thuật về một concept với response có cấu trúc. Dùng: /project:ask <concept hoặc câu hỏi>
---

User muốn hiểu sâu về một concept kỹ thuật trong React Native. Đây là repo học tập — ưu tiên WHY và trade-offs, không phải tutorial surface-level.

## Input

Câu hỏi hoặc concept từ `$ARGUMENTS`.

## Quy trình

1. Nhận diện domain từ câu hỏi → kiểm tra skill tương ứng đã load chưa. Nếu chưa, hỏi user có muốn load không trước khi trả lời.

2. Trả lời theo **EXPLAIN format** (từ rule `04-response-format.md`):
   - Dùng khi nào
   - Cơ chế bên trong (WHY, không phải WHAT)
   - Code example ngắn có comment WHY
   - Trade-offs thực tế
   - Pitfalls nếu có

3. Cuối response: đề xuất câu hỏi follow-up hoặc bài tập thực hành phù hợp với level Senior.

## Ràng buộc

- Không giải thích những gì hiển nhiên với Senior dev (React component lifecycle, useState cơ bản, v.v.)
- Nếu câu hỏi mơ hồ → hỏi lại context cụ thể trước khi trả lời (tránh giải thích sai level)
- Tối đa 1 code example — chọn example nói lên điểm quan trọng nhất
