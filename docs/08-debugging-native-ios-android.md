# Native Debugging — iOS (Xcode/Instruments) + Android (Studio/Profiler)

> Khi bug xuống tới native module, native crash, hoặc performance ở UI thread — JS-side tools không giúp được. Phần này là cách dùng tool của OS chính chủ.
>
> **Nguồn tham khảo chính**:
> - https://developer.apple.com/documentation/xcode/debugging
> - https://developer.apple.com/documentation/xcode/improving-your-app-s-performance
> - https://developer.android.com/studio/debug
> - https://developer.android.com/studio/profile

---

## 1. Khi nào cần native debugging cho RN dev?

```
   ┌──────────────────────────────────────────────────────┐
   │  Native debug cần khi:                               │
   │                                                      │
   │  ✅ Native crash (SIGSEGV, EXC_BAD_ACCESS)            │
   │  ✅ Native module bạn viết bị bug                     │
   │  ✅ App start chậm (TTI)                              │
   │  ✅ Memory leak ngoài JS heap                         │
   │  ✅ Animation jank khi useNativeDriver/Reanimated     │
   │  ✅ Layout sai mà JS render đúng (View hierarchy)     │
   │  ✅ Build error level Xcode/Gradle                    │
   │  ✅ Threading bug (deadlock, ANR)                     │
   │                                                      │
   │  Không cần khi:                                      │
   │  ❌ JS logic sai (dùng RNDT)                          │
   │  ❌ React state issue                                 │
   │  ❌ Network request fail vì payload sai               │
   └──────────────────────────────────────────────────────┘
```

---

## 2. Xcode debugger — iOS native side

### 2.1. Mở project iOS của RN

```bash
# RN bare workflow:
cd ios
xed .                    # mở .xcworkspace tự động
# hoặc:
open MyApp.xcworkspace
```

⚠️ Luôn mở `.xcworkspace` (không phải `.xcodeproj`) vì RN có Pods.

### 2.2. Build & run từ Xcode (không qua `npm run ios`)

```
   ┌─────────────────────────────────────────────────────┐
   │  Tại sao chạy từ Xcode?                             │
   │  - Bắt được native log đầy đủ trong Console         │
   │  - Đặt breakpoint native được                       │
   │  - Symbolicate crash tự động                        │
   │  - Xem View hierarchy, Memory graph                 │
   │  - Profile được với Instruments                     │
   │                                                     │
   │  Nhược: Metro phải start riêng (`npm start`)        │
   └─────────────────────────────────────────────────────┘
```

Cách chạy:
1. `npm start` ở terminal riêng.
2. Xcode → chọn scheme + simulator/device.
3. Cmd+R hoặc nút Play.

### 2.3. Breakpoint cơ bản

```
   Click vào số dòng bên trái source code → breakpoint xanh

   Khi breakpoint hit:
     Local variables panel       (xem giá trị)
     Console (lldb prompt: po self.someProperty)
     Step over (F6) / Into (F7) / Out (F8) / Continue (F9)
```

### 2.4. LLDB commands — phải biết

```
   (lldb) po expression          # print object (Obj-C/Swift)
   (lldb) p expression           # print primitive

   po self.view                  # in UIView mô tả
   po [self.view recursiveDescription]   # cây subview
   po self.view.bounds
   p self.count
   p (int)[self.array count]

   expr self.title = @"New title"   # đổi value runtime
   expr -- self.view.backgroundColor = UIColor.redColor

   bt                            # backtrace
   thread list                   # liệt kê threads
   thread select 2               # chuyển sang thread 2
```

### 2.5. Symbolic breakpoint — pause khi function bất kỳ được gọi

```
   Breakpoint navigator (Cmd+8) → + → Symbolic Breakpoint

   Symbol:  -[UIViewController viewDidAppear:]
   → pause mỗi khi VC nào đó present
```

→ Hữu ích để debug “khi nào màn hình này hiện lên?”.

### 2.6. Conditional breakpoint

```
   Right-click breakpoint → Edit Breakpoint
   Condition:  user.id == @"abc"
   Action:     Log message: "User loaded: %@"
   Auto-continue: ✓     (không pause, chỉ log)
```

→ Logpoint kiểu native — không cần edit code.

### 2.7. Watchpoint — pause khi value thay đổi

