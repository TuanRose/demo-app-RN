# Fastlane — Deep Dive

> Fastlane là “automation layer” chuẩn de-facto cho mobile release. Tài liệu này đi từ kiến trúc bên trong → cấu hình thực tế cho RN project.
>
> **Nguồn tham khảo chính**:
> - https://docs.fastlane.tools
> - https://docs.fastlane.tools/getting-started/ios/setup
> - https://docs.fastlane.tools/actions
> - https://github.com/fastlane/fastlane (source code)

---

## 1. Fastlane là gì?

**Fastlane là một bộ Ruby tools** giúp tự động hoá **mọi tác vụ release mobile**:

```
   ┌────────────────────────────────────────────────────┐
   │                                                    │
   │   Manual workflow (không có Fastlane):             │
   │                                                    │
   │   1. Bump version trong Xcode/build.gradle         │
   │   2. Increment build number                        │
   │   3. Open Xcode → Archive → Export → .ipa          │
   │   4. Vào appstoreconnect.apple.com upload          │
   │   5. Chờ processing 30 phút                        │
   │   6. Add to TestFlight, fill release notes         │
   │   7. Cùng 1 quy trình cho Android trên Play        │
   │   8. Notify team                                   │
   │   → Tốn 1-2 giờ/lần, dễ sai                       │
   │                                                    │
   ├────────────────────────────────────────────────────┤
   │                                                    │
   │   Với Fastlane:                                    │
   │                                                    │
   │     $ fastlane beta                                │
   │                                                    │
   │   Một câu lệnh, tất cả ở trên tự động.            │
   │                                                    │
   └────────────────────────────────────────────────────┘
```

**Vì sao là chuẩn de-facto**:
- Open source (Google mua từ 2017, tiếp tục free).
- Community plugin lớn (Firebase, Slack, Sentry, ...).
- Được Apple chính thức công nhận, hoạt động với App Store Connect API.
- Tích hợp với mọi CI tool.

---

## 2. Kiến trúc Fastlane

```
   ┌────────────────────────────────────────────────────┐
   │                  Fastlane gem                      │
   │  (Ruby executable: `fastlane`)                     │
   ├────────────────────────────────────────────────────┤
   │  Core actions  │  iOS tools         │ Android tools│
   │                │                    │              │
   │  - sh          │  - gym (build_app) │ - gradle     │
   │  - git_*       │  - match           │ - supply     │
   │  - slack       │  - pilot           │ - screengrab │
   │  - upload_*    │  - deliver         │              │
   │  - increment_* │  - snapshot        │              │
   │                │  - scan (test)     │              │
   ├────────────────┴────────────────────┴──────────────┤
   │              Plugins (third-party)                 │
   │  fastlane-plugin-firebase_app_distribution         │
   │  fastlane-plugin-versioning                        │
   │  fastlane-plugin-sentry                            │
   │  ...                                               │
   ├────────────────────────────────────────────────────┤
   │              Spaceship                             │
   │  Ruby client cho App Store Connect API             │
   │  + Apple Developer Portal API                      │
   └────────────────────────────────────────────────────┘
```

### 2.1. Mỗi tool con làm gì?

| Tool | Chức năng |
|---|---|
| **gym** (`build_app`) | Build + sign .ipa từ Xcode workspace |
| **match** | Đồng bộ cert + profile qua git repo (encrypted) |
| **pilot** | Upload lên TestFlight |
| **deliver** | Upload metadata + screenshots + binary lên App Store |
| **scan** (`run_tests`) | Chạy test iOS |
| **snapshot** | Screenshots tự động iOS |
| **gradle** | Build Android `.apk` / `.aab` |
| **supply** (`upload_to_play_store`) | Upload Android lên Play Console |
| **screengrab** | Screenshots tự động Android |
| **produce** | Tạo app entry trong App Store Connect / Play Console |
| **cert / sigh** | Tạo cert / provisioning profile (legacy, dùng match thay) |

---

## 3. Setup Fastlane cho RN project

### 3.1. Cài đặt

Fastlane là Ruby gem → nên dùng **Bundler** để pin version (giống npm):

```bash
# Tại root RN project
gem install bundler

# Tạo Gemfile
cat > Gemfile <<'EOF'
source "https://rubygems.org"
gem "fastlane"
EOF

bundle install
```

Hoặc dùng `rbenv` / `asdf` để quản lý Ruby version (mặc định macOS có sẵn 2.6/2.7, đủ dùng nhưng nên 3.x).

### 3.2. Init

