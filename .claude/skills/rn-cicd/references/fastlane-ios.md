# Reference: Fastlane iOS

---

## Cài đặt

```bash
# Thêm vào Gemfile (trong thư mục ios/ hoặc root)
gem "fastlane"

bundle install
bundle exec fastlane init  # tạo Fastfile, Appfile
```

**`ios/Appfile`:**
```ruby
app_identifier "com.yourcompany.yourapp"
apple_id "you@email.com"
team_id "XXXXXXXXXX"  # Team ID từ Apple Developer Portal
```

---

## Fastfile — lanes cơ bản

**`ios/Fastfile`:**
```ruby
default_platform(:ios)

platform :ios do

  # ===== CERTIFICATES (dùng match) =====
  desc "Sync certificates và provisioning profiles"
  lane :certificates do
    match(
      type: "development",
      app_identifier: "com.yourcompany.yourapp",
      readonly: true  # chỉ đọc (dùng trên CI), false để cập nhật
    )
  end

  # ===== BUILD =====
  desc "Build app cho TestFlight"
  lane :beta do
    # Tăng build number tự động
    increment_build_number(
      build_number: latest_testflight_build_number + 1,
      xcodeproj: "YourApp.xcodeproj"
    )

    # Sync signing
    match(type: "appstore", readonly: true)

    # Build
    gym(
      scheme: "YourApp",
      workspace: "YourApp.xcworkspace",
      configuration: "Release",
      export_method: "app-store",
      output_directory: "./build",
      output_name: "YourApp.ipa"
    )

    # Upload lên TestFlight
    pilot(
      ipa: "./build/YourApp.ipa",
      skip_waiting_for_build_processing: true,  # không chờ Apple process
      distribute_external: false
    )
  end

  # ===== RELEASE =====
  desc "Submit lên App Store"
  lane :release do
    match(type: "appstore", readonly: true)
    gym(scheme: "YourApp", workspace: "YourApp.xcworkspace", configuration: "Release")
    deliver(
      ipa: "./build/YourApp.ipa",
      submit_for_review: true,
      automatic_release: false,  # manual release sau khi approved
      force: true                # bỏ qua HTML report preview
    )
  end

  # ===== SCREENSHOTS =====
  lane :screenshots do
    snapshot          # chụp screenshots tự động
    frameit(silver: true)  # thêm device frame
  end

  # Error handler
  error do |lane, exception|
    slack(
      message: "Error in lane #{lane}: #{exception.message}",
      success: false
    )
  end
end
```

---

## match — Certificate management (khuyến nghị)

match lưu certificates và provisioning profiles trong git repo private (hoặc S3/Google Cloud).
Toàn bộ team dùng chung certificates → không bị "works on my machine".

```bash
# Init (lần đầu)
bundle exec fastlane match init
# Chọn storage: git, s3, google_cloud

# Tạo certificates mới
bundle exec fastlane match development
bundle exec fastlane match appstore
bundle exec fastlane match adhoc

# Sync (readonly) — dùng trên CI
bundle exec fastlane match appstore --readonly
```

**`ios/Matchfile`:**
```ruby
git_url "https://github.com/yourcompany/certificates.git"
storage_mode "git"
type "appstore"
app_identifier "com.yourcompany.yourapp"
username "you@email.com"
```

---

## gym — Build options

```ruby
gym(
  scheme: "YourApp",
  workspace: "YourApp.xcworkspace",
  configuration: "Release",
  export_method: "app-store",   # "development", "ad-hoc", "enterprise", "app-store"
  export_options: {
    provisioningProfiles: {
      "com.yourcompany.yourapp" => "match AppStore com.yourcompany.yourapp"
    }
  },
  include_bitcode: false,       # Apple deprecated Bitcode
  include_symbols: true,
  output_directory: "./build",
  xcargs: "-allowProvisioningUpdates"
)
```

---

## Chạy trên CI

```bash
# .github/workflows/ios.yml
# hoặc Bitrise, CircleCI, Fastlane CI

bundle exec fastlane beta

# Với environment variables
MATCH_PASSWORD=${{ secrets.MATCH_PASSWORD }} \
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD=${{ secrets.APP_SPECIFIC_PASSWORD }} \
bundle exec fastlane beta
```

**Secrets cần thiết cho CI:**
- `MATCH_PASSWORD` — encrypt/decrypt certificates git repo
- `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` — App-Specific Password từ appleid.apple.com
- `FASTLANE_SESSION` — hoặc dùng App Store Connect API key (an toàn hơn)

**App Store Connect API Key (khuyến nghị cho CI):**
```ruby
app_store_connect_api_key(
  key_id: ENV["ASC_KEY_ID"],
  issuer_id: ENV["ASC_ISSUER_ID"],
  key_filepath: "./AuthKey.p8",  # hoặc key_content: ENV["ASC_KEY_CONTENT"]
  duration: 1200,
  in_house: false
)
```
