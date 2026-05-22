# Docs — Tài liệu kỹ thuật chuyên sâu

Bộ tài liệu học tập về kiến trúc mobile development, ưu tiên React Native nhưng đặt trong bối cảnh toàn cảnh ngành.

## Mục lục

### Phần 1 — Kiến trúc

| # | File | Nội dung |
|---|---|---|
| 01 | [react-native-architecture.md](01-react-native-architecture.md) | Kiến trúc giao tiếp JS ↔ Native: Bridge cũ, JSI / Turbo Modules / Fabric / Codegen mới, Hermes |
| 02 | [native-render-lifecycle.md](02-native-render-lifecycle.md) | Render lifecycle iOS (UIView + Core Animation), Android (measure/layout/draw), và React Native (Fabric pipeline) |
| 03 | [mobile-architectures.md](03-mobile-architectures.md) | Toàn cảnh kiến trúc mobile: Native, RN, Flutter, Capacitor, KMM, PWA, MAUI — so sánh + decision tree |

### Phần 2 — Deploy & CI/CD

| # | File | Nội dung |
|---|---|---|
| 04 | [mobile-cicd-fundamentals.md](04-mobile-cicd-fundamentals.md) | Nền tảng deploy mobile: code signing iOS/Android, App Store Connect API, Play App Signing, versioning, release channels (TestFlight, Play tracks), OTA updates, secrets management |
| 05 | [fastlane-deep-dive.md](05-fastlane-deep-dive.md) | Fastlane đầy đủ: kiến trúc, Fastfile anatomy, Match (cert/profile sync), gym/pilot/supply, plugins, real-world Fastfile cho RN + best practices |
| 06 | [cicd-pipelines-real-world.md](06-cicd-pipelines-real-world.md) | Pipelines thực tế: GitHub Actions workflows hoàn chỉnh, Bitrise, EAS Build, caching strategy, self-hosted runners, secret rotation, cost estimation |

### Phần 3 — Debugging

| # | File | Nội dung |
|---|---|---|
| 07 | [debugging-fundamentals-rn.md](07-debugging-fundamentals-rn.md) | Mindset debug (9 nguyên tắc Agans), phân loại bug, kỹ thuật repro, RN DevTools, React DevTools Profiler, console nâng cao, source maps, Reactotron |
| 08 | [debugging-native-ios-android.md](08-debugging-native-ios-android.md) | Native debug: Xcode (LLDB, View Debugger, Memory Graph, Sanitizers, Instruments), Android Studio (Logcat, Profiler, Layout Inspector, GPU profiling), ADB, ANR, đọc tombstone & crash log |
| 09 | [debugging-advanced-production.md](09-debugging-advanced-production.md) | Network proxy (Charles, Proxyman, mitmproxy + map local/remote), performance (TTI, jank, bundle size), memory leak, Sentry + Crashlytics, race condition, production-only bugs, end-to-end case study |

### Phần 4 — Native & Platform

| # | File | Nội dung |
|---|---|---|
| 10 | [splash-screen-bootsplash.md](10-splash-screen-bootsplash.md) | Splash screen với react-native-bootsplash: generate assets, cấu hình iOS (AppDelegate.swift) + Android (MainActivity.kt), hide từ JS, troubleshooting RN 0.85 prebuilt |
| 11 | [native-modules-swift.md](11-native-modules-swift.md) | Native Module (logic, không UI) bằng Swift: Legacy (RCTEventEmitter + bridge file) vs Turbo (TS spec + CodeGen + shim ObjC++), type mapping, threading, error handling, checklist production |
| 12 | [native-components-swift.md](12-native-components-swift.md) | Native Component (widget có UI) bằng Swift: Legacy (RCTViewManager) vs Fabric (RCTViewComponentView), props/events, commands, so sánh tổng kết 4 loại native code |

| -- | [claude-code.md](claude-code.md) | Ghi chú về Claude Code (đã có sẵn) |
| -- | [WORKFLOW.md](WORKFLOW.md) | Quy trình làm việc: session startup, learning flow, prompt patterns |
| -- | [PROMPTS.md](PROMPTS.md) | Prompt templates copy-paste theo từng loại request |

## Cách dùng

- Đọc theo thứ tự 01 → 02 → 03 nếu muốn build mental model từ trên xuống.
- Mỗi file có section **"Đọc thêm"** ở cuối, dẫn về tài liệu chính thức (Apple, Google, Meta, Flutter).
- Diagram dùng ASCII art — render đẹp trên cả terminal lẫn GitHub.

## Nguyên tắc khi cập nhật docs

- Trích nguồn chính thức (developer.apple.com, developer.android.com, reactnative.dev, docs.flutter.dev).
- Không dùng nguồn blog cá nhân trừ khi tác giả là core team (Meta/Google/Apple).
- Khi RN/iOS/Android có version mới làm thay đổi kiến trúc, cập nhật phần liên quan + ghi version.
