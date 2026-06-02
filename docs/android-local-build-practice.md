# Android Local Build Practice

> **Mục tiêu:** Luyện tập build Android AAB local với Fastlane + productFlavors
> trước khi Play Console account được verify — không cần upload lên Play Store.

---

## Những gì đã làm được

### 1. Tạo Release Keystore

```bash
keytool -genkey -v \
  -keystore android/app/release.keystore \
  -alias demo-app-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

- File output: `android/app/release.keystore`
- `release.keystore` đã được thêm vào `.gitignore` — không commit lên git
- Backup keystore + password ở nơi an toàn (Google Drive, 1Password)

**Tại sao không dùng `debug.keystore`?**
Debug keystore không được Google Play tin tưởng. APK/AAB ký bằng debug key sẽ bị Play Store reject. Nếu publish nhầm → phải tạo app ID mới, không thể update app cũ.

---

### 2. Cấu hình `fastlane/.env`

Thêm Android credentials vào `fastlane/.env` (gitignored):

```bash
ANDROID_KEYSTORE_PATH=/absolute/path/to/android/app/release.keystore
ANDROID_KEYSTORE_ALIAS=demo-app-key
ANDROID_KEYSTORE_PASSWORD=<store-password>
ANDROID_KEY_PASSWORD=<key-password>
ANDROID_BUILD_FLAVOUR=Prod
```

Fastlane tự load `fastlane/.env` khi chạy bất kỳ lane nào — không cần `source` hay `export` thủ công.

---

### 3. Fix `build_only` lane — thêm `flavor`

**Vấn đề**: `build.gradle` có `flavorDimensions` → Gradle task `bundleRelease` không tồn tại.
Gradle yêu cầu task cụ thể: `bundleProdRelease`, `bundleDevRelease`, v.v.

**Fix trong `fastlane/Fastfile`:**

```ruby
lane :build_only do
  flavour = ENV["ANDROID_BUILD_FLAVOUR"] || "Prod"
  gradle(
    task:        "bundle",
    flavor:      flavour,   # ← bắt buộc khi có flavorDimensions
    build_type:  "Release",
    project_dir: "android/",
    properties: { ... },
  )
end
```

Fastlane ghép params thành: `./gradlew bundle{flavor}Release`

---

### 4. Fix dependency `org.asyncstorage.shared_storage:storage-android:1.0.0`

**Vấn đề**: `@react-native-async-storage/async-storage` ship artifact `storage-android:1.0.0`
dưới dạng local Maven repo trong `node_modules`, nhưng Gradle không biết đường dẫn.

**Lỗi:**
```
Could not find org.asyncstorage.shared_storage:storage-android:1.0.0.
```

**Fix trong `android/build.gradle`:**

```groovy
allprojects {
    repositories {
        maven {
            url("${rootDir}/../node_modules/@react-native-async-storage/async-storage/android/local_repo")
        }
    }
}
```

**Tại sao `allprojects`?** Dependency này được dùng bởi subproject `:react-native-async-storage_async-storage` — phải khai báo ở root để tất cả subproject đều thấy repo này.

---

### 5. Build thành công cả 3 môi trường

```bash
# Prod — com.demo_app (Play Store)
bundle exec fastlane android build_only

# Dev — com.demo_app.dev (local development)
ANDROID_BUILD_FLAVOUR=Dev bundle exec fastlane android build_only

# Antonio — com.demo_app.antonio (Firebase App Distribution)
ANDROID_BUILD_FLAVOUR=Antonio bundle exec fastlane android build_only
```

Output files:
```
android/app/build/outputs/bundle/
├── ProdRelease/app-Prod-release.aab
├── DevRelease/app-Dev-release.aab
└── AntonioRelease/app-Antonio-release.aab
```

---

## Giải thích cơ chế chính

### YARA pattern — dynamic flavor qua env var

Thay vì tạo 3 lane riêng cho 3 môi trường, dùng 1 lane + inject env var:

```
CI inject ANDROID_BUILD_FLAVOUR=Prod
         ↓
Fastlane đọc ENV["ANDROID_BUILD_FLAVOUR"]
         ↓
Gradle chạy bundleProdRelease
         ↓
AAB được ký bằng release keystore
```

### AGP Injected Signing Properties

`android.injected.signing.*` là cơ chế của Android Gradle Plugin — không phải `-P` thông thường.
Fastlane truyền credentials qua đây để override `signingConfig` trong `build.gradle` tại runtime,
không cần hardcode password vào repo.

### `lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH]`

Sau khi `gradle()` action chạy xong, đường dẫn `.aab` được lưu vào shared context.
Lane `beta` dùng lại giá trị này để upload: `supply(aab: lane_context[...])`.

---

## Checklist đã hoàn thành (local)

- [x] Tạo `release.keystore` + thêm vào `.gitignore`
- [x] Điền Android credentials vào `fastlane/.env`
- [x] Fix `build_only` lane — thêm `flavor` param
- [x] Fix `android/build.gradle` — khai báo local Maven repo cho async-storage
- [x] Build thành công Prod / Dev / Antonio flavor

## Checklist còn lại (cần Play Console account)

- [ ] Tạo app trên Google Play Console
- [ ] Tạo service account + download JSON key
- [ ] Upload AAB lần đầu thủ công lên Internal Testing
- [ ] Thêm GitHub Secrets
- [ ] Push CI → verify pipeline xanh
