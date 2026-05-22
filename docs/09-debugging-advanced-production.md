# Advanced Debugging — Network, Performance, Production

> Phần này dành cho các bug khó: production-only, intermittent, performance thật, race condition. Sau khi nắm 07 (mindset + JS) và 08 (native), đây là playbook ứng dụng.
>
> **Nguồn tham khảo chính**:
> - https://docs.sentry.io/platforms/react-native
> - https://firebase.google.com/docs/crashlytics
> - https://www.charlesproxy.com/documentation
> - https://docs.proxyman.io
> - https://reactnative.dev/docs/profile-hermes

---

## 1. Network debugging — bắt traffic thật của app

### 1.1. Tại sao RNDT Network không đủ

```
   RNDT Network bắt: chỉ fetch/XHR từ JS
   KHÔNG bắt:        - Image source (native loader)
                     - Native SDK (Firebase, Stripe, OneSignal)
                     - WebSocket native
                     - GRPC
                     - HTTP/2 push
                     - Background sync
```

→ Khi nghi ngờ request native, dùng **proxy MitM** (Man-in-the-Middle).

### 1.2. Proxy tools comparison

| Tool | OS | Free? | Đặc điểm |
|---|---|---|---|
| **Charles Proxy** | Mac/Win/Linux | Trial 30 ngày, $50 license | Mature nhất, UI quen thuộc |
| **Proxyman** | Mac (native) | Free + Pro | UX hiện đại nhất, RN-friendly |
| **mitmproxy** | Cross-platform | Free, open source | CLI + Python scripting |
| **Wireshark** | Cross-platform | Free | Layer thấp hơn (raw packet), không decrypt TLS dễ |
| **Burp Suite** | Cross-platform | Free + Pro | Thiên security testing |

### 1.3. Setup Charles/Proxyman cho iOS Simulator

```
   ┌──────────────────────────────────────────────────────┐
   │ 1. Mở Charles/Proxyman trên Mac                     │
   │ 2. Note port (default 8888)                          │
   │ 3. iOS Simulator → tự động dùng proxy của Mac        │
   │    (không cần config thêm)                           │
   │ 4. Bật SSL Proxying:                                 │
   │    - Charles: Help > SSL Proxying > Install Certs   │
   │    - Proxyman: Tools > Install Cert > Simulator     │
   │ 5. Trust cert trong Sim Settings > General > About  │
   │    > Cert Trust Settings                             │
   └──────────────────────────────────────────────────────┘
```

### 1.4. Setup proxy cho device thật iOS

```
   1. Mac và iPhone cùng wifi
   2. Wifi settings trên iPhone > Configure Proxy > Manual
      - Server: IP của Mac (cmd: ipconfig getifaddr en0)
      - Port:   8888
   3. Mở Safari → http://chls.pro/ssl (Charles) → install profile
      Hoặc Proxyman có hướng dẫn QR code
   4. Settings > General > VPN & Device Management → trust profile
   5. Settings > General > About > Cert Trust Settings → enable
```

### 1.5. Setup proxy cho Android emulator

```bash
# Khởi động emulator với proxy:
emulator -avd Pixel_8 -http-proxy http://10.0.2.2:8888

# 10.0.2.2 = host loopback của emulator (IP của Mac)
```

Cài cert: kéo cert file vào emulator → Settings > Security > Install certificate.

### 1.6. Setup proxy cho device thật Android

```
   1. Wifi > Modify network > Advanced > Proxy: Manual
      - Hostname: IP Mac
      - Port:     8888
   2. Tải cert (Charles cert .pem) → mở qua trình duyệt
   3. Settings > Security > Install from storage
   4. Trust as "VPN and apps"
```

### 1.7. SSL Pinning — vấn đề khi debug

```
   ┌──────────────────────────────────────────────────────┐
   │ App có SSL pinning sẽ TỪ CHỐI cert proxy giả        │
   │   → Charles thấy CONNECTION RESET                    │
   │                                                      │
   │ Workaround (chỉ dùng debug, KHÔNG ship):             │
   │  1. Build flag bật/tắt SSL pinning theo BuildConfig  │
   │  2. Dev build → pinning off → debug được proxy       │
   │  3. Release build → pinning on                       │
   └──────────────────────────────────────────────────────┘
```

### 1.8. mitmproxy — CLI + scriptable

```bash
brew install mitmproxy

# Run interactive
mitmproxy

# Headless với rule
mitmdump -s rewrite_response.py
```

