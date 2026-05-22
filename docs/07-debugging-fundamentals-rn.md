# Debugging Fundamentals — Mindset + JS/React Native side

> Phần này không phải “cheat sheet tool” — mà là **cách suy nghĩ khi gặp bug**, sau đó mới đến tool. Kỹ thuật debug là kỹ năng nghề nghiệp lâu nhất, không lỗi thời, áp dụng cho mọi stack.
>
> **Nguồn tham khảo chính**:
> - https://reactnative.dev/docs/debugging
> - https://reactnative.dev/docs/react-native-devtools
> - https://reactnative.dev/docs/the-new-architecture/debugging
> - *Debugging — The 9 Indispensable Rules* (David J. Agans)

---

## 1. Debugging mindset — 9 nguyên tắc bất biến

Tổng kết từ sách *Debugging* của Agans (kinh điển trong nghề):

```
   ┌──────────────────────────────────────────────────────┐
   │  1. Understand the system                            │
   │     Đọc docs trước khi đoán. Nếu không hiểu cách     │
   │     code chạy đúng, không thể tìm chỗ chạy sai.      │
   ├──────────────────────────────────────────────────────┤
   │  2. Make it fail                                     │
   │     Reliable repro = thắng 80%. Không repro được     │
   │     thì không debug được.                            │
   ├──────────────────────────────────────────────────────┤
   │  3. Quit thinking and look                           │
   │     Đừng đoán “chắc tại X”. Add log, dùng debugger,  │
   │     QUAN SÁT thực tế.                                │
   ├──────────────────────────────────────────────────────┤
   │  4. Divide and conquer                               │
   │     Binary search bug. Tắt một nửa code, fail hay    │
   │     pass? Lặp lại đến khi tìm root cause.            │
   ├──────────────────────────────────────────────────────┤
   │  5. Change one thing at a time                       │
   │     Đổi 5 thứ rồi pass → không biết thứ nào sửa bug. │
   ├──────────────────────────────────────────────────────┤
   │  6. Keep an audit trail                              │
   │     Note lại: đã thử gì, kết quả ra sao. Sau 2h debug│
   │     bạn quên hết — note tiết kiệm 30 phút sau.       │
   ├──────────────────────────────────────────────────────┤
   │  7. Check the plug                                   │
   │     Bug đơn giản nhất thường bị bỏ qua. Restart,     │
   │     clean cache, check version, có internet không?   │
   ├──────────────────────────────────────────────────────┤
   │  8. Get a fresh view                                 │
   │     Kẹt 1h → đứng dậy đi vòng / hỏi đồng nghiệp.     │
   │     Rubber duck cũng được.                           │
   ├──────────────────────────────────────────────────────┤
   │  9. If you didn’t fix it, it ain’t fixed             │
   │     Bug “tự hết” = đang ẩn. Hiểu **tại sao** sửa     │
   │     được, đừng dừng ở “giờ chạy OK rồi”.             │
   └──────────────────────────────────────────────────────┘
```

---

## 2. Phân loại bug — quyết định chiến lược debug

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   │             repro được                  không repro      │
   │           ┌──────────────────┐    ┌────────────────────┐ │
   │  thấy     │ DỄ NHẤT          │    │ Race condition?    │ │
   │  ngay     │ Add log,         │    │ Log thật chi tiết  │ │
   │  fail     │ debugger, fix    │    │ + try ma trận test │ │
   │           └──────────────────┘    └────────────────────┘ │
   │                                                          │
   │  fail     ┌──────────────────┐    ┌────────────────────┐ │
   │  ẩn       │ State sai        │    │ TỆ NHẤT            │ │
   │  (UI sai, │ Inspect data,    │    │ Production-only    │ │
   │  data sai)│ snapshot, redux  │    │ → telemetry +      │ │
   │           │ devtools         │    │   feature flag     │ │
   │           └──────────────────┘    └────────────────────┘ │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

