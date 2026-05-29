# Android Firebase Distribution — Thêm Environment Mới

> **Mục tiêu luyện tập:** Thêm environment `antonio` vào pipeline Android của `demo_app_bk`,
> phân phối build qua Firebase App Distribution thay vì Google Play.
>
> **Tương đương thực tế:** Đây là quy trình tương tự `sh-yara-connect-mobile` dùng cho
> các environment `qa`, `staging` — nhưng đơn giản hơn vì không có HashiCorp Vault.

---

## Kiến trúc sau khi hoàn thành

```
push branch `antonio`
        │
        ▼
GitHub Actions (.github/workflows/android-antonio.yml)
        │
        ├── Checkout + Node + Java + Ruby
        ├── Decode keystore from GitHub Secret
        └── bundle exec fastlane android firebase_beta
                │
                ├── gradle assemble AntonioBuildRelease  ← productFlavor mới
                ├── gradle bundle AntonioBuildRelease
                └── firebase_app_distribution
                        │
                        └── Firebase Console
                                └── App: com.demo_app.antonio
                                        └── Group: antonio-testers
```

---

## Tổng quan các bước

| # | Bước | Thay đổi ở đâu |
|---|------|----------------|
| 1 | Thêm `Antonio` productFlavor | `android/app/build.gradle` |
| 2 | Đăng ký app trong Firebase Console | Firebase Console (external) |
| 3 | Cập nhật `google-services.json` | `android/app/google-services.json` |
| 4 | Thêm lane `firebase_beta` vào Fastfile | `fastlane/Fastfile` |
| 5 | Tạo GitHub Actions workflow mới | `.github/workflows/android-antonio.yml` |
| 6 | Thêm GitHub Secrets | GitHub repo settings (external) |

---

## Bước 1 — Thêm `Antonio` productFlavor

File: `android/app/build.gradle`

Tìm block `android { ... }`, thêm `flavorDimensions` và `productFlavors` sau `buildTypes`:

```groovy
android {
    // ... (giữ nguyên defaultConfig, signingConfigs, buildTypes)

    flavorDimensions "environment"

    productFlavors {
        // Flavor mặc định — map với build hiện tại (Google Play)
        Production {
            dimension "environment"
            // Không có suffix → applicationId = "com.demo_app"
        }

        // Flavor mới cho Firebase distribution
        Antonio {
            dimension "environment"
            applicationIdSuffix ".antonio"
            // app name hiển thị trên device
            resValue "string", "app_name", "DemoApp Antonio"
        }
    }
}
```

> **Tại sao cần `Production` flavor?**
> Khi thêm `flavorDimensions`, Gradle yêu cầu tất cả variant phải có flavor.
> `Production` đóng vai trò "default" để không break build hiện tại.
>
> Sau khi thêm, các build variant mới sẽ là:
> - `ProductionRelease` (cũ, dùng cho Google Play)
> - `AntonioRelease` (mới, dùng cho Firebase)

---

## Bước 2 — Đăng ký app trong Firebase Console

