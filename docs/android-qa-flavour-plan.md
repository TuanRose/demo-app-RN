# QA Build Flavour — Android Implementation Plan

> **Branch:** `release/android`
> **Sprint:** hiện tại (iOS đã được defer sang Sprint 5 — xem `docs/ios-qa-scheme-plan.md`)
> **Status:** 🟡 IN PROGRESS — T1–T6, T8 completed; T7 pending CI verify; T9–T10 pending
> **US:** Create dedicated QA build flavour (Android) — side-by-side install, QA backend, CI/CD distribution

---

## 1. Mục tiêu

Tạo flavour `Qa` riêng cho Android để QA team test trên QA backend mà không ảnh hưởng Prod/Dev.
Build QA phải:
- Trỏ về QA backend (env vars riêng)
- Cài song song với Prod/Dev/Antonio trên cùng device (`applicationId` suffix `.qa`)
- Phân biệt được bằng mắt (app name "DemoApp QA" + launcher icon riêng)
- Tự động build + distribute qua **Firebase App Distribution** khi push lên `release/android`

---

## 2. Acceptance Criteria → Task mapping

| AC (từ US) | Task phụ trách | Status |
|---|---|---|
| Android QA flavour compiles & runs, points to QA backend | T1, T2 | ⬜ |
| QA installs side-by-side with prod/dev | T1 (applicationIdSuffix `.qa`) | ⬜ |
| QA visually distinguishable (name + icon) | T1 (app_name) + T4 (icon) | ⬜ |
| Env config (API URL, keys, flags) injected per flavour | T2 (react-native-config) | ⬜ |
| ProGuard/R8 appropriately configured | T3 | ⬜ |
| Signing configuration verified for QA | T5 | ⬜ |
| CI/CD builds + distributes QA | T6, T7, T8, T9 | ⬜ |
| Documentation updated (build/run locally) | T10 | ⬜ |

> iOS-related AC ("iOS QA scheme compiles…") thuộc Sprint 5 — không tính trong branch này.

---

## 3. Current state (đã verify trong repo)

```
android/app/build.gradle
  └── flavorDimensions "environment"
        productFlavors: Prod | Dev | Antonio   ← CHƯA có Qa
  └── enableProguardInReleaseBuilds = false    ← ProGuard đang TẮT cho mọi release
  └── signingConfigs.release → đọc từ ENV, fallback debug.keystore

android/app/google-services.json
  └── chỉ đăng ký: corleone.dev.demo_app.antonio   ← cần thêm .qa

android/app/proguard-rules.pro   → rỗng (chỉ default template)
android/app/src/main/res/mipmap-*  → icon Prod (chưa có override cho qa)

fastlane/Fastfile
  └── lane :firebase_beta  → ĐÃ dynamic qua ENV["ANDROID_BUILD_FLAVOUR"]
                             (build APK+AAB, upload APK lên Firebase)

.github/workflows/android-antonio.yml  → template để clone cho QA
gradle.properties: newArchEnabled=true, hermesEnabled=true
```

**Kết luận:** hạ tầng Firebase/Fastlane đã có sẵn (từ flavor Antonio). QA chỉ cần *nhân bản pattern* + thêm env config + icon + ProGuard. Rủi ro thấp.

---

## 4. Kiến trúc sau khi hoàn thành

```
push branch release/android
        │
        ▼
GitHub Actions (.github/workflows/android-qa.yml)
        │
        ├── Checkout + Node + Java + Ruby
        ├── Decode keystore from GitHub Secret
        └── ANDROID_BUILD_FLAVOUR=Qa  →  bundle exec fastlane android firebase_beta
                │
                ├── gradle clean
                ├── gradle assembleQaRelease   ← productFlavor Qa
                ├── gradle bundleQaRelease
                └── firebase_app_distribution (APK)
                        │
                        └── Firebase Console (cùng project với Antonio)
                                └── App: corleone.dev.demo_app.qa
                                        └── Group: qa-testers
```

---

## 5. Task breakdown (chi tiết, có checkbox tiến độ)

### ⬜ T1 — Thêm `Qa` productFlavor
**File:** `android/app/build.gradle` (block `productFlavors`)

