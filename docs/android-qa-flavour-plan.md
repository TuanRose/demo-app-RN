# QA Build Flavour — Android Implementation Plan

> **Branch:** `release/android`
> **Sprint:** hiện tại (iOS đã được defer sang Sprint 5 — xem `docs/ios-qa-scheme-plan.md`)
> **Status:** 📋 PLANNED — chưa implement, chờ yêu cầu bắt đầu
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

**2b. Tạo env files (root project)**
```ini
# .env            (default = Prod)
API_BASE_URL=https://api.prod.example.com
API_KEY=__prod_key__
FEATURE_NEW_UI=false

# .env.qa
API_BASE_URL=https://api.qa.example.com
API_KEY=__qa_key__
FEATURE_NEW_UI=true

# .env.dev
API_BASE_URL=https://api.dev.example.com
API_KEY=__dev_key__
FEATURE_NEW_UI=true
```
> ⚠️ `.env*` chứa key thật → thêm vào `.gitignore`, chỉ commit `.env.example`. KHÔNG commit secrets (rule repo).

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

**Done when:** chạy `Qa` build, log/UI hiển thị `apiBaseUrl === https://api.qa.example.com`.

**Alternative (không thêm lib):** dùng `buildConfigField` + `resValue` trong từng flavor → đọc qua `BuildConfig.API_BASE_URL` ở native, nhưng phải tự viết bridge để JS đọc → nhiều boilerplate hơn. Chỉ chọn nếu muốn zero dependency.

---

### ⬜ T3 — ProGuard / R8 cho QA
**Quyết định cần chốt:** QA nên minify **giống Production** để bắt sớm lỗi do R8 strip class — nhưng giữ stack trace đọc được.

**File:** `android/app/proguard-rules.pro` (thêm)
```proguard
# Giữ line number để crash trace đọc được (QA cần debug)
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# react-native-config: giữ BuildConfig field, tránh bị strip sau minify
-keep class com.demo_app.BuildConfig { *; }
```

**File:** `android/app/build.gradle` — 2 lựa chọn:

- **Option A (recommended, low-risk):** giữ `enableProguardInReleaseBuilds = false` cho mọi flavor (đồng nhất với Prod hiện tại). Rules ở trên vẫn add sẵn → khi bật R8 sau này không vỡ. AC "appropriately configured" = rules đúng & sẵn sàng.
- **Option B (QA-faithful):** bật riêng R8 cho QA để mirror production thật:
```groovy
buildTypes {
    release {
        // ... giữ nguyên
        minifyEnabled enableProguardInReleaseBuilds
    }
}
// QA muốn test với R8 giống prod tương lai → cân nhắc bật minifyEnabled true
// nhưng phải verify app không crash do thiếu keep-rule trước khi giao QA
```

> **Recommendation:** Option A cho lần setup đầu (tránh QA bị block bởi lỗi R8 chưa rõ). Ghi chú trong PR rằng rules đã ready để chuyển Option B khi Prod bật minify.

**Done when:** build QA release thành công; nếu chọn B → app mở được, không `ClassNotFoundException`.

---

### ⬜ T4 — Launcher icon + app name riêng cho QA
App name đã xong ở T1 (`resValue app_name`). Còn icon:

**Cấu trúc resource override** (Gradle tự ưu tiên `src/qa/` đè `src/main/`):
```
android/app/src/qa/res/
├── mipmap-mdpi/ic_launcher.png      (+ ic_launcher_round.png)
├── mipmap-hdpi/ic_launcher.png
├── mipmap-xhdpi/ic_launcher.png
├── mipmap-xxhdpi/ic_launcher.png
└── mipmap-xxxhdpi/ic_launcher.png
```
> Nếu Prod dùng adaptive icon (`mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_foreground.png`) thì override foreground + thêm badge "QA".

**Cách tạo nhanh icon QA:** lấy icon Prod + overlay ribbon/badge "QA" (ImageMagick hoặc tool như `easylauncher` gradle plugin). Tạm thời có thể copy icon Prod + đổi màu nền để phân biệt.

**Done when:** cài QA build → launcher hiện "DemoApp QA" + icon khác Prod.

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
- [ ] (nếu Option B) app không crash với R8 bật

---

## 7. Rủi ro & quyết định đã chốt

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Firebase project riêng hay chung? | **Chung** với Antonio | Đỡ quản lý, chỉ thêm app registration |
| Keystore QA riêng hay chung? | **Chung** | QA không lên Play Store |
| Env injection approach | **react-native-config** | 1 API cho 2 platform, ít boilerplate |
| ProGuard QA | **Option A** (off, rules ready) | Tránh block QA bởi lỗi R8 lần đầu |
| CI trigger | **`release/android`** | Tách khỏi release/ios, không build thừa |
| Distribution | **Firebase App Distribution** | Theo US (Android) |

---

## 8. Thứ tự thực thi đề xuất

```
T1 (flavor)  →  T2 (env config)  →  T3 (proguard)  →  T4 (icon)  →  T5 (signing verify)
                                                                          │
T6 (Firebase app) → T9 (secrets) → T7 (fastlane verify) → T8 (workflow) → T10 (docs)
```
Ước lượng: **~5–6h** dev (T4 icon tốn nhất nếu chưa có asset).

---

## 9. Master progress checklist

- [ ] T1 — `Qa` productFlavor trong build.gradle
- [ ] T2 — react-native-config + `.env.qa` + `src/config/env.ts`
- [ ] T3 — ProGuard rules (keepattributes + RNConfig keep)
- [ ] T4 — Launcher icon override `src/qa/res/mipmap-*`
- [ ] T5 — Verify signing (release keystore)
- [ ] T6 — Firebase Console: app `.qa` + group `qa-testers` + google-services.json
- [ ] T7 — Verify lane `firebase_beta` chạy với `ANDROID_BUILD_FLAVOUR=Qa`
- [ ] T8 — `.github/workflows/android-qa.yml`
- [ ] T9 — GitHub Secrets `ANDROID_QA_*`
- [ ] T10 — Docs build & run QA locally
- [ ] Verify pipeline xanh + build xuất hiện trên Firebase + tester nhận email