1. Vào [Firebase Console](https://console.firebase.google.com) → project của bạn
2. **Add app** → chọn Android
3. **Package name:** `com.demo_app.antonio` ← phải khớp với applicationId + suffix
4. Download `google-services.json`
5. Ghi lại **App ID** — format: `1:xxxxxxxxxxxx:android:xxxxxxxxxxxxxxxx`

> **Lưu ý:** Nếu chưa có Firebase project, tạo mới project trước.
> Nếu không có quyền tạo app, hỏi người quản lý Firebase Console.

---

## Bước 3 — Cập nhật `google-services.json`

File: `android/app/google-services.json`

Nếu chưa có file này, tạo mới từ Firebase Console (download).
Nếu đã có, mở file và thêm block client cho `com.demo_app.antonio` vào mảng `"client"`:

```json
{
  "project_info": {
    "project_number": "XXXXXXXXXXXX",
    "project_id": "your-firebase-project-id",
    "storage_bucket": "your-firebase-project-id.appspot.com"
  },
  "client": [
    {
      "client_info": {
        "mobilesdk_app_id": "1:XXXXXXXXXXXX:android:XXXXXXXXXX",
        "android_client_info": {
          "package_name": "com.demo_app"
        }
      },
      "api_key": [{ "current_key": "AIza..." }],
      "services": { "appinvite_service": { "other_platform_oauth_client": [] } }
    },
    {
      "client_info": {
        "mobilesdk_app_id": "1:XXXXXXXXXXXX:android:YYYYYYYYYY",
        "android_client_info": {
          "package_name": "com.demo_app.antonio"
        }
      },
      "api_key": [{ "current_key": "AIza..." }],
      "services": { "appinvite_service": { "other_platform_oauth_client": [] } }
    }
  ],
  "configuration_version": "1"
}
```

> **Cách nhanh nhất:** Download file `google-services.json` từ Firebase Console sau bước 2 —
> Firebase tự tạo file đầy đủ với tất cả các app đã đăng ký trong project.

---

## Bước 4 — Thêm lane `firebase_beta` vào Fastfile

File: `fastlane/Fastfile`

Tìm `platform :android do` và thêm lane mới trước `lane :beta do`:

```ruby
# ─────────────────────────────────────────────────────────────
#  firebase_beta
#  Build APK + AAB → upload to Firebase App Distribution
#
#  Khác biệt so với lane :beta (Google Play):
#  - firebase_beta dùng firebase_app_distribution (không cần Google Play)
#  - Không cần versionCode incremental — Firebase chấp nhận string
#  - Dùng ENV['FIREBASE_APP_ID'] và ENV['ANDROID_BUILD_FLAVOUR']
#  - Phù hợp cho internal QA/staging environment
# ─────────────────────────────────────────────────────────────
desc "Build APK + AAB → upload to Firebase App Distribution"
lane :firebase_beta do
  version_code = ENV["APP_VERSION_CODE"] || (Time.now.to_i / 60).to_s
  version_name = ENV["APP_VERSION"]      || "1.0.0"
  flavour      = ENV["ANDROID_BUILD_FLAVOUR"] || "Antonio"

  UI.message "Building #{flavour} #{version_name} (#{version_code})..."

  gradle(
    task:        "clean"
  )

  gradle(
    task:       "assemble",
    flavor:     flavour,
    build_type: "Release",
    project_dir: "android/",
    properties: {
      "android.injected.signing.store.file"     => ENV["ANDROID_KEYSTORE_PATH"],
      "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
      "android.injected.signing.key.alias"      => ENV["ANDROID_KEYSTORE_ALIAS"],
      "android.injected.signing.key.password"   => ENV["ANDROID_KEY_PASSWORD"],
      "versionCode"                             => version_code,
      "versionName"                             => version_name,
    },
  )

  gradle(
    task:       "bundle",
    flavor:     flavour,
    build_type: "Release",
    project_dir: "android/",
    properties: {
      "android.injected.signing.store.file"     => ENV["ANDROID_KEYSTORE_PATH"],
      "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
      "android.injected.signing.key.alias"      => ENV["ANDROID_KEYSTORE_ALIAS"],
      "android.injected.signing.key.password"   => ENV["ANDROID_KEY_PASSWORD"],
      "versionCode"                             => version_code,
      "versionName"                             => version_name,
    },
  )

  firebase_app_distribution(
    app:              ENV["FIREBASE_APP_ID"],
    groups:           ENV["FIREBASE_GROUPS"] || "antonio-testers",
    firebase_cli_path: "./node_modules/.bin/firebase",
    release_notes:    release_notes,
    android_artifact_type: "AAB",
  )

  UI.success "✅ #{flavour} #{version_name} (#{version_code}) → Firebase App Distribution!"
end
```

> **Tại sao `firebase_cli_path: "./node_modules/.bin/firebase"`?**
> Firebase CLI cần được cài sẵn trong `node_modules` (thêm `firebase-tools` vào `package.json`).
> CI runner không cần cài global `firebase-tools`.

**Thêm `firebase-tools` vào `package.json`:**
```bash
npm install --save-dev firebase-tools
```

---

## Bước 5 — Tạo GitHub Actions workflow

File: `.github/workflows/android-antonio.yml`

Tạo file mới (không sửa `android-beta.yml`):

```yaml
name: Android Antonio → Firebase Distribution

on:
  push:
    branches:
      - antonio          # trigger khi push lên branch "antonio"
    paths-ignore:
      - '**.md'
      - 'docs/**'

  workflow_dispatch:     # cho phép trigger thủ công từ GitHub UI

concurrency:
  group: android-antonio
  cancel-in-progress: true

jobs:
  deploy-antonio:
    name: Build & Upload to Firebase
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Setup Java 17
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true

      - name: Install JS dependencies
        run: npm ci

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}
          restore-keys: ${{ runner.os }}-gradle-

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Decode Android Keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_ANTONIO_KEYSTORE_BASE64 }}
        run: |
          echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/antonio.keystore
          echo "ANDROID_KEYSTORE_PATH=/tmp/antonio.keystore" >> $GITHUB_ENV

      - name: Build & Upload to Firebase
        env:
          # Signing
          ANDROID_KEYSTORE_PATH:     ${{ env.ANDROID_KEYSTORE_PATH }}
          ANDROID_KEYSTORE_ALIAS:    ${{ secrets.ANDROID_ANTONIO_KEYSTORE_ALIAS }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_ANTONIO_KEYSTORE_PASSWORD }}
          ANDROID_KEY_PASSWORD:      ${{ secrets.ANDROID_ANTONIO_KEY_PASSWORD }}
          # Firebase
          FIREBASE_APP_ID:           ${{ secrets.ANDROID_ANTONIO_FIREBASE_APP_ID }}
          FIREBASE_GROUPS:           antonio-testers
          # Build config
          ANDROID_BUILD_FLAVOUR:     Antonio
          APP_VERSION:               ${{ secrets.APP_VERSION }}
          APP_VERSION_CODE:          ${{ github.run_number }}
        run: bundle exec fastlane android firebase_beta

      - name: Cleanup keystore
        if: always()
        run: rm -f /tmp/antonio.keystore
```

---

## Bước 6 — Thêm GitHub Secrets

Vào: `GitHub repo → Settings → Secrets and variables → Actions`

Thêm các secret sau:

| Secret name | Giá trị | Ghi chú |
|-------------|---------|---------|
| `ANDROID_ANTONIO_FIREBASE_APP_ID` | `1:xxxx:android:yyyy` | Lấy từ Firebase Console bước 2 |
| `ANDROID_ANTONIO_KEYSTORE_BASE64` | base64 của file `.keystore` | `base64 -i release.keystore \| pbcopy` |
| `ANDROID_ANTONIO_KEYSTORE_ALIAS` | alias trong keystore | |
| `ANDROID_ANTONIO_KEYSTORE_PASSWORD` | store password | |
| `ANDROID_ANTONIO_KEY_PASSWORD` | key password | |
| `APP_VERSION` | `1.0.0` | version name |

> **Cách tạo keystore nếu chưa có:**
> ```bash
> keytool -genkey -v \
>   -keystore android/app/antonio.keystore \
>   -alias antonio-key \
>   -keyalg RSA \
>   -keysize 2048 \
>   -validity 10000
> ```
> Sau đó encode: `base64 -i android/app/antonio.keystore | pbcopy`
>
> **QUAN TRỌNG:** Thêm `*.keystore` vào `.gitignore` — không commit keystore lên repo.

---

## Verify — Kiểm tra pipeline hoạt động

### Local (trước khi push)

```bash
# 1. Verify flavor được nhận diện
cd android && ./gradlew tasks | grep -i antonio

# 2. Test build local (cần set env vars)
export ANDROID_BUILD_FLAVOUR=Antonio
export ANDROID_KEYSTORE_PATH=app/antonio.keystore
export ANDROID_KEYSTORE_ALIAS=antonio-key
export ANDROID_KEYSTORE_PASSWORD=your_password
export ANDROID_KEY_PASSWORD=your_password
export FIREBASE_APP_ID=1:xxxx:android:yyyy
export APP_VERSION=1.0.0
export APP_VERSION_CODE=1

bundle exec fastlane android firebase_beta

# 3. Kiểm tra file output
ls android/app/build/outputs/bundle/antonioRelease/
```

### CI (sau khi push)

```bash
# 1. Tạo branch antonio
git checkout -b antonio
git push -u origin antonio

# 2. Xem pipeline tại GitHub Actions tab
# Expected: workflow "Android Antonio → Firebase Distribution" triggered

# 3. Kiểm tra Firebase Console
# App Distribution → chọn app "com.demo_app.antonio"
# → Releases → build mới xuất hiện
# → Groups: "antonio-testers" nhận email thông báo
```

---

## So sánh: demo_app_bk vs sh-yara-connect-mobile

| | `demo_app_bk` | `sh-yara-connect-mobile` |
|--|---------------|--------------------------|
| Secrets | GitHub Secrets trực tiếp | HashiCorp Vault → GitHub Actions |
| Fastfile location | `fastlane/` (root) | `android/fastlane/` |
| Build trigger mapping | Hardcode trong workflow | Dynamic qua `map-trigger-pattern-environment` |
| Runners | `ubuntu-latest` (GitHub-hosted) | Self-hosted `gh-runner-apac-large` |
| Firebase CLI | `node_modules/.bin/firebase` | `../node_modules/.bin/firebase` |
| versionCode | `github.run_number` | `github.run_number + 44070` (legacy offset) |

---

## Checklist hoàn thành

- [ ] `android/app/build.gradle` — thêm `flavorDimensions` + `Antonio` productFlavor
- [ ] Firebase Console — đăng ký `com.demo_app.antonio`, ghi lại App ID
- [ ] `android/app/google-services.json` — cập nhật với client mới
- [ ] `package.json` — thêm `firebase-tools` vào devDependencies
- [ ] `fastlane/Fastfile` — thêm lane `firebase_beta`
- [ ] `.github/workflows/android-antonio.yml` — tạo workflow mới
- [ ] GitHub Secrets — thêm 5 secret `ANDROID_ANTONIO_*`
- [ ] Push branch `antonio` → verify pipeline green
- [ ] Firebase Console — xác nhận build xuất hiện trong App Distribution