```
   Right-click variable trong Locals → "Watch ..."
   → app pause mỗi khi biến đó được ghi
```

→ Tìm “ai đang sửa state này?” — kinh điển cho memory bug.

---

## 3. Xcode View Debugger — debug layout

### 3.1. Cách mở

```
   Khi app đang chạy:
     Debug > View Debugging > Capture View Hierarchy
   Hoặc click icon "Debug View Hierarchy" trên thanh debug bar

   → Xcode pause app, render 3D view tree
```

```
   ┌───────────────────────────────────────────────────────┐
   │     UIWindow                                          │
   │      └─ UIView (rootVC.view)                          │
   │          └─ RCTRootView         (RN root)             │
   │              └─ RCTView         (UIKit)               │
   │                  └─ RCTView                           │
   │                      ├─ RCTText  (Text component)     │
   │                      └─ RCTScrollView                 │
   │                          └─ ...                       │
   └───────────────────────────────────────────────────────┘
```

### 3.2. Tính năng

- **Slider 3D** — tách layer ra để xem chồng lên nhau như thế nào.
- **Object inspector** — xem frame, bounds, hidden, alpha của từng view.
- **Show clipped content** — view nào bị cha clip.
- **Show constraints** — Auto Layout constraint conflict.

### 3.3. RN-specific debugging với View Debugger

```
   Câu hỏi             Cách dùng View Debugger
   ─────────────       ─────────────────────────
   View bị che?        Slider 3D xem ai đè
   View không hiện?    Check alpha, hidden, clipsToBounds
   Layout sai?         Check frame vs intent
   Touch không nhận?   Check userInteractionEnabled
                       + view phía trên có chặn không
```

---

## 4. Xcode Memory Graph Debugger

### 4.1. Cách mở

```
   App đang chạy → click "Debug Memory Graph" trên debug bar
```

### 4.2. Phát hiện memory leak

```
   ┌───────────────────────────────────────────────────────┐
   │ Sau khi capture, Xcode hiển thị tất cả object còn     │
   │ trong RAM, kèm reference graph.                       │
   │                                                       │
   │ Filter ! (warnings) → các leak tiềm năng:             │
   │   - Retain cycle (A giữ B, B giữ A)                   │
   │   - Object đáng lẽ deinit nhưng vẫn sống              │
   │                                                       │
   │ Click 1 object → xem reference path:                  │
   │   AppDelegate → MyManager → MyVC → self               │
   │   ▲                                  │                │
   │   └──────── retain cycle ─────────────┘               │
   └───────────────────────────────────────────────────────┘
```

### 4.3. Pattern thường thấy trong RN

```
   ┌─────────────────────────────────────────────────────┐
   │ NSNotificationCenter observer không remove          │
   │   → VC không deinit được                            │
   │                                                     │
   │ Block capture self mạnh                             │
   │   block = ^{ self.foo(); }   // [weak self] thiếu   │
   │                                                     │
   │ NativeModule giữ ref tới callback JS                │
   │   → JS context không free                           │
   └─────────────────────────────────────────────────────┘
```

---

## 5. Xcode Sanitizers — phát hiện bug runtime

```
   Edit Scheme → Run > Diagnostics:
     ✓ Address Sanitizer    (memory corruption, use-after-free)
     ✓ Thread Sanitizer     (data race)
     ✓ Undefined Behavior Sanitizer
     ✓ Main Thread Checker  (UIKit gọi từ background thread)
     ✓ Malloc Scribble      (init memory với pattern lạ để dễ phát hiện)
```

→ Bật khi nghi ngờ native module có lỗi memory/threading. Slow nhưng vô giá.

---

## 6. Instruments — profiling iOS

Xcode → Open Developer Tool → Instruments (hoặc `Cmd+I` từ Xcode).

### 6.1. Templates phổ biến

