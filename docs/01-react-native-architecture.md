# React Native — Kiến trúc giao tiếp JS ↔ Native

> Tài liệu này tổng hợp từ tài liệu chính thức React Native (reactnative.dev), RFC của Meta, và các bài viết engineering từ team React Native core.
>
> **Nguồn tham khảo chính**:
> - https://reactnative.dev/architecture/overview
> - https://reactnative.dev/architecture/landing-page
> - https://github.com/reactwg/react-native-new-architecture
> - https://engineering.fb.com/2018/06/14/android/react-native-rearchitecture/

---

## 1. Tổng quan: React Native chạy như thế nào?

React Native (RN) cho phép viết UI bằng JavaScript/TypeScript nhưng **render ra native view thật** (UIView trên iOS, android.view.View trên Android) — **không phải WebView**.

Ý tưởng cốt lõi: tách thành 2 “thế giới”:

```
┌─────────────────────────────┐         ┌─────────────────────────────┐
│        JS World             │         │       Native World          │
│  (Hermes / JSC engine)      │ ◄─────► │  (Obj-C/Swift, Java/Kotlin) │
│                             │         │                             │
│  - React reconciler         │         │  - UIView / android.View    │
│  - Component tree           │         │  - Threading (UI/BG)        │
│  - Business logic           │         │  - Platform APIs            │
│  - Hooks, state             │         │  - Native modules           │
└─────────────────────────────┘         └─────────────────────────────┘
```

Mọi thứ đặt ra câu hỏi: **2 thế giới này nói chuyện với nhau bằng cách nào?**

→ Đó là điểm khác biệt cốt lõi giữa **Old Architecture (Bridge)** và **New Architecture (JSI + Turbo + Fabric)**.

---

## 2. Old Architecture — Bridge (RN < 0.68 mặc định)

### 2.1. Threading model

RN cũ chia ra **3 thread chính**:

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   JS Thread     │   │ Shadow Thread   │   │   UI/Main Thread│
│                 │   │  (Layout)       │   │   (Native)      │
│ - Run Hermes/JSC│   │ - Yoga layout   │   │ - Render UIView │
│ - React tree    │   │ - C++ engine    │   │ - Touch events  │
│ - Setstate, fx  │   │ - Flexbox calc  │   │ - Animations    │
└────────┬────────┘   └────────┬────────┘   └────────▲────────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                       The BRIDGE
                  (JSON, async, batched)
```

- **JS Thread**: nơi code React chạy. Chỉ một thread duy nhất → block là cả app lag.
- **Shadow Thread**: tính layout (Yoga — clone của Flexbox). Chạy C++ riêng để không block JS.
- **UI / Main Thread**: thread native gốc của OS, render view, xử lý touch.

### 2.2. The Bridge — vấn đề lớn nhất của kiến trúc cũ

Bridge là một hàng đợi message **bất đồng bộ, batched, JSON-serialized** giữa JS và Native.

```
JS gọi: NativeModules.CameraModule.takePhoto({ flash: true })
   │
   ▼
┌──────────────────────────────────────────┐
│ 1. Serialize payload thành JSON string   │
│    {"module":"CameraModule",             │
│     "method":"takePhoto",                │
│     "args":[{"flash":true}]}             │
└──────────────────────────────────────────┘
   │
   ▼ (queue, batched mỗi frame ~16ms)
┌──────────────────────────────────────────┐
│ 2. Bridge gom batch, gửi sang Native     │
└──────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────┐
│ 3. Native deserialize JSON → method call │
│    [cameraModule takePhoto:@{...}]       │
└──────────────────────────────────────────┘
   │
   ▼
┌──────────────────────────────────────────┐
│ 4. Kết quả → JSON → Bridge → JS callback │
└──────────────────────────────────────────┘
```

### 2.3. Hệ quả của Bridge

| Vấn đề | Giải thích |
|---|---|
| **Async-only** | Không gọi native đồng bộ được. Đo `Dimensions` cũng phải `await`. |
| **JSON overhead** | Mọi data đều serialize/deserialize → tốn CPU, tốn memory. |
| **Lag startup** | App phải chờ JS bundle parse + bridge init xong mới render được. |
| **Race condition** | List dài scroll nhanh → JS gửi update chậm hơn UI scroll → empty cells. |
| **Không share memory** | JS và Native không chia sẻ được object trực tiếp. |

> Đây là lý do Meta phải viết lại kiến trúc — không phải vì RN “chậm”, mà vì **bridge giới hạn khả năng tối ưu sâu hơn**.

---

## 3. New Architecture — JSI + Turbo Modules + Fabric (RN 0.68+, mặc định từ 0.76)

New Architecture có 4 trụ cột:

```
┌─────────────────────────────────────────────────────────────┐
│                     New Architecture                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│     JSI      │ Turbo Modules│    Fabric    │    Codegen     │
│              │              │              │                │
│ Thay Bridge  │ Thay Native  │ Thay UIMan-  │ Sinh code C++  │
│ → giao tiếp  │ Modules      │ ager → render│ từ TS specs để │
│ trực tiếp    │ (lazy load + │ đồng bộ +    │ đảm bảo type   │
│ qua C++ ref  │ sync calls)  │ concurrent   │ safety 2 phía  │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 3.1. JSI — JavaScript Interface

