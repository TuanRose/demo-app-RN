# CICD Production Standard — React Native Mobile App (Tiếng Việt)

> Tài liệu này tổng hợp toàn bộ kiến thức và kỹ thuật để xây dựng pipeline CICD chuẩn production cho iOS và Android.
> Được viết dựa trên thực tế triển khai tại demo_app và sh-farmcare-mobile.

---

## Mục lục

1. [Tổng quan kiến trúc pipeline](#1-tổng-quan-kiến-trúc-pipeline)
2. [iOS — Code Signing với Fastlane Match](#2-ios--code-signing-với-fastlane-match)
3. [iOS — Build và Upload lên TestFlight](#3-ios--build-và-upload-lên-testflight)
4. [iOS — Submit lên App Store](#4-ios--submit-lên-app-store)
5. [Android — Build AAB và Upload lên Play Store](#5-android--build-aab-và-upload-lên-play-store)
6. [Android — Staged Rollout lên Production](#6-android--staged-rollout-lên-production)
7. [Fastlane — Cấu trúc Fastfile chuẩn](#7-fastlane--cấu-trúc-fastfile-chuẩn)
8. [GitHub Actions — Workflows](#8-github-actions--workflows)
9. [Secrets và Environment Variables](#9-secrets-và-environment-variables)
10. [Những lỗi phổ biến và cách fix](#10-những-lỗi-phổ-biến-và-cách-fix)
11. [Quy trình release đầy đủ](#11-quy-trình-release-đầy-đủ)
12. [Checklist trước khi release](#12-checklist-trước-khi-release)

---

## 1. Tổng quan kiến trúc pipeline

```
Code push to main
       │
       ├──► [iOS Beta Workflow]          ──► TestFlight (internal testers)
       │    macos-15 runner (~25-40 min)
       │
       └──► [Android Beta Workflow]      ──► Play Internal Testing
            ubuntu-latest (~15-25 min)

QA approve trên TestFlight + Play Internal
       │
       ▼
[Production Workflow] — CHỈ manual trigger
       │
       ├──► iOS: App Store (review 1-3 ngày)
       └──► Android: Play Production (staged rollout 10% → 100%)
```

### Tại sao tách beta và production?

- **Beta tự động**: mỗi push lên main → build mới ngay lập tức → QA test được luôn
- **Production thủ công**: quyết định release là của con người, không phải bot
- **Chi phí**: ubuntu runner (~$0.008/min) rẻ hơn macos runner (~$0.08/min) 10 lần → Android luôn dùng ubuntu

---

## 2. iOS — Code Signing với Fastlane Match

### Match là gì?

Match là giải pháp quản lý certificate và provisioning profile tập trung. Toàn bộ team dùng chung 1 bộ certificate được lưu trong encrypted git repo.

**Vấn đề match giải quyết:**
- Developer mới join team → tự sync profile, không cần xin từng người
- CI runner không có Apple account → chỉ cần git token để clone repo match
- Certificate hết hạn → 1 người renew, push lên match repo → mọi người tự sync

### 3 loại profile cần tạo

```
development  → dev build, debug trên thiết bị thật
adhoc        → distribution cho QA (không qua App Store)
appstore     → release lên TestFlight + App Store
```

### Cách tạo Match repo lần đầu

```bash
# 1. Tạo git repo trên GitHub (private): my-org/ios-certificates
# 2. Chạy sync_certs lane để tạo/upload certificates:
bundle exec fastlane ios sync_certs
# → Fastlane sẽ hỏi MATCH_PASSWORD để encrypt, ghi nhớ password này
```

### Matchfile

```ruby
git_url(ENV["MATCH_GIT_URL"])
storage_mode("git")
type("appstore")           # default type
app_identifier([ENV["APP_IDENTIFIER"]])
username(ENV["APPLE_ID"])  # chỉ dùng local, CI dùng API key
```

### Match trên CI (không có SSH, không có Apple ID)

CI runner không thể dùng SSH key hay Apple ID (2FA). Phải dùng:

```ruby
# HTTPS với personal access token
git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}")

# App Store Connect API Key (thay Apple ID/password)
api_key = app_store_connect_api_key(
  key_id:      ENV["ASC_KEY_ID"],
  issuer_id:   ENV["ASC_ISSUER_ID"],
  key_content: ENV["ASC_KEY_CONTENT"],
  duration:    1200,  # 20 phút, đủ cho build dài
)
```

### Cách lấy App Store Connect API Key

1. App Store Connect → Users and Access → Integrations → App Store Connect API
2. Tạo key mới với role "App Manager" (không cần Admin)
3. Download file `.p8` — **chỉ download được 1 lần**
4. Ghi lại Key ID và Issuer ID
5. Đọc nội dung file .p8: `cat AuthKey_XXXXXXXX.p8` → copy toàn bộ kể cả header

---

## 3. iOS — Build và Upload lên TestFlight

### Flow đầy đủ của lane `ios beta`

```
1. Tạo API Key object (ASC API)
2. Query build number hiện tại từ TestFlight → +1
3. Set build number trong Xcode project
4. Sync match certificate (readonly, không tạo mới trên CI)
5. Build .ipa với gym
6. Upload lên TestFlight với pilot
```

### Tại sao query build number thay vì hardcode?

```ruby
# Cách sai: hardcode hoặc tăng thủ công
increment_build_number(build_number: 42)

# Cách đúng: query từ TestFlight → không bao giờ conflict
latest = latest_testflight_build_number(
  api_key: api_key,
  app_identifier: ENV["APP_IDENTIFIER"],
  initial_build_number: 0,  # fallback khi chưa có build nào
)
increment_build_number(build_number: latest + 1, xcodeproj: "ios/demo_app.xcodeproj")
```

### Cấu hình gym (build)

```ruby
gym(
  scheme:           "demo_app",
  workspace:        "ios/demo_app.xcworkspace",
  configuration:    "Release",
  export_method:    "app-store",
  output_directory: "./build/ios",
  output_name:      "demo_app.ipa",
  include_bitcode:  false,   # Bitcode deprecated từ Xcode 14
  xcargs: [
    "CODE_SIGN_STYLE=Manual",
    "PROVISIONING_PROFILE_SPECIFIER='match AppStore #{ENV['APP_IDENTIFIER']}'",
    "CODE_SIGN_IDENTITY='iPhone Distribution'",
  ].join(" "),
)
```

**Tại sao cần `CODE_SIGN_STYLE=Manual`?**

Mặc định Xcode dùng "Automatic" signing → tự tìm certificate → trên CI không có Keychain của developer → lỗi. `Manual` + chỉ định profile từ match → không bao giờ sai.

**Tại sao cần `setup_ci` trong `before_all`?**

```ruby
before_all do
  setup_ci  # TẠO temporary keychain trên CI runner
end
```

Không có `setup_ci` → khi import certificate vào Keychain → macOS hỏi password → CI block, build treo vĩnh viễn.

### Cấu hình pilot (upload TestFlight)

```ruby
pilot(
  api_key:                          api_key,
  ipa:                              "./build/ios/demo_app.ipa",
  skip_waiting_for_build_processing: true,  # QUAN TRỌNG: không đợi Apple xử lý
  distribute_external:              false,   # chỉ internal testers trước
  changelog:                        release_notes,
)
```

**Tại sao `skip_waiting_for_build_processing: true`?**

Apple mất 5-30 phút để xử lý build. Nếu không skip → CI runner ngồi chờ → tốn tiền, có thể timeout.

---

## 4. iOS — Submit lên App Store

### Lane `ios production`

```ruby
lane :production do
  api_key = asc_api_key
  deliver(
    api_key:           api_key,
    app_identifier:    ENV["APP_IDENTIFIER"],
    submit_for_review: true,          # tự động submit sau upload
    automatic_release: false,         # KHÔNG tự release khi Apple approve
    force:             true,          # không mở browser để confirm
    skip_screenshots:  true,          # screenshots đã có trên ASC
    skip_metadata:     true,          # metadata đã có trên ASC
    phased_release:    true,          # bật phased release trên App Store
  )
end
```

**Tại sao `automatic_release: false`?**

Nếu `true` → khi Apple approve → app live ngay với 100% users. Không có cơ hội dừng nếu phát hiện bug sau khi submit. `false` → Apple approve → app ở trạng thái "Pending Developer Release" → team quyết định khi nào release.

**Production workflow KHÔNG rebuild** — nó submit build đã được QA approve từ TestFlight lên App Store.

---

## 5. Android — Build AAB và Upload lên Play Store

### AAB vs APK

| | APK | AAB |
|---|---|---|
| Google Play yêu cầu | Không (từ 2021) | **Bắt buộc** |
| Kích thước | Lớn hơn | Nhỏ hơn (Google tối ưu cho từng thiết bị) |
| Gradle task | `assemble` | **`bundle`** |
| Output | app-release.apk | app-release.aab |

```ruby
gradle(
  task:       "bundle",       # KHÔNG phải "assemble"
  build_type: "Release",
  project_dir: "android/",
)
```

### Signing Android không hardcode trong build.gradle

**Cách sai** (hardcode trong build.gradle):
```gradle
signingConfigs {
  release {
    storeFile file("release.keystore")  # commit keystore vào git — NGUY HIỂM
    storePassword "my_password"         # password lộ trong git history
  }
}
```

**Cách đúng** (inject từ env vars qua Fastlane):
```ruby
# Trong Fastfile — Fastlane truyền properties vào Gradle
gradle(
  task: "bundle",
  build_type: "Release",
  project_dir: "android/",
  properties: {
    "android.injected.signing.store.file"     => ENV["ANDROID_KEYSTORE_PATH"],
    "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
    "android.injected.signing.key.alias"      => ENV["ANDROID_KEYSTORE_ALIAS"],
    "android.injected.signing.key.password"   => ENV["ANDROID_KEY_PASSWORD"],
    "versionCode"                             => version_code,
    "versionName"                             => ENV["APP_VERSION"] || "1.0.0",
  }
)
```

```gradle
// Trong build.gradle — đọc từ project properties
defaultConfig {
    versionCode project.findProperty('versionCode')?.toInteger() ?: 1
    versionName project.findProperty('versionName') ?: "1.0.0"
}
signingConfigs {
    release {
        def ksPath = System.getenv('ANDROID_KEYSTORE_PATH')
        storeFile     ksPath ? rootProject.file(ksPath) : file('debug.keystore')
        storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: 'android'
        keyAlias      System.getenv('ANDROID_KEYSTORE_ALIAS')    ?: 'androiddebugkey'
        keyPassword   System.getenv('ANDROID_KEY_PASSWORD')       ?: 'android'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release  // KHÔNG phải signingConfigs.debug
    }
}
```

### Tự động tăng versionCode

```ruby
# Query versionCode hiện tại từ Play Store → +1
current = begin
  google_play_track_version_codes(
    package_name: ENV["APP_IDENTIFIER"],
    track: "internal",
    json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
  ).max
rescue
  0  # fallback: lần đầu upload chưa có build nào
end || 0

version_code = current + 1
```

**Lưu ý**: Lần đầu upload **phải làm thủ công qua Play Console** vì `supply` yêu cầu app đã tồn tại trên Play Store.

### Upload với supply

```ruby
supply(
  package_name:          ENV["APP_IDENTIFIER"],
  track:                 "internal",
  aab:                   lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
  json_key:              ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
  skip_upload_apk:       true,         # chỉ upload AAB
  skip_upload_images:    true,         # không update screenshots
  skip_upload_screenshots: true,
)
```

---

## 6. Android — Staged Rollout lên Production

### Tại sao dùng staged rollout?

Không có Apple review (Android có thể release ngay). Staged rollout cho phép phát hiện bug trước khi 100% users bị ảnh hưởng:

```
Internal Testing → Closed Testing → Open Testing → Production (10%) → 25% → 50% → 100%
```

### Promote lên Production (không rebuild)

```ruby
lane :production do
  rollout = (ENV["ROLLOUT_PERCENTAGE"] || "0.1").to_f

  supply(
    package_name:     ENV["APP_IDENTIFIER"],
    track:            "internal",       # track nguồn
    track_promote_to: "production",     # promote lên production
    rollout:          rollout.to_s,     # "0.1" = 10%
    json_key:         ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
    skip_upload_apk:  true,
    skip_upload_aab:  true,             # KHÔNG upload lại — chỉ promote
    skip_upload_images: true,
    skip_upload_screenshots: true,
  )
end
```

### Tăng rollout dần

| Giai đoạn | Rollout | Thời điểm |
|---|---|---|
| Initial | 10% (`0.1`) | Lúc release |
| Expand | 25% (`0.25`) | Sau 24h, không có crash spike |
| Expand | 50% (`0.5`) | Sau 48h, ổn định |
| Full | 100% (`1.0`) | Sau 1 tuần, tự tin |

---

## 7. Fastlane — Cấu trúc Fastfile chuẩn

### Shared helpers (đặt ngoài `platform` block)

```ruby
# DRY: tạo 1 lần, dùng nhiều nơi
def asc_api_key
  app_store_connect_api_key(
    key_id:      ENV.fetch("ASC_KEY_ID",      ""),
    issuer_id:   ENV.fetch("ASC_ISSUER_ID",   ""),
    key_content: ENV.fetch("ASC_KEY_CONTENT", ""),
    duration:    1200,
  )
end

def release_notes
  changelog = `git log -10 --pretty=format:"• %s" --no-merges`.strip
  changelog.empty? ? "No changelog available" : changelog
end

def notify_slack(message:, success: true, payload: {})
  return unless ENV["SLACK_WEBHOOK_URL"]
  slack(
    message:      message,
    webhook_url:  ENV["SLACK_WEBHOOK_URL"],
    success:      success,
    payload:      payload.merge(
      "Build" => ENV["BUILD_NUMBER"] || "local",
      "Branch" => ENV["GIT_BRANCH"] || `git rev-parse --abbrev-ref HEAD`.strip,
    ),
    default_payloads: [:lane, :test_result, :git_author],
  )
end
```

### Cấu trúc platform block

```ruby
platform :ios do
  before_all do
    setup_ci  # LUÔN CÓ: tạo temp keychain
  end

  lane :sync_certs do ... end    # quản lý certificates
  lane :beta do ... end          # build + TestFlight
  lane :production do ... end    # submit App Store
  lane :adhoc do ... end         # build adhoc cho QA
  lane :build_only do ... end    # chỉ build, không upload
  lane :bump_version do ... end  # tăng version number
  lane :refresh_profile do ... end  # renew profile khi add device mới

  error do |lane, exception|
    notify_slack(message: "iOS #{lane} failed: #{exception.message}", success: false)
  end
end

platform :android do
  lane :beta do ... end
  lane :production do ... end
  lane :build_only do ... end
  lane :bump_version do ... end

  error do |lane, exception|
    notify_slack(message: "Android #{lane} failed: #{exception.message}", success: false)
  end
end
```

### Lanes phụ trợ quan trọng

**`bump_version`** — tăng version trước release:
```ruby
lane :bump_version do |options|
  version = options[:version] || ENV["APP_VERSION"] || UI.input("Version: ")
  increment_version_number(version_number: version, xcodeproj: "ios/demo_app.xcodeproj")
  UI.success "Bumped to #{version}"
end
```

**`register_new_device`** — thêm thiết bị mới cho dev/QA:
```ruby
lane :register_new_device do
  device_name = UI.input("Device name: ")
  udid        = UI.input("UDID: ")
  register_devices(devices: { device_name => udid }, api_key: asc_api_key)
  match(type: "development", force_for_new_devices: true, ...)
  match(type: "adhoc",       force_for_new_devices: true, ...)
end
```

---

## 8. GitHub Actions — Workflows

### iOS Beta (`deploy-testflight.yml`)

```yaml
on:
  push:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**', '.github/workflows/android-*.yml']
  workflow_dispatch:

concurrency:
  group: ios-beta
  cancel-in-progress: true   # build cũ bị hủy khi push mới

jobs:
  deploy-ios:
    runs-on: macos-15          # BẮT BUỘC: cần Xcode
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # cần git history cho release notes
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.3', bundler-cache: true }
      - uses: maxim-lobanov/setup-xcode@v1
        with: { xcode-version: 'latest-stable' }
      - run: npm ci
      - uses: actions/cache@v4      # cache CocoaPods
        with:
          path: ios/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
      - run: bundle exec pod install --project-directory=ios
      - run: bundle exec fastlane ios beta
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          # ... tất cả secrets
```

### Android Beta (`android-beta.yml`)

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: android-beta
  cancel-in-progress: true

jobs:
  deploy-android:
    runs-on: ubuntu-latest    # Ubuntu = 10x rẻ hơn macos
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }  # AGP 8+ cần Java 17
      - uses: actions/cache@v4      # cache Gradle
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}
      - uses: android-actions/setup-android@v3
      - name: Decode Android Keystore    # Binary → Base64 secret → file
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > /tmp/release.keystore
          echo "ANDROID_KEYSTORE_PATH=/tmp/release.keystore" >> $GITHUB_ENV
      - run: bundle exec fastlane android beta
        env:
          ANDROID_KEYSTORE_PATH: ${{ env.ANDROID_KEYSTORE_PATH }}
          # ... tất cả secrets
      - name: Cleanup keystore    # xóa keystore sau build
        if: always()
        run: rm -f /tmp/release.keystore
```

### Production Release (`production.yml`)

```yaml
on:
  workflow_dispatch:           # CHỈ manual — không auto trigger
    inputs:
      platform:
        type: choice
        options: [both, ios, android]
      android_rollout:
        default: '0.1'

concurrency:
  group: production-release
  cancel-in-progress: false    # KHÔNG cancel production release đang chạy

jobs:
  release-ios:
    if: ${{ inputs.platform == 'ios' || inputs.platform == 'both' }}
    runs-on: macos-15
    # ...

  release-android:
    if: ${{ inputs.platform == 'android' || inputs.platform == 'both' }}
    runs-on: ubuntu-latest
    # ...

  summary:
    needs: [release-ios, release-android]
    if: always()    # chạy kể cả khi jobs trên bị skip hoặc fail
    runs-on: ubuntu-latest
```

---

## 9. Secrets và Environment Variables

### Cách lưu binary keystore trong GitHub Secrets

GitHub Secrets chỉ lưu text. Keystore là binary file:

```bash
# Encode keystore thành Base64
base64 -i release.keystore | pbcopy  # copy vào clipboard (macOS)
# Paste vào GitHub Secret: ANDROID_KEYSTORE_BASE64

# Decode lại trong CI
echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/release.keystore
```

### Danh sách đầy đủ secrets cần tạo

**iOS:**
```
ASC_KEY_ID          → Key ID từ App Store Connect API
ASC_ISSUER_ID       → Issuer ID từ App Store Connect API
ASC_KEY_CONTENT     → Nội dung file .p8 (kể cả header BEGIN PRIVATE KEY)
APPLE_ID            → Apple ID email (chỉ local, không cần trên CI)
TEAM_ID             → 10-character Apple Team ID (tìm trong Membership)
APP_IDENTIFIER      → Bundle ID: com.company.appname
MATCH_GIT_URL       → https://github.com/org/ios-certificates
MATCH_GIT_TOKEN     → GitHub Personal Access Token (repo scope)
MATCH_PASSWORD      → Password để encrypt match repo
```

**Android:**
```
ANDROID_KEYSTORE_BASE64  → Keystore file encoded base64
ANDROID_KEYSTORE_ALIAS   → Key alias trong keystore
ANDROID_KEYSTORE_PASSWORD → Keystore password
ANDROID_KEY_PASSWORD      → Key password
GOOGLE_PLAY_JSON_KEY_PATH → Đường dẫn đến JSON key file (hoặc nội dung)
```

**Chung:**
```
APP_VERSION         → "1.0.0" — version hiện tại (hoặc dùng bump_version lane)
SLACK_WEBHOOK_URL   → Webhook URL cho Slack notifications (optional)
```

### fastlane/.env.default vs fastlane/.env

| File | Commit vào git? | Chứa gì? |
|---|---|---|
| `.env.default` | ✅ Có | Non-secret defaults: ROLLOUT_PERCENTAGE=0.1, APP_VERSION=1.0.0 |
| `.env` | ❌ Không (thêm vào .gitignore) | Local secrets của developer |
| `.env.example` | ✅ Có | Template với tất cả variables và hướng dẫn lấy ở đâu |
| GitHub Secrets | N/A | Secrets cho CI/CD |

---

## 10. Những lỗi phổ biến và cách fix

### iOS

**Lỗi: codesign hangs, không có output**
```
Cause:  Không có setup_ci → macOS hỏi Keychain password → CI block
Fix:    Thêm setup_ci vào before_all block
```

**Lỗi: "No signing certificate found"**
```
Cause:  match readonly:true nhưng certificate chưa tạo
Fix:    Chạy sync_certs lane với readonly:false lần đầu
```

**Lỗi: "Profile doesn't match"**
```
Cause:  Dùng "Automatic" signing thay vì Manual
Fix:    Thêm xcargs CODE_SIGN_STYLE=Manual và PROVISIONING_PROFILE_SPECIFIER
```

**Lỗi: "Error fetching provisioning profile from Apple"**
```
Cause:  Apple ID hỏi 2FA → không thể dùng trên CI
Fix:    Dùng App Store Connect API Key thay Apple ID
```

**Lỗi: `latest_testflight_build_number` fails**
```
Cause:  App chưa tồn tại trên App Store Connect
Fix:    Tạo app trên ASC trước (identifier must match bundle ID)
        Thêm initial_build_number: 0 làm fallback
```

### Android

**Lỗi: Play Store reject APK**
```
Cause:  Upload APK thay vì AAB (Google Play bắt buộc AAB từ 2021)
Fix:    Đổi gradle task từ "assemble" sang "bundle"
```

**Lỗi: "App not found" khi supply upload**
```
Cause:  Lần đầu upload, app chưa tồn tại trên Play Store
Fix:    Upload thủ công lần đầu qua Play Console, sau đó mới dùng supply
```

**Lỗi: Build signed bằng debug keystore lên Play Store**
```
Cause:  build.gradle có signingConfig signingConfigs.debug trong release buildType
Fix:    Sửa thành signingConfig signingConfigs.release
```

**Lỗi: `google_play_track_version_codes` throws exception**
```
Cause:  Internal track chưa có build nào (lần đầu)
Fix:    Bọc trong begin/rescue: rescue; 0 end || 0
```

**Lỗi: "Cannot read binary .keystore from Secrets"**
```
Cause:  GitHub Secrets là text, keystore là binary
Fix:    Encode: base64 -i release.keystore | pbcopy
        Decode trong CI: echo "$SECRET" | base64 --decode > /tmp/release.keystore
```

---

## 11. Quy trình release đầy đủ

### Chuẩn bị lần đầu (one-time setup)

```bash
# 1. Tạo iOS certificates repo
#    GitHub → New repo → "ios-certificates" (private)

# 2. Tạo match certificates
bundle exec fastlane ios sync_certs

# 3. Tạo release keystore (Android)
keytool -genkey -v -keystore release.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 4. Encode keystore
base64 -i release.keystore | pbcopy
# → Paste vào GitHub Secret: ANDROID_KEYSTORE_BASE64

# 5. Tạo Google Play JSON key
#    Play Console → Setup → API access → Create service account
#    Download JSON file → đọc nội dung → lưu vào secret hoặc path

# 6. Upload lần đầu lên Play Store (thủ công)
#    Play Console → Dashboard → Create app → Upload AAB thủ công
#    SAU ĐÓ mới dùng fastlane supply

# 7. Tạo app trên App Store Connect
#    ASC → Apps → "+" → New App → Bundle ID phải match
```

### Quy trình release thường xuyên

```
Developer push lên main
       │
       ├─ GitHub Actions tự động:
       │  ├─ iOS beta build → TestFlight (25-40 phút)
       │  └─ Android beta build → Play Internal (15-25 phút)
       │
QA test 1-2 ngày
       │
       ├─ QA approve
       │
PM/TL vào GitHub → Actions → Production Release → Run workflow
       │
       ├─ Chọn platform: both/ios/android
       ├─ Nhập version (optional)
       ├─ Nhập android_rollout: 0.1 (10%)
       │
       ├─ iOS: submit lên App Store → Apple review 1-3 ngày
       └─ Android: promote lên Production 10% → theo dõi crash

Sau 24h ổn định → tăng Android rollout → 25% → 50% → 100%
Khi Apple approve iOS → manually release từ ASC (automatic_release: false)
```

---

## 12. Checklist trước khi release

### iOS

- [ ] `APP_IDENTIFIER` match Bundle ID trong Xcode
- [ ] App đã tạo trên App Store Connect
- [ ] `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` đã set trong secrets
- [ ] `MATCH_GIT_URL`, `MATCH_GIT_TOKEN`, `MATCH_PASSWORD` đã set
- [ ] `TEAM_ID` là 10-character Apple Team ID
- [ ] `sync_certs` đã chạy ít nhất 1 lần (certificates tồn tại trong match repo)
- [ ] `setup_ci` có trong `before_all`
- [ ] `CODE_SIGN_STYLE=Manual` trong xcargs
- [ ] `skip_waiting_for_build_processing: true` trong pilot
- [ ] `automatic_release: false` trong production lane

### Android

- [ ] Release keystore đã tạo và được encode thành Base64
- [ ] `ANDROID_KEYSTORE_BASE64` secret đã set
- [ ] `ANDROID_KEYSTORE_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` đã set
- [ ] `GOOGLE_PLAY_JSON_KEY_PATH` trỏ đến JSON key hợp lệ
- [ ] App đã tạo trên Play Console
- [ ] Lần đầu đã upload thủ công qua Play Console
- [ ] `build.gradle` dùng `signingConfig signingConfigs.release` trong release buildType
- [ ] Gradle task là `bundle` (không phải `assemble`)
- [ ] `skip_upload_aab: true` trong production lane (chỉ promote, không upload lại)

### GitHub Actions

- [ ] Tất cả secrets đã được set trong GitHub repo → Settings → Secrets and variables → Actions
- [ ] `fetch-depth: 0` trong checkout (cho release notes)
- [ ] `bundler-cache: true` trong ruby/setup-ruby
- [ ] Gradle cache key bao gồm hash của build.gradle files
- [ ] CocoaPods cache key bao gồm hash của Podfile.lock
- [ ] Keystore cleanup trong `if: always()` step
- [ ] Java 17 cho Android (AGP 8+)
- [ ] Production workflow dùng `cancel-in-progress: false`

---

*Cập nhật lần cuối: Tháng 5/2026*
*Dự án: demo_app (React Native 0.85.2)*
*Thực hành cho: sh-farmcare-mobile (production)*
