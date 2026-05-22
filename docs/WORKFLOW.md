# Workflow — Quy trình làm việc trong repo này

> Tài liệu này định nghĩa quy trình từ lúc mở project đến lúc hoàn thành một bài học.  
> Follow đúng thứ tự → tránh lãng phí context, tránh làm đi làm lại.

---

## TL;DR — Checklist nhanh mỗi ngày

```
[ ] 1. Session startup — load context (2 phút)
[ ] 2. Load skill của domain hôm nay
[ ] 3. Đọc theory → hỏi Claude verify hiểu đúng
[ ] 4. Build theo ROADMAP requirements
[ ] 5. Review code + tick objectives
[ ] 6. Viết journal entry (nếu xong skill)
```

---

## 1. Session Startup — Load Context

**Mỗi lần mở project**, chạy theo thứ tự này:

### Bước 1 — Xem tiến độ tổng quan
```
/project:progress
```
→ Claude đọc `src/README.md` + tất cả lesson folders, báo cáo đang ở đâu.

### Bước 2 — Xác định ngày và skill hôm nay
Mở `ROADMAP.md`, tìm ngày hiện tại, copy checklist chưa tick.

Hoặc paste vào Claude:
```
Tôi đang ở [Day X / Skill: rn-xxx].
Hôm nay cần làm những gì? Đọc ROADMAP.md và tóm tắt checklist chưa hoàn thành của ngày này.
```

### Bước 3 — Load skill của ngày
```
/rn-<domain>
```
Ví dụ: `/rn-navigation`, `/rn-storage`, `/rn-animation`

> **Quan trọng:** Skill KHÔNG tự load. Phải gọi lệnh này mỗi session mới nếu cần reference.  
> Claude sẽ tự detect context và nhắc nếu bạn quên.

### Bước 4 — Mở folder bài học
```
Mở src/0X_<tên_skill>/ trong editor.
```
Đọc README.md của bài học để nhớ lại context lần trước.

---

## 2. Bắt Đầu Bài Học Mới

Khi bắt đầu một domain mới (lần đầu tiên):

### Bước 1 — Tạo folder bài học
```
/project:new-lesson <tên-skill> <mô tả ngắn>
```
Ví dụ: `/project:new-lesson navigation "FinTrack navigators + deep linking"`

### Bước 2 — Load skill + orientation
```
/rn-<domain>

Tôi bắt đầu bài học [tên]. Theo ROADMAP, hôm nay cần đọc:
- [list các reference files từ ROADMAP]
Đọc lần lượt và sau mỗi file hỏi tôi để verify hiểu đúng.
```

### Bước 3 — Theory trước, code sau
**Không code ngay.** Phải hiểu WHY trước:
```
/project:ask [concept chính của domain này]
```
Ví dụ với navigation:
```
/project:ask Stack Navigator vs Tab Navigator — khi nào nest cái nào vào cái nào, và tại sao RootNavigator phải là Stack không phải Tab?
```

### Bước 4 — Xác nhận mental model trước khi build
```
Tôi hiểu [domain này] như sau: [giải thích bằng lời của mình].
Cái gì tôi hiểu sai hoặc thiếu?
```
→ Claude sẽ phản biện hoặc confirm.

---

## 3. Flow Trong Một Session Học

### Phase A — Theory (20-30 phút)

**Đọc reference + hỏi:**
```
/project:ask [concept cụ thể]
```

**Khi gặp trade-off cần quyết định:**
```
/project:compare [A] vs [B] cho [use case cụ thể trong FinTrack]
```

**Khi muốn phản biện / kiểm tra hiểu biết:**
```
Tôi cho rằng [nhận định của bạn]. Điều này đúng không?
Nếu sai, tại sao? Nếu đúng, khi nào thì không đúng?
```

---

### Phase B — Build (phần lớn thời gian)

**Prompt mở đầu khi implement:**
```
Implement [feature cụ thể] trong src/0X_<skill>/
Requirements (từ ROADMAP):
- [yêu cầu 1]
- [yêu cầu 2]
Pattern: [nếu có yêu cầu cụ thể]
Đây là học tập nhưng phải đúng production standard theo ROADMAP.
```

**Khi bị block / không biết bắt đầu từ đâu:**
```
/project:debug

Tình huống: tôi không biết cách [X].
Tôi đã thử: [những gì đã thử].
Context: [đang build cái gì, trong folder nào].
```

**Khi cần quyết định kiến trúc trong lúc code:**
```
Đang implement [X], gặp quyết định: [mô tả quyết định].
Theo Clean Architecture của FinTrack, cách nào đúng hơn?
Đưa 3 options theo format ROADMAP.
```

---

### Phase C — Review & Close

**Review code vừa viết:**
```
/project:review-lesson src/0X_<skill>/

Focus: [correctness / patterns / TypeScript / all]
Đặc biệt check: [điểm bạn nghi ngờ nhất]
```

**Tick objectives đã xong:**
```
/project:tick-lesson src/0X_<skill>/ [số thứ tự mục tiêu]
```

**Verify "Done when" criteria của ROADMAP:**
```
Kiểm tra xem tôi đã đáp ứng "Done when" của [Day X] chưa:
[paste "Done when" từ ROADMAP]
Chạy test / kiểm tra và báo cáo.
```