**JSI là một abstract C++ API** cho phép JS engine (Hermes, JSC, V8) expose JS object ra C++ và ngược lại.

```
       OLD (Bridge)                          NEW (JSI)
┌──────────┐   JSON   ┌──────────┐    ┌──────────┐  C++ ref  ┌──────────┐
│ JS World │ ◄─────► │  Native  │    │ JS World │ ◄────────►│  Native  │
└──────────┘  async   └──────────┘    └──────────┘  sync OK  └──────────┘
              batched                              shared mem
              serialize                            zero copy
```

**JSI hoạt động như thế nào?**

JS engine (Hermes) cung cấp `jsi::Runtime`. C++ code có thể:
1. Tạo `HostObject` (object C++ giả làm JS object).
2. Đăng ký vào global → JS gọi `global.someNativeApi.foo()` → chạy thẳng C++ function.
3. Không serialize, không queue, có thể đồng bộ.

```cpp
// C++ side (đơn giản hoá)
class CameraHostObject : public jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    if (name.utf8(rt) == "takePhoto") {
      return jsi::Function::createFromHostFunction(
        rt, name, 1,
        [](jsi::Runtime& rt, const jsi::Value&, const jsi::Value* args, size_t)
          -> jsi::Value {
            // Gọi native API trực tiếp, sync hoặc async tuỳ ý
            return jsi::Value(/* kết quả */);
        });
    }
    return jsi::Value::undefined();
  }
};
```

```ts
// JS side
global.NativeCamera.takePhoto({ flash: true }); // chạy thẳng C++, không qua bridge
```

### 3.2. Turbo Modules — thay thế Native Modules

**Native Modules cũ**:
- Tất cả module load eager khi app start → tốn TTI (Time-To-Interactive).
- Chỉ async, chỉ JSON.
- Không có type-check giữa JS và Native — sai tên prop runtime mới crash.

**Turbo Modules mới**:

```
                    Turbo Module Architecture

   TypeScript Spec (NativeCamera.ts)
        │
        ▼
   ┌─────────────┐
   │  Codegen    │  → tạo C++ interface + Obj-C protocol + Java interface
   └─────────────┘
        │
        ▼
   ┌──────────────────────────────────┐
   │ JS gọi: NativeCamera.takePhoto() │
   └──────────────┬───────────────────┘
                  │ JSI direct call
                  ▼
   ┌──────────────────────────────────┐
   │ C++ Turbo Module impl            │
   │  → forward sang Obj-C / Java     │
   └──────────────────────────────────┘
                  │
                  ▼
            Native API
```

**Lợi ích**:
- **Lazy loading**: chỉ load module khi JS gọi đến → app start nhanh hơn.
- **Type-safe**: spec TypeScript là source of truth, codegen sinh ra code 2 phía.
- **Sync calls** (khi cần): `Dimensions.get('window')` không cần await nữa.

### 3.3. Fabric — render system mới

**UIManager cũ** (Old Architecture):
```
JS render → diff → batch UI ops → bridge → Native UIManager → tạo/update view
```
- Async, không thể giữ UI consistent với React tree khi animation phức tạp.
- Không support `Suspense`, `Concurrent Mode` đúng nghĩa.

**Fabric**:
```
   ┌────────────────────────────────────┐
   │         React (JS)                 │
   │  - Reconciler (concurrent)         │
   └─────────────┬──────────────────────┘
                 │ JSI
                 ▼
   ┌────────────────────────────────────┐
   │   Fabric Renderer (C++)            │
   │  - Shadow Tree (immutable, C++)    │
   │  - Yoga layout (cùng thread)       │
   └─────────────┬──────────────────────┘
                 │
                 ▼
   ┌────────────────────────────────────┐
   │   Mounting Layer (platform)        │
   │  - iOS: UIView                     │
   │  - Android: android.view.View      │
   └────────────────────────────────────┘
```

**Đặc điểm**:
- **Shadow tree là C++ immutable** — share giữa JS và UI thread không cần lock.
- **Sync rendering** khi cần (vd: input, animation gesture).
- **Concurrent rendering**: hỗ trợ React 18 (`useTransition`, `Suspense`).
- **Cross-platform shadow tree**: cùng C++ code chạy iOS + Android → ít bug platform-specific.

### 3.4. Codegen — code generator

Đầu vào: TypeScript spec (`Native*.ts`, `*NativeComponent.ts`).
Đầu ra: code C++/Obj-C/Java với type được kiểm tra cả 2 phía build-time.