```python
# rewrite_response.py — modify response cho test edge case
from mitmproxy import http

def response(flow: http.HTTPFlow):
    if "/api/me" in flow.request.url:
        flow.response.text = '{"id":"test","premium":true}'
        flow.response.status_code = 200
```

→ Mock backend mà không cần config app.

### 1.9. Map Local / Map Remote — debug magic

```
   ┌──────────────────────────────────────────────────────┐
   │ Charles & Proxyman cho phép redirect request:        │
   │                                                      │
   │  Map Local                                           │
   │    https://api.com/users → ./mock/users.json         │
   │    → Test offline, edge case, không cần backend     │
   │                                                      │
   │  Map Remote                                          │
   │    https://api.prod.com → https://api.staging.com    │
   │    → Test app prod build với staging API             │
   └──────────────────────────────────────────────────────┘
```

---

## 2. Performance debugging — measure trước, optimize sau

### 2.1. Performance bug categories

```
   ┌──────────────────────────────────────────────────────┐
   │  1. Startup (TTI — Time To Interactive)              │
   │     "App mở 4 giây, user complain"                   │
   │                                                      │
   │  2. Frame drops (jank)                               │
   │     "Scroll list giật, animation gãy"                │
   │                                                      │
   │  3. Slow interaction                                 │
   │     "Tap button → response delay 500ms"              │
   │                                                      │
   │  4. Memory growth                                    │
   │     "App crash sau 30 phút sử dụng"                  │
   │                                                      │
   │  5. Battery drain                                    │
   │     "App tốn pin"                                    │
   │                                                      │
   │  6. Network slow                                     │
   │     "Cảm giác load chậm"                             │
   └──────────────────────────────────────────────────────┘
```

### 2.2. Đo TTI (Time To Interactive)

```ts
// App.tsx
import { AppRegistry } from 'react-native';

const startTime = Date.now();

function logTTI() {
  console.log(`TTI: ${Date.now() - startTime}ms`);
}

function App() {
  useEffect(() => {
    InteractionManager.runAfterInteractions(logTTI);
  }, []);
  return <Root />;
}
```

Hoặc dùng lib **`react-native-performance`**:

```ts
import { performance } from 'react-native-performance';

performance.mark('app-start');
// sau khi UI ready
performance.mark('app-ready');
performance.measure('TTI', 'app-start', 'app-ready');

// In production: gửi metric đến Sentry, Firebase Performance
```

### 2.3. FPS & jank measurement

```
   ┌──────────────────────────────────────────────────────┐
   │  Source                Tool                          │
   │  ──────                ────                          │
   │  Built-in              Dev menu > Perf Monitor       │
   │  iOS native            Instruments > Core Animation  │
   │  Android native        GPU Rendering Profile         │
   │  Production telemetry  Sentry Performance, Firebase  │
   │                        Performance Monitoring        │
   └──────────────────────────────────────────────────────┘
```

### 2.4. Common RN performance traps

| Triệu chứng | Root cause thường gặp | Fix |
|---|---|---|
| Scroll list giật | renderItem inline, key sai | `useCallback`, stable key, `memo` |
| List 1000+ items chậm | `FlatList` không tối ưu | Switch sang `FlashList` |
| Image scroll giật | Decode trên JS thread | `FastImage`, prefetch, resize |
| Animation jank | useNativeDriver thiếu | `useNativeDriver: true` hoặc Reanimated |
| App start chậm | Quá nhiều require sync upfront | Dynamic import, lazy navigators |
| Tap delay 100ms | Touch ripple chờ debounce | `pressRetentionOffset`, `delayPressIn=0` |
| Modal mở chậm | Modal full re-render parent | Tách Modal sang component riêng + memo |

### 2.5. Bundle size analysis

```bash
# Tạo bundle production
npx react-native bundle \
  --platform android --dev false \
  --entry-file index.js \
  --bundle-output bundle.js \
  --sourcemap-output bundle.map

# Phân tích bundle
npx react-native-bundle-visualizer
# Hoặc:
npx source-map-explorer bundle.js bundle.map
```

```
   Output:
   ┌─────────────────────────────────────────┐
   │  node_modules/lodash         800 KB     │
   │  node_modules/moment         260 KB     │
   │  node_modules/react-native   220 KB     │
   │  src/                        180 KB     │
   │  ...                                    │
   └─────────────────────────────────────────┘

   → Chỗ to nhất là target tối ưu đầu tiên.
```