| Loại bug | Đặc điểm | Tool ưu tiên |
|---|---|---|
| **Crash có stack trace** | Stack trỏ thẳng vào line lỗi | Đọc stack, fix ngay |
| **Logic sai, data sai** | Không crash nhưng kết quả sai | Debugger, breakpoint, inspect state |
| **UI sai** | Render lệch, thiếu element | React DevTools, Inspector |
| **Performance issue** | Lag, dropped frame | Profiler (Hermes / Instruments / Android Profiler) |
| **Memory leak** | App lớn dần, OOM | Heap snapshot, Allocations |
| **Race condition** | Lúc fail lúc không | Log timeline, thread inspection |
| **Production-only** | Local OK, prod fail | Sentry breadcrumb, remote log, feature flag |
| **Heisenbug** | Thêm log thì hết bug | Optimization khác giữa Debug/Release? Race condition? |

---

## 3. Repro — kỹ năng số một

### 3.1. Reliable repro = đã giải quyết 80%

```
   Bug report:                         Reliable repro:
   "App crash khi click button"   →   "Trên iPhone 17 Pro Max iOS 26.1,
                                       sau khi login user X,
                                       vào tab Profile,
                                       kéo refresh 3 lần liên tiếp,
                                       tap nút Logout
                                       → crash 9/10 lần"
```

### 3.2. Thu hẹp điều kiện

```
   ┌──────────────────────────────────────────────────────┐
   │ Bug variables (xếp theo độ dễ thay):                 │
   │                                                      │
   │  - User account / data                               │
   │  - Network state (wifi/4G/offline)                   │
   │  - Build (Debug/Release/specific commit)             │
   │  - Device (model, OS version, RAM, storage)          │
   │  - Locale / timezone / date                          │
   │  - App state (cold start vs background)              │
   │  - Permission state (granted vs not)                 │
   │  - Feature flag value                                │
   │                                                      │
   │ Lock từng biến lại → tìm ra biến nào ảnh hưởng       │
   └──────────────────────────────────────────────────────┘
```

### 3.3. Khi không repro được local

```
   ┌──────────────────────────────────────────────────────┐
   │ Tactic theo thứ tự:                                  │
   │                                                      │
   │ 1. Check device thật, không phải simulator/emulator. │
   │    Race condition + threading khác hoàn toàn.        │
   │                                                      │
   │ 2. Build Release, không phải Debug.                  │
   │    Hermes optimize khác, ProGuard/R8 minify khác.    │
   │                                                      │
   │ 3. Reset state (uninstall + reinstall fresh).        │
   │                                                      │
   │ 4. Slow network: dùng Network Link Conditioner       │
   │    (iOS) hoặc Settings → Developer (Android).        │
   │                                                      │
   │ 5. Low memory: simulate qua Xcode Memory Pressure    │
   │    hoặc adb shell am send-trim-memory.               │
   │                                                      │
   │ 6. Get user help: chỉ user reproduce được → log     │
   │    trace của họ (Sentry, video screen record).       │
   └──────────────────────────────────────────────────────┘
```

---

## 4. React Native — landscape của debug tools (2025+)

### 4.1. Lịch sử ngắn

```
   2015-2020:  Chrome DevTools (Remote JS Debugger) — slow, dùng V8 thay JSC
   2018-2023:  Flipper — Meta's mobile debugger, plugin ecosystem
   2023-2024:  Meta deprecate Flipper trong RN core
   2024+:      React Native DevTools (RNDT) — built-in, dùng Hermes Inspector
   Always:     Reactotron (community), Sentry, native tools
```

### 4.2. Tool stack hiện tại — RN 0.76+