```
   ┌──────────────────────────────────────────────────────┐
   │  Time Profiler                                       │
   │   - CPU sampling, function nào tốn time              │
   │   - Dùng khi: app lag, scroll giật                   │
   │                                                      │
   │  Allocations                                         │
   │   - Object allocate, retain count                    │
   │   - Dùng khi: memory growth, leak                    │
   │                                                      │
   │  Leaks                                               │
   │   - Tự động phát hiện leak                           │
   │   - Dùng khi: chắc chắn có leak nhưng không rõ chỗ   │
   │                                                      │
   │  Core Animation                                      │
   │   - FPS, offscreen rendering, layer composition      │
   │   - Dùng khi: animation jank, UI 60fps không đạt     │
   │                                                      │
   │  Network                                             │
   │   - Mọi request native, kích thước, thời gian        │
   │                                                      │
   │  System Trace                                        │
   │   - Thread state, syscall, lock contention           │
   │   - Dùng khi: app freeze, deadlock                   │
   │                                                      │
   │  Energy Log                                          │
   │   - CPU, GPU, GPS, network impact pin                │
   └──────────────────────────────────────────────────────┘
```

### 6.2. Time Profiler — tìm hàm chậm

```
   1. Xcode > Product > Profile (Cmd+I)
   2. Chọn template "Time Profiler"
   3. Record → tương tác app
   4. Stop

   Bottom panel:
   ┌────────────────────────────────────────────────┐
   │  Weight  │ Symbol Name                         │
   │   42%    │ -[FlatList renderItem:]             │
   │   28%    │   -[Image decode:]                  │
   │   12%    │   -[CALayer setNeedsDisplay]        │
   │   ...    │                                     │
   └────────────────────────────────────────────────┘
```

→ % cao = function tốn nhiều CPU. Tối ưu từ trên xuống.

### 6.3. Core Animation — tìm jank

```
   ┌──────────────────────────────────────────────────┐
   │ Track:  FPS (xanh = 60+, đỏ = drop)              │
   │                                                  │
   │ Settings panel:                                  │
   │   ✓ Color Blended Layers                         │
   │      → vùng đỏ = blending (transparent layer)    │
   │   ✓ Color Misaligned Images                      │
   │      → ảnh không pixel-aligned, GPU resample     │
   │   ✓ Color Offscreen-Rendered                     │
   │      → corner radius, shadow → tốn fillrate      │
   └──────────────────────────────────────────────────┘
```

### 6.4. Allocations — debug memory

```
   1. Profile với Allocations
   2. "Mark Generation" trước khi tương tác
   3. Tương tác (vd: vào màn hình → quay ra)
   4. "Mark Generation" lần nữa
   5. Xem "Generation B" — object nào sống sót

   Nếu navigate vào và ra mà object vẫn còn → leak
```

---

## 7. Console.app — đọc native log từ device

```bash
# Mac:
open /System/Applications/Utilities/Console.app

# Hoặc terminal:
log stream --predicate 'process == "MyApp"' --info --debug
```

→ Xem `NSLog`, `os_log`, system warnings, crash log của device thật mà không cần Xcode mở.

### 7.1. Lưu ý từ iOS 16+

`NSLog` mặc định không hiện trong Console nếu app chưa được sign bằng cert phù hợp. Dùng `os_log`:

```objc
#import <os/log.h>
os_log(OS_LOG_DEFAULT, "User logged in: %{public}@", username);
//                                       ^ public → log thật, ko bị redact <private>
```

---

## 8. Android Studio debugger

### 8.1. Mở project Android

```bash
# Mở folder android/, KHÔNG phải root
studio android/

# Hoặc Android Studio > Open > chọn android/ folder
```

### 8.2. Run debug

```
   Top toolbar:
     - Chọn config: app
     - Chọn device
     - Click Debug (bug icon, KHÔNG phải Run)

   Hoặc Shift+F9
```

→ App start với debugger attach. Breakpoint + step debugger giống Xcode.

### 8.3. Logcat — quan trọng nhất

```
   Tab Logcat dưới Android Studio
   Filter: package:mine            (chỉ log của app)
   Filter: tag:RNFatalException    (lỗi RN native)
   Level:  Verbose / Debug / Info / Warn / Error / Assert
```

```
   Patterns hay gặp:
     E/AndroidRuntime: FATAL EXCEPTION       ← native crash
     E/ReactNativeJS:                        ← JS error
     W/System.err:                           ← exception in process
     I/Choreographer: Skipped 30 frames!     ← jank
     E/libEGL: ...                           ← OpenGL error
```

### 8.4. Logcat từ command line — không mở Studio