### 2.6. Khi nào dùng Hermes profile

```
   Câu hỏi: tại sao function này chậm?
   → Hermes Sampling Profiler

   1. Dev menu > Enable Sampling Profiler
   2. Tương tác app
   3. Disable → save .cpuprofile
   4. Mở Chrome chrome://inspect → Performance > Load
      Hoặc speedscope.app
   5. Flame chart → tìm function chiếm % cao
```

---

## 3. Memory leak — JS heap & native

### 3.1. JS heap leak (Hermes)

**Heap snapshot từ RNDT**:

```
   1. Dev menu > Open DevTools
   2. Memory tab > "Take heap snapshot"
   3. Tương tác (mở/đóng screen 10 lần)
   4. Take snapshot lần 2
   5. Compare snapshots → object nào tăng

   Filter "Comparison" để xem chỉ delta
```

### 3.2. Pattern leak phổ biến trong RN

```ts
// ❌ Listener không cleanup
useEffect(() => {
  const sub = DeviceEventEmitter.addListener('event', handler);
  // quên: return () => sub.remove();
}, []);

// ❌ setInterval/setTimeout không clear
useEffect(() => {
  setInterval(() => doSomething(), 1000);
  // quên cleanup
}, []);

// ❌ Closure giữ ref đến component lớn
const Big = () => {
  const data = useMemo(() => generateLargeData(), []);
  return <SmallComponent onClick={() => useData(data)} />;
  //                              ^ closure giữ data sống mãi
};

// ❌ Subscription Redux/Zustand
useEffect(() => {
  const unsub = store.subscribe(() => {});
  // quên unsub()
}, []);
```

### 3.3. Native leak (xem 08-debugging-native)

```
   iOS:    Xcode Memory Graph + Instruments Allocations
   Android: Profiler > Memory > Capture heap dump → analyze
```

---

## 4. Crash reporting — Sentry vs Crashlytics

### 4.1. Lựa chọn

| | Sentry | Firebase Crashlytics |
|---|---|---|
| **Pricing** | Free tier 5k events/tháng, sau đó $26+/tháng | Free hoàn toàn |
| **JS error capture** | ✅ Tốt nhất cho RN | ❌ Chỉ native crash, JS phải custom |
| **Source map** | Auto upload qua plugin | Manual |
| **Breadcrumb** | ✅ Mạnh (HTTP, navigation, console) | Custom log |
| **Performance monitoring** | ✅ Built-in | ✅ Firebase Performance |
| **Session replay** | ✅ Mới có cho RN | ❌ |
| **Privacy** | Self-host được | Phải chấp nhận Google |

→ Phổ biến: **Sentry cho JS error + RN crashes**, Crashlytics nếu đã trong Firebase ecosystem.

### 4.2. Sentry setup cho RN

```bash
npx @sentry/wizard@latest -i reactNative
```

Wizard tự thêm:
- `@sentry/react-native` package
- `Sentry.init` trong `index.js`
- Plugin Metro để upload source map khi build
- Native init iOS + Android

```ts
// index.js
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://xxx@sentry.io/xxx',
  tracesSampleRate: 0.1,        // 10% transactions cho perf monitoring
  enableAutoSessionTracking: true,
  enableNativeCrashHandling: true,
  beforeSend: (event) => {
    if (__DEV__) return null;   // không gửi event dev
    return event;
  }
});

AppRegistry.registerComponent(appName, () => Sentry.wrap(App));
```

### 4.3. Breadcrumb — context cho crash

```ts
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'User tapped Login button',
  level: 'info',
  data: { userId: 'abc' }
});

// Khi crash xảy ra, Sentry attach 100 breadcrumb gần nhất
// → biết user làm gì trước crash
```

Auto breadcrumb (mặc định bật):
- HTTP requests
- Navigation events
- Console logs
- Touch events (limited)

### 4.4. Custom context

```ts
// Set 1 lần khi user login
Sentry.setUser({
  id: user.id,
  email: user.email
  // KHÔNG set field nhạy cảm (password, token)
});

Sentry.setTag('feature_flag_new_ui', 'on');
Sentry.setContext('subscription', {
  plan: 'premium',
  trial: false
});
```

→ Trong dashboard có thể filter crash theo plan, theo feature flag.

### 4.5. Manual capture

