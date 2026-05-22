---
description: So sánh hai approach/thư viện và đưa recommendation cụ thể. Dùng: /project:compare <A> vs <B> [cho use-case]
---

User muốn so sánh hai lựa chọn kỹ thuật và cần recommendation có quan điểm rõ ràng — không phải chỉ liệt kê pros/cons đối xứng.

## Input

Từ `$ARGUMENTS`: tên hai option cần so sánh, và optionally use case cụ thể.

## Quy trình

1. Nhận diện domain → kiểm tra skill đã load chưa. Nếu chưa, đề xuất load skill để có context reference chính xác.

2. Xác định các tiêu chí so sánh **có liên quan** đến use case (không so sánh tất cả mọi thứ — chọn 4-6 tiêu chí quan trọng nhất).

3. Trả lời theo **COMPARE format** (từ rule `04-response-format.md`):
   - Bảng so sánh tiêu chí cốt lõi
   - "Dùng A khi" / "Dùng B khi" — điều kiện cụ thể
   - Recommendation rõ ràng cho context bài học này

4. Nếu use case chưa rõ trong `$ARGUMENTS` → hỏi trước: "Use case cụ thể của bạn là gì?" vì recommendation sẽ khác nhau.

## Ràng buộc

- **Phải đưa recommendation** — không được kết thúc bằng "tùy bạn" hay "cả hai đều tốt"
- Context: đây là code học tập → ưu tiên option nào dạy được nhiều concept hơn, không phải option production-safe nhất
- Nếu một option rõ ràng tốt hơn trong use case này → nói thẳng, không cần cân bằng giả tạo
