# Reference: React Native DevTools & Debugging

---

## React Native DevTools (RN 0.73+)

React Native DevTools là debugger chính thức, thay thế cho Chrome DevTools remote debugging.

### Mở DevTools

```
# Trong Metro console, nhấn 'j' để mở debugger
# Hoặc shake device / Cmd+D (iOS) / Cmd+M (Android)
# → "Open DevTools"
```

### Tính năng
- **Console** — log, warn, error, grouping, filtering
- **Sources** — breakpoints, step through, call stack, scope inspection
- **React DevTools tab** — component tree, props/state inspection, profiler
- **Network** — request/response inspection (RN 0.76+)
- **Memory** — heap snapshots, allocation tracking

### Breakpoints trong code

```tsx
// Trigger debugger programmatically
function complexFunction() {
  debugger; // dừng execution tại đây khi DevTools mở
  // ...
}
```

---

## Dev Menu

```
iOS Simulator:     Cmd+D hoặc Cmd+Ctrl+Z
Android Emulator:  Cmd+M (Mac) / Ctrl+M (Windows)
Physical device:   Shake device
```

**Options:**
- Reload — hot reload JS bundle
- Open DevTools
- Toggle Performance Monitor — FPS meter, JS thread usage
- Toggle Inspector — tap element để xem layout, styles, props
- Disable Fast Refresh — tắt nếu gây bug khi dev

---

## Flipper (deprecated nhưng vẫn dùng)

Flipper ít được maintain hơn từ RN 0.74 nhưng vẫn hoạt động với một số plugins.

```bash
# Install Flipper từ flipper.dev
# iOS — thêm vào Podfile
pod 'FlipperKit', '~> 0.182.0'
```

**Plugins hữu ích:**
- **Network** — inspect API calls
- **React DevTools** — component inspector
- **Databases** — xem SQLite databases
- **MMKV** — xem key-value storage
- **Crash Reporter** — crash logs

---

## LogBox

LogBox là UI hiển thị errors và warnings trong app khi development.

```tsx
import { LogBox } from 'react-native';

// Ignore specific warnings (dùng sparingly — nên fix thay vì ignore)
LogBox.ignoreLogs([
  'VirtualizedLists should never be nested',
  /Warning: .* deprecated/,
]);

// Ignore tất cả warnings (không nên dùng)
LogBox.ignoreAllLogs();

// Custom error handler
import { ErrorUtils } from 'react-native';

const originalHandler = ErrorUtils.getGlobalHandler();

ErrorUtils.setGlobalHandler((error, isFatal) => {
  // Log lên Sentry trước
  Sentry.captureException(error);
  // Sau đó xử lý như bình thường
  originalHandler(error, isFatal);
});
```

---

## console methods

```tsx
// Standard levels
console.log('Debug info');
console.warn('Warning message');
console.error('Error occurred');

// Grouping
console.group('API Request');
console.log('URL:', url);
console.log('Body:', body);
console.groupEnd();

// Timing
console.time('renderList');
// ... render
console.timeEnd('renderList'); // "renderList: 23ms"

// Table (object arrays)
console.table(users); // hiển thị dạng table trong DevTools

// Trace — print call stack
console.trace('Where was this called?');
```

---

## Performance Monitor

```tsx
import { PerformanceObserver } from 'react-native';

// Measure render performance
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration}ms`);
  }
});
observer.observe({ entryTypes: ['measure'] });

performance.mark('renderStart');
// ... component render
performance.mark('renderEnd');
performance.measure('render', 'renderStart', 'renderEnd');
```

---

## Network Debugging

```tsx
// Global fetch interceptor để log requests
const originalFetch = global.fetch;

global.fetch = async (url, options) => {
  const start = Date.now();
  console.log(`→ ${options?.method ?? 'GET'} ${url}`);

  try {
    const response = await originalFetch(url, options);
    const duration = Date.now() - start;
    console.log(`← ${response.status} ${url} (${duration}ms)`);
    return response;
  } catch (error) {
    console.error(`✗ ${url}`, error);
    throw error;
  }
};
```

---

## Element Inspector

```tsx
// Programmatic layout inspection
import { UIManager } from 'react-native';

const ref = useRef(null);

const inspectLayout = () => {
  ref.current?.measure((x, y, width, height, pageX, pageY) => {
    console.log({ x, y, width, height, pageX, pageY });
  });
};
```

---

## Remote Debugging (Legacy — deprecated RN 0.73+)

```
# RN < 0.73: mở Dev Menu → "Debug JS Remotely"
# Mở Chrome → chrome://inspect
# KHÔNG dùng cho RN 0.73+ — dùng React Native DevTools thay
```

---

## Xcode Instruments (iOS Native Profiling)

```
Xcode → Product → Profile (Cmd+I)

Instruments để dùng:
- Time Profiler    — CPU usage, call tree
- Allocations      — memory allocation per class
- Leaks            — memory leaks detection
- Core Animation   — GPU usage, frame rate
- Network          — network traffic
```

## Android Studio Profiler

```
Android Studio → View → Tool Windows → App Inspection
                                     → Profiler

- CPU Profiler     — thread activity, method traces
- Memory Profiler  — heap dump, allocation
- Network Profiler — request timeline
- Energy Profiler  — battery usage
```