```ts
try {
  riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'PaymentFlow' },
    extra: { orderId: '123' }
  });
}

// Hoặc message tự do
Sentry.captureMessage('Cache miss rate high', 'warning');
```

### 4.6. Source map verify

```
   Sau release, kiểm tra trong Sentry:
   1. Settings > Source Maps
   2. Tìm release version
   3. Click → list bundle + source map files

   Nếu thiếu → stack trace hiển thị obfuscated
   Fix: chạy build lại với env SENTRY_AUTH_TOKEN đúng
```

---

## 5. Production debugging — không repro được local

### 5.1. Strategy chính

```
   ┌──────────────────────────────────────────────────────┐
   │  Cannot reproduce → cần thông tin thêm từ prod        │
   │                                                       │
   │  1. Tăng telemetry (log, breadcrumb, custom event)    │
   │  2. Feature flag để bật/tắt suspect code              │
   │  3. Remote logging cho specific user                  │
   │  4. Session replay (Sentry mới support RN)            │
   │  5. A/B test fix candidate                            │
   └──────────────────────────────────────────────────────┘
```

### 5.2. Targeted logging với feature flag

```ts
// Configure remote (LaunchDarkly, GrowthBook, Firebase Remote Config)
const debugUserId = remoteConfig.get('debug_user_id');

if (currentUser.id === debugUserId) {
  // Bật verbose log chỉ cho user này
  Sentry.addBreadcrumb({
    category: 'verbose-debug',
    message: `State at ${location}: ${JSON.stringify(state)}`
  });
}
```

→ User cụ thể bug → bật logging chỉ cho họ → nhận được trace chi tiết, các user khác không bị ảnh hưởng.

### 5.3. Session Replay (Sentry RN)

```ts
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: '...',
  integrations: [
    Sentry.mobileReplayIntegration({
      maskAllText: true,         // privacy: che text input
      maskAllImages: false
    })
  ],
  replaysSessionSampleRate: 0.01,    // 1% session record
  replaysOnErrorSampleRate: 1.0      // 100% session khi có error
});
```

→ Khi crash, có video replay lại UX của user trước crash. Quý nhất cho UI bugs.

### 5.4. Canary release / staged rollout

```
   ┌──────────────────────────────────────────────────────┐
   │  Pattern an toàn ship fix:                            │
   │                                                       │
   │  v1.2.4 (fix candidate)                               │
   │   │                                                   │
   │   ├─ Internal track (10 testers)        Day 1         │
   │   │   - Monitor crash rate                            │
   │   │                                                   │
   │   ├─ 1% rollout (Play staged)           Day 2-3       │
   │   │   - Compare crash rate vs v1.2.3                  │
   │   │                                                   │
   │   ├─ 10% rollout                        Day 4-5       │
   │   │                                                   │
   │   └─ 100%                                Day 7         │
   │                                                       │
   │   → Bug regression sớm phát hiện, user impact thấp   │
   └──────────────────────────────────────────────────────┘
```

### 5.5. Hot rollback strategy

```
   Nếu fix lại tệ hơn:
   - iOS: Phase Release → Pause rollout (App Store Connect)
   - Android: Halt rollout (Play Console)
   - Cả 2: Bumping bản trước lên (rollback chỉ áp với bản cũ)
   - OTA (EAS Update): rollback ngay tại runtime, không cần store
```

---

## 6. Race condition — bug khó nhất

### 6.1. Đặc điểm

```
   ┌──────────────────────────────────────────────────────┐
   │  - Lúc fail lúc không (1/10 lần)                      │
   │  - Fail trên thiết bị chậm hơn dev machine            │
   │  - Thêm log → bug biến mất (Heisenbug)                │
   │  - Stack trace mỗi lần khác nhau                      │
   │  - Có liên quan async, network, animation, navigation │
   └──────────────────────────────────────────────────────┘
```

### 6.2. Common patterns RN

```ts
// ❌ State update sau unmount
useEffect(() => {
  fetchData().then(data => setState(data));   // component unmount trước khi fetch xong
}, []);

// ✅ Cleanup
useEffect(() => {
  let mounted = true;
  fetchData().then(data => {
    if (mounted) setState(data);
  });
  return () => { mounted = false; };
}, []);

// ✅ AbortController
useEffect(() => {
  const controller = new AbortController();
  fetch(url, { signal: controller.signal })
    .then(r => r.json())
    .then(setState)
    .catch(e => { if (e.name !== 'AbortError') throw e; });
  return () => controller.abort();
}, []);
```