```bash
# Chỉ app mình
adb logcat --pid=$(adb shell pidof -s com.mycompany.myapp)

# Filter theo tag
adb logcat *:S ReactNativeJS:V          # chỉ tag ReactNativeJS

# Save vào file
adb logcat -d > log.txt                  # snapshot
adb logcat > log.txt                     # stream

# Clear log buffer
adb logcat -c
```

### 8.5. ADB commands cheat sheet

```bash
# Devices
adb devices                               # list
adb -s <serial> shell                     # shell device cụ thể

# Install / uninstall
adb install -r app.apk                    # reinstall, keep data
adb uninstall com.mycompany.myapp

# Files
adb push local.txt /sdcard/
adb pull /sdcard/log.txt .

# App lifecycle
adb shell am start -n com.mycompany.myapp/.MainActivity
adb shell am force-stop com.mycompany.myapp
adb shell pm clear com.mycompany.myapp    # clear data

# System
adb shell dumpsys meminfo com.mycompany.myapp
adb shell dumpsys gfxinfo com.mycompany.myapp framestats
adb shell input keyevent KEYCODE_HOME
adb shell input text "Hello"

# Memory pressure simulation
adb shell am send-trim-memory com.mycompany.myapp MODERATE
adb shell am send-trim-memory com.mycompany.myapp COMPLETE
```

---

## 9. Android Profiler — performance toàn diện

```
   View > Tool Windows > Profiler   (Android Studio)
```

### 9.1. CPU Profiler

```
   ┌──────────────────────────────────────────────────────┐
   │  Recording config:                                   │
   │   - Sample Java/Kotlin Methods                       │
   │   - Trace Java/Kotlin Methods (chính xác hơn, slow)  │
   │   - Sample C/C++ Functions                           │
   │   - System Trace (toàn system call)                  │
   │                                                      │
   │  Output:                                             │
   │   - Call chart (flame graph)                         │
   │   - Top down / Bottom up                             │
   │   - Method timeline per thread                       │
   └──────────────────────────────────────────────────────┘
```

### 9.2. Memory Profiler

```
   Track allocations real-time:
     - Java heap
     - Native heap
     - Graphics (textures)
     - Stack
     - Code (DEX)
     - Others

   Capture heap dump → analyze leak suspect
   Click class → see all instances + GC root path
```

### 9.3. Network Profiler

Hiển thị network từ HttpURLConnection / OkHttp. **Lưu ý**: nếu RN dùng OkHttp tuỳ chỉnh (vd thêm interceptor SSL pinning), profiler có thể không bắt được.

### 9.4. System Trace — Perfetto-style

```
   Profiler > System Trace (Android 9+)
     - Mọi thread, CPU core
     - GPU activity
     - Frame timing, jank indicators
     - Atrace / ftrace events
```

→ Tương đương Instruments System Trace trên iOS. Dùng cho frame drop, ANR analysis.

---

## 10. Layout Inspector — debug View Android

```
   Android Studio > Tools > Layout Inspector
```

```
   ┌──────────────────────────────────────────────┐
   │ Hiển thị view hierarchy live của app:        │
   │                                              │
   │  ContentFrameLayout                          │
   │   └─ ReactRootView                           │
   │       └─ ReactViewGroup                      │
   │           ├─ ReactTextView                   │
   │           └─ ReactScrollView                 │
   │                                              │
   │ Click → xem properties: width, height,       │
   │ background, padding, ...                     │
   │                                              │
   │ 3D view tách layer (giống Xcode View Debug). │
   └──────────────────────────────────────────────┘
```

---

## 11. GPU Rendering Profile — Android (developer options)

```
   Trên device:
   Settings > Developer options > Profile GPU rendering > On screen as bars

   Khi tương tác app, dưới màn hình hiển thị bar mỗi frame:
   ┌────────────────────────────┐
   │ Vertical line = 16ms (60fps) │
   │ ▓ Misc time                  │
   │ ▓ Input handling             │
   │ ▓ Animation                  │
   │ ▓ Measure/layout             │
   │ ▓ Draw                       │
   │ ▓ Sync upload (textures)     │
   │ ▓ Issue commands GPU         │
   │ ▓ Swap buffers               │
   └────────────────────────────┘
```

→ Bar nào vượt 16ms → frame đó miss. Màu nào cao → biết tầng nào chậm.