```groovy
productFlavors {
    Prod    { dimension "environment" }
    Dev     { dimension "environment"; applicationIdSuffix ".dev";     resValue "string", "app_name", "DemoApp Dev" }
    Antonio { dimension "environment"; applicationIdSuffix ".antonio"; resValue "string", "app_name", "DemoApp Antonio" }

    // NEW — QA environment
    Qa {
        dimension "environment"
        applicationIdSuffix ".qa"                       // → corleone.dev.demo_app.qa (cài song song)
        resValue "string", "app_name", "DemoApp QA"     // → tên app dưới launcher
    }
}
```

**WHY:** `applicationIdSuffix` đổi package name → Android coi là app khác → cài song song được. `resValue app_name` override `@string/app_name` chỉ cho flavor này.

**Done when:** `./gradlew :app:assembleQaRelease` tạo ra task (không lỗi "task not found").

---

### ⬜ T2 — Env config per flavour (react-native-config)
**Quyết định:** dùng `react-native-config` — 1 API (`Config.X`) cho cả iOS/Android, tích hợp tự nhiên với product flavors. (Đã so sánh ở phần trao đổi; thay thế cho việc tự viết native bridge.)

**2a. Install**
```bash
npm install react-native-config
# iOS sẽ pod install ở Sprint 5; Android autolink tự động
```