```bash
# iOS
cd ios
bundle exec fastlane init

# Android
cd ../android
bundle exec fastlane init
```

→ Sinh ra:
- `ios/fastlane/Fastfile`
- `ios/fastlane/Appfile`
- `android/fastlane/Fastfile`
- `android/fastlane/Appfile`

### 3.3. Cấu trúc folder điển hình

```
my-rn-app/
├── Gemfile                    ← pin fastlane version
├── Gemfile.lock
├── ios/
│   ├── fastlane/
│   │   ├── Fastfile           ← lanes iOS
│   │   ├── Appfile            ← bundle id, team id
│   │   ├── Matchfile          ← config cho match
│   │   ├── Pluginfile         ← list plugins
│   │   └── README.md          (auto-generated)
│   └── ...
├── android/
│   ├── fastlane/
│   │   ├── Fastfile           ← lanes Android
│   │   ├── Appfile            ← package name
│   │   └── Pluginfile
│   └── ...
└── ...
```

---

## 4. Fastfile — anatomy

### 4.1. Cấu trúc cơ bản

```ruby
# ios/fastlane/Fastfile

# Min fastlane version cần
fastlane_version "2.220.0"

# Nền tảng iOS
default_platform(:ios)

platform :ios do

  # Hook chạy trước mọi lane
  before_all do |lane, options|
    setup_ci if ENV['CI']    # tạo keychain tạm trên CI
    ensure_git_status_clean  # fail nếu có uncommitted changes
  end

  desc "Run tests"
  lane :test do
    run_tests(scheme: "MyApp")
  end

  desc "Build & upload to TestFlight"
  lane :beta do
    match(type: "appstore", readonly: true)

    increment_build_number(
      build_number: latest_testflight_build_number(version: get_version_number) + 1
    )

    build_app(
      scheme: "MyApp",
      workspace: "MyApp.xcworkspace",
      export_method: "app-store"
    )

    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )

    slack(message: "✅ iOS beta uploaded")
  end

  # Hook chạy nếu có lỗi
  error do |lane, exception, options|
    slack(
      message: "❌ Lane #{lane} failed: #{exception.message}",
      success: false
    )
  end

  # Hook chạy sau khi lane xong (success)
  after_all do |lane|
    # cleanup, notify, ...
  end
end
```

### 4.2. Các thành phần

| Phần | Vai trò |
|---|---|
| `fastlane_version` | Min version yêu cầu — fail nếu thấp hơn |
| `default_platform(:ios)` | Mặc định khi gọi `fastlane <lane>` |
| `platform :ios do ... end` | Group lanes theo platform |
| `lane :name do ... end` | Định nghĩa 1 lane (chạy được bằng `fastlane <name>`) |
| `desc "..."` | Mô tả, hiển thị khi `fastlane lanes` |
| `before_all` | Chạy trước mỗi lane trong platform đó |
| `after_all` | Chạy sau khi lane thành công |
| `error` | Chạy khi có exception |

### 4.3. Cách chạy

```bash
# Tại root project (vì Gemfile ở đây)
bundle exec fastlane ios beta            # platform :ios → lane :beta
bundle exec fastlane android internal    # platform :android → lane :internal

# Nếu đứng trong ios/ hoặc android/ folder, default_platform tự lo:
cd ios && bundle exec fastlane beta
```

### 4.4. Truyền tham số vào lane

```ruby
lane :deploy do |options|
  env = options[:env] || "staging"
  version = options[:version]

  UI.user_error!("version is required") unless version

  # ... use env, version
end
```

```bash
bundle exec fastlane deploy env:production version:1.2.3
```

### 4.5. Appfile

```ruby
# ios/fastlane/Appfile
app_identifier("com.mycompany.myapp")
apple_id("dev@mycompany.com")              # legacy, có thể bỏ nếu dùng API key
team_id("ABCDE12345")                      # Developer Portal team
itc_team_id("123456")                      # App Store Connect team
```

```ruby
# android/fastlane/Appfile
package_name("com.mycompany.myapp")
json_key_file("./play-store-key.json")    # service account
```

---

## 5. Match — quản lý cert + profile qua git

### 5.1. Vấn đề Match giải quyết

```
   Không có Match:                     Có Match:
   ───────────────                     ─────────
   - Mỗi dev tự tạo cert               - 1 cert dùng cho cả team
   - Profile lung tung                 - Profile encrypt trong git repo
   - Xcode auto signing → conflict     - CI clone repo → import → ký
   - CI cần upload .p12 manual         - Mọi nơi đều readonly
```

