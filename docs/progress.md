# Java Core Mastery — Progress Tracker
 
> **Learner:** Antonio (Senior FE JS/TS → Junior+ BE Java)
> **Goal:** Principal-level Java Core (Java 7 → 21)
> **Start date:** _(điền ngày bắt đầu)_
> **Target:** _(điền mục tiêu — vd: phỏng vấn BE, Spring Boot project...)_
 
---
 
## 📍 Trạng thái hiện tại
 
| | |
|--|--|
| **Module đang học** | M1 — Type System & Language Core |
| **Session gần nhất** | 10/06/2026 |
| **Tâm trạng hiện tại** | 🟡 Đang nắm dần |
 
---
 
## 🗺️ Tổng quan tiến độ
 
| Module | Tên | Trạng thái | Tự đánh giá | Ngày xong |
|--------|-----|:----------:|:-----------:|:---------:|
| M0 | Nền tảng Java cho dev JS/TS | ✅ Xong | 🟡 Functional | 06/06/2026 |
| M1 | Type System & Language Core | ✅ Xong | 🟡 Functional | 10/06/2026 |
| M2 | OOP & Design Idioms | 🔲 Chưa | — | — |
| M3 | Collections & Data Structures | 🔲 Chưa | — | — |
| M4 | Streams & Functional | 🔲 Chưa | — | — |
| M5 | Exceptions & Error Handling | 🔲 Chưa | — | — |
| M6 | JVM Internals & Memory/GC | 🔲 Chưa | — | — |
| M7 | Concurrency & JMM | 🔲 Chưa | — | — |
| M8 | I/O & NIO | 🔲 Chưa | — | — |
| M9 | Modern Java 9–21 | 🔲 Chưa | — | — |
| M10 | Reflection & Bytecode | 🔲 Chưa | — | — |
| M11 | Time / Number / Misc APIs | 🔲 Chưa | — | — |
| M12 | Tooling & Production Perf | 🔲 Chưa | — | — |
 
**Legend trạng thái:** 🔲 Chưa · 🔄 Đang học · ✅ Xong · 🔁 Cần ôn lại
 
**Legend tự đánh giá:** 🔴 Aware · 🟡 Functional · 🟢 Deep
 
---
 
## 📝 Session Log
 
> Ghi lại sau mỗi buổi học — để session sau tôi biết bạn đang ở đâu.
 
### Session 1 — 06/06/2026
- **Học:** M0 Self-check quiz (5 câu) + Labs 0.1–0.4
- **Xong:** M0 hoàn toàn
- **Kẹt / chưa rõ:** Unbox null → NPE không phải compile error; CompletableFuture chạy multi-thread khác Promise
- **Lab đã chạy:** Lab 0.1 (Integer cache), Lab 0.2 (NPE), Lab 0.3 (final), Lab 0.4 (int overflow)
- **Việc làm tiếp:** Quiz M1 + Labs M1
### Session 2 — 10/06/2026
- **Học:** M1 — Type System (Nhóm A: Primitives & String, Nhóm B: Generics, Nhóm C: Modern Java Types) + Labs M1
- **Xong:** M1 hoàn toàn
- **Kẹt / chưa rõ:** String immutability (tưởng toUpperCase sửa trực tiếp); String pool vs Heap
- **Lab đã chạy:** Lab M1-01 (Integer cache + String pool), Lab M1-02 (PECS copy function)
- **Việc làm tiếp:** Quiz M2 + Labs M2
---
 
## 🐛 Chỗ hay nhầm / Bug từng gặp
 
> Ghi lại các bẫy thực tế bạn đã rơi vào — quan trọng hơn lý thuyết.
 
| Module | Bẫy | Ghi chú |
|--------|-----|---------|
| _(vd: M0)_ | _(vd: dùng `==` cho String)_ | _(vd: phải dùng `.equals()`)_ |
 
---
 
## 🧪 Lab còn nợ
 
