# Prompt Templates — React Native Learning Repo

Cheat sheet các prompt chuẩn. Copy-paste hoặc dùng slash command tương ứng.

---

## Workflow Commands (slash commands)

| Command | Dùng khi |
|---|---|
| `/project:new-lesson <tên> <mô tả>` | Bắt đầu bài học mới |
| `/project:new-screen <folder> <TênScreen>` | Thêm demo screen vào bài học |
| `/project:ask <concept>` | Hỏi kỹ thuật có cấu trúc |
| `/project:compare <A> vs <B>` | So sánh approach/thư viện |
| `/project:debug` | Debug với guided template |
| `/project:review-lesson <path>` | Review toàn bộ bài học |
| `/project:tick-lesson <folder> [số]` | Đánh dấu mục tiêu hoàn thành |
| `/project:progress` | Xem tiến độ toàn bộ |

---

## Prompt Templates (free-form)

### Bắt đầu bài học

```
Tôi muốn học [topic — ví dụ: Reanimated 3 gestures].
Tạo bài học mới và load skill phù hợp.
```

---

### Hỏi kỹ thuật — EXPLAIN

```
/project:ask [concept]
```

Hoặc free-form khi muốn control hơn:

```
Giải thích [concept].
Context: tôi đang làm [X] trong bài [Y].
Muốn biết: WHY cần nó, trade-offs, và pitfalls thường gặp.
Bỏ qua phần cơ bản — focus vào điểm không hiển nhiên.
```

---

### So sánh approach — COMPARE

```
/project:compare [A] vs [B] cho [use-case]
```

Hoặc:

```
So sánh [A] vs [B].
Use case: [mô tả ngắn].
Đưa recommendation cụ thể với lý do — không cần cân bằng nếu một cái rõ ràng tốt hơn.
```

---

### Debug — DEBUG

```
/project:debug

Bug: [hành vi sai so với mong đợi]
Error: [paste error / stack trace]
Đã thử: [những gì đã thử]
File: [path]
```

Hoặc inline:

```
Lỗi này nghĩa là gì và cách fix:
[paste error]

Context: [đang làm gì khi gặp lỗi]
```

---

### Implement feature — IMPLEMENT

```
Implement [feature] trong [folder/lesson].

Requirements:
- [yêu cầu 1]
- [yêu cầu 2]

Pattern muốn follow: [nếu có — ví dụ: custom hook, compound component]
Đây là code học tập — đừng over-engineer, nhưng phải đúng best practices.
```

---

### Review code — REVIEW

```
/project:review-lesson [path]
```

Hoặc cho đoạn code cụ thể:

```
Review đoạn code này.
Focus: [correctness / performance / patterns / TypeScript — hoặc "all"]
Đây là code học tập — chỉ ra vấn đề thực sự, không nitpick style không quan trọng.

[paste code]
```

---

### Thiết kế / Architecture — TRADE-OFF

```
Tôi đang thiết kế [feature/system].
Các option đang cân nhắc: [A], [B], [C].
Constraint: [ràng buộc quan trọng — performance, team size, v.v.]
Đưa recommendation cụ thể.
```

---

### Hỏi khi đang đọc docs / reference

```
Trong docs [link hoặc tên], đoạn này nói gì thực ra:
[paste đoạn docs]

Cụ thể: [câu hỏi bạn thực sự muốn biết]
```

---

## Tips viết prompt hiệu quả

**Cái Claude cần để trả lời tốt:**
1. **Context**: bạn đang làm gì, ở đâu trong codebase
2. **Level**: bỏ qua cái gì (Claude biết bạn là Senior)
3. **Focus**: muốn biết WHY, hay trade-offs, hay chỉ cần code nhanh
4. **Constraint**: học tập vs production, có/không có native code, v.v.

**Tránh:**
- "Giải thích X" — thiếu context → Claude sẽ hỏi lại
- "Cái nào tốt hơn?" — thiếu use case → recommendation vô nghĩa
- Paste toàn bộ file khi chỉ cần review một hàm