### 5.2. Cách hoạt động

```
   ┌──────────────────────────────────────────────────────┐
   │  Repo riêng: cert-and-profiles  (private GitHub)     │
   │                                                      │
   │  ├── certs/                                          │
   │  │   ├── distribution/                               │
   │  │   │   └── ABC123.cer (encrypted)                  │
   │  │   │       + ABC123.p12 (encrypted)                │
   │  │   │                                               │
   │  └── profiles/                                       │
   │      └── appstore/                                   │
   │          └── com.mycompany.myapp.mobileprovision    │
   │                                                      │
   └──────────────────────────────────────────────────────┘
                          │
                          │ encrypt với MATCH_PASSWORD
                          │ (OpenSSL AES-256)
                          ▼
   ┌──────────────────────────────────────────────────────┐
   │  Local máy dev / CI runner                           │
   │  $ fastlane match appstore                           │
   │   → Clone repo                                       │
   │   → Decrypt với MATCH_PASSWORD                       │
   │   → Import .p12 vào Keychain                         │
   │   → Cài profile vào ~/Library/.../Provisioning       │
   └──────────────────────────────────────────────────────┘
```

### 5.3. Setup Match lần đầu

```bash
cd ios
bundle exec fastlane match init      # tạo Matchfile

# Matchfile:
#   git_url("https://github.com/mycompany/cert-and-profiles")
#   storage_mode("git")
#   type("appstore")
#   app_identifier(["com.mycompany.myapp"])
#   username("dev@mycompany.com")

# Gen cert + profile, push lên repo
bundle exec fastlane match appstore         # production
bundle exec fastlane match development      # dev
bundle exec fastlane match adhoc            # ad-hoc
```

### 5.4. Match trong Fastfile

```ruby
lane :beta do
  # Readonly trên CI để tránh tạo cert mới vô ý
  match(
    type: "appstore",
    readonly: is_ci,
    app_identifier: ["com.mycompany.myapp"]
  )

  build_app(...)
  upload_to_testflight(...)
end
```

### 5.5. Storage modes

| Mode | Khi nào |
|---|---|
| `git` | Default. Repo riêng, encrypt bằng MATCH_PASSWORD |
| `s3` | AWS S3 bucket |
| `google_cloud` | GCS bucket |
| `gitlab_secure_files` | GitLab CI native storage |

### 5.6. Setup CI dùng Match

```yaml
# GitHub Actions example
env:
  MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
  MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
  # base64(github_username:personal_access_token)
```

```ruby
# Fastfile
lane :beta do
  setup_ci if ENV['CI']     # tạo temp keychain
  match(type: "appstore", readonly: true)
  # ...
end
```

`setup_ci` là magic action: tạo keychain tạm, set làm default, để cleanup tự động sau build → tránh leak cert vào host CI shared.

---

## 6. Build iOS — gym / build_app

### 6.1. Lệnh cơ bản

```ruby
build_app(
  workspace: "MyApp.xcworkspace",        # bắt buộc cho RN (có Pods)
  scheme: "MyApp",
  configuration: "Release",
  export_method: "app-store",            # app-store / ad-hoc / development / enterprise
  export_options: {
    provisioningProfiles: {
      "com.mycompany.myapp" => "match AppStore com.mycompany.myapp"
    }
  },
  output_directory: "./build",
  output_name: "MyApp.ipa",
  clean: true,
  silent: false,
  include_bitcode: false,                # bitcode đã deprecated
  include_symbols: true                  # cần cho crash reporting
)
```

### 6.2. Ý nghĩa các option quan trọng

| Option | Note |
|---|---|
| `workspace` vs `project` | RN luôn dùng workspace (vì có Pods) |
| `export_method` | Quyết định cert + profile dùng |
| `export_options.provisioningProfiles` | Map bundle ID → profile name (Match đặt theo template `match {Type} {bundle}`) |
| `include_symbols` | Bao gồm dSYM → upload Sentry / Crashlytics |
| `xcargs` | Truyền args xuống xcodebuild (vd `-allowProvisioningUpdates`) |

---

## 7. TestFlight — pilot / upload_to_testflight

```ruby
upload_to_testflight(
  app_identifier: "com.mycompany.myapp",
  ipa: "./build/MyApp.ipa",
  skip_waiting_for_build_processing: true,    # đừng chờ Apple processing (15-30 phút)
  changelog: "Bug fixes and improvements",
  distribute_external: false,                  # internal testers thôi
  groups: ["QA Team"],                         # nếu external
  api_key_path: "./fastlane/api_key.json"      # App Store Connect API key
)
```

