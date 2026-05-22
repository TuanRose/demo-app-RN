# Các kiến trúc Mobile Development — toàn cảnh và so sánh

> Nguồn tham khảo:
> - https://developer.apple.com/documentation
> - https://developer.android.com/guide
> - https://docs.flutter.dev/resources/architectural-overview
> - https://kotlinlang.org/docs/multiplatform.html
> - https://learn.microsoft.com/en-us/dotnet/maui
> - https://web.dev/progressive-web-apps

---

## 1. Bức tranh tổng quát

Có **5 nhóm kiến trúc** chính để build mobile app:

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  1. NATIVE                  iOS Swift/Obj-C    Android Kotlin/Java  │
│                                                                     │
│  2. CROSS-PLATFORM (NATIVE-BRIDGE)    React Native, NativeScript    │
│                                                                     │
│  3. CROSS-PLATFORM (CUSTOM RENDER)    Flutter (Skia/Impeller)       │
│                                                                     │
│  4. HYBRID (WEBVIEW)        Cordova, Ionic, Capacitor               │
│                                                                     │
│  5. PWA / WEB-FIRST         Web app cài như app                     │
│                                                                     │
│  Bonus: SHARED-LOGIC ONLY   KMM (Kotlin Multiplatform)              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Trục so sánh chính:
- **Native fidelity**: app trông và chạy giống native bao nhiêu?
- **Code share %**: bao nhiêu code dùng chung iOS+Android?
- **Performance**: tốc độ render, khả năng tận dụng hardware.
- **Developer experience**: hot reload, ecosystem, tooling.
- **Hiring**: tìm dev dễ không?

---

## 2. Native Development

### 2.1. iOS Native

```
┌────────────────────────────────────────────┐
│          App Code (Swift / Obj-C)          │
│                                            │
│   UIKit  /  SwiftUI   ← UI framework       │
│   Foundation                               │
│   Core Data, CoreLocation, ...             │
└────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────┐
│  iOS SDK (Cocoa Touch)                     │
└────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────┐
│  Darwin kernel + Metal / GPU               │
└────────────────────────────────────────────┘
```

- **Ngôn ngữ**: Swift (mới), Objective-C (legacy).
- **UI**: UIKit (imperative, mature) hoặc SwiftUI (declarative, RN-like).
- **IDE**: Xcode.
- **Package**: Swift Package Manager, CocoaPods.

### 2.2. Android Native

```
┌────────────────────────────────────────────┐
│         App Code (Kotlin / Java)           │
│                                            │
│   Jetpack Compose / View XML  ← UI         │
│   Coroutines, Flow                         │
│   Room, Retrofit, ...                      │
└────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────┐
│  Android Framework (Java APIs)             │
└────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────┐
│  ART runtime (Dalvik bytecode)             │
└────────────────────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────┐
│  Linux kernel + Vulkan / OpenGL            │
└────────────────────────────────────────────┘
```

- **Ngôn ngữ**: Kotlin (modern), Java (legacy).
- **UI**: Jetpack Compose (declarative) hoặc View XML (imperative).
- **IDE**: Android Studio.
- **Package**: Gradle + Maven.

### 2.3. Khi nào chọn Native?

| Chọn Native khi | Không nên khi |
|---|---|
| App game, AR/VR, đòi performance tối đa | Team nhỏ, ngân sách hạn chế |
| Cần dùng hardware sâu (camera RAW, sensor) | Cần ship 2 platform cùng lúc nhanh |
| App OS-level (system app, keyboard, widget) | App business logic là chính |
| Cần UI/UX mới nhất ngay khi OS release | Cần share code với web app |

---

## 3. Cross-Platform — Native Bridge approach

### 3.1. React Native

```
┌──────────────────────────────────────────┐
│  JS / TS App Code                        │
│  React components                        │
└──────────────────────────────────────────┘
                  │
                  ▼  JSI (zero-copy C++ refs)
┌──────────────────────────────────────────┐
│  Fabric Renderer (C++)                   │
│  Turbo Modules (C++)                     │
└──────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────┐
│  Native UIView / android.view.View       │
│  Native modules (camera, GPS, ...)       │
└──────────────────────────────────────────┘
```

