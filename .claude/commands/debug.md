---
description: Debug một vấn đề với context đầy đủ. Dùng: /project:debug (sau đó paste thông tin theo template)
---

User đang gặp bug và cần chẩn đoán nhanh + fix chính xác. Không đưa ra danh sách giả thuyết — tìm root cause thực sự.

## Input

Sau khi nhận lệnh, nếu user chưa cung cấp đủ thông tin, hỏi theo template:

```
Cần thêm thông tin:
- Bug: [mô tả hành vi sai so với mong đợi]
- Error message: [paste chính xác — stack trace nếu có]  
- Đã thử: [những cách đã thử]
- File liên quan: [path]
- RN version / OS: [nếu liên quan đến native]
```

Nếu user đã paste đủ info trong message → bắt đầu debug ngay.

## Quy trình

1. Nhận diện domain từ error / file → kiểm tra skill phù hợp.

2. Phân tích root cause — ưu tiên theo thứ tự:
   a. Đọc stack trace / error message để định vị điểm lỗi
   b. Đọc file liên quan nếu cần
   c. Chẩn đoán root cause (một câu rõ ràng)

3. Trả lời theo **DEBUG format** (từ rule `04-response-format.md`):
   - Root cause — một câu, chính xác
   - Fix — chỉ code cần thay đổi
   - Tại sao xảy ra — cơ chế để không bị lại

## Ràng buộc

- Không liệt kê 5 nguyên nhân có thể — chẩn đoán 1 nguyên nhân đúng nhất
- Nếu thực sự ambiguous mới hỏi thêm, nếu không thì diagnose thẳng
- Sau fix: đề xuất cách tránh lỗi tương tự trong tương lai (1 dòng)
