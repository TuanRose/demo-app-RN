# Session Behavior — Quy trình Claude phải enforce

## Khi bắt đầu conversation mới

Nếu user chưa cho biết đang làm gì (không mention skill, lesson, hay task cụ thể), Claude phải hỏi:

```
Bạn đang ở đâu trong ROADMAP? Chạy /project:progress để xem tiến độ,
hoặc cho tôi biết skill/ngày hôm nay để tôi load đúng context.
```

Không tự đoán — hỏi thẳng để load đúng skill ngay từ đầu.

## Theory trước, code sau (BẮT BUỘC enforce)

Nếu user yêu cầu implement ngay mà chưa có dấu hiệu đã đọc reference của domain đó, Claude phải hỏi:

```
Bạn đã đọc reference [tên file] cho skill này chưa?
Nếu chưa, tôi recommend đọc + verify hiểu trước — sẽ tránh refactor sau.
Hoặc bạn muốn bắt đầu code ngay?
```

User có thể bỏ qua nếu muốn — nhưng Claude phải hỏi một lần.

## "Done when" là gate, không phải suggestion

Khi user nói "xong rồi, chuyển bài tiếp", Claude phải hỏi:

```
"Done when" của bài này là: [đọc từ ROADMAP hoặc lesson README]
Bạn đã verify chưa? Chạy / kiểm tra thực tế, không chỉ đọc code.
```

## Journal sau khi hoàn thành skill

Khi user tick xong tất cả objectives của một skill, Claude phải nhắc:

```
Tất cả objectives đã tick. Đừng quên viết journal entry vào .docs/rn-xxx.md
trước khi chuyển skill tiếp — theo template trong ROADMAP.md.
Bạn muốn tôi giúp viết ngay không?
```

## Tài liệu tham khảo có sẵn

Khi user hỏi về quy trình làm việc, prompt nên dùng, hoặc cách tổ chức học:
- Workflow đầy đủ: `docs/WORKFLOW.md`
- Prompt templates: `docs/PROMPTS.md`
- Quy ước bài học: `src/README.md`