---

## 12. ANR (Application Not Responding) — Android only

### 12.1. ANR là gì

```
   ANR xảy ra khi:
   - Main thread block > 5 giây (Activity input)
   - BroadcastReceiver block > 10 giây
   - Service > 20 giây

   System hiển thị dialog: "App not responding. Wait / Close"
```

### 12.2. Đọc traces

```bash
# Khi ANR xảy ra, system dump vào /data/anr/
adb shell ls /data/anr/
adb pull /data/anr/anr_2026-05-08-12-00-00 .

# Hoặc qua bugreport
adb bugreport bugreport.zip
# Tìm file anr_*.txt trong zip
```

### 12.3. Pattern thường gặp trong RN

```
   ┌────────────────────────────────────────────────┐
   │ ANR thread "main" trong RN thường vì:          │
   │                                                │
   │  - JS thread block lâu (lib JSI sync call lâu) │
   │  - Native module gọi I/O trên main thread      │
   │  - Bridge backlog quá lớn (old arch)           │
   │  - Synchronous SQLite/MMKV trên main thread    │
   │  - Layout flickering (measure/layout vô tận)   │
   └────────────────────────────────────────────────┘
```

### 12.4. Phòng ANR

```kotlin
// Native module — KHÔNG block main thread
@ReactMethod
fun heavyTask(promise: Promise) {
    Thread {                        // hoặc Coroutine
        try {
            val result = doHeavyWork()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR", e)
        }
    }.start()
}
```

---

## 13. Đọc native crash log

### 13.1. iOS — crash log structure

```
   Hardware Model:      iPhone17,1
   Process:             MyApp [1234]
   Version:             1.2.3 (456)
   OS Version:          iOS 26.1.0
   Exception Type:      EXC_CRASH (SIGABRT)
   Exception Codes:     ...
   Termination Reason:  Namespace SIGNAL, Code 0x6

   Last Exception Backtrace:
   0   CoreFoundation   0x... __exceptionPreprocess
   1   libobjc.A.dylib  0x... objc_exception_throw
   2   MyApp            0x... -[ViewController someMethod] + 234
   3   ...
```

**Symbolicate** (có dSYM file):

```bash
# Xcode tự động nếu có dSYM trong Organizer
# Manual:
atos -arch arm64 -o MyApp.app.dSYM/Contents/Resources/DWARF/MyApp 0x100012345
```

### 13.2. Android — tombstone

```bash
adb shell ls /data/tombstones/        # cần root cho prod app, dev OK
adb pull /data/tombstones/tombstone_00 .
```

```
   *** *** *** *** *** *** *** *** *** *** *** *** *** ***
   Build fingerprint: 'google/redfin/...'
   ABI: 'arm64'
   pid: 1234, tid: 5678, name: MyApp >>> com.mycompany.myapp <<<
   signal 11 (SIGSEGV), code 1 (SEGV_MAPERR), fault addr 0x0
       x0  ...
       ...
   backtrace:
     #00 pc 00012345  /data/app/.../libreact_nativemodule.so (foo+34)
```

**Symbolicate** với `ndk-stack`:

```bash
$ANDROID_NDK/ndk-stack -sym android/app/build/intermediates/merged_native_libs/release/out/lib/arm64-v8a -dump tombstone.txt
```

### 13.3. Pattern đọc nhanh

```
   Signal      Nghĩa
   ─────────   ─────────────────────────────────────
   SIGSEGV     Memory access invalid (null pointer, dangling)
   SIGABRT     abort(), assert, NSException uncaught
   SIGBUS      Misaligned memory access
   SIGILL      Illegal instruction (corrupt code)
   SIGTRAP     Debugger breakpoint
```

---

## 14. Debug native module RN viết tay

### 14.1. Setup

```
   1. Set breakpoint trong code Obj-C/Java native module
   2. Build từ Xcode/Studio (debug attach)
   3. Trigger từ JS → JS gọi native method → breakpoint hit
```

### 14.2. iOS — common issues

```
   Symptom                          Likely cause
   ─────────────────────────────    ───────────────────────
   Native module not found          - Missing RCT_EXPORT_MODULE
                                    - Pod chưa install
   Method not found                 - Missing RCT_EXPORT_METHOD
                                    - Sai signature (number args)
   Promise never resolves           - Quên gọi resolve/reject
   Crash khi call from JS           - Param type mismatch
                                      (NSString vs NSNumber)
```

