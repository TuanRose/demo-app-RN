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
                ├── gradle assemble AntonioRelease  ← productFlavor Antonio
                ├── gradle bundle AntonioRelease
                └── firebase_app_distribution
                        │
                        └── Firebase Console
                                └── App: corleone.dev.demo_app.antonio
                                        └── Group: antonio-testers
```

---

## Tổng quan các bước

| # | Bước | Thay đổi ở đâu |
|---|------|----------------|
| 1 | Thêm `Antonio` productFlavor | `android/app/build.gradle` |
| 2 | Thêm `fastlane-plugin-firebase_app_distribution` | `Gemfile` |
| 3 | Thêm lane `firebase_beta` vào Fastfile | `fastlane/Fastfile` |
| 4 | Tạo GitHub Actions workflow mới | `.github/workflows/android-antonio.yml` |
| 5 | Tạo Firebase project + đăng ký app | Firebase Console (external) |
| 6 | Download `google-services.json` | `android/app/google-services.json` |
| 7 | Enable App Distribution + tạo tester group | Firebase Console (external) |
| 8 | Lấy `FIREBASE_TOKEN` qua `firebase login:ci` | terminal |
| 9 | Thêm GitHub Secrets | GitHub repo settings (external) |

---

## Bước 1 — Thêm `Antonio` productFlavor

File: `android/app/build.gradle`

```groovy
android {
    // ... (giữ nguyên defaultConfig, signingConfigs, buildTypes)

    flavorDimensions "environment"

    productFlavors {
        Prod {
            dimension "environment"
            applicationId "corleone.dev.demo_app"
        }
        Dev {
            dimension "environment"
            applicationId "corleone.dev.demo_app.dev"
        }
        Antonio {
            dimension "environment"
            applicationId "corleone.dev.demo_app.antonio"
        }
    }
}
```

> **Tại sao cần flavor `Prod` khi thêm `flavorDimensions`?**
> Gradle yêu cầu tất cả variant phải có flavor khi `flavorDimensions` được khai báo.
> Không có `Prod` → task `bundleRelease` không còn tồn tại → CI cũ sẽ fail.

Sau khi thêm, build variants:
- `ProdRelease` → applicationId = `corleone.dev.demo_app` → Google Play
- `AntonioRelease` → applicationId = `corleone.dev.demo_app.antonio` → Firebase

---

## Bước 2 — Thêm Fastlane plugin vào Gemfile

File: `Gemfile`

```ruby
gem 'fastlane'
gem 'fastlane-plugin-firebase_app_distribution'
```

Sau đó chạy:
```bash
bundle install
```

> **Tại sao phải chạy `bundle install` sau khi sửa Gemfile?**
> `bundle install` download gem mới và update `Gemfile.lock`.
> CI dùng `bundler-cache: true` đọc `Gemfile.lock` để restore cache.
> Nếu `Gemfile.lock` cũ (thiếu gem) → CI fail hoặc không cache được.
> Rule: sửa Gemfile → luôn commit cả `Gemfile` lẫn `Gemfile.lock`.

---

## Bước 3 — Thêm lane `firebase_beta` vào Fastfile

File: `fastlane/Fastfile`

```ruby
desc "Build APK + AAB → upload to Firebase App Distribution (non-production environments)"
lane :firebase_beta do
  flavour      = ENV["ANDROID_BUILD_FLAVOUR"] || "Antonio"
  version_code = ENV["APP_VERSION_CODE"]      || Time.now.strftime("%Y%m%d%H")
  version_name = ENV["APP_VERSION"]           || "1.0.0"

  gradle(task: "clean", project_dir: "android/")

  gradle(
    task:        "assemble",
    flavor:      flavour,
    build_type:  "Release",
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
    task:        "bundle",
    flavor:      flavour,
    build_type:  "Release",
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
    app:                   ENV["FIREBASE_APP_ID"],
    groups:                ENV["FIREBASE_GROUPS"] || "antonio-testers",
    # WHY firebase_cli_token: CI runner không có browser → không thể `firebase login`.
    # `firebase login:ci` tạo 1 token offline dùng được trên CI.
    firebase_cli_token:    ENV["FIREBASE_TOKEN"],
    # WHY ../node_modules: Fastfile chạy từ thư mục fastlane/
    # → relative path lên 1 level để tìm node_modules ở root
    firebase_cli_path:     "../node_modules/.bin/firebase",
    release_notes:         release_notes,
    android_artifact_type: "AAB",
  )

  UI.success "✅ #{flavour} #{version_name} (#{version_code}) → Firebase App Distribution!"
