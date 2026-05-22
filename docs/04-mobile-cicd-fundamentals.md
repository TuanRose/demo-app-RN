# Mobile Deploy & CI/CD — Nền tảng

> Trước khi học Fastlane hay GitHub Actions, cần nắm chắc các khái niệm gốc: code signing, versioning, release channels, OTA updates. Phần này không phụ thuộc tool — áp dụng cho cả native, RN, Flutter.
>
> **Nguồn tham khảo chính**:
> - https://developer.apple.com/documentation/appstoreconnectapi
> - https://developer.apple.com/documentation/security/code-signing-tasks
> - https://developer.android.com/studio/publish
> - https://developer.android.com/studio/publish/app-signing
> - https://reactnative.dev/docs/publishing-to-app-store

---

## 1. Mobile release pipeline — bức tranh tổng

```
   ┌─────────────────────────────────────────────────────────────┐
   │                                                             │
   │   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────────┐  │
   │   │ Code │ → │Build │ → │ Sign │ → │Upload│ → │ Distribute│  │
   │   └──────┘   └──────┘   └──────┘   └──────┘   └──────────┘  │
   │     git      .ipa/.aab    cert       store        users     │
   │                                                             │
   └─────────────────────────────────────────────────────────────┘
```

| Bước | iOS | Android |
|---|---|---|
| **Build** | Xcode → `.ipa` (archive + export) | Gradle → `.aab` (App Bundle) hoặc `.apk` |
| **Sign** | Cert + Provisioning Profile | Keystore (`.jks` / `.keystore`) |
| **Upload** | App Store Connect (TestFlight/AppStore) | Google Play Console |
| **Distribute** | TestFlight, App Store, Ad-hoc, Enterprise | Internal/Closed/Open testing, Production |

---

## 2. iOS Code Signing — phần khó nhất

### 2.1. Tại sao iOS signing phức tạp?

Apple bắt buộc mọi app chạy trên thiết bị thật phải được **ký bằng identity hợp lệ** + **provisioning profile match với device + entitlements + bundle ID**.

```
┌────────────────────────────────────────────────────────────┐
│  Để ký được 1 build iOS, bạn cần:                          │
│                                                            │
│  1. Apple Developer Account ($99/năm)                      │
│  2. Bundle ID đăng ký (com.company.app)                    │
│  3. Certificate (.p12 + private key)                       │
│       ├─ Development cert                                  │
│       └─ Distribution cert                                 │
│  4. Provisioning Profile (.mobileprovision)                │
│       ├─ Development (dev devices)                         │
│       ├─ Ad-hoc (limited devices)                          │
│       ├─ App Store (production)                            │
│       └─ Enterprise (in-house)                             │
│  5. Entitlements file (Push, iCloud, ...)                  │
└────────────────────────────────────────────────────────────┘
```

### 2.2. Quan hệ giữa các artifact

```
   Apple Developer Portal
   ┌──────────────────────────────────────────────┐
   │                                              │
   │  Identifier (Bundle ID): com.company.app     │
   │      │                                       │
   │      ├── App Service Capabilities            │
   │      │   (Push, In-App Purchase, ...)        │
   │      │                                       │
   │      └── Provisioning Profile                │
   │              │                               │
   │              ├── Cert (public key)           │
   │              ├── Devices (ad-hoc)            │
   │              └── Entitlements                │
   │                                              │
   └──────────────────────────────────────────────┘
                    │
                    ▼
              .ipa file = compiled binary + signed by cert + embedded profile
```

### 2.3. Các loại Provisioning Profile

| Loại | Dùng khi | Distribute tới |
|---|---|---|
| **Development** | Dev test trên device cá nhân | Devices đăng ký trong portal |
| **Ad-hoc** | QA, beta nội bộ ngoài TestFlight | Tối đa 100 devices/year |
| **App Store** | Submit lên TestFlight + App Store | Tất cả users qua App Store |
| **In-House (Enterprise)** | Distribute nội bộ công ty không qua App Store | Bất kỳ device nào (cần $299/năm Enterprise) |