```ts
// ❌ Two requests, latter resolves first
const search = (q) => api.search(q).then(setResults);

// User types: "a", "ab", "abc"
// Request "a" returns last → results sai
//
// ✅ Token để invalidate
let lastToken = 0;
const search = (q) => {
  const token = ++lastToken;
  api.search(q).then(r => {
    if (token === lastToken) setResults(r);
  });
};
```

### 6.3. Detect bằng test

```ts
// Jest fake timers + delay random
test('handles fast typing', async () => {
  jest.useFakeTimers();

  // Mock api với delay random 0-100ms
  api.search = jest.fn().mockImplementation((q) =>
    new Promise(r => setTimeout(() => r({q, results: [...]}), Math.random() * 100))
  );

  // Trigger 10 search liên tiếp
  for (const c of "search query") {
    await user.type(input, c);
    jest.advanceTimersByTime(50);
  }

  await waitFor(() => expect(getDisplayed()).toBe("search query result"));
});
```

### 6.4. Tools

```
   iOS Thread Sanitizer       — phát hiện data race C++/Obj-C
   Android StrictMode         — phát hiện network/disk on main thread
   React StrictMode           — gọi effect 2 lần để phát hiện side effect ẩn
```

---

## 7. ANR & deadlock — Android specific

### 7.1. Reproduce ANR có chủ ý

```kotlin
// Native module test ANR
@ReactMethod
fun blockMainThread() {
    Thread.sleep(10000)    // block 10s on main thread
    // → ANR sau 5s
}
```

→ Test xem error reporting có bắt được không.

### 7.2. Detect ANR pre-emptive

```bash
# Watch frame skip
adb shell dumpsys gfxinfo com.mycompany.myapp framestats

# Output:
# Janky frames: 124 (12.4%)
# 50th percentile: 5ms
# 90th percentile: 16ms
# 95th percentile: 32ms     ← worrying
# 99th percentile: 89ms     ← bad
```

### 7.3. Prevention checklist

```
   ☐ Mọi I/O (file, network, SQLite) trên background thread
   ☐ MMKV/AsyncStorage không gọi đồng bộ trong onCreate
   ☐ Bridge call (RN old arch) không spam liên tục
   ☐ JSI sync call không block JS thread quá lâu
   ☐ Không deadlock giữa Java lock + JS callback
   ☐ Khi handler gọi native module → nhớ async
```

---

## 8. App size — debug để giảm

### 8.1. iOS

```bash
# Xcode → Product > Archive → Organizer
# Chọn archive → Distribute > Export for App Size analysis
# Apple gửi report:
#   - Compressed app size
#   - Per-architecture breakdown
#   - Asset catalog size
#   - Binary size

# Hoặc check qua App Store Connect → App > Analytics > App Size
```

### 8.2. Android

```bash
# AAB analysis
bundletool build-apks --bundle=app.aab --output=app.apks
bundletool get-size total --apks=app.apks

# APK analyzer (Android Studio)
# Build > Analyze APK > chọn .apk
# → Hiển thị tree từng file, size compress vs raw
```

### 8.3. Common bloat

```
   ┌──────────────────────────────────────────────────────┐
   │  Source                          Cách giảm           │
   ├──────────────────────────────────────────────────────┤
   │  Hermes bytecode (~5MB)          Cần thiết            │
   │  Native libs cho mọi ABI         Build per-ABI APK    │
   │  PNG assets không tối ưu         WebP, vector         │
   │  Font không dùng                 Subset hoặc remove   │
   │  React Native debug binary       Release config check │
   │  ProGuard/R8 không bật           Bật minify Release   │
   │  Source maps trong .ipa          Strip khi export     │
   └──────────────────────────────────────────────────────┘
```

---

## 9. End-to-end debugging workflow — case study

### 9.1. Scenario: “App crash khi user mở Profile screen”