end
```

> **So sánh với lane `beta` (Google Play):**
> - `beta`: dùng `supply` + `GOOGLE_PLAY_JSON_KEY_PATH` + versionCode incremental từ Play API
> - `firebase_beta`: dùng `firebase_app_distribution` + `FIREBASE_TOKEN` + versionCode từ `github.run_number`
> - Firebase không yêu cầu versionCode incremental như Play Store → `github.run_number` là đủ

---

## Bước 4 — Tạo GitHub Actions workflow

File: `.github/workflows/android-antonio.yml`

Tạo file mới (không sửa `android-beta.yml`):

```yaml
name: Android Antonio → Firebase Distribution

on:
  push:
    branches:
      - antonio
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch:

concurrency:
  group: android-antonio
  cancel-in-progress: true

jobs:
  deploy-antonio:
    name: Build & Upload to Firebase Distribution
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true

      - run: npm ci

      - uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*', '**/gradle-wrapper.properties') }}

      - uses: android-actions/setup-android@v3

      - name: Decode Android Keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_ANTONIO_KEYSTORE_BASE64 }}
        run: |
          echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/antonio.keystore
          echo "ANDROID_KEYSTORE_PATH=/tmp/antonio.keystore" >> $GITHUB_ENV

      - name: Build & Upload to Firebase Distribution
        env:
          ANDROID_KEYSTORE_PATH:     ${{ env.ANDROID_KEYSTORE_PATH }}
          ANDROID_KEYSTORE_ALIAS:    ${{ secrets.ANDROID_ANTONIO_KEYSTORE_ALIAS }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_ANTONIO_KEYSTORE_PASSWORD }}
          ANDROID_KEY_PASSWORD:      ${{ secrets.ANDROID_ANTONIO_KEY_PASSWORD }}
          FIREBASE_APP_ID:           ${{ secrets.ANDROID_ANTONIO_FIREBASE_APP_ID }}
          FIREBASE_GROUPS:           antonio-testers
          # WHY FIREBASE_TOKEN: generate once locally via `firebase login:ci`
          # token này không expire → dùng được trên CI mãi mãi (cho đến khi revoke)
          FIREBASE_TOKEN:            ${{ secrets.FIREBASE_TOKEN }}
          ANDROID_BUILD_FLAVOUR:     Antonio
          APP_VERSION:               ${{ secrets.APP_VERSION }}
          APP_VERSION_CODE:          ${{ github.run_number }}
        run: bundle exec fastlane android firebase_beta

      - name: Cleanup keystore
        if: always()
        run: rm -f /tmp/antonio.keystore
```

> **Tại sao workflow riêng thay vì chung `android-beta.yml`?**
> - `android-beta.yml` dùng Google Play secrets (`GOOGLE_PLAY_JSON_KEY_BASE64`)
> - `android-antonio.yml` dùng Firebase secrets (`ANDROID_ANTONIO_FIREBASE_APP_ID`)
> - Tách rõ ràng = dễ debug, dễ thêm env mới
> - Tương đương YARA: mỗi environment có vault path riêng

---

## Bước 5–7 — Firebase Console setup

1. Vào [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → đặt tên
2. **Add app** → Android → Package name: `corleone.dev.demo_app.antonio`
3. Download `google-services.json` → đặt vào `android/app/google-services.json`
4. Ghi lại **App ID** (format: `1:xxxxxxxxxxxx:android:xxxxxxxxxxxxxxxx`) — cần cho GitHub Secret
5. Sidebar → **DevOps & Engagement** → **App Distribution**
6. Tab **Testers & Groups** → **Add group** → tên: `antonio-testers` → thêm email testers

> **`google-services.json` có bắt buộc không?**
> Cho App Distribution: **không bắt buộc** — Fastlane CLI dùng `FIREBASE_TOKEN` + `FIREBASE_APP_ID`,
> không cần parse file này.
> Bắt buộc nếu app dùng Firebase SDKs (Analytics, Crashlytics) — khi đó Gradle plugin cần file để
> generate config constants khi build.

---

## Bước 8 — Lấy FIREBASE_TOKEN

```bash
./node_modules/.bin/firebase login:ci
# → mở browser để auth → sau đó print token dạng 1//0g... vào terminal
```

> **Tại sao `firebase login:ci` thay vì `firebase login`?**
> `firebase login` lưu session trên máy local (requires browser).
> CI runner là ephemeral — mỗi build là máy mới, không có browser.
> `firebase login:ci` tạo **offline token** — một chuỗi string dùng được trên bất kỳ máy nào
> mà không cần browser. Token này không expire cho đến khi bị revoke thủ công.

---

## Bước 9 — GitHub Secrets

Vào: `GitHub repo → Settings → Secrets and variables → Actions`

| Secret | Giá trị | Ghi chú |
|--------|---------|---------|
| `ANDROID_ANTONIO_FIREBASE_APP_ID` | `1:xxxx:android:yyyy` | Từ Firebase Console → Project Settings → Your apps |
| `FIREBASE_TOKEN` | Token từ `firebase login:ci` | Offline CI token — dùng chung cho tất cả Firebase apps |
| `ANDROID_ANTONIO_KEYSTORE_BASE64` | `base64 -i release.keystore \| pbcopy` | Có thể dùng chung keystore với Prod |
| `ANDROID_ANTONIO_KEYSTORE_ALIAS` | alias trong keystore | Same as `ANDROID_KEYSTORE_ALIAS` nếu dùng chung keystore |
| `ANDROID_ANTONIO_KEYSTORE_PASSWORD` | store password | Same as `ANDROID_KEYSTORE_PASSWORD` nếu dùng chung |
| `ANDROID_ANTONIO_KEY_PASSWORD` | key password | Same as `ANDROID_KEY_PASSWORD` nếu dùng chung |

> **Dùng chung keystore Prod hay tạo keystore riêng?**
> - **Dùng chung**: đơn giản hơn, Antonio là env học tập không lên Play Store → không cần keystore riêng
> - **Keystore riêng**: cần nếu Antonio sẽ là 1 app độc lập trên Play Store với package name khác
> - Trong dự án thực: mỗi app (package name khác nhau) có keystore riêng; cùng package name thì dùng chung

---

## Verify — Kiểm tra pipeline hoạt động

```bash
# 1. Commit changes
git add android/app/build.gradle \
        android/app/google-services.json \
        Gemfile Gemfile.lock \
        fastlane/Fastfile \
        .github/workflows/android-antonio.yml