### 2.4. App Store Connect API Key — thay thế Apple ID + 2FA

Trước đây Fastlane phải login bằng Apple ID + 2FA (rất phiền trên CI). Apple đã ra **App Store Connect API Key**:

```
   App Store Connect → Users and Access → Keys
       │
       ▼
   Tạo API Key → tải file .p8 (chỉ tải 1 lần!)
       │
       ▼
   Cần 3 thứ:
   - Issuer ID  (UUID của team)
   - Key ID     (10 ký tự)
   - .p8 file   (private key)
       │
       ▼
   CI dùng cả 3 → JWT token → gọi App Store Connect API
```

→ Tất cả tool hiện đại (Fastlane, EAS, Xcode Cloud) đều dùng API Key, **không dùng Apple ID nữa**.

### 2.5. Automatic vs Manual signing

```
       Automatic (Xcode "Automatically manage signing")
   ┌─────────────────────────────────────────────┐
   │ Xcode tự gen cert + profile khi cần         │
   │ ✅ Local dev đơn giản                        │
   │ ❌ CI/team work → conflict, profile lung tung│
   └─────────────────────────────────────────────┘

       Manual (cần cho team + CI)
   ┌─────────────────────────────────────────────┐
   │ Bạn quản lý cert/profile thủ công           │
   │ ✅ Kiểm soát hoàn toàn                       │
   │ ✅ Reproducible build                        │
   │ ❌ Cài đặt tốn công                          │
   │   → Fastlane match giải quyết               │
   └─────────────────────────────────────────────┘
```

---

## 3. Android Code Signing — đơn giản hơn

### 3.1. Keystore

```
   Keystore (.jks / .keystore)
   ┌──────────────────────────────────┐
   │  Mật khẩu store                  │
   │  ├─ Key alias 1                  │
   │  │   ├─ Key password             │
   │  │   ├─ Private key              │
   │  │   └─ Public certificate       │
   │  └─ Key alias 2                  │
   └──────────────────────────────────┘
```

Build production cần:
- File `.jks` / `.keystore`
- `STORE_PASSWORD`
- `KEY_ALIAS`
- `KEY_PASSWORD`

```groovy
// android/app/build.gradle
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_PATH") ?: "release.keystore")
        storePassword System.getenv("KEYSTORE_PASSWORD")
        keyAlias System.getenv("KEY_ALIAS")
        keyPassword System.getenv("KEY_PASSWORD")
    }
}
```

### 3.2. Play App Signing — quan trọng và dễ nhầm

Từ 2021, Google Play **bắt buộc** dùng Play App Signing cho app mới. Có 2 key:

```
   ┌─────────────────────────────────────────────────────────┐
   │                                                         │
   │  Upload Key (bạn giữ)        App Signing Key (Google)   │
   │       │                              │                  │
   │       │ ký .aab                       │ Google ký lại    │
   │       ▼                              ▼                  │
   │  Upload .aab ──────► Play Console ──────► users tải    │
   │                                                         │
   │  → Mất Upload Key vẫn được — Google tạo lại được        │
   │  → Mất App Signing Key = mất app vĩnh viễn (Google giữ) │
   │                                                         │
   └─────────────────────────────────────────────────────────┘
```

**Best practice**:
- Để Google quản lý App Signing Key.
- Bạn chỉ giữ Upload Key trong CI secret + 1 backup an toàn.
- Có thể rotate Upload Key qua Play Console nếu lộ.

### 3.3. APK vs AAB

| | APK (`.apk`) | AAB (`.aab`) |
|---|---|---|
| Định dạng | App package thực thi | App Bundle (Google split lại) |
| Kích thước user tải | Toàn bộ resources | Chỉ resources cho device |
| Bắt buộc từ 2021 | ❌ | ✅ cho app mới trên Play |
| Distribute ngoài Play | ✅ (sideload, F-Droid, Galaxy Store) | ❌ (cần `bundletool` chuyển thành APK) |

→ Lệnh build:
- `./gradlew assembleRelease` → `.apk`
- `./gradlew bundleRelease` → `.aab`

