# Skill: rn-debugging

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Dev tools | React Native DevTools, LogBox, Dev Menu, Flipper, VS Code |
| Sentry | Error tracking, performance tracing, source maps, breadcrumbs |
| Crashlytics | Firebase Crashlytics, crash reports, non-fatal errors |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Dev Menu, React Native DevTools, Flipper, LogBox, VS Code debug | `references/devtools.md` |
| Sentry setup, error capture, performance, source maps, alerts | `references/sentry.md` |
| Firebase Crashlytics setup, custom keys, non-fatal errors, ANRs | `references/crashlytics.md` |

---

## Quy tắc chung

- **Dev tools chỉ hoạt động trong development** — không có trong release builds.
- Sentry + Crashlytics: không log **PII** (email, phone, user ID raw) — hash hoặc omit.
- **Source maps**: bắt buộc upload cho Sentry — không có thì stack trace sẽ minified.
- Dùng **LogBox.ignoreLogs()** cho known third-party warnings, không ignore tất cả.
- **Flipper**: hữu ích cho local debug, không cần cho production monitoring.
- Ưu tiên: Sentry cho JS errors + performance, Crashlytics cho native crashes.
