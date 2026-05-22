# Skill: rn-native-performance

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

Skill này bao phủ **performance optimization** trong React Native:

| Chủ đề | Mô tả |
|--------|-------|
| Performance overview | Frame rates, threading model, common problems & fixes |
| Build speed | Android ABI, Gradle caching, ccache, sccache |
| FlatList / VirtualizedList | Props tuning, item memoization, getItemLayout |
| JS loading | Hermes, lazy load, inline requires, RAM bundles |
| Profiling | Android Studio Profiler, trace reading, iOS Instruments |

---

## Routing — đọc reference file nào

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Frame drop, animation lag, console.log, Perf Monitor, InteractionManager | `references/performance-overview.md` |
| Build chậm, Gradle, ABI, ccache, sccache | `references/build-speed.md` |
| FlatList chậm, scroll lag, VirtualizedList props | `references/flatlist.md` |
| App khởi động chậm, Hermes, lazy load, inline requires, RAM bundle | `references/js-loading.md` |
| Profiling, tìm bottleneck, Android Studio Profiler, Instruments, Systrace | `references/profiling.md` |

---

## Quy tắc chung

- Luôn test performance trong **release build** — dev mode chậm hơn đáng kể.
- Đo trước khi optimize: dùng Perf Monitor hoặc profiler, đừng đoán.
- JS thread và UI thread độc lập — frame drop trên một thread không ảnh hưởng thread kia.
- Target: 60 FPS = 16.67ms/frame.