- **UI**: render ra native view thật → UX native chuẩn (animation, scroll, gesture giống OS).
- **Logic**: chạy trên Hermes (JS engine).
- **Code share**: ~85–95% iOS+Android, ~70% nếu share với web (React Native Web).
- **Ai dùng**: Meta (FB, Instagram), Microsoft (Office, Outlook), Discord, Shopify, Coinbase.

### 3.2. NativeScript

Tương tự RN nhưng:
- Dùng JavaScriptCore, không có JSI riêng.
- Expose toàn bộ native API ra JS qua reflection (khác RN — RN cần module wrapper).
- UI dùng XML/Angular/Vue.

### 3.3. Đặc điểm chung của native-bridge approach

| Điểm mạnh | Điểm yếu |
|---|---|
| UI thật là native → fidelity cao | Cần native dev để viết module mới |
| Hot reload, fast iteration | Performance kém hơn native ở edge case |
| Ecosystem npm khổng lồ | Dependency hell (npm + pod + gradle) |
| Share code với web (RN Web) | Native version mới ra hỗ trợ chậm |

---

## 4. Cross-Platform — Custom Renderer (Flutter)

### 4.1. Kiến trúc Flutter

```
┌──────────────────────────────────────────────┐
│  Dart App Code                               │
│  Widgets (Material / Cupertino)              │
└──────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  Flutter Framework (Dart)                    │
│   - Widgets                                  │
│   - Rendering layer (RenderObject tree)      │
│   - Animations, gestures                     │
└──────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  Flutter Engine (C++)                        │
│   - Skia / Impeller (graphics)               │
│   - Dart VM                                  │
│   - Text rendering                           │
└──────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  Platform embedder                           │
│   - iOS: UIView (1 cái duy nhất)             │
│   - Android: SurfaceView                     │
└──────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  GPU (Metal / Vulkan / OpenGL)               │
└──────────────────────────────────────────────┘
```

**Khác biệt cốt lõi với RN**:
- Flutter **KHÔNG dùng native UI widget**. Mỗi pixel Flutter tự vẽ qua Skia/Impeller.
- App Flutter chỉ là **1 `UIView` (iOS) hoặc 1 `SurfaceView` (Android)** chứa canvas riêng.
- → Tự kiểm soát 100% rendering, 60fps đồng nhất 2 platform.
- → Nhưng phải **tự reimplement** Material, Cupertino mỗi lần OS update.

### 4.2. Dart — ngôn ngữ

- Compile thành machine code khi build production (AOT) → chạy nhanh.
- Compile JIT lúc dev → hot reload < 1s.
- Strong typed, single-threaded với isolates (giống Web Worker).

### 4.3. So sánh tư duy: RN vs Flutter

```
       React Native              vs              Flutter

   "Bridge to native UI"                     "Replace native UI"

   ┌──────────┐                            ┌──────────┐
   │ JS code  │                            │Dart code │
   └────┬─────┘                            └────┬─────┘
        │ JSI                                   │
        ▼                                       ▼
   ┌──────────┐                            ┌──────────┐
   │  Native  │                            │  Skia    │
   │  UIView  │                            │  Canvas  │
   │  android.│                            │ (custom) │
   │   View   │                            └────┬─────┘
   └──────────┘                                 ▼
                                           ┌──────────┐
                                           │ 1 native │
                                           │ surface  │
                                           └──────────┘
```

| | React Native | Flutter |
|---|---|---|
| UI render | Native widget | Custom Skia/Impeller |
| Ngôn ngữ | TS/JS | Dart |
| Look-and-feel | Native theo từng OS | Đồng nhất 2 platform |
| Hot reload | ✅ Fast Refresh | ✅ Sub-second |
| Performance | Tốt, gần native | Rất tốt, 60/120fps |
| Bundle size | ~7-15 MB | ~15-25 MB (engine lớn) |
| Ai dùng | Meta, MSFT, Shopify | Google Pay, BMW, Alibaba |
| Web support | RN Web (decent) | Flutter Web (chưa SEO tốt) |

---

## 5. Hybrid — WebView approach

### 5.1. Cordova / Ionic / Capacitor

