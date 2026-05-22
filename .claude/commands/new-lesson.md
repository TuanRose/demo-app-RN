---
description: Tạo folder bài học mới trong src/ theo quy ước của repo. Dùng: /project:new-lesson <tên-skill> <mô-tả-ngắn>
---

Tạo một folder bài học mới trong `src/` theo đúng quy ước học tập của repo này.

## Input

Tên bài học (từ $ARGUMENTS): dùng làm tên folder và tiêu đề README.

## Quy trình

1. **Đọc `src/README.md`** để nắm quy ước đặt tên và cấu trúc folder.

2. **Xác định số thứ tự tiếp theo** bằng cách đọc các folder hiện có trong `src/`:
   ```bash
   ls src/
   ```

3. **Tạo folder** theo format `{số_thứ_tự:02d}_{tên_skill}` (ví dụ: `03_turbo_module`).

4. **Tạo `README.md`** trong folder mới với template sau:
   ```markdown
   # {Tiêu đề bài học}

   ## Mục tiêu
   - [ ] ...

   ## Skill liên quan
   <!-- Chọn skill phù hợp -->
   - `/rn-native-legacy` — Legacy Native Modules & UI Components
   - `/rn-native-platform` — New Architecture (Turbo Modules, Fabric)
   - `/rn-platform-guides` — Android/iOS platform guides
   - `/rn-native-performance` — Performance optimization
   - `/rn-animation` — Animated API, Reanimated, Gesture Handler
   - `/rn-testing` — Jest, RNTL, Detox, Maestro
   - `/rn-navigation` — React Navigation, deep linking, auth flow
   - `/rn-state-management` — Redux Toolkit, Zustand, TanStack Query
   - `/rn-cicd` — EAS Build, GitHub Actions, Fastlane
   - `/rn-storage` — MMKV, SQLite, offline-first
   - `/rn-push-notifications` — FCM, APNs, Notifee
   - `/rn-security` — Keychain, SSL pinning, OAuth2 PKCE
   - `/rn-debugging` — DevTools, Sentry, Crashlytics
   - `/rn-accessibility` — a11y props, VoiceOver, TalkBack
   - `/rn-architecture` — Folder structure, Clean Architecture, Monorepo

   ## Kiến thức cần nắm
   - ...

   ## Cấu trúc folder
   - `specs/` — TypeScript specs
   - `components/` — Components demo
   - `screens/` — Demo screens
   - `utils/` — Utility functions

   ## Ghi chú
   > Thêm ghi chú trong quá trình học ở đây.

   ## Tài liệu tham khảo
   - ...
   ```

5. **Tạo subfolder** phù hợp với nội dung bài học (chỉ tạo những folder thực sự cần).

6. **Cập nhật bảng Modules trong `src/README.md`** — thêm dòng mới vào cuối bảng:
   ```markdown
   | {số} | {tên_folder} | /rn-skill-tên | ⬜ Chưa bắt đầu |
   ```

7. **Thông báo** đường dẫn folder vừa tạo và các bước tiếp theo.