```
   ┌──────────────────────────────────────────────────────┐
   │  React Native DevTools  (built-in, mặc định)         │
   │   ├─ Sources / Breakpoints / Step debugger           │
   │   ├─ Console                                         │
   │   ├─ React DevTools (Components + Profiler)          │
   │   ├─ Network (HTTP requests)                         │
   │   ├─ Memory (heap snapshot, allocation timeline)     │
   │   └─ Performance (CPU profile)                       │
   │                                                      │
   │  → Mở: trong terminal `j` khi đang chạy Metro        │
   │     hoặc nhấn `d` → "Open DevTools"                  │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │  Reactotron (community, optional)                    │
   │   - Action timeline, state inspector                 │
   │   - Custom commands                                  │
   │   - Tốt hơn RNDT cho Redux/Zustand state debugging   │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │  Sentry / Crashlytics (production)                   │
   │   - Crash + breadcrumb + user actions                │
   │   - Session replay (Sentry mới hỗ trợ RN)            │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │  Native tools (cho native module / native crash)     │
   │   - Xcode debugger + Instruments (iOS)               │
   │   - Android Studio + Profiler (Android)              │
   └──────────────────────────────────────────────────────┘
```

→ Xem chi tiết native tools ở [08-native-debugging.md](08-native-debugging.md).

---

## 5. React Native DevTools — built-in debugger

### 5.1. Kích hoạt

```
   Terminal đang chạy `npm start`:
       Press d                      → Show dev menu
       Press j                      → Open DevTools
       Press r                      → Reload
       Press Shift+m                → Toggle inspector

   Trên device:
       Cmd+D (iOS sim) / Cmd+M (Android emu)  → Dev menu
       Lắc device thật                        → Dev menu
```

### 5.2. Sources tab — breakpoint debugging

```
   ┌────────────────────────────────────────────────────┐
   │  RNDT > Sources                                    │
   │                                                    │
   │  Trong tree project, mở file .ts/.tsx              │
   │  Click line number → đặt breakpoint                │
   │                                                    │
   │  Khi code chạy đến → app pause                     │
   │   - Step over (F10)                                │
   │   - Step into (F11)                                │
   │   - Step out (Shift+F11)                           │
   │   - Resume (F8)                                    │
   │                                                    │
   │  Right pane:                                       │
   │   - Scope: vars trong scope hiện tại               │
   │   - Watch: expressions custom                      │
   │   - Call stack                                     │
   │   - Breakpoints (list, enable/disable)             │
   └────────────────────────────────────────────────────┘
```

### 5.3. `debugger` statement — đặt breakpoint từ code

```ts
function fetchUser(id: string) {
  debugger;                          // pause khi DevTools mở
  return api.get(`/users/${id}`);
}
```

Tự động skip khi DevTools không mở → an toàn để commit (nhưng không nên).

### 5.4. Conditional breakpoints

Right-click line number → Add conditional breakpoint:

```js
user.id === "abc123"        // chỉ pause khi đúng user
items.length > 100          // chỉ pause khi list lớn
```

→ Hữu ích khi bug chỉ xảy ra với 1 record cụ thể.

### 5.5. Logpoints — log không cần edit code

Right-click line → Add logpoint:

```
"User loaded: " + user.name + " at " + Date.now()
```

→ App log ra như `console.log` mà không cần build lại. Xoá lúc nào cũng được.

---

## 6. Console — không chỉ là `console.log`

### 6.1. Các method ít dùng nhưng mạnh

```ts
// Thay vì console.log(user) khô khan
console.table(users);              // bảng đẹp với columns
console.group("User flow");        // group log thành nested
  console.log("step 1");
  console.log("step 2");
console.groupEnd();

console.time("fetch");             // đo thời gian
fetchUser();
console.timeEnd("fetch");          // → "fetch: 234ms"

console.count("render");           // đếm số lần gọi
// → "render: 1", "render: 2", ...

console.trace("Why was this called?");  // in stack trace

console.assert(user, "User must exist");  // log nếu false
```

### 6.2. Object inspection

```ts
console.log(state);                // hiển thị reference, lazy expand
console.log(JSON.parse(JSON.stringify(state)));  // snapshot ngay tại thời điểm log
```

> RN inspect object là lazy — khi expand sau, có thể state đã đổi. Snapshot khi cần đảm bảo.

### 6.3. Đừng để console.log trong code production