**App Store Connect API Key trong fastlane**:

```ruby
# Cách 1: file json
api_key = app_store_connect_api_key(
  key_id: "ABC123XYZ",
  issuer_id: "xxxx-xxxx-xxxx",
  key_filepath: "./AuthKey_ABC123XYZ.p8",
  duration: 1200,    # token valid 20 phút
  in_house: false
)

upload_to_testflight(api_key: api_key)
```

```ruby
# Cách 2: trên CI dùng env vars
api_key = app_store_connect_api_key(
  key_id: ENV['ASC_KEY_ID'],
  issuer_id: ENV['ASC_ISSUER_ID'],
  key_content: ENV['ASC_KEY_CONTENT'],   # nội dung file .p8 đặt vào secret
  is_key_content_base64: true
)
```

---

## 8. Build Android — gradle

```ruby
gradle(
  task: "bundle",                # bundle = .aab; assemble = .apk
  build_type: "Release",
  project_dir: "android/",
  properties: {
    "android.injected.signing.store.file" => ENV['KEYSTORE_PATH'],
    "android.injected.signing.store.password" => ENV['KEYSTORE_PASSWORD'],
    "android.injected.signing.key.alias" => ENV['KEY_ALIAS'],
    "android.injected.signing.key.password" => ENV['KEY_PASSWORD']
  }
)

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 9. Play Console upload — supply / upload_to_play_store

### 9.1. Setup Play Console service account

1. Play Console → Setup → API access → tạo service account.
2. Cấp role: **Release manager** (hoặc custom — cần `releases:edit`).
3. Tải JSON key.

### 9.2. Upload

```ruby
upload_to_play_store(
  package_name: "com.mycompany.myapp",
  json_key: "./play-store-key.json",
  aab: "./android/app/build/outputs/bundle/release/app-release.aab",
  track: "internal",            # internal / alpha / beta / production
  release_status: "draft",       # hoặc "completed"
  rollout: "0.1",                # staged rollout 10%
  changes_not_sent_for_review: false,
  skip_upload_metadata: true,    # nếu không quản lý metadata qua fastlane
  skip_upload_images: true,
  skip_upload_screenshots: true
)
```

### 9.3. Promote build giữa các tracks

```ruby
lane :promote_to_production do |options|
  upload_to_play_store(
    track: "internal",
    track_promote_to: "production",
    rollout: "0.1",                # 10% rollout
    skip_upload_apk: true,
    skip_upload_aab: true
  )
end
```

→ Không build lại, chỉ promote artifact đã có trên Play.

---

## 10. Plugins phổ biến cho RN project

### 10.1. Cài plugin

```bash
bundle exec fastlane add_plugin firebase_app_distribution
# tạo file ios/fastlane/Pluginfile + update Gemfile
```

### 10.2. Plugin nên biết

| Plugin | Công dụng |
|---|---|
| `fastlane-plugin-firebase_app_distribution` | Upload build lên Firebase App Distribution |
| `fastlane-plugin-versioning` | Quản lý CFBundleShortVersionString tốt hơn |
| `fastlane-plugin-sentry` | Upload dSYM/source maps lên Sentry |
| `fastlane-plugin-changelog` | Đọc CHANGELOG.md, format release notes |
| `fastlane-plugin-react_native_release` | Helper cho RN-specific tasks |
| `fastlane-plugin-load_json` | Đọc JSON file (cho config) |

### 10.3. Ví dụ Firebase upload

```ruby
firebase_app_distribution(
  app: "1:123456:ios:abcdef",       # Firebase app ID
  ipa_path: "./build/MyApp.ipa",
  groups: "qa-team, devs",
  release_notes: "PR #123: New login flow"
)
```

---

## 11. Real-world Fastfile cho RN project

### 11.1. iOS Fastfile

```ruby
# ios/fastlane/Fastfile
fastlane_version "2.220.0"
default_platform(:ios)

WORKSPACE = "MyApp.xcworkspace"
SCHEME = "MyApp"
BUNDLE_ID = "com.mycompany.myapp"