---

## 4. Versioning — đừng nhầm 4 trường này

### 4.1. iOS

```
Info.plist:
  CFBundleShortVersionString = "1.2.3"   ← marketing version (user thấy)
  CFBundleVersion           = "456"      ← build number (App Store dùng để compare)
```

**Quy tắc**:
- `CFBundleShortVersionString` (`MARKETING_VERSION`): semver `MAJOR.MINOR.PATCH` — bạn quyết định.
- `CFBundleVersion` (`CURRENT_PROJECT_VERSION`): **phải tăng strict mỗi lần upload TestFlight**, dù same marketing version. Nếu không, Apple từ chối.

### 4.2. Android

```
android/app/build.gradle:
  versionName "1.2.3"   ← marketing version
  versionCode 456       ← integer, phải tăng strict
```

- `versionName`: string, hiển thị cho user.
- `versionCode`: integer, **bắt buộc tăng** mỗi lần upload Play Console. Nếu không, Play từ chối.

### 4.3. Strategy tự động tăng version

```
   ┌────────────────────────────────────────────────┐
   │ Strategy phổ biến cho versionCode/build number │
   ├────────────────────────────────────────────────┤
   │                                                │
   │  1. Auto increment (số tự tăng từng build)     │
   │     Pros: đơn giản                             │
   │     Cons: 2 CI run cùng lúc → conflict         │
   │                                                │
   │  2. Số commit từ root (`git rev-list --count`) │
   │     Pros: deterministic, không cần state       │
   │     Cons: rebase reset                         │
   │                                                │
   │  3. Timestamp UTC (vd: 25040912 = 2025-04-09)  │
   │     Pros: monotonic, no conflict               │
   │     Cons: nhìn lạ                              │
   │                                                │
   │  4. App Store Connect "latest build + 1"       │
   │     Pros: luôn đúng                            │
   │     Cons: cần API call mỗi lần                 │
   │                                                │
   └────────────────────────────────────────────────┘
```

Mặc định nên dùng **#3 (timestamp)** hoặc **#4 (latest+1)**. Fastlane có sẵn action `latest_testflight_build_number` cho phương án 4.

---

## 5. Release channels & testing strategy

### 5.1. iOS — TestFlight

```
                    App Store Connect
   ┌───────────────────────────────────────────────────────┐
   │                                                       │
   │   Build (.ipa)                                        │
   │       │                                               │
   │       ▼                                               │
   │   Processing (10-30 phút Apple xử lý)                │
   │       │                                               │
   │       ▼                                               │
   │   ┌──────────────┐    ┌──────────────────┐           │
   │   │ Internal     │    │ External Testing │           │
   │   │ Testing      │    │                  │           │
   │   │              │    │  - Tới 10,000    │           │
   │   │ - Tới 100    │    │    testers       │           │
   │   │   App Store  │    │  - Beta Review   │           │
   │   │   Connect    │    │    của Apple     │           │
   │   │   users      │    │  - Public link   │           │
   │   │ - Không      │    │                  │           │
   │   │   cần review │    │                  │           │
   │   └──────────────┘    └──────────────────┘           │
   │       │                       │                       │
   │       └───────┬───────────────┘                       │
   │               ▼                                       │
   │   App Store Submission                                │
   │       │                                               │
   │       ▼                                               │
   │   App Review (1-3 ngày)                              │
   │       │                                               │
   │       ▼                                               │
   │   App Store (production)                              │
   │                                                       │
   └───────────────────────────────────────────────────────┘
```

### 5.2. Android — Play Console testing tracks

```
              Google Play Console
   ┌────────────────────────────────────────────────┐
   │                                                │
   │   .aab upload                                  │
   │       │                                        │
   │       ▼                                        │
   │   ┌────────────────────────────────────────┐   │
   │   │ 4 tracks:                              │   │
   │   │                                        │   │
   │   │  1. Internal testing  (tới 100 users) │   │
   │   │     Available trong vài phút           │   │
   │   │                                        │   │
   │   │  2. Closed testing                     │   │
   │   │     (alpha) groups bạn chọn            │   │
   │   │                                        │   │
   │   │  3. Open testing                       │   │
   │   │     (beta) public opt-in               │   │
   │   │                                        │   │
   │   │  4. Production                         │   │
   │   │     Có thể staged rollout (1%, 5%, ...) │  │
   │   │                                        │   │
   │   └────────────────────────────────────────┘   │
   │                                                │
   └────────────────────────────────────────────────┘
```

