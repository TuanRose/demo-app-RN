# Claude Code — Hướng dẫn sử dụng cho dự án này

## 1. Tổng quan kiến trúc `.claude/`

Toàn bộ cấu hình Claude Code nằm trong `.claude/`. Không có folder "agents" riêng — agent behavior được tạo ra từ 3 thành phần phối hợp:

```
.claude/
├── settings.json          ← Permissions + Hooks (automation layer)
├── settings.local.json    ← Local overrides (không commit)
├── rules/                 ← Context luôn được load (constraints, conventions)
│   ├── 00-project.md      ← Quy tắc bắt buộc, comment policy
│   ├── 01-typescript.md   ← TypeScript strict conventions
│   ├── 02-architecture.md ← Folder structure
│   ├── api.md             ← Networking & API conventions
│   ├── mobile/
│   │   ├── components.md  ← Component rules, StyleSheet, memo
│   │   ├── navigation.md  ← React Navigation patterns
│   │   ├── performance.md ← FlatList, memo, profiling
│   │   └── platform.md    ← iOS/Android specific behavior
│   └── testing/
│       └── jest.md        ← Jest + RNTL conventions
├── commands/              ← Agent workflows (gọi bằng /project:tên)
│   ├── new-lesson.md
│   ├── new-screen.md
│   ├── review-lesson.md
│   ├── tick-lesson.md
│   └── progress.md
└── skills/                ← Domain knowledge (load theo yêu cầu)
    ├── rn-animation/
    ├── rn-architecture/
    ├── rn-cicd/
    ├── rn-debugging/
    ├── rn-native-legacy/
    ├── rn-native-performance/
    ├── rn-native-platform/
    ├── rn-navigation/
    ├── rn-platform-guides/
    ├── rn-push-notifications/
    ├── rn-security/
    ├── rn-state-management/
    ├── rn-storage/
    ├── rn-testing/
    └── rn-accessibility/
```

---

## 2. Ba loại "Agent" trong Claude Code

### 2.1 Rules — Context luôn active

Files trong `.claude/rules/` được Claude load **tự động mỗi conversation**. Đây là lớp constraints và conventions không cần gọi thủ công.

- Dùng để định nghĩa: coding style, naming, forbidden patterns, project-specific rules
- Load theo thứ tự filename (`00-`, `01-`, `02-`)
- Subdirectory cũng được load đệ quy

### 2.2 Commands — Agent workflows

Files trong `.claude/commands/` được gọi bằng `/project:tên-file`. Mỗi command IS một agent — có role, process, output format riêng.

**Anatomy của một command production-grade:**

```markdown
---
description: Mô tả ngắn — hiện trong /help và skills list  ← BẮT BUỘC
---

Giải thích mục đích của command.

## Input

Từ `$ARGUMENTS`: `<param1> [param2]`
Ví dụ: `src/01_foo 2`

## Quy trình

1. **Bước đầu tiên** — mô tả cụ thể, có bash command mẫu nếu cần
   ```bash
   ls src/
   ```

2. **Bước tiếp theo** — rõ ràng, có điều kiện if/else nếu input thay đổi

3. **Xử lý edge case** — nếu không có argument, làm gì?

## Output

Template kết quả cụ thể:
\`\`\`
## Kết quả
- Điều A: ...
- Điều B: ...
\`\`\`
```

**Nguyên tắc thiết kế command:**
- `description` frontmatter là bắt buộc — không có thì không hiện trong skill list
- Input phải khai báo rõ `$ARGUMENTS` format + ví dụ
- Steps phải numbered và actionable, không mơ hồ
- Output phải có template cụ thể — không để Claude tự quyết format

### 2.3 Skills — Domain knowledge on demand

Files trong `.claude/skills/` được load khi user gọi `/rn-tên`. Mỗi skill có:
- `SKILL.md` — routing logic (Claude đọc yêu cầu rồi đọc đúng reference file)
- `references/` — chi tiết kỹ thuật theo từng subtopic

Skills **không tự load** — phải gọi thủ công ở đầu conversation.

### 2.4 Hooks — Automation layer

Cấu hình trong `settings.json → "hooks"`. Chạy tự động theo event, không cần user trigger.

| Event | Mô tả | Dùng khi nào |
|---|---|---|
| `Stop` | Sau mỗi lần Claude trả lời xong | Reminder, summary |
| `PostToolUse` | Sau khi Claude dùng tool | Lint, validate, log |
| `PreToolUse` | Trước khi Claude dùng tool | Guard, confirmation |