```
┌─────────────────────────────────────────┐
│    Native shell app                     │
│  ┌───────────────────────────────────┐  │
│  │  WKWebView (iOS)                  │  │
│  │  WebView (Android)                │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  HTML + CSS + JS            │  │  │
│  │  │  React / Vue / Angular      │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│           │ Plugin bridge               │
│           ▼                             │
│  ┌───────────────────────────────────┐  │
│  │  Native plugins (camera, ...)     │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- App là 1 web app chạy trong WebView native.
- **Capacitor** (Ionic team) là phiên bản hiện đại của Cordova.
- Plugin gọi native qua JSON bridge tương tự RN cũ.

### 5.2. Đặc điểm

| Điểm mạnh | Điểm yếu |
|---|---|
| Code share gần 100% với web | UI không thật sự native |
| Dev web có thể làm app ngay | Performance kém hơn |
| Ship nhanh, deploy lại không qua App Store (web) | Animation, scroll cảm giác “web” |
| | Bị giới hạn bởi WebView của OS |

→ Phù hợp cho **app nội bộ, tool đơn giản, MVP**, không phù hợp app người dùng cuối nhạy UX.

---

## 6. Progressive Web Apps (PWA)

```
┌──────────────────────────────────────┐
│  Browser (Safari, Chrome, ...)       │
│   ┌────────────────────────────────┐ │
│   │  Web App                       │ │
│   │  + Service Worker (offline)    │ │
│   │  + Web Manifest (install icon) │ │
│   │  + Push API, Notifications     │ │
│   └────────────────────────────────┘ │
└──────────────────────────────────────┘
                │
                ▼ "Add to Home Screen"
┌──────────────────────────────────────┐
│  Trông như app, mở fullscreen        │
│  Có icon trên home screen            │
└──────────────────────────────────────┘
```

- **Không có native code** — chỉ web standards.
- iOS hỗ trợ giới hạn (Apple cố tình hạn chế để bảo vệ App Store).
- Phù hợp cho content app (news, blog, e-commerce).

---

## 7. Kotlin Multiplatform Mobile (KMM) — chia sẻ logic, KHÔNG share UI

```
   ┌──────────────────────────────────────────────────┐
   │               Shared Kotlin Module                │
   │  ┌──────────────────────────────────────────────┐ │
   │  │  Business logic, networking, database        │ │
   │  │  ViewModel, Repository, ...                  │ │
   │  └──────────────────────────────────────────────┘ │
   └──────────────────────────────────────────────────┘
            │                              │
            ▼                              ▼
   ┌──────────────────┐            ┌──────────────────┐
   │ iOS App (Swift)  │            │ Android (Kotlin) │
   │ SwiftUI / UIKit  │            │ Compose / View   │
   └──────────────────┘            └──────────────────┘
       UI riêng từng platform — share ~50-70% logic
```

- Compile Kotlin → native binary cho cả 2 platform.
- iOS dùng Swift gọi vào shared module qua Kotlin/Native.
- **UI vẫn native riêng** → fidelity cao nhất.
- Compose Multiplatform mở rộng cho UI share luôn (mới, chưa stable hoàn toàn).

**Ai dùng**: Netflix (một phần), Cash App, McDonald's, Philips.

---

## 8. .NET MAUI / Xamarin

- Microsoft stack, kế thừa từ Xamarin.Forms.
- Code C# / XAML.
- Có 2 mode:
  - **MAUI**: render ra native handlers (giống RN).
  - **Hybrid Blazor**: chạy Blazor (web) trong WebView.

Ít phổ biến trong khu vực startup, nhưng mạnh ở enterprise / Microsoft ecosystem.

---

## 9. Bảng so sánh tổng

| Tiêu chí | Native | RN | Flutter | Capacitor | KMM | PWA |
|---|---|---|---|---|---|---|
| **Code share iOS+Android** | 0% | 90% | 95% | 99% | 50-70% | 100% |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Native UI fidelity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| **Dev velocity** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Hot reload** | Limited | ✅ | ✅ | ✅ | Limited | ✅ |
| **Bundle size** | Nhỏ nhất | Trung bình | Lớn | Trung bình | Nhỏ | N/A |
| **Ecosystem** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Hiring (VN)** | Khá | Dễ | Khá | Dễ | Khó | Dễ |
| **Phù hợp app** | Game, system, AR | App business, social | App brand-heavy, đồng nhất UX | Tool nội bộ | Big enterprise | Content site |

---

## 10. Decision tree — chọn kiến trúc nào?

```
                    ┌─────────────────────────────┐
                    │ Cần performance tối đa,      │
                    │ AR/VR, game 3D nặng?         │
                    └─────────┬───────────────────┘
                              │
                       ┌──────┴──────┐
                       Yes           No
                        │             │
                        ▼             ▼
                   ┌────────┐   ┌─────────────────────────────┐
                   │ NATIVE │   │ Có team native sẵn 2 platform│
                   └────────┘   │ và app rất quan trọng?       │
                                └─────────┬───────────────────┘
                                          │
                                   ┌──────┴──────┐
                                   Yes           No
                                    │             │
                                    ▼             ▼
                               ┌────────┐   ┌─────────────────────┐
                               │ NATIVE │   │ Cần look-feel native │
                               │ + KMM  │   │ theo từng platform?  │
                               │(share) │   └─────────┬───────────┘
                               └────────┘             │
                                                ┌─────┴─────┐
                                                Yes         No
                                                 │           │
                                                 ▼           ▼
                                           ┌────────┐  ┌─────────┐
                                           │   RN   │  │ FLUTTER │
                                           └────────┘  └─────────┘
                                                 │           │
                                  Khi nào ko nên RN/Flutter?
                                                 │
                                                 ▼
                                  ┌────────────────────────────────┐
                                  │ App đơn giản, dev web only,    │
                                  │ acceptable UX trung bình       │
                                  │  → CAPACITOR / PWA             │
                                  └────────────────────────────────┘