→ Promote build từ track này lên track cao hơn không cần build lại.

### 5.3. Đường đi build qua các môi trường

```
   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │   Dev    │ → │    QA    │ → │   Beta   │ → │   Prod   │
   └──────────┘   └──────────┘   └──────────┘   └──────────┘
   feature        Firebase       TestFlight     App Store
   branch         App Distrib    External       Play Store
                  / Internal     Open testing
                  Track
```

- **Dev**: tự động build mỗi PR, distribute Firebase App Distribution (free, fast).
- **QA**: build từ `develop` branch sau merge.
- **Beta**: build từ `release/x.y.z` branch, gửi TestFlight + Open Testing.
- **Prod**: build từ tag `vX.Y.Z`, submit store.

---

## 6. Firebase App Distribution — best for dev/QA builds

```
   ┌─────────────────────────────────────────────────┐
   │  Firebase App Distribution                      │
   │                                                 │
   │  - Free (Google product)                        │
   │  - iOS (.ipa) + Android (.apk/.aab)             │
   │  - Distribute qua email + link                  │
   │  - Tester groups                                │
   │  - Release notes, version diff                  │
   │  - Tích hợp với Crashlytics                     │
   │  - Không cần App Store / TestFlight review     │
   └─────────────────────────────────────────────────┘
```

→ Dùng cho dev/QA loops. Tránh dùng cho external users (vì cần cài profile / Firebase app trên iOS).

---

## 7. OTA Updates — cập nhật JS bundle không qua store

### 7.1. Khái niệm

RN, Flutter (web), Capacitor có thể **đẩy JS/Dart bundle update** trực tiếp đến user **không qua App Store / Play Store**:

```
   ┌──────────────────────────────────────────────────────────┐
   │                                                          │
   │   App build version 1.0 (binary cố định)                 │
   │       │                                                  │
   │       ├─ JS bundle v1 (built into app)                   │
   │       │                                                  │
   │       ▼                                                  │
   │   Đẩy bundle v2 lên CDN                                  │
   │       │                                                  │
   │       ▼                                                  │
   │   App start → check update server                        │
   │       │                                                  │
   │       ▼                                                  │
   │   Tải bundle v2 → restart → chạy code mới               │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

### 7.2. Lưu ý quan trọng

**OTA chỉ thay JS code**, không thay được:
- Native modules (cần native build mới).
- Splash, app icon, Info.plist, AndroidManifest.
- Permissions, entitlements.

**Quy tắc chung Apple/Google**:
- Apple cho phép OTA **với điều kiện không thay đổi feature/UX cơ bản đã review**.
- Google linh hoạt hơn nhưng cùng nguyên tắc.

### 7.3. Tool OTA cho RN

| Tool | Note |
|---|---|
| **EAS Update** (Expo) | Chính chủ, recommended cho dự án mới. Hỗ trợ cả non-Expo RN. |
| **CodePush** (Microsoft) | Đã **deprecated** (sunset 2025). Dùng cho legacy. |
| **Self-host** | S3 + custom server — kiểm soát tối đa, chi phí dev cao. |

---

## 8. CI/CD landscape cho mobile

### 8.1. So sánh tool

| Tool | iOS macOS runner? | Free tier | Mobile-specific? | Đặc điểm |
|---|---|---|---|---|
| **GitHub Actions** | ✅ macOS-latest | 2000 min/tháng (private) | ❌ general-purpose | Tích hợp git tốt nhất, marketplace lớn |
| **GitLab CI** | ✅ (saas-macos) | có giới hạn | ❌ | Tốt cho self-host |
| **Bitrise** | ✅ | có | ✅ mobile-only | Nhiều step build sẵn cho mobile |
| **CircleCI** | ✅ macOS resource class | có | ❌ | Caching mạnh |
| **Codemagic** | ✅ | có | ✅ mobile + Flutter-first | UI configure dễ |
| **EAS Build** (Expo) | ✅ | có | ✅ RN/Expo only | Quản lý cert + build cloud, không cần Mac |
| **Xcode Cloud** | ✅ | có (Apple Dev account) | ✅ iOS only | Apple chính chủ |
| **App Center** (MSFT) | ✅ | có | ✅ | **Sunset 3/2025**, không nên chọn mới |

### 8.2. Khi nào chọn cái nào?

```
   ┌─────────────────────────────────────────────────────┐
   │ Đã dùng GitHub & cần CI cho cả backend + mobile?    │
   │   → GitHub Actions                                  │
   ├─────────────────────────────────────────────────────┤
   │ Team mobile-only, muốn UI config + step library?    │
   │   → Bitrise / Codemagic                             │
   ├─────────────────────────────────────────────────────┤
   │ Project Expo, muốn build cloud không cần Mac?       │
   │   → EAS Build                                       │
   ├─────────────────────────────────────────────────────┤
   │ Muốn Apple chính chủ, đã trong ecosystem Apple?    │
   │   → Xcode Cloud                                     │
   ├─────────────────────────────────────────────────────┤
   │ Cần kiểm soát hoàn toàn, có Mac mini self-host?    │
   │   → GitLab CI / Jenkins + self-hosted runner       │
   └─────────────────────────────────────────────────────┘