**Hooks hiện tại trong dự án:**
- `Stop` → Nhắc cập nhật checklist bài học
- `PostToolUse` (Write) → Tự lint file `.ts/.tsx` vừa tạo trong `src/`

---

## 3. Tất cả commands hiện có

| Command | Dùng khi nào | Syntax |
|---|---|---|
| `/project:new-lesson` | Bắt đầu bài học mới | `/project:new-lesson tên_skill mô_tả` |
| `/project:new-screen` | Thêm demo screen vào bài | `/project:new-screen src/01_foo TênScreen` |
| `/project:tick-lesson` | Đánh dấu mục tiêu hoàn thành | `/project:tick-lesson src/01_foo 2` |
| `/project:review-lesson` | Review code khi xong bài | `/project:review-lesson src/01_foo` |
| `/project:progress` | Xem tiến độ tổng tất cả bài | `/project:progress` |

---

## 4. Tất cả skills hiện có

| Skill | Domain | Khi nào load |
|---|---|---|
| `/rn-native-legacy` | Legacy Modules & UI Components | Bài học về Bridge, NativeModules cũ |
| `/rn-native-platform` | Turbo Modules, Fabric (New Architecture) | Bài học New Arch |
| `/rn-platform-guides` | Android/iOS release, communication | Bài học platform-specific |
| `/rn-native-performance` | Profiling, FlatList, JS loading | Bài học performance |
| `/rn-animation` | Animated API, Reanimated, Gesture Handler | Bài học animation |
| `/rn-testing` | Jest, RNTL, Detox, Maestro | Bài học testing |
| `/rn-navigation` | React Navigation, deep linking, auth flow | Bài học navigation |
| `/rn-state-management` | Redux Toolkit, Zustand, TanStack Query | Bài học state |
| `/rn-cicd` | EAS Build, GitHub Actions, Fastlane | Bài học CI/CD |
| `/rn-storage` | MMKV, SQLite, offline-first | Bài học storage |
| `/rn-push-notifications` | FCM, APNs, Notifee | Bài học push |
| `/rn-security` | Keychain, SSL pinning, OAuth2 PKCE | Bài học security |
| `/rn-debugging` | DevTools, Sentry, Crashlytics | Bài học debugging |
| `/rn-accessibility` | a11y props, VoiceOver, TalkBack | Bài học accessibility |
| `/rn-architecture` | Clean Architecture, monorepo, folder structure | Bài học architecture |

---

## 5. Workflow học tập tiêu chuẩn

```
1. Tạo bài học
   /project:new-lesson tên_topic mô_tả_ngắn

2. Load skill phù hợp (ngay câu đầu conversation)
   /rn-animation  hoặc  /rn-testing  hoặc  /rn-native-legacy  ...

3. Học + code (Claude dùng rules tự động, không cần gọi thêm gì)

4. Khi xong một mục tiêu
   /project:tick-lesson src/0N_tên số_thứ_tự

5. Khi xong bài học
   /project:review-lesson src/0N_tên

6. Xem tổng tiến độ bất cứ lúc nào
   /project:progress
```

---

## 6. Khi nào dùng gì — Quick reference

| Tình huống | Làm gì |
|---|---|
| Hỏi câu kỹ thuật về RN | Cứ hỏi thẳng — rules đã load tự động |
| Cần code mẫu theo đúng pattern của skill | Gọi `/rn-tên` trước |
| Muốn tạo thêm command mới | Tạo file `.claude/commands/tên.md` với `description` frontmatter |
| Muốn Claude tự động làm gì đó | Thêm hook vào `.claude/settings.json` |
| Muốn Claude luôn nhớ một convention | Thêm vào `.claude/rules/` |
| Permission bị hỏi nhiều lần | Thêm vào `settings.json → permissions.allow` |

---

## 7. Permissions đang cấu hình

**Project-level** (`.claude/settings.json`):
- Allow: `npm run *`, `npm install *`, `npx jest *`, `npx react-native *`, `git diff/log/status`, `find/ls` trong `src/` và `.claude/`
- Deny: `cat .env*`, `rm -rf*`, `git push --force*`

**Global** (`~/.claude/settings.json`):
- Allow: WebFetch cho 13 domains tài liệu RN (reactnative.dev, reactnavigation.org, tanstack.com, ...)
- Allow: `grep -rn` trong `src/` và `.claude/`