```

---

## 11. Roadmap tự học cho Solution Architect

Để hiểu sâu mobile architecture (định hướng SA), ưu tiên theo thứ tự:

1. **Native foundation** (1 platform là đủ để hiểu nguyên lý)
   - iOS: UIView lifecycle + UIKit + SwiftUI cơ bản
   - Android: Activity lifecycle + View pipeline + Compose cơ bản
2. **React Native New Architecture**
   - Hiểu JSI, Turbo Modules, Fabric
   - Viết 1 Turbo Module thật, 1 Fabric Component thật
3. **Native render performance**
   - Profile với Instruments + Android Profiler
   - Hiểu CALayer, RenderThread, frame budget
4. **Flutter** (so sánh, không cần ship)
   - Hiểu vì sao Skia/Impeller khác native bridge
   - Đọc kiến trúc, không cần code production
5. **KMM** (cho enterprise)
   - Hiểu khi nào KMM hợp lý, khi nào RN/Flutter hợp lý hơn
6. **CI/CD + Release** (skill SA bắt buộc)
   - Fastlane, EAS Build, GitHub Actions
   - Code signing, provisioning profile, Play Console
7. **Observability**
   - Sentry, Crashlytics, Firebase Performance
   - OpenTelemetry mobile

---

## 12. Tài liệu chính thức để đọc sâu

| Chủ đề | Link |
|---|---|
| Apple App Programming Guide | https://developer.apple.com/library/archive/documentation/iPhone/Conceptual/iPhoneOSProgrammingGuide/ |
| Android Architecture Guide | https://developer.android.com/topic/architecture |
| Jetpack Compose | https://developer.android.com/jetpack/compose/documentation |
| SwiftUI Tutorials | https://developer.apple.com/tutorials/swiftui |
| React Native Architecture | https://reactnative.dev/architecture/overview |
| Flutter Architectural Overview | https://docs.flutter.dev/resources/architectural-overview |
| Kotlin Multiplatform | https://kotlinlang.org/docs/multiplatform.html |
| .NET MAUI | https://learn.microsoft.com/en-us/dotnet/maui/ |
| Capacitor | https://capacitorjs.com/docs |
| PWA on web.dev | https://web.dev/explore/progressive-web-apps |

---

## 13. Sách / khoá học gợi ý (tin cậy)

- **iOS**: *iOS Programming: The Big Nerd Ranch Guide* — chuẩn để hiểu UIKit + UIView lifecycle.
- **Android**: *Android Programming: The Big Nerd Ranch Guide*.
- **React Native**: official docs + working group RFC trên GitHub (Meta engineers viết).
- **Flutter**: official docs là tốt nhất, không cần sách.
- **Mobile system design**: *Designing Data-Intensive Applications* (M. Kleppmann) — không phải mobile cụ thể nhưng nguyên lý áp dụng được.
- **Kiến trúc app**: *Clean Architecture* (Robert C. Martin) — apply cho cả native và RN.