```

### 8.3. Pipeline chuẩn cho mobile

```
   ┌──────────────────────────────────────────────────────────┐
   │                  Mobile CI Pipeline                      │
   ├──────────────────────────────────────────────────────────┤
   │                                                          │
   │  1. Trigger    PR / push to develop / tag                │
   │      ▼                                                   │
   │  2. Setup      checkout code, Node, Ruby, Xcode, JDK     │
   │      ▼                                                   │
   │  3. Cache      node_modules, pods, gradle, Ruby gems     │
   │      ▼                                                   │
   │  4. Install    npm ci, pod install, bundle install       │
   │      ▼                                                   │
   │  5. Lint+Test  ESLint, TypeScript, Jest                  │
   │      ▼                                                   │
   │  6. Build      .ipa (iOS) hoặc .aab (Android)            │
   │      ▼                                                   │
   │  7. Sign       cert + provisioning / keystore            │
   │      ▼                                                   │
   │  8. Upload     TestFlight / Play Console / Firebase      │
   │      ▼                                                   │
   │  9. Notify     Slack, email, GitHub comment              │
   │                                                          │
   └──────────────────────────────────────────────────────────┘
```

---

## 9. Secrets management — đừng commit cert / keystore

### 9.1. Những thứ TUYỆT ĐỐI không commit

```
   ┌────────────────────────────────────────────────┐
   │  iOS:                                          │
   │   - .p12 cert + private key                    │
   │   - .mobileprovision                           │
   │   - App Store Connect API .p8 + Issuer/Key ID  │
   │   - Apple ID password (nếu còn dùng)           │
   │                                                │
   │  Android:                                      │
   │   - .jks / .keystore                           │
   │   - keystore password                          │
   │   - key alias password                         │
   │   - Play Console service account JSON          │
   │                                                │
   │  RN/General:                                   │
   │   - .env files                                 │
   │   - Firebase service account                   │
   │   - Sentry auth token                          │
   │   - API keys (Maps, Stripe, Firebase config)   │
   └────────────────────────────────────────────────┘