platform :ios do

  before_all do
    setup_ci if ENV['CI']
  end

  desc "Run unit tests"
  lane :test do
    run_tests(scheme: SCHEME, workspace: WORKSPACE)
  end

  # Helper: lấy ASC API key
  def asc_api_key
    app_store_connect_api_key(
      key_id: ENV['ASC_KEY_ID'],
      issuer_id: ENV['ASC_ISSUER_ID'],
      key_content: ENV['ASC_KEY_CONTENT'],
      is_key_content_base64: true,
      duration: 1200
    )
  end

  desc "Sync certs/profiles via Match"
  lane :certificates do
    match(type: "development", readonly: is_ci)
    match(type: "appstore", readonly: is_ci)
  end

  desc "Build & upload to TestFlight"
  lane :beta do
    api_key = asc_api_key

    match(type: "appstore", readonly: true, api_key: api_key)

    # Build number = latest TestFlight + 1
    increment_build_number(
      build_number: latest_testflight_build_number(
        api_key: api_key,
        version: get_version_number(target: SCHEME)
      ) + 1
    )

    build_app(
      workspace: WORKSPACE,
      scheme: SCHEME,
      export_method: "app-store",
      include_symbols: true,
      output_directory: "./build"
    )

    upload_to_testflight(
      api_key: api_key,
      skip_waiting_for_build_processing: true,
      changelog: ENV['CHANGELOG'] || "Internal beta"
    )

    # Upload dSYM lên Sentry
    sentry_upload_dif(
      auth_token: ENV['SENTRY_AUTH_TOKEN'],
      org_slug: "mycompany",
      project_slug: "myapp-ios",
      path: "./build"
    ) if ENV['SENTRY_AUTH_TOKEN']

    slack(
      message: "✅ iOS beta v#{get_version_number}(#{get_build_number}) up on TestFlight",
      slack_url: ENV['SLACK_WEBHOOK_URL']
    ) if ENV['SLACK_WEBHOOK_URL']
  end

  desc "Submit to App Store"
  lane :release do
    api_key = asc_api_key

    match(type: "appstore", readonly: true, api_key: api_key)

    build_app(
      workspace: WORKSPACE,
      scheme: SCHEME,
      export_method: "app-store",
      include_symbols: true
    )

    upload_to_app_store(
      api_key: api_key,
      submit_for_review: true,
      automatic_release: false,           # release thủ công sau khi review pass
      force: true,                        # skip preview HTML confirm
      skip_metadata: false,
      skip_screenshots: true,
      precheck_include_in_app_purchases: false
    )
  end

  error do |lane, exception, options|
    slack(
      message: "❌ iOS lane #{lane} failed: #{exception.message}",
      success: false,
      slack_url: ENV['SLACK_WEBHOOK_URL']
    ) if ENV['SLACK_WEBHOOK_URL']
  end
end
```

### 11.2. Android Fastfile

```ruby
# android/fastlane/Fastfile
fastlane_version "2.220.0"
default_platform(:android)

PACKAGE_NAME = "com.mycompany.myapp"