> Lab trong roadmap chưa chạy thật. Xoá đi khi đã làm.
 
- [x] M0 — Lab 0.1: Integer equality trap
- [x] M0 — Lab 0.2: NPE demo
- [x] M0 — Lab 0.3: final ≠ immutable
- [x] M0 — Lab 0.4: int overflow im lặng
- [x] M1 — Lab: Integer cache + String pool
- [x] M1 — Lab: PECS copy function
- [ ] M2 — Lab: equals/hashCode contract
- [ ] M3 — Lab: LRU Cache bằng LinkedHashMap
- [ ] M3 — Lab: ConcurrentModificationException
- [ ] M4 — Lab: Lazy stream với peek()
- [ ] M4 — Lab: parallelStream benchmark
- [ ] M6 — Lab: Heap dump + VisualVM
- [ ] M7 — Lab: Visibility bug (volatile)
- [ ] M7 — Lab: Deadlock cố ý
- [ ] M7 — Lab: CompletableFuture pipeline
---
 
## ❓ Quiz kết quả
 
> Ghi lại điểm quiz mỗi module — để biết chỗ nào cần ôn lại.
 
| Module | Ngày | Điểm | Câu sai | Action |
|--------|------|:----:|---------|--------|
| M0 | 06/06/2026 | 3/5 | Câu 3 (unbox NPE), Câu 5 (CF vs Promise) | Chạy lab M0 + ôn lại 2 câu sai |
| M1 | 10/06/2026 | 8/9 | String immutability (toUpperCase không sửa trực tiếp) | Nhớ: mọi String method đều return object mới |

---
 
## 💡 Insights cá nhân
 
> Những "aha moment" — khi một khái niệm mới click trong đầu. Viết bằng lời của bạn.
 
- "final trong Java = const trong JS — khóa reference, không khóa nội dung bên trong"
- "int overflow Java không báo lỗi — dùng Math.addExact() nếu muốn fail fast"
- "NPE xảy ra lúc runtime, không phải compile time — khác với TS strictNullChecks"
- "String.toUpperCase() không sửa string gốc — phải gán lại: s = s.toUpperCase()"
- "String pool = cache các literal trong heap — tái sử dụng, tiết kiệm memory"
- "PECS: src dùng extends (đọc ra), dest dùng super (ghi vào)"
- "Type erasure: List<String> và List<Integer> cùng là List ở runtime"

---
 
## 🔁 Spaced Repetition Queue
 
> Topic cần ôn lại theo thời gian (dùng lệnh `/review` để tôi quiz ngẫu nhiên từ đây).
 
| Topic | Lần ôn tiếp | Lý do |
|-------|-------------|-------|
| Unbox null → NPE | 13/06/2026 | Nhầm là compile error |
| CompletableFuture vs Promise | 13/06/2026 | Chưa biết risk concurrency |
| Integer cache -128..127 | 13/06/2026 | Nhớ quy tắc vàng: object luôn dùng .equals() |
| String immutability | 17/06/2026 | Tưởng toUpperCase sửa trực tiếp — phải gán lại |
| PECS — subtype/supertype | 17/06/2026 | Nhầm từ "upper bound", cần dùng subtype/supertype |
| String pool vs Heap | 17/06/2026 | literal → pool, new String() → heap thường |

---
 
## 🎯 Milestone
 
- [x] Xong M0 — đọc Java cơ bản không cần tra cú pháp
- [ ] Xong M1–M5 — viết Java application đơn giản tự tin
- [ ] Xong M6–M7 — hiểu JVM + Concurrency (phân biệt principal)
- [ ] Xong M8–M12 — full Java Core principal-level
- [ ] Tự code một mini project BE Java không cần nhìn docs syntax
---
 
_Cập nhật file này sau mỗi session. Session mới paste nội dung file này cho tôi đọc — tôi sẽ biết ngay bạn đang ở đâu và tiếp tục đúng chỗ._