**2b. Tạo env files (root project)** — 🔒 CHỐT: repo học tập → trỏ **public mock API** để thấy env switch chạy
```ini
# .env            (default = Prod)
API_BASE_URL=https://dummyjson.com
API_KEY=demo-prod-key-not-real
FEATURE_NEW_UI=false

# .env.qa         (QA trỏ backend KHÁC → mắt thấy data khác = verify switch)
API_BASE_URL=https://fakestoreapi.com
API_KEY=demo-qa-key-not-real
FEATURE_NEW_UI=true

# .env.dev
API_BASE_URL=https://dummyjson.com
API_KEY=demo-dev-key-not-real
FEATURE_NEW_UI=true
```
> **Vì sao 2 host khác nhau:** Prod (`dummyjson.com`) vs QA (`fakestoreapi.com`) trả data shape khác → mở từng build thấy data khác → chứng minh env injection chạy. Cả 2 API public, không cần key thật → `API_KEY` chỉ placeholder.
> **Muốn realistic hơn** (mô phỏng "QA backend độc lập"): tạo free mock ở [beeceptor.com](https://beeceptor.com) → `yourname-qa.free.beeceptor.com`.
> ⚠️ **Discipline:** `.env*` vào `.gitignore`, chỉ commit `.env.example` (placeholder). Dù key ở đây là giả, vẫn giữ thói quen KHÔNG commit secrets (rule repo).

**2c. Map flavor → env file** trong `android/app/build.gradle` (TRƯỚC block `android {}`)
```groovy
// react-native-config: map mỗi {flavor}{buildType} (lowercase) → file env tương ứng
project.ext.envConfigFiles = [
    proddebug:      ".env",
    prodrelease:    ".env",
    qadebug:        ".env.qa",
    qarelease:      ".env.qa",
    devdebug:       ".env.dev",
    devrelease:     ".env.dev",
    antoniodebug:   ".env",
    antoniorelease: ".env",
]
apply from: project(':react-native-config').projectDir.getPath() + "/dotenv.gradle"
```

**2d. Dùng trong code** — `src/config/env.ts`
```ts
import Config from 'react-native-config';

// WHY fallback: nếu Config trống (env file thiếu) → không crash, mặc định về prod-safe
export const ENV = {
  apiBaseUrl: Config.API_BASE_URL ?? 'https://api.prod.example.com',
  apiKey: Config.API_KEY ?? '',
  featureNewUi: Config.FEATURE_NEW_UI === 'true',
} as const;
```

**Done when:** chạy `Qa` build, log/UI hiển thị `apiBaseUrl === https://fakestoreapi.com` (khác Prod `dummyjson.com`).

**Alternative (không thêm lib):** dùng `buildConfigField` + `resValue` trong từng flavor → đọc qua `BuildConfig.API_BASE_URL` ở native, nhưng phải tự viết bridge để JS đọc → nhiều boilerplate hơn. Chỉ chọn nếu muốn zero dependency.

---

### ⬜ T3 — ProGuard / R8 cho QA
**🔒 CHỐT: Option B — BẬT R8** (không phải A). Lý do: repo học tập → tắt minify thì rules không bao giờ chạy = không exercise được R8 = không học được gì. US scope "ProGuard/R8 appropriately configured" yêu cầu nó *thực sự chạy*. Rủi ro thấp vì RN ship sẵn consumer ProGuard rules qua autolink.

**File:** `android/app/build.gradle` (1 dòng)
```groovy
def enableProguardInReleaseBuilds = true   // đổi false → true (áp dụng mọi release flavor)
```
> AGP **không** cho set `minifyEnabled` per-flavor trong DSL → bật global cho `release` buildType là cách sạch nhất. Ảnh hưởng cả Antonio release nhưng OK (Antonio cũng là env học tập, không phải Play Store production với user thật).

**File:** `android/app/proguard-rules.pro` (thêm)
```proguard
# Giữ line number để crash trace đọc được (QA cần debug)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# react-native-config: giữ BuildConfig field, tránh bị strip sau minify
-keep class com.demo_app.BuildConfig { *; }
```

**Phần luyện tập thật sự (điểm học của task này):**
```bash
cd android && ./gradlew assembleQaRelease
# App crash sau minify? → đọc logcat → tìm class bị R8 strip → thêm -keep rule → build lại (vòng lặp R8)
# De-obfuscate stack trace bằng mapping.txt:
#   android/app/build/outputs/mapping/qaRelease/mapping.txt
```

**Done when:** `assembleQaRelease` build xong, app mở được không `ClassNotFoundException`; biết dùng `mapping.txt` để đọc lại stack trace bị obfuscate.

---

### ⬜ T4 — Launcher icon + app name riêng cho QA
App name đã xong ở T1 (`resValue app_name`). Icon → **🔒 CHỐT: easylauncher gradle plugin** (tự overlay ribbon "QA" lên icon Prod lúc build — khỏi sửa PNG tay).

**4a. Thêm plugin** — `android/build.gradle` (root)
```groovy
buildscript {
    dependencies {
        classpath 'com.project.starter:easylauncher:6.4.0'   // check latest version
    }
}
```

**4b. Apply + config** — `android/app/build.gradle`
```groovy
apply plugin: 'com.starter.easylauncher'   // đầu file, cạnh các apply plugin khác

// cuối file, NGOÀI block android {}
easylauncher {
    productFlavors {
        Qa      { filters = [ customRibbon(label: "QA",  ribbonColor: "#FF6600") ] }
        Dev     { filters = [ customRibbon(label: "DEV", ribbonColor: "#0066FF") ] }
        Antonio { filters = [ grayRibbonFilter() ] }
        // Prod: không filter → icon gốc sạch
    }
}
```

**WHY easylauncher** thay vì bỏ PNG tay vào `src/qa/res/mipmap-*`: làm tay phải sửa ~10 file (5 mật độ × 2 round); plugin generate tự động lúc build, là kỹ thuật dùng thật ở production.

> **Học thêm cơ chế gốc (optional):** bỏ thử 1 file `src/qa/res/mipmap-hdpi/ic_launcher.png` để thấy Gradle ưu tiên `src/qa/` đè `src/main/`. Nhưng để xong việc → dùng plugin.

**Done when:** cài QA build → launcher hiện "DemoApp QA" + icon có ribbon "QA" cam, phân biệt rõ với Prod.

---

### ⬜ T5 — Signing configuration cho QA
**Quyết định:** dùng **chung keystore với Antonio/Prod** (QA không lên Play Store → không cần keystore riêng). Giảm số secrets phải quản lý.

`signingConfigs.release` hiện đã đọc từ ENV (`ANDROID_KEYSTORE_*`) với fallback `debug.keystore` — **không cần sửa code**. QA flavor + `buildType release` tự kế thừa `signingConfig signingConfigs.release`.

**Done when:** `assembleQaRelease` ký bằng release keystore (verify: `apksigner verify --print-certs app-qa-release.apk`).

---

### ⬜ T6 — Firebase Console: đăng ký app QA (dùng CHUNG project với Antonio)
1. Firebase Console → project hiện tại → **Add app** → Android
2. Package name: `corleone.dev.demo_app.qa`
3. Download `google-services.json` mới (sẽ chứa **cả** `.antonio` lẫn `.qa`) → replace `android/app/google-services.json`
4. Ghi lại **App ID** mới (`1:xxxx:android:yyyy`) → dùng cho secret `ANDROID_QA_FIREBASE_APP_ID`
5. App Distribution → Testers & Groups → tạo group `qa-testers` → thêm email QA

> `google-services.json` không bắt buộc cho App Distribution (Fastlane dùng token + App ID), nhưng cần nếu app dùng Firebase SDK. Thêm vào cho an toàn.

**Done when:** Firebase Console hiện app `corleone.dev.demo_app.qa` + group `qa-testers`.

---

### ⬜ T7 — Fastlane: reuse lane `firebase_beta`
**Không cần lane mới.** `firebase_beta` đã dynamic qua `ENV["ANDROID_BUILD_FLAVOUR"]`. CI chỉ set `ANDROID_BUILD_FLAVOUR=Qa` + `FIREBASE_GROUPS=qa-testers`.

Verify local:
```bash
ANDROID_BUILD_FLAVOUR=Qa \
FIREBASE_APP_ID=<qa_app_id> \
FIREBASE_GROUPS=qa-testers \
FIREBASE_TOKEN=<token> \
bundle exec fastlane android firebase_beta
```

**Done when:** lane chạy `assembleQaRelease` + `bundleQaRelease` + upload APK QA lên Firebase.

---

### ⬜ T8 — GitHub Actions: `android-qa.yml`
**File mới:** `.github/workflows/android-qa.yml` — clone từ `android-antonio.yml`, đổi:

```yaml
name: Android QA → Firebase Distribution

on:
  push:
    branches:
      - release/android        # US: trigger release/* → ở đây map vào branch release/android
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch:

concurrency:
  group: android-qa
  cancel-in-progress: true

# ... (các step Checkout/Node/Java/Ruby/npm ci/Gradle cache/Android SDK giống android-antonio.yml)

      - name: Decode Android Keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_QA_KEYSTORE_BASE64 }}
        run: |
          echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/qa.keystore
          echo "ANDROID_KEYSTORE_PATH=/tmp/qa.keystore" >> $GITHUB_ENV

      - name: Build & Upload to Firebase Distribution
        env:
          ANDROID_KEYSTORE_PATH:     ${{ env.ANDROID_KEYSTORE_PATH }}
          ANDROID_KEYSTORE_ALIAS:    ${{ secrets.ANDROID_QA_KEYSTORE_ALIAS }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_QA_KEYSTORE_PASSWORD }}
          ANDROID_KEY_PASSWORD:      ${{ secrets.ANDROID_QA_KEY_PASSWORD }}
          FIREBASE_APP_ID:           ${{ secrets.ANDROID_QA_FIREBASE_APP_ID }}
          FIREBASE_GROUPS:           qa-testers
          FIREBASE_TOKEN:            ${{ secrets.FIREBASE_TOKEN }}
          ANDROID_BUILD_FLAVOUR:     Qa
          APP_VERSION:               ${{ secrets.APP_VERSION }}
          APP_VERSION_CODE:          ${{ github.run_number }}
        run: bundle exec fastlane android firebase_beta

      - name: Upload APK artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: demo_app-qa-${{ github.run_number }}.apk
          path: android/app/build/outputs/apk/qa/release/app-qa-release.apk
          retention-days: 14

      - name: Upload AAB artifact
        if: success()
        uses: actions/upload-artifact@v4
        with:
          name: demo_app-qa-${{ github.run_number }}.aab
          path: android/app/build/outputs/bundle/qaRelease/app-qa-release.aab
          retention-days: 14

      - name: Cleanup keystore
        if: always()
        run: rm -f /tmp/qa.keystore
```

> **Quyết định trigger:** US ghi "release/*". Vì ta tách 2 branch (`release/android`, `release/ios`), workflow Android trigger trên **`release/android`** để push iOS không kích build Android thừa. Nếu muốn đúng glob `release/**` thì đổi lại + dựa vào `paths` filter cho `android/**`.

**Done when:** push lên `release/android` → workflow xanh, artifact APK/AAB xuất hiện.

---

### ⬜ T9 — GitHub Secrets cần thêm
| Secret | Giá trị | Ghi chú |
|---|---|---|
| `ANDROID_QA_FIREBASE_APP_ID` | `1:xxxx:android:yyyy` | App ID QA từ T6 |
| `ANDROID_QA_KEYSTORE_BASE64` | `base64 -i release.keystore` | Có thể reuse keystore Antonio/Prod |
| `ANDROID_QA_KEYSTORE_ALIAS` | alias | Same Antonio nếu dùng chung |
| `ANDROID_QA_KEYSTORE_PASSWORD` | store password | Same Antonio nếu dùng chung |
| `ANDROID_QA_KEY_PASSWORD` | key password | Same Antonio nếu dùng chung |
| `FIREBASE_TOKEN` | đã có (từ Antonio) | Dùng chung, không cần tạo lại |
| `APP_VERSION` | đã có | Dùng chung |

**Done when:** đủ secrets, workflow không lỗi "secret not found".

---

### ⬜ T10 — Documentation: build & run QA locally
Thêm section vào `docs/android-local-build-practice.md` (hoặc README):

```bash
# Run QA debug trên emulator/device
npx react-native run-android --mode=qaDebug --appId=corleone.dev.demo_app.qa

# Build QA release APK
cd android && ./gradlew assembleQaRelease

# Build QA AAB
cd android && ./gradlew bundleQaRelease

# Verify env đã inject đúng
# → mở app, kiểm tra màn debug/log hiển thị API_BASE_URL = QA
```

**Done when:** một dev mới đọc doc tự build & chạy được QA flavor.

---

## 6. Local verification checklist (sau khi implement)

- [ ] `./gradlew assembleQaRelease` build thành công
- [ ] APK cài song song được với Prod/Dev (3 icon cùng tồn tại trên device)
- [ ] App name "DemoApp QA" + icon QA hiển thị đúng
- [ ] App trỏ về QA backend (`Config.API_BASE_URL`)
- [ ] APK ký bằng release keystore (`apksigner verify --print-certs`)
- [ ] App không crash với R8 bật (crash → đọc logcat → thêm keep rule); biết dùng `mapping.txt`

---

## 7. Rủi ro & quyết định đã chốt

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Firebase project riêng hay chung? | **Chung** với Antonio | Đỡ quản lý, chỉ thêm app registration |
| Keystore QA riêng hay chung? | **Chung** | QA không lên Play Store |
| Env injection approach | **react-native-config** + mock API (dummyjson/fakestoreapi) | 1 API cho 2 platform; 2 host khác → verify switch bằng mắt |
| ProGuard QA | **Option B — bật R8** (global release) | Tắt thì không exercise R8 → không học; RN ship sẵn consumer rules nên rủi ro thấp |
| Icon QA | **easylauncher plugin** (ribbon "QA") | Khỏi sửa ~10 PNG tay; kỹ thuật production thật |
| CI trigger | **`release/android`** | Tách khỏi release/ios, không build thừa |
| Distribution | **Firebase App Distribution** | Theo US (Android) |

---

## 8. Thứ tự thực thi đề xuất

```
T1 (flavor)  →  T2 (env config)  →  T3 (proguard)  →  T4 (icon)  →  T5 (signing verify)
                                                                          │
T6 (Firebase app) → T9 (secrets) → T7 (fastlane verify) → T8 (workflow) → T10 (docs)
```
Ước lượng: **~5–6h** dev (T3 vòng lặp debug R8 dễ tốn thời gian nhất; T4 icon nhanh nhờ easylauncher).

---

## 9. Master progress checklist

- [x] T1 — `Qa` productFlavor trong build.gradle
- [x] T2 — react-native-config + `.env.qa` (mock API) + `src/config/env.ts`
- [x] T3 — Bật R8 (`enableProguardInReleaseBuilds = true`) + keep rules + verify `mapping.txt`
- [x] T4 — Icon QA qua easylauncher plugin (ribbon "QA")
- [x] T5 — Verify signing (release keystore)
- [x] T6 — Firebase Console: app `.qa` + group `qa-testers` + google-services.json
- [ ] T7 — Verify lane `firebase_beta` chạy với `ANDROID_BUILD_FLAVOUR=Qa` ← proven khi CI T8 xanh
- [x] T8 — `.github/workflows/android-qa.yml`
- [ ] T9 — GitHub Secrets `ANDROID_QA_*`
- [ ] T10 — Docs build & run QA locally
- [ ] Verify pipeline xanh + build xuất hiện trên Firebase + tester nhận email

---

## 10. Lessons Learned — thực tế khác với plan

### T2 — react-native-config
- **Map format thực tế:** `envConfigFiles` dùng tên flavor viết hoa (`Qa`, `Prod`...), không phải lowercase concat `qadebug`/`qarelease` như plan gốc ghi. dotenv.gradle của lib handle case-insensitive matching.
- **Env file đơn giản hơn plan:** chỉ dùng `API_BASE_URL` + `APP_ENV`. Bỏ `API_KEY`, `FEATURE_NEW_UI` vì mock API public không cần key; tránh thêm placeholder giả gây nhầm lẫn.

### T3 — R8/ProGuard
- **Keep rules thực tế:** thêm 3 rules cho RN core (`com.facebook.react.**`, `com.facebook.hermes.**`, `com.facebook.jni.**`) — plan gốc chỉ ghi `com.demo_app.BuildConfig`. JSI bridge dùng reflection → bắt buộc keep.
- **mapping.txt path:** `app/build/outputs/mapping/QaRelease/mapping.txt` (viết hoa `Q`, `R`) — khác format thường thấy trong docs.

### T5 — Signing verification
- **Kết quả verify local:** `apksigner verify --print-certs app-Qa-release.apk` → `CN=Android Debug` — đúng expected.
- **Lý do:** build local không set `ANDROID_KEYSTORE_PATH` → `signingConfigs.release` fallback về `debug.keystore`. Đây là thiết kế đúng, không phải bug.
- **Trên CI:** Fastlane inject keystore thật qua `android.injected.signing.*` → override hoàn toàn block signingConfig → APK ký bằng release keystore.
- **Không cần sửa code gì** — cơ chế đã đúng từ setup Antonio.

### T4 — easylauncher (nhiều gotcha nhất)

**1. Artifact không tồn tại trên google()/mavenCentral()**
- Plan ghi `classpath 'com.project.starter:easylauncher:6.4.0'` → sai group ID và version.
- Group ID đúng: `com.starter.easylauncher`. Version `6.4.0` không tồn tại → phải dùng `6.4.1`.
- Plugin publish trên Gradle Plugin Portal → phải thêm `gradlePluginPortal()` vào `pluginManagement.repositories` trong `settings.gradle`.

**2. Không dùng được `classpath` + `apply plugin` thông thường**
- Approach `classpath(...)` trong `buildscript {}` + `apply plugin` không resolve được với project dùng `pluginManagement`.
- Solution: dùng `plugins {}` block với `apply false`, sau đó `apply plugin` thủ công sau Android plugin.

**3. `plugins {}` block phải đứng đầu file**
- Gradle rule: `plugins {}` phải là statement đầu tiên, trước mọi `apply plugin`.
- Nhưng easylauncher yêu cầu apply SAU Android plugin → dùng `apply false` trong `plugins {}` để resolve mà chưa apply, rồi `apply plugin: "com.starter.easylauncher"` đúng vị trí.

**4. Config ribbon thực tế:**
```groovy
// Plan ghi: customRibbon(label: "QA", ribbonColor: "#FF6600")
// Thực tế dùng built-in:
filters(redRibbonFilter("QA"))
```
`redRibbonFilter` là built-in của lib, không cần config màu thủ công.
