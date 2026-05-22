# Reference: Fastlane Android

---

## Cài đặt

```bash
# Trong thư mục android/ hoặc root
bundle exec fastlane init
```

**`android/Appfile`:**
```ruby
package_name "com.yourcompany.yourapp"
json_key_file "google-service-account.json"  # từ Google Play Console
```

---

## Fastfile — Android lanes

**`android/Fastfile`:**
```ruby
default_platform(:android)

platform :android do

  desc "Build debug APK"
  lane :build_debug do
    gradle(
      task: "assemble",
      build_type: "Debug"
    )
  end

  desc "Build release APK cho internal testers"
  lane :build_apk do
    gradle(
      task: "assemble",
      build_type: "Release",
      print_command: false  # ẩn sensitive args
    )
  end

  desc "Build release AAB cho Play Store"
  lane :build_aab do
    gradle(
      task: "bundle",
      build_type: "Release"
    )
  end

  desc "Deploy lên Play Store (internal track)"
  lane :internal do
    gradle(task: "bundle", build_type: "Release")
    upload_to_play_store(
      track: "internal",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      skip_upload_metadata: true,
      skip_upload_screenshots: true,
      skip_upload_images: true
    )
  end

  desc "Promote internal → alpha → beta → production"
  lane :promote_to_beta do
    upload_to_play_store(
      track: "internal",
      track_promote_to: "beta"
    )
  end

  desc "Deploy lên production"
  lane :deploy do
    gradle(task: "bundle", build_type: "Release")
    upload_to_play_store(
      track: "production",
      aab: "app/build/outputs/bundle/release/app-release.aab",
      rollout: "0.1"  # 10% rollout trước
    )
  end

  desc "Tăng version code"
  lane :bump_version_code do
    android_set_version_code(
      version_code: google_play_track_version_codes(track: "internal")[0] + 1
    )
  end
end
```

---

## gradle action

```ruby
gradle(
  task: "bundle",            # "assemble" (APK), "bundle" (AAB), "test"
  build_type: "Release",     # "Debug", "Release"
  flavor: "staging",         # product flavor nếu có
  project_dir: "android/",   # đường dẫn đến android/
  properties: {
    "android.injected.signing.store.file" => ENV["KEYSTORE_PATH"],
    "android.injected.signing.store.password" => ENV["KEYSTORE_PASSWORD"],
    "android.injected.signing.key.alias" => ENV["KEY_ALIAS"],
    "android.injected.signing.key.password" => ENV["KEY_PASSWORD"],
  },
  print_command: false  # ẩn command (tránh log sensitive data)
)
```

---

## upload_to_play_store (supply)

```ruby
upload_to_play_store(
  package_name: "com.yourcompany.yourapp",
  track: "internal",               # "internal", "alpha", "beta", "production"
  rollout: "1.0",                  # 1.0 = 100%, 0.1 = 10%
  aab: "path/to/app.aab",

  # Metadata (tùy chọn)
  metadata_path: "./fastlane/metadata/android",
  skip_upload_metadata: false,
  skip_upload_screenshots: false,
  skip_upload_images: false,

  # Nếu dùng service account key
  json_key: "google-service-account.json",

  # Version
  version_name: "2.1.0",
  version_code: 210,
)
```

---

## Signing configuration trên CI

**Lưu keystore và password trong GitHub Secrets, không commit file:**

```yaml
# .github/workflows
- name: Decode keystore
  run: echo "${{ secrets.KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore

- name: Build and deploy
  env:
    KEYSTORE_PATH: "release.keystore"
    KEYSTORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
    KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
    KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
  run: bundle exec fastlane deploy
```

---

## Google Service Account — setup cho supply

1. Google Play Console → Setup → API access
2. Tạo service account → tải JSON key
3. Cấp quyền "Release manager" cho service account
4. Lưu JSON vào secrets, không commit vào git

```bash
# Test kết nối
bundle exec fastlane run validate_play_store_json_key json_key:"google-service-account.json"
```