### 14.3. Android — common issues

```
   Symptom                          Likely cause
   ─────────────────────────────    ───────────────────────
   Module undefined trong JS        - getPackages() chưa add
   Method not found                 - @ReactMethod thiếu
   Crash on UI thread               - I/O sync trên @ReactMethod
   Cannot find type                 - Mismatch ReadableMap vs JS
                                      object structure
```

---

## 15. Debug Hermes engine sâu hơn

### 15.1. Hermes profile — JS-side flame graph

```bash
# Bật profiler trong app
# 1. Chạy app
# 2. Dev menu > "Enable Sampling Profiler"
# 3. Tương tác app
# 4. Dev menu > "Disable Sampling Profiler" → save .cpuprofile

# Mở trong Chrome DevTools:
# chrome://inspect → Performance tab → Load Profile
```

### 15.2. Hermes bytecode inspect

```bash
# Disassemble JS bundle
hermes --emit-binary -out=bundle.hbc index.js
hbcdump bundle.hbc                    # human-readable bytecode
```

→ Hữu ích khi nghi optimization Hermes loại bỏ code (vd dead code elimination quá tay).

---

## 16. Workflow debug native crash production

```
   ┌──────────────────────────────────────────────────────┐
   │ 1. Crashlytics/Sentry alert: crash mới               │
   │                                                      │
   │ 2. Xem crash detail:                                 │
   │    - Device, OS, app version                         │
   │    - Stack trace (cần symbolicated)                  │
   │    - Breadcrumb (user actions trước crash)           │
   │                                                      │
   │ 3. Verify dSYM/proguard mapping đã upload:           │
   │    - iOS: dSYM trong Sentry/Crashlytics              │
   │    - Android: mapping.txt cho R8/ProGuard            │
   │                                                      │
   │ 4. Tìm commit gây ra:                                │
   │    - Crash xuất hiện từ version nào                  │
   │    - Diff version đó vs version trước                │
   │                                                      │
   │ 5. Reproduce local:                                  │
   │    - Build cùng config Release                       │
   │    - Cùng device model nếu có                        │
   │                                                      │
   │ 6. Fix → release patch                               │
   │                                                      │
   │ 7. Verify Crashlytics/Sentry crash rate giảm sau     │
   │    rollout patch                                     │
   └──────────────────────────────────────────────────────┘
```

---

## 17. Bảng so sánh tools

| Mục đích | iOS | Android |
|---|---|---|
| **Source debugger** | Xcode + LLDB | Android Studio + java debugger |
| **CPU profile** | Instruments > Time Profiler | Profiler > CPU |
| **Memory leak** | Memory Graph + Instruments > Allocations | Profiler > Memory + heap dump |
| **Network** | Instruments > Network / Charles | Profiler > Network / Charles |
| **View tree** | View Debugger | Layout Inspector |
| **System trace** | Instruments > System Trace | Profiler > System Trace (Perfetto) |
| **Console log** | Console.app, Xcode console | Logcat |
| **Crash log** | Xcode Organizer, .ips files | Tombstone, Crashlytics |
| **GPU profile** | Instruments > Core Animation, Metal HUD | GPU Rendering bars |

---

## 18. Đọc thêm

| Tài liệu | Link |
|---|---|
| Xcode debugging overview | https://developer.apple.com/documentation/xcode/debugging |
| LLDB cheat sheet | https://lldb.llvm.org/use/map.html |
| Instruments user guide | https://help.apple.com/instruments/mac/current/ |
| Address Sanitizer | https://developer.apple.com/documentation/xcode/diagnosing-memory-thread-and-crash-issues-early |
| Android debug overview | https://developer.android.com/studio/debug |
| Android Profiler | https://developer.android.com/studio/profile |
| Logcat | https://developer.android.com/studio/debug/logcat |
| ADB | https://developer.android.com/studio/command-line/adb |
| ANR analysis | https://developer.android.com/topic/performance/vitals/anr |
| Tombstone | https://source.android.com/docs/core/tests/debug/native-crash |
| Hermes profiling | https://reactnative.dev/docs/profile-hermes |