```
   Tại sao:
   - Hermes vẫn execute → tốn CPU
   - String concat tạo garbage cho GC
   - Có thể log thông tin nhạy cảm
   - Babel có plugin tự strip ở Release build
```

```js
// babel.config.js
module.exports = {
  plugins: [
    process.env.NODE_ENV === 'production' && [
      'transform-remove-console',
      { exclude: ['error', 'warn'] }
    ]
  ].filter(Boolean)
};
```

---

## 7. React DevTools — Components + Profiler

### 7.1. Components tab

```
   ┌────────────────────────────────────────────────────┐
   │ Components view                                    │
   │                                                    │
   │  <App>                                             │
   │   ├─ <NavigationContainer>                         │
   │   │   └─ <Stack.Navigator>                         │
   │   │       └─ <HomeScreen>      ← click            │
   │   │                                                │
   │   │  ┌──────────────────────────────────┐          │
   │   │  │ Right pane:                       │         │
   │   │  │  Props: { route, navigation }     │         │
   │   │  │  Hooks:                           │         │
   │   │  │    State: 0                       │         │
   │   │  │    Effect: ƒ                      │         │
   │   │  │  Source: HomeScreen.tsx:12        │         │
   │   │  └──────────────────────────────────┘          │
   └────────────────────────────────────────────────────┘
```

**Tính năng quan trọng**:
- Edit props/state runtime để test edge case (vd set `loading: true` xem UI).
- “Filter by component name” khi tree quá lớn.
- “Highlight updates when components render” → xem component nào re-render thừa.

### 7.2. Profiler tab — tìm component re-render thừa

```
   1. Bật Profile → start recording
   2. Tương tác app (vd: nhập text vào input)
   3. Stop recording
   4. Xem flame chart:
       - Mỗi commit là 1 cột
       - Width = thời gian render
       - Click commit → xem component nào render
       - “Why did this render?” → reason (props change, state change, parent re-rendered)
```

### 7.3. Common findings

```
   ┌────────────────────────────────────────────────────┐
   │ Symptom                  Root cause                │
   ├────────────────────────────────────────────────────┤
   │ Toàn bộ tree re-render   - Context value tạo mới  │
   │ khi 1 input thay đổi      mỗi render               │
   │                          - useMemo thiếu           │
   │                                                    │
   │ FlatList item re-render  - renderItem tạo inline   │
   │ tất cả khi scroll         (mỗi render = function   │
   │                            mới → memo fail)        │
   │                          → useCallback             │
   │                                                    │
   │ Component render 3-4 lần  - Strict Mode (dev only) │
   │ liên tiếp                  → bình thường           │
   │                          - useEffect setState gây  │
   │                            chain re-render         │
   └────────────────────────────────────────────────────┘
```

---

## 8. Network debugging trong RN

### 8.1. RNDT > Network tab

Hiển thị mọi `fetch` / `XMLHttpRequest` của app:

```
   ┌────────────────────────────────────────────────────┐
   │ Status  Method  URL              Type    Size  Time│
   │  200    GET     /api/users       fetch   12kb  234ms│
   │  401    GET     /api/me          fetch   0kb   45ms│
   │  500    POST    /api/order       xhr     2kb   1.2s│
   └────────────────────────────────────────────────────┘

   Click row →
     Headers (request/response)
     Payload (form data, JSON body)
     Response (preview, raw)
     Timing (DNS, TCP, TLS, TTFB)
```

### 8.2. Lưu ý quan trọng

```
   ┌────────────────────────────────────────────────────┐
   │ RNDT Network chỉ thấy fetch chạy qua JS.           │
   │                                                    │
   │ KHÔNG thấy:                                        │
   │  - Request từ native module (vd Image source URI,  │
   │    Firebase SDK, native Stripe SDK)                │
   │  - WebSocket native                                │
   │  - HTTP/2 native                                   │
   │                                                    │
   │ → Để bắt full traffic: dùng proxy (Charles,        │
   │   Proxyman, mitmproxy). Xem 09-debugging-advanced. │
   └────────────────────────────────────────────────────┘
```