```ts
// specs/NativeCalculator.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  add(a: number, b: number): number;          // sync
  fetchUser(id: string): Promise<{name: string}>;  // async
}

export default TurboModuleRegistry.getEnforcing<Spec>('Calculator');
```

→ Codegen sinh:
- C++ JSI binding
- Obj-C `RCTCalculatorSpec` protocol
- Java `CalculatorSpec` abstract class

Native dev chỉ implement, không lo binding.

---

## 4. So sánh Old vs New Architecture

| Khía cạnh | Old (Bridge) | New (JSI + Fabric + Turbo) |
|---|---|---|
| **Giao tiếp JS ↔ Native** | JSON, async, batched | C++ refs qua JSI, có thể sync |
| **Module loading** | Eager (all upfront) | Lazy (on first call) |
| **Type safety** | Runtime only | Build-time (Codegen) |
| **Render** | UIManager async | Fabric C++ shadow tree |
| **Concurrent React** | Không hỗ trợ tốt | Hỗ trợ đầy đủ |
| **Memory** | JSON copies | Zero-copy refs |
| **Startup time** | Chậm (load all) | Nhanh (lazy) |
| **Debug** | Chrome DevTools (remote) | Hermes Inspector / Flipper |

---

## 5. Lifecycle gọi Native từ JS — chi tiết flow

### 5.1. Old Architecture — gọi `NativeModules.MyModule.doStuff(arg)`

```
JS Thread                Bridge                   Native Thread
─────────                ──────                   ─────────────
[1] doStuff(arg)
    │
    ▼
[2] enqueueNativeCall
    serialize → JSON ──────►
                          [3] queue, wait next batch
                          [4] flush batch ─────────►
                                                  [5] dispatch by moduleId+methodId
                                                      │
                                                      ▼
                                                  [6] [myModule doStuff:arg]
                                                      │
                                                      ▼
                                                  [7] callback(JSON) ──┐
                          [8] queue response ◄─────────────────────────┘
[9] resolve promise ◄─── deserialize ── flush
```

### 5.2. New Architecture — gọi Turbo Module

```
JS Thread                                          Native
─────────                                          ──────
[1] NativeMyModule.doStuff(arg)
    │
    ▼
[2] JSI HostFunction trực tiếp gọi C++
    │
    ▼
[3] C++ TurboModule.doStuff(arg)
    │   (no serialization, có thể sync)
    ▼
[4] [myModule doStuff:arg]  /  myModule.doStuff(arg)
    │
    ▼
[5] return giá trị (JSI Value) ──── JS nhận luôn
```

→ Latency giảm từ **~5–10ms** (bridge round-trip) xuống **~0.1ms** (function call).

---

## 6. Hermes — JS engine mặc định

Từ RN 0.70, **Hermes** là JS engine mặc định (thay JSC trên iOS / V8 trên Android).

**Lý do chọn Hermes**:
- Bytecode precompiled → JS không cần parse lúc runtime → **TTI nhanh hơn 2–3x**.
- Memory footprint nhỏ hơn JSC.
- Tích hợp sẵn JSI → bắt buộc cho New Architecture.
- Có debugger Chrome DevTools-compatible.

```
┌───────────────────────────────────────────┐
│  app.bundle.js (text)                     │
│      │                                    │
│      ▼  hermesc (build-time)              │
│  app.bundle.hbc (bytecode)                │
│      │                                    │
│      ▼  Hermes VM (runtime)               │
│  Execute trực tiếp, không parse text      │
└───────────────────────────────────────────┘
```

---

## 7. Khi nào điều này quan trọng với người viết app?

**Hầu hết developer RN không tự viết JSI/Fabric** — bạn dùng `useState`, `View`, `FlatList` như thường. Nhưng hiểu kiến trúc giúp:

1. **Debug performance**: biết lag xuất phát từ JS thread, Shadow thread, hay native render.
2. **Viết native module**: chọn Turbo Module thay Native Module cũ.
3. **Migrate New Architecture**: biết cần update lib nào, codegen spec ra sao.
4. **Đánh giá lib**: lib nào dùng JSI (Reanimated 2+, MMKV, VisionCamera) sẽ nhanh hơn lib bridge cũ.
5. **Chọn pattern**: animation phức tạp dùng Reanimated worklets (chạy trên UI thread qua JSI), không dùng `Animated` API cũ.

---

## 8. Đọc thêm

| Tài liệu | Link |
|---|---|
| RN Architecture overview | https://reactnative.dev/architecture/overview |
| New Architecture working group | https://github.com/reactwg/react-native-new-architecture |
| Fabric deep dive (Meta blog) | https://engineering.fb.com/2018/06/14/android/react-native-rearchitecture/ |
| JSI introduction | https://formidable.com/blog/2019/jsi-jsc-part-2/ |
| Hermes | https://hermesengine.dev |
| Reanimated worklets (real-world JSI) | https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/worklets |
