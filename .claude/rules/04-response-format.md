# Response Format — Chuẩn hóa output theo loại request

Claude phải nhận diện loại request và dùng đúng format tương ứng. Không dùng format mặc định (prose dài) khi đã có format chuẩn.

---

## 1. EXPLAIN — Giải thích concept / API

**Trigger**: "giải thích", "explain", "X là gì", "tại sao dùng X", `/project:ask`

**Format**:
```
### [Tên concept]

**Dùng khi**: [một dòng — use case chính]
**Cơ chế**: [cách hoạt động bên trong — WHY, không phải WHAT]

[code example ngắn gọn, có comment WHY]

**Trade-offs**:
- ✅ [lợi thế thực tế]
- ❌ [hạn chế / cái giá phải trả]

**Pitfalls**: [lỗi thường gặp nếu có]
```

---

## 2. COMPARE — So sánh approach / thư viện

**Trigger**: "so sánh", "vs", "nên dùng cái nào", "A hay B", `/project:compare`

**Format**:
```
### [A] vs [B]

| Tiêu chí | [A] | [B] |
|---|---|---|
| [criterion 1] | ... | ... |
| [criterion 2] | ... | ... |

**Dùng [A] khi**: ...
**Dùng [B] khi**: ...
**Trong bài học này**: [recommendation cụ thể + lý do 1-2 câu]
```

Không liệt kê pros/cons đối xứng nhàm — phải đưa recommendation có quan điểm.

---

## 3. DEBUG — Tìm và sửa lỗi

**Trigger**: "bug", "lỗi", "không chạy", "error", `/project:debug`

**Format**:
```
**Root cause**: [một câu chính xác — cái gì sai, không phải mô tả lỗi]

**Fix**:
[code fix, chỉ phần cần thay đổi]

**Tại sao xảy ra**: [giải thích cơ chế dẫn đến lỗi — để không bị lại]
```

Không liệt kê nhiều nguyên nhân giả thuyết. Chẩn đoán rõ ràng, fix ngay.

---

## 4. IMPLEMENT — Viết code theo yêu cầu

**Trigger**: "implement", "tạo", "viết", "làm", `/project:new-screen`

**Format**:
```
[Code trực tiếp — không preamble dài]

// Comment WHY ở những chỗ không hiển nhiên
```

Sau code, tối đa 3 dòng note về quyết định kiến trúc quan trọng. Không giải thích WHAT — code tự nói.

---

## 5. REVIEW — Đánh giá code

**Trigger**: "review", "feedback", "nhận xét", `/project:review-lesson`

**Format**:
```
**Issues** (theo severity):
🔴 [Critical — logic sai / bug / security]
🟡 [Warning — pattern không tốt / sẽ gây vấn đề]  
🔵 [Style — convention / readability]

**Code cải thiện**:
[chỉ phần cần sửa, không paste lại toàn bộ]

**Điểm tốt**: [1-2 cái — không bỏ qua nếu có]
```

---

## 6. TRADE-OFF / ARCHITECTURE — Tư vấn thiết kế

**Trigger**: "nên thiết kế như thế nào", "architecture", "pattern nào phù hợp"

**Format**:
```
**Recommendation**: [kết luận trước — không vòng vo]

**Lý do**:
- [constraint / factor 1]
- [constraint / factor 2]

**Alternative nếu requirement thay đổi**: [khi nào thì đổi hướng]
```

---

## Nguyên tắc chung

- **Ngắn > dài** — Senior dev không cần giải thích hiển nhiên
- **Kết luận trước, lý do sau** — không dẫn dắt dài để rồi mới nói điểm chính
- **Code > prose** — một đoạn code tốt thay 3 đoạn mô tả
- **Quan điểm rõ ràng** — khi được hỏi recommendation thì phải recommend, không "tùy bạn"
- Dùng tiếng Việt cho giải thích, English cho code và tên kỹ thuật