```
   ┌──────────────────────────────────────────────────────┐
   │ STEP 1 — Sentry alert                                │
   │   Crash type: TypeError: Cannot read property        │
   │     'avatar' of undefined                            │
   │   Frequency: 234 events/24h                          │
   │   Affected: 156 users                                │
   │   Versions: 1.2.3, 1.2.4                             │
   │   Devices: mostly Android 11-13                      │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │ STEP 2 — Inspect event                               │
   │   Stack:                                             │
   │     at ProfileHeader.render (ProfileHeader.tsx:45)   │
   │     at ProfileScreen (ProfileScreen.tsx:23)          │
   │   Breadcrumbs:                                       │
   │     [GET /api/me] 200, 234ms                         │
   │     [navigation] Home → Profile                      │
   │     [console.warn] "Token refreshed"                 │
   │   User context: subscription=trial, region=VN        │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │ STEP 3 — Reproduce                                   │
   │   Local: clear data → login fresh → vào Profile      │
   │   Bug không repro                                    │
   │   →  Tạo user trial fake → repro được! (avatar null  │
   │      khi user chưa upload ảnh)                       │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │ STEP 4 — Fix                                         │
   │   ProfileHeader.tsx:45                               │
   │   <Image source={{ uri: user.avatar }} />            │
   │     ↓                                                │
   │   <Image source={{ uri: user.avatar ?? DEFAULT }} /> │
   │                                                      │
   │   Add unit test: render với user.avatar = null       │
   └──────────────────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────┐
   │ STEP 5 — Ship                                        │
   │   - PR: 1 file changed, 2 lines                      │
   │   - Hotfix branch                                    │
   │   - Tag v1.2.5 → release pipeline                    │
   │   - Internal test 1h → 10% rollout                   │
   │   - Sentry crash rate v1.2.5 = 0 sau 24h             │
   │   - Promote 100%                                     │
   └──────────────────────────────────────────────────────┘
```

---

## 10. Bộ sưu tập “bug hiếm khó quên” — học qua ví dụ

### 10.1. “Background fetch xong app crash ngầm”

**Symptom**: app foreground OK, nhưng sáng dậy mở app trắng đôi khi.

**Root cause**: Background fetch handler kết thúc trễ → iOS kill app, native code holdback một async không lifecycle-aware → segfault.

**Fix**: Đảm bảo handler gọi `completionHandler()` trong < 30s, không hold ref tới UI.

### 10.2. “Tap delay 300ms”

**Symptom**: tap button → response sau 300ms.

**Root cause**: React component setState gây re-render parent → bridge backlog (old arch).

**Fix**: Memoize, hoặc migrate New Architecture (sync render).

### 10.3. “Image trắng sau khi list scroll xa”

**Symptom**: list 10000 ảnh, scroll xa rồi quay lại → ảnh cũ nhiều khi không hiện.

**Root cause**: FlatList recycle view, nhưng `Image` cache key trùng + `onLoad` race condition.

**Fix**: `FastImage` với cache=immutable, hoặc force key unique.

### 10.4. “TextInput cuộn lên khi keyboard hiện ở Android”

**Symptom**: input dưới keyboard ở Android.

**Root cause**: `android:windowSoftInputMode` không đặt đúng.

**Fix**: AndroidManifest `windowSoftInputMode="adjustResize"` + `KeyboardAvoidingView`.

---

## 11. Checklist trước khi nói “bug đã fix”

```
   ☐ Hiểu root cause (không phải triệu chứng)
   ☐ Có regression test capture bug
   ☐ Test pass với cả Debug + Release build
   ☐ Reproduce thủ công xác nhận hết bug
   ☐ Code review (đặc biệt cho race condition)
   ☐ Sentry/Crashlytics monitoring sau release
   ☐ Bug similar ở chỗ khác đã check?
   ☐ Document lý do fix nếu non-obvious (comment WHY)
   ☐ Update onboarding/runbook nếu là class bug mới
```

---

## 12. Đọc thêm

| Tài liệu | Link |
|---|---|
| Sentry RN | https://docs.sentry.io/platforms/react-native |
| Sentry Session Replay (mobile) | https://docs.sentry.io/platforms/react-native/session-replay |
| Firebase Crashlytics | https://firebase.google.com/docs/crashlytics |
| Charles Proxy | https://www.charlesproxy.com/documentation |
| Proxyman | https://docs.proxyman.io |
| mitmproxy | https://docs.mitmproxy.org |
| RN Performance | https://reactnative.dev/docs/performance |
| Hermes profiling | https://reactnative.dev/docs/profile-hermes |
| Android jank/ANR | https://developer.android.com/topic/performance/vitals |
| iOS Hangs / Hitches | https://developer.apple.com/videos/play/wwdc2022/10076 |
| LaunchDarkly (feature flag) | https://docs.launchdarkly.com |