### 8.3. Mock network với MSW (Mock Service Worker)

```ts
// __mocks__/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => HttpResponse.json([{ id: 1, name: 'Test' }])),
  http.get('/api/error', () => HttpResponse.json(null, { status: 500 }))
];
```

→ Test edge case (server 500, network slow) không cần backend.

---

## 9. Source maps — để stack trace đọc được

### 9.1. Vấn đề

```
   Production crash log:
     Error: Cannot read property 'name' of undefined
       at e (index.android.bundle:1:1024576)
       at t (index.android.bundle:1:1024612)

   Không hiểu file/line nào trong source thật.
```

### 9.2. Source map là gì

```
   ┌──────────────────────────────────────────┐
   │  app code TS/TSX                         │
   │     │                                    │
   │     ▼  Metro bundle                      │
   │  index.bundle.js (minified, 1 dòng)      │
   │     +                                    │
   │  index.bundle.js.map  ← mapping          │
   │     line/col bundle → file/line gốc      │
   └──────────────────────────────────────────┘
```

### 9.3. Setup cho production

**Sentry (RN tích hợp sẵn)**:

```bash
# Tự động upload source map khi build
# Cấu hình bằng @sentry/react-native + sentry-cli
```

```js
// metro.config.js — không cần custom, Sentry plugin xử lý
const { getDefaultConfig } = require('@react-native/metro-config');
module.exports = getDefaultConfig(__dirname);
```

**Manual** (không dùng Sentry):

```bash
# iOS — gen sourcemap khi bundle
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --sourcemap-output ios/main.jsbundle.map
```

→ Symbolicate stack trace với `npx metro-symbolicate ios/main.jsbundle.map < raw.log`.

### 9.4. Verify source map đã upload

```
   Sentry dashboard → Project → Source Maps
   → list các release + version + bundle
   → Click 1 stack frame → check "Source map applied"
```

---

## 10. Reactotron — community alternative cho state debugging

### 10.1. Khi nào nên dùng

RNDT đã đủ dùng cho 90% case. Reactotron mạnh hơn ở:
- **State management debugging** (Redux, MobX, Zustand) — timeline action đẹp hơn.
- **Custom commands** — gọi function từ desktop, hữu ích để trigger edge case.
- **Image overlays** — design QA layout.
- **Persistence** — lưu lại session debug, replay sau.

### 10.2. Setup nhanh

```bash
npm install --save-dev reactotron-react-native reactotron-redux
```

```ts
// ReactotronConfig.ts
import Reactotron from 'reactotron-react-native';
import { reactotronRedux } from 'reactotron-redux';

if (__DEV__) {
  Reactotron
    .configure({ name: 'MyApp' })
    .useReactNative()
    .use(reactotronRedux())
    .connect();
}
```

```ts
// store.ts (Redux)
const store = configureStore({
  reducer,
  enhancers: __DEV__ ? [Reactotron.createEnhancer!()] : []
});
```

---

## 11. Các kỹ thuật JS-side phổ biến

### 11.1. Binary search code

```ts
function complicatedFn(input) {
  // step 1
  // step 2
  // step 3
  // step 4
  // step 5
  // step 6
  return result;
}

// Bug? Comment step 4-6 → còn fail không?
//   Còn → bug ở 1-3
//   Hết → bug ở 4-6
// Lặp lại trong half có bug.
```

### 11.2. Bisect git history

```bash
git bisect start
git bisect bad             # commit hiện tại fail
git bisect good v1.2.0     # commit này pass

# Git checkout commit ở giữa, bạn test → tell:
git bisect good   # hoặc bad

# Lặp lại đến khi tìm ra commit gây bug
git bisect reset
```

→ Cứu mạng khi bug xuất hiện sau 1 tháng dev mà không biết commit nào gây ra.

### 11.3. Patch-package — debug code trong node_modules