git commit -m "feat: setup Firebase App Distribution for Antonio flavor"

# 2. Push lên branch antonio để trigger workflow
git checkout -b antonio
git push -u origin antonio

# 3. Theo dõi tại GitHub Actions tab
# Expected: workflow "Android Antonio → Firebase Distribution" triggered

# 4. Kiểm tra Firebase Console
# App Distribution → app "corleone.dev.demo_app.antonio"
# → Releases → build mới xuất hiện
# → Group "antonio-testers" nhận email thông báo
```

---

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `Could not find gem 'fastlane-plugin-firebase_app_distribution'` | Chưa chạy `bundle install` sau khi sửa Gemfile | `bundle install` → commit `Gemfile.lock` |
| `App Distribution is not enabled` | Chưa enable trong Firebase Console | Firebase Console → App Distribution → Get started |
| `Invalid Firebase token` | FIREBASE_TOKEN sai hoặc expired | Chạy lại `firebase login:ci` → update secret |
| `App not found` | FIREBASE_APP_ID sai | Kiểm tra Project Settings → Your apps → App ID |
| `Could not find task ':app:assembleAntonioRelease'` | Flavor chưa được khai báo trong build.gradle | Kiểm tra `productFlavors { Antonio { ... } }` |

---

## So sánh: demo_app_bk vs sh-yara-connect-mobile

| | `demo_app_bk` | `sh-yara-connect-mobile` |
|--|---------------|--------------------------|
| Secrets | GitHub Secrets trực tiếp | HashiCorp Vault → GitHub Actions |
| Fastfile location | `fastlane/` (root) | `android/fastlane/` |
| Build trigger mapping | Hardcode trong workflow | Dynamic qua `map-trigger-pattern-environment` |
| Runners | `ubuntu-latest` (GitHub-hosted) | Self-hosted `gh-runner-apac-large` |
| Firebase CLI path | `../node_modules/.bin/firebase` | `../node_modules/.bin/firebase` |
| versionCode | `github.run_number` | `github.run_number + 44070` (legacy offset) |
| Auth | `firebase_cli_token` | `firebase_cli_token` |

---

## Checklist hoàn thành

- [x] `android/app/build.gradle` — thêm `flavorDimensions` + `Antonio` productFlavor
- [x] `Gemfile` — thêm `fastlane-plugin-firebase_app_distribution` + chạy `bundle install`
- [x] `fastlane/Fastfile` — thêm lane `firebase_beta` với `firebase_cli_token`
- [x] `.github/workflows/android-antonio.yml` — tạo workflow mới với `FIREBASE_TOKEN` secret
- [x] Firebase Console — tạo project, đăng ký app `corleone.dev.demo_app.antonio`
- [x] `android/app/google-services.json` — download từ Firebase Console + đặt vào project
- [x] Firebase Console — enable App Distribution, tạo group `antonio-testers`
- [x] `FIREBASE_TOKEN` — lấy qua `firebase login:ci`
- [x] GitHub Secrets — thêm 6 secrets `ANDROID_ANTONIO_*` + `FIREBASE_TOKEN`
- [ ] Push branch `antonio` → verify pipeline green
- [ ] Firebase Console — xác nhận build xuất hiện trong App Distribution
- [ ] Tester nhận email thông báo có build mới