platform :android do

  desc "Run tests"
  lane :test do
    gradle(task: "test", project_dir: ".")
  end

  desc "Build .aab Release"
  lane :build_release do
    gradle(
      task: "bundle",
      build_type: "Release",
      project_dir: ".",
      properties: {
        "android.injected.signing.store.file" => ENV['KEYSTORE_PATH'],
        "android.injected.signing.store.password" => ENV['KEYSTORE_PASSWORD'],
        "android.injected.signing.key.alias" => ENV['KEY_ALIAS'],
        "android.injected.signing.key.password" => ENV['KEY_PASSWORD']
      }
    )
  end

  desc "Internal testing"
  lane :internal do
    build_release
    upload_to_play_store(
      package_name: PACKAGE_NAME,
      json_key: ENV['PLAY_STORE_JSON_KEY_PATH'],
      track: "internal",
      aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
    slack(message: "✅ Android internal track uploaded") if ENV['SLACK_WEBHOOK_URL']
  end

  desc "Promote internal → production with 10% rollout"
  lane :promote_production do
    upload_to_play_store(
      package_name: PACKAGE_NAME,
      json_key: ENV['PLAY_STORE_JSON_KEY_PATH'],
      track: "internal",
      track_promote_to: "production",
      rollout: "0.1",
      skip_upload_aab: true,
      skip_upload_apk: true,
      skip_upload_metadata: true,
      skip_upload_images: true,
      skip_upload_screenshots: true
    )
  end

  error do |lane, exception, options|
    slack(
      message: "❌ Android lane #{lane} failed: #{exception.message}",
      success: false,
      slack_url: ENV['SLACK_WEBHOOK_URL']
    ) if ENV['SLACK_WEBHOOK_URL']
  end
end
```

### 11.3. Cách chạy

```bash
# Local dev
bundle exec fastlane ios test
bundle exec fastlane ios certificates
bundle exec fastlane ios beta

bundle exec fastlane android internal
bundle exec fastlane android promote_production
```

---

## 12. Tips & best practices

### 12.1. Tách lane nhỏ, compose lại

```ruby
# Bad: 1 lane khổng lồ làm tất cả
lane :do_everything do
  match(...); build_app(...); upload(...); notify(...)
end

# Good: lanes nhỏ, gọi nhau
lane :sync_certs do; match(type: "appstore"); end
lane :build do; build_app(...); end
lane :upload_tf do; upload_to_testflight(...); end

lane :beta do
  sync_certs
  build
  upload_tf
end
```

→ Test từng lane riêng dễ hơn, debug nhanh hơn.

### 12.2. Always `readonly: is_ci` cho match

CI không nên có quyền **tạo** cert mới — chỉ nên dùng cert đã có. Nếu cần tạo, làm local 1 lần.

### 12.3. Đừng pass secret qua command line

```bash
# Bad: leak vào shell history + process list
bundle exec fastlane beta password:abcdef

# Good: env var
export MATCH_PASSWORD=abcdef
bundle exec fastlane beta
```

### 12.4. Pin version

```ruby
# Gemfile
gem "fastlane", "2.220.0"  # KHÔNG dùng "~>" cho fastlane
```

→ Fastlane release nhanh, đôi khi breaking. Pin để build reproducible.

### 12.5. Dùng `lane_context` để pass data

```ruby
lane :build do
  build_app(...)
  # output path tự lưu vào lane_context
  UI.message("IPA: #{lane_context[SharedValues::IPA_OUTPUT_PATH]}")
end

lane :upload do
  upload_to_testflight(ipa: lane_context[SharedValues::IPA_OUTPUT_PATH])
end
```

### 12.6. Verbose mode khi debug

```bash
bundle exec fastlane beta --verbose
```

### 12.7. `fastlane lanes` — list lanes available

```bash
$ bundle exec fastlane lanes
----- iOS -----
ios test         Run unit tests
ios certificates Sync certs/profiles via Match
ios beta         Build & upload to TestFlight
ios release      Submit to App Store
```

### 12.8. Fastfile càng nên làm “orchestration”, không phải logic

Logic phức tạp (parse changelog, version bump strategy) → tách thành Ruby helper hoặc script Node, gọi qua `sh()`. Fastfile nên đọc dễ.

---

## 13. Khi nào KHÔNG dùng Fastlane

| Tình huống | Thay thế |
|---|---|
| Project Expo full | EAS CLI (`eas build`, `eas submit`) — không cần Fastlane |
| Project React Native + Expo prebuild | Có thể vẫn dùng Fastlane, hoặc EAS |
| Team chỉ iOS, đã trong Apple ecosystem hoàn toàn | Xcode Cloud có thể đủ |
| Không có Mac (build Android only) | Gradle + supply trực tiếp |

→ Cho RN bare workflow + native modules + GitHub Actions: **Fastlane vẫn là chuẩn nhất**.

---

## 14. Lỗi phổ biến và cách xử lý

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `No matching provisioning profiles found` | Profile không match bundle ID hoặc cert | `bundle exec fastlane match appstore --force` |
| `Code signing is required for product type 'Application'` | Xcode không tìm thấy cert trong keychain | `setup_ci` hoặc check keychain |
| `App Store Connect API key error` | .p8 file format sai (encoding) | Encode base64 đúng cách: `base64 -i AuthKey.p8` |
| `Build number ... has already been used` | Trùng build number trên TestFlight | Dùng `latest_testflight_build_number + 1` |
| `Module not found ... in Pods` | Chưa `pod install` | Thêm `cocoapods` action trước `build_app` |
| `Could not find ... in keychain` | Keychain temp bị unlock fail | `unlock_keychain` action |
| Match: `Couldn't decrypt the repo` | MATCH_PASSWORD sai | Check secret CI |

---

## 15. Đọc thêm

| Tài liệu | Link |
|---|---|
| Fastlane docs (chính chủ) | https://docs.fastlane.tools |
| All actions reference | https://docs.fastlane.tools/actions |
| Match deep dive | https://docs.fastlane.tools/actions/match |
| Codesigning concepts | https://codesigning.guide |
| Plugins index | https://docs.fastlane.tools/plugins/available-plugins |
| Best practices | https://docs.fastlane.tools/best-practices |
| Spaceship (low-level API) | https://github.com/fastlane/fastlane/tree/master/spaceship |