```

### 9.2. Cách lưu trữ thường gặp

| Phương án | Pros | Cons |
|---|---|---|
| **CI secrets** (GitHub Actions Secrets, Bitrise vault) | Đơn giản, mã hoá at rest | Phải re-setup mỗi tool CI |
| **Fastlane Match** (encrypted git repo) | Cert/profile sync giữa devs + CI | Cần repo riêng |
| **HashiCorp Vault / AWS Secrets Manager** | Enterprise-grade | Setup phức tạp |
| **1Password CLI** | Team workflow tốt | Cần subscription |
| **EAS credentials** | Tự động cho Expo | Lock-in Expo |

### 9.3. Pattern thường dùng cho RN + Fastlane + GitHub Actions

```
   ┌──────────────────────────────────────────────────────┐
   │  GitHub Secrets (cho CI):                            │
   │   - MATCH_PASSWORD          (giải mã match repo)     │
   │   - MATCH_GIT_TOKEN         (clone match repo)       │
   │   - APP_STORE_CONNECT_API_KEY (.p8 base64)           │
   │   - APP_STORE_CONNECT_KEY_ID                         │
   │   - APP_STORE_CONNECT_ISSUER_ID                      │
   │   - ANDROID_KEYSTORE_BASE64 (encode .jks → base64)   │
   │   - ANDROID_KEYSTORE_PASSWORD                        │
   │   - ANDROID_KEY_ALIAS                                │
   │   - ANDROID_KEY_PASSWORD                             │
   │   - PLAY_STORE_JSON_KEY     (service account)        │
   │   - SENTRY_AUTH_TOKEN                                │
   │   - SLACK_WEBHOOK_URL                                │
   └──────────────────────────────────────────────────────┘

   Trong workflow:
     - Decode base64 secret thành file tạm
     - Set env var
     - Chạy fastlane lane
     - Cleanup file tạm sau build
```

---

## 10. Checklist setup CI/CD lần đầu cho RN project

```
   ┌─────────────────────────────────────────────────────┐
   │  iOS                                                │
   │  □ Apple Developer account active                   │
   │  □ Bundle ID đã đăng ký (com.company.app)           │
   │  □ App tạo trong App Store Connect                  │
   │  □ App Store Connect API Key + .p8 file             │
   │  □ Distribution cert + provisioning profile         │
   │     → setup Match repo                              │
   │  □ Keychain trên CI runner                          │
   │  □ Versioning strategy chọn xong                    │
   │                                                     │
   │  Android                                            │
   │  □ Play Console account, app entry tạo xong        │
   │  □ Upload keystore tạo + lưu an toàn                │
   │  □ Play Console service account + JSON key          │
   │  □ App Signing by Google Play đã enable             │
   │  □ Internal testing track có ít nhất 1 build        │
   │                                                     │
   │  CI                                                 │
   │  □ Tool CI chọn xong (GHA / Bitrise / EAS / ...)    │
   │  □ Secrets nhập đầy đủ                              │
   │  □ Trigger rules: PR / push develop / tag          │
   │  □ Slack / email notification                       │
   │  □ Caching: node_modules, pods, gradle              │
   │  □ Test job tách riêng build job (fail-fast)        │
   │                                                     │
   │  Project                                            │
   │  □ .gitignore: cert, keystore, .env, *.p12, *.p8   │
   │  □ README hướng dẫn build local                    │
   │  □ Fastfile dưới control                           │
   │  □ Versioning script (auto bump)                   │
   │  □ Crash reporting (Sentry / Crashlytics) gắn xong │
   └─────────────────────────────────────────────────────┘
```

---

## 11. Đọc thêm

| Chủ đề | Link |
|---|---|
| Apple Code Signing Guide | https://developer.apple.com/documentation/security/code-signing-tasks |
| App Store Connect API | https://developer.apple.com/documentation/appstoreconnectapi |
| Android App Signing | https://developer.android.com/studio/publish/app-signing |
| Play App Signing FAQ | https://support.google.com/googleplay/android-developer/answer/9842756 |
| TestFlight overview | https://developer.apple.com/testflight/ |
| Play Console testing tracks | https://support.google.com/googleplay/android-developer/answer/9845334 |
| Firebase App Distribution | https://firebase.google.com/docs/app-distribution |
| EAS Update | https://docs.expo.dev/eas-update/introduction |
| RN — Publishing iOS | https://reactnative.dev/docs/publishing-to-app-store |