---

## 4. Kết Thúc Bài Học — Knowledge Journal

Khi hoàn thành **tất cả objectives** của một skill:

### Viết journal entry vào `.docs/`
```
Tôi vừa hoàn thành skill [rn-xxx].
Giúp tôi viết một journal entry cho `.docs/rn-xxx.md` theo template trong ROADMAP.md.
Dựa trên code trong src/0X_<skill>/ và những gì chúng ta đã thảo luận.
```

Template (từ ROADMAP):
- What I built (2-3 câu)
- Key concepts (mental models)
- Decisions & trade-offs (những gì đã chọn và tại sao)
- Gotchas (cái gì bất ngờ / tốn thời gian)
- Code patterns to remember (snippets ngắn)
- References

### Weekly Retrospective (cuối mỗi tuần)
Dùng câu hỏi trong ROADMAP để tự kiểm tra. Paste vào Claude:
```
Week [X] Retrospective — tôi tự trả lời:
- [câu hỏi 1]: [câu trả lời của bạn]
- [câu hỏi 2]: [câu trả lời của bạn]

Đánh giá độ chính xác và chỉ ra gap nếu có.
```

---

## 5. Prompt Patterns Theo Tình Huống

### Khi hiểu mờ một concept
```
/project:ask [concept]
```
Nếu vẫn chưa rõ sau response đầu tiên:
```
Giải thích lại bằng một example khác — lần này dùng analogy với [backend / iOS native / một thứ tôi đã biết].
```

### Khi cần quyết định và không chắc
```
/project:compare [A] vs [B] cho [use case FinTrack cụ thể]
```
Sau khi nhận response — phản biện:
```
Tôi không đồng ý với điểm [X] vì [lý do].
Bảo vệ recommendation của bạn hoặc điều chỉnh nếu tôi đúng.
```

### Khi bug khó tìm
```
/project:debug

Bug: [mô tả hành vi sai]
Error: [paste stack trace]
Platform: [iOS / Android / cả hai]
Đã thử: [những gì đã thử]
File: [path]
```

### Khi code chạy được nhưng nghi ngờ chất lượng
```
Code này chạy đúng nhưng tôi nghi ngờ về [pattern / performance / memory leak].
Review và chỉ ra vấn đề nếu có — đừng chỉ confirm "trông ổn".
[paste đoạn code]
```

### Khi muốn đào sâu hơn ROADMAP
```
ROADMAP dừng ở mức [X] cho topic này.
Tôi muốn hiểu sâu hơn: [câu hỏi cụ thể].
Level: tôi muốn hiểu như một người cần đưa ra kiến trúc quyết định cho team.
```

### Khi review cuối ngày
```
Hôm nay tôi đã làm: [list những gì đã build].
Nhìn lại, có quyết định nào tôi đã đưa ra không đúng không?
Và có gì tôi bỏ sót từ ROADMAP requirements không?
```

---

## 6. Navigating ROADMAP

### Cấu trúc thời gian
```
Week 1 (Day 1-7):   Architecture → Navigation → State Management
Week 2 (Day 8-14):  Storage → Push Notifications → Security
Week 3 (Day 15-21): Animation → Accessibility → Performance → Debugging  
Week 4 (Day 22-28): Testing → CI/CD → Native Legacy → New Architecture → Platform
```

### Rule: đừng skip "Done when"
Mỗi skill có "Done when" trong ROADMAP — đây là gate, không phải suggestion.  
Trước khi chuyển skill tiếp theo, verify bằng lệnh thực sự (không chỉ đọc code):
```
Verify "Done when" của skill này:
[paste "Done when" criteria]
Chạy hoặc kiểm tra và báo cáo pass/fail.
```

### Khi bị block hơn 30 phút
Ghi lại vào ROADMAP.md, phần "Notes & Blockers":
```
Cập nhật bảng Notes trong ROADMAP.md:
Date: [hôm nay]
Skill: [tên]
Note: [mô tả blocker và cách giải quyết]
```

### Nhảy giữa các skill (không khuyến khích)
Nếu bắt buộc phải làm vậy:
```
Tôi cần tạm dừng [skill A] và chuyển sang [skill B] vì [lý do].
Giúp tôi lưu lại context của [skill A] để tiếp tục sau:
- Đã làm được gì
- Còn thiếu gì
- Blocker là gì
```

---

## 7. Quy Tắc Vàng

**1. Theory → Verify → Build — không skip bước nào**  
Đọc reference → hỏi Claude để verify hiểu đúng → mới code.  
Nếu code trước khi hiểu → sẽ phải refactor.

**2. Phản biện mọi quyết định**  
ROADMAP khuyến khích "every decision gets 3 options."  
Nếu Claude recommend option A → hỏi tại sao không phải B hoặc C.

**3. WHY trong code, không WHAT**  
Comment giải thích lý do chọn API này, không giải thích code làm gì.  
Nếu không biết tại sao → đó là signal cần học thêm trước khi code.

**4. Journal ngay khi xong — không để sau**  
Memory decay nhanh. Viết `.docs/` ngay sau khi tick xong skill.

**5. Production standard từ bài đầu**  
Không có "chạy được là ổn." Nếu không survive code review thực → không tính done.