```bash
# Chỉnh sửa file trong node_modules để add log
vim node_modules/some-lib/index.js

# Save patch
npx patch-package some-lib

# Tạo file: patches/some-lib+1.2.3.patch
# Auto apply mỗi khi npm install
```

### 11.4. React Native Performance Monitor

```
   Dev menu → "Show Perf Monitor"

   Overlay hiển thị:
   ┌────────────────────────────────┐
   │ JS:    60 fps   15 ms          │
   │ UI:    60 fps   8 ms           │
   │ RAM:   123 MB                  │
   │ Views: 234                     │
   └────────────────────────────────┘

   - JS fps drop = JS thread block
   - UI fps drop = native render lag
   - RAM tăng dần = memory leak
   - Views nhiều = list không recycle
```

### 11.5. Element Inspector

```
   Dev menu → "Toggle Element Inspector"

   Tap vào element bất kỳ → show:
   - Component name
   - File: line
   - Padding/margin/size
   - Computed style
```

→ Nhanh hơn React DevTools khi tìm “tại sao chỗ này lại trông như vậy”.

---

## 12. Checklist khi nhận bug report

```
   ┌──────────────────────────────────────────────────────┐
   │  STEP 1 — Hiểu bug                                   │
   │  □ Đọc kỹ report, hỏi clarification nếu mơ hồ        │
   │  □ Xem screenshot/video nếu có                       │
   │  □ Check Sentry/Crashlytics có event tương ứng?      │
   │                                                      │
   │  STEP 2 — Repro                                      │
   │  □ Reproduce trên device giống user (model, OS)      │
   │  □ Build cùng version (commit/tag) user dùng         │
   │  □ Note chính xác steps để repro                     │
   │  □ Nếu không repro → ask for more info / video       │
   │                                                      │
   │  STEP 3 — Localize                                   │
   │  □ Check stack trace                                 │
   │  □ Binary search code/state                          │
   │  □ Git bisect nếu regression                         │
   │  □ Reproduce trong test (unit/integration)           │
   │                                                      │
   │  STEP 4 — Fix                                        │
   │  □ Hiểu root cause, không patch triệu chứng         │
   │  □ Viết test capture bug (regression test)           │
   │  □ Fix, verify test pass                             │
   │  □ Verify manual repro không còn fail                │
   │                                                      │
   │  STEP 5 — Hậu fix                                    │
   │  □ Update memory/docs nếu là pattern hay lặp        │
   │  □ Hỏi: bug tương tự còn ở chỗ khác không?           │
   │  □ Telemetry để verify fix khi deploy                │
   └──────────────────────────────────────────────────────┘
```

---

## 13. Các anti-pattern cần tránh

| Anti-pattern | Hậu quả |
|---|---|
| **Fix bằng try/catch nuốt error** | Bug ẩn xuống, lần sau khó tìm hơn |
| **Add `await` đại trà** đến khi “chạy”| Không hiểu race condition gốc |
| **Disable test fail** | Tích nợ kỹ thuật, sớm muộn nổ |
| **Bỏ code bị nghi** mà không hiểu sao | Bug có thể trở lại tháng sau |
| **Fix từ Stack Overflow copy-paste** | Không hiểu context, có thể đúng-giả |
| **Đổ tại lib third-party** | 90% là code mình sai. Verify trước khi blame |
| **Không write test cho bug đã fix** | Regression chắc chắn |

---

## 14. Đọc thêm

| Nguồn | Link |
|---|---|
| RN debugging overview | https://reactnative.dev/docs/debugging |
| RN DevTools | https://reactnative.dev/docs/react-native-devtools |
| New Arch debugging | https://reactnative.dev/docs/the-new-architecture/debugging |
| React DevTools docs | https://react.dev/learn/react-developer-tools |
| Sentry RN | https://docs.sentry.io/platforms/react-native |
| Reactotron | https://docs.infinite.red/reactotron |
| MSW for RN | https://mswjs.io/docs/integrations/react-native |
| Sách *Debugging — 9 Rules* | https://debuggingrules.com |
