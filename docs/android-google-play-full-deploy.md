# Android Google Play — Full Deploy Guide (First Time)

> **Mục tiêu:** Deploy `demo_app_bk` lên Google Play Internal Testing lần đầu tiên,
> theo đúng YARA pattern: productFlavors + dynamic Fastfile + GitHub Actions.
>
> **Thời gian ước tính:** 3-4 giờ (bao gồm đăng ký Google Play Developer + service account)

---

## Phase 0 — Tạo Google Play Developer Account (One-time, ~30 phút)

> **Điều kiện:** Cần thẻ Visa/Mastercard để trả phí $25 USD một lần duy nhất.
> Phí này là vĩnh viễn — không phí hàng năm.

### 0.1 Tạo Google Account dành riêng cho developer

> **Tại sao tạo account riêng?**
> Account Google personal thường có lịch sử nhiều service khác nhau.
> Dùng account riêng cho developer giúp tách biệt billing, dễ chuyển giao cho team.

1. Vào [accounts.google.com/signup](https://accounts.google.com/signup)
2. Điền thông tin:
   - First name: `Demo`
   - Last name: `App`
   - Username: chọn dạng `yourname.dev` hoặc `yourcompany.android`
   - Password: dùng password manager, lưu lại
3. Thêm recovery email = personal email của bạn (phòng khi mất access)
4. **Bật 2-Factor Authentication ngay** — Google Play Console yêu cầu

> **Nếu đã có Google account muốn dùng luôn:** Bỏ qua bước này, dùng account đó đăng nhập Play Console.

---

### 0.2 Đăng ký Google Play Developer

1. Vào [play.google.com/console/signup](https://play.google.com/console/signup)
2. Đăng nhập bằng Google account vừa tạo
3. Chọn loại account:

   | Loại | Khi nào chọn |
   |------|-------------|
   | **Personal** | App cá nhân, không có tên công ty |
   | **Organization** | Publish dưới tên công ty / startup |

   → Chọn **Personal** nếu đây là project cá nhân/học tập.

4. Điền **Developer name** — đây là tên hiển thị công khai trên Play Store:
   - Ví dụ: `Antonio Vu` hoặc `DemoApp Studio`
   - **Không thể đổi dễ dàng sau khi tạo** — chọn kỹ

5. Điền contact email (dùng email đang đăng nhập)

6. Đồng ý **Developer Distribution Agreement** (đọc lướt phần chính)

7. Nhấn **Continue to payment**

---

### 0.3 Thanh toán phí $25 USD

1. Nhập thông tin thẻ (Visa/Mastercard)
2. Billing address: điền địa chỉ thật (Google verify)
   ```
   Country:  Vietnam
   Address:  [địa chỉ của bạn]
   City:     Ho Chi Minh City
   ZIP:      700000
   ```
3. Nhấn **Buy** — bị charge $25 ngay lập tức

> **Lưu ý:** Một số ngân hàng Việt Nam block giao dịch nước ngoài.
> Nếu bị từ chối: gọi ngân hàng mở "thanh toán quốc tế", hoặc dùng thẻ Visa debit Techcombank/VCB.

---

### 0.4 Hoàn tất setup Play Console

Sau thanh toán, Google sẽ redirect về Play Console. Làm theo các bước onboarding:

**Bước A — Verify thông tin account:**
1. Điền số điện thoại để verify (OTP)
2. Chờ email xác nhận từ Google (thường < 5 phút)

**Bước B — Setup Developer Profile:**
1. Vào **Settings → Developer account → Developer page**
2. Điền:
   - Developer name: như đã nhập
   - Website: `https://github.com/yourusername` (có thể dùng GitHub)
   - Email address: email liên hệ cho user (public)

**Bước C — Verify danh tính (Identity verification):**

> Google bắt đầu yêu cầu verify danh tính từ 2023 cho tất cả new accounts.

1. **Settings → Developer account → Identity verification**
2. Upload CMND/CCCD hoặc Passport (2 mặt)
3. Chờ Google review: **1-3 ngày làm việc**

> **Trong thời gian chờ verify**, bạn vẫn có thể tạo app và upload build nội bộ.
> Nhưng **không thể publish ra public** cho đến khi verify xong.

---

### 0.5 Kiểm tra account sẵn sàng

Khi vào [play.google.com/console](https://play.google.com/console), bạn thấy:
- Dashboard trống "You don't have any apps yet"
- Không có banner lỗi màu đỏ về account status
- Menu bên trái có đủ: **All apps, Setup, Users and permissions**

✅ Account sẵn sàng → tiếp tục Phase 1.

---

## Kiến trúc tổng thể (YARA pattern)

```
push branch `main`
        │
        ▼
GitHub Actions — android-beta.yml
        │
        ├── Set ANDROID_BUILD_FLAVOUR=Prod   ← inject environment
        │
        └── bundle exec fastlane android beta
                │
                ├── query versionCode from Play Store API
                ├── gradle bundle Prod Release   ← build AAB với Prod flavor
                └── supply upload to Internal Testing
                        │
                        └── Google Play Console
                                └── app: com.demo_app
                                        └── track: Internal Testing
```

**Tại sao theo YARA pattern?**

| Concept | YARA | demo_app_bk |
|---------|------|-------------|
| Build flavor | `ENV['ANDROID_BUILD_FLAVOUR']` | `ENV["ANDROID_BUILD_FLAVOUR"]` (giống) |
| versionCode | `ENV['APP_VERSION_CODE']` (từ Vault) | Query real-time từ Play Store API |
| Secrets | HashiCorp Vault | GitHub Secrets |
| Pipeline trigger | Branch map → environment | Branch `main` → `Prod` flavor |

---

## Phase 1 — Setup ngoài repo (One-time)

### 1.1 Tạo Release Keystore

Keystore là file chứa private key để ký APK/AAB. Một khi đã publish lên Play Store với keystore này, **không được thay đổi hoặc mất keystore** — Google sẽ từ chối update từ keystore khác.

```bash
# Chạy từ thư mục gốc của project
keytool -genkey -v \
  -keystore android/app/release.keystore \
  -alias demo-app-key \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000

# Điền thông tin khi được hỏi:
# First and Last Name: DemoApp
# Organizational Unit: Mobile
# Organization: DemoApp
# City: Ho Chi Minh
# State: Ho Chi Minh
# Country Code (2 letter): VN
```

> **QUAN TRỌNG — Backup keystore:**
> ```bash
> # Lưu vào nơi an toàn (Google Drive, 1Password, ...)
> # KHÔNG commit lên git
> echo "android/app/release.keystore" >> .gitignore
> ```

**Encode keystore sang Base64** (để lưu vào GitHub Secret):
```bash
base64 -i android/app/release.keystore | pbcopy
# Đã copy vào clipboard — paste vào GitHub Secret ANDROID_KEYSTORE_BASE64
```

---

### 1.2 Tạo App trên Google Play Console

> **Quy tắc bắt buộc của Google:** Lần đầu tiên PHẢI upload thủ công qua web UI.
> Fastlane `supply` chỉ hoạt động từ lần upload thứ 2 trở đi.

1. Vào [Google Play Console](https://play.google.com/console)
2. **Create app** → điền thông tin:
   - App name: `Demo App`
   - Default language: `English (United States)`
   - App or game: `App`
   - Free or paid: `Free`
3. Sau khi tạo xong, ghi lại **Package name** hiển thị trong URL (= `com.demo_app`)

---

### 1.3 Tạo Service Account (cho Fastlane `supply`)

Fastlane cần service account để gọi Google Play API.

**Bước A — Google Cloud Console:**
1. Vào [Google Cloud Console](https://console.cloud.google.com)
2. Chọn project liên kết với Google Play Console
3. **IAM & Admin → Service Accounts → Create Service Account**
   - Name: `fastlane-ci`
   - Description: `Fastlane CI/CD access to Google Play`
   - Bỏ qua phần "Grant this service account access to project" — không cần thiết
4. Tab **Keys → Add key → Create new key → JSON** → download `fastlane-ci.json`

**Bước B — Google Play Console:**
1. Vào **Setup (Cài đặt) → API access (Truy cập API)** ← ở account level, không phải app level
2. Tìm service account vừa tạo → **Grant access**
3. Permission: `Release manager` (tối thiểu cần để upload build)

> **⚠️ "Truy cập API" không hiển thị?**
> Xảy ra khi account chưa hoàn thành **Android Developer Verification**.
> Sidebar Play Console sẽ có mục "Xác minh nhà phát triển Android" chưa tick.
> Fix: hoàn thành verification → "Truy cập API" xuất hiện.
>
> **Workaround khi bị blocked:** Nếu service account được tạo trong Cloud project đã link
> với Play Console, nó vẫn có thể connect. Test bằng:
> ```bash
> bundle exec fastlane run validate_play_store_json_key json_key:fastlane-ci.json
> # Output: Successfully established connection to Google Play Store. ✅
> ```

**Bước C — Encode JSON key:**
```bash
base64 -i fastlane-ci.json | pbcopy
# Paste vào GitHub Secret GOOGLE_PLAY_JSON_KEY_BASE64
```

> **Tại sao không lưu path mà lưu Base64?**
> CI runner là ephemeral — không có file system persistent.
> Base64 → decode tại runtime → ghi ra `/tmp/` → xóa sau build.

---

### 1.4 Build AAB và Upload Lần Đầu Thủ Công

Google yêu cầu build đầu tiên phải upload qua web UI.

**Build local:**
```bash
cd android

./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file=app/release.keystore \
  -Pandroid.injected.signing.store.password=YOUR_STORE_PASSWORD \
  -Pandroid.injected.signing.key.alias=demo-app-key \
  -Pandroid.injected.signing.key.password=YOUR_KEY_PASSWORD
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**Upload lên Google Play Console:**
1. **Internal testing → Create new release**
2. Drag & drop file `app-release.aab`
3. **Save → Review release → Start rollout to Internal testing**

Sau khi upload xong, Play Console sẽ hiển thị `versionCode: 1` trong Internal track.
Từ thời điểm này, Fastlane `supply` có thể query được versionCode và upload tiếp.

---

## Phase 2 — Code Changes (YARA pattern)

### 2.1 Thêm `Prod` productFlavor vào `build.gradle`

File: `android/app/build.gradle`

Thêm `flavorDimensions` và `productFlavors` sau block `buildTypes`:

```groovy
flavorDimensions "environment"

productFlavors {
    // Prod: applicationId = "com.demo_app" (không có suffix — đây là app trên Play Store)
    Prod {
        dimension "environment"
    }

    // Dev: applicationId = "com.demo_app.dev" (cài song song với Prod trên device)
    Dev {
        dimension "environment"
        applicationIdSuffix ".dev"
        resValue "string", "app_name", "DemoApp Dev"
    }
}
```

> **Tại sao `Prod` không có `applicationIdSuffix`?**
> Giống YARA: `com.yara.connect.prod` là appId trên Play Store.
> Ở đây `com.demo_app` đã là appId trên Play Store — thêm suffix sẽ tạo app khác.

Sau khi thêm, build variants mới:
- `ProdDebug`, `ProdRelease` ← dùng cho Play Store
- `DevDebug`, `DevRelease` ← dùng cho local development

---

### 2.2 Cập nhật Fastfile — Android `beta` lane

File: `fastlane/Fastfile`

Tìm `lane :beta do` trong `platform :android do` và cập nhật để đọc flavor từ env (giống YARA):

```ruby
lane :beta do
  current_version_code = begin
    google_play_track_version_codes(
      package_name: ENV["APP_IDENTIFIER"],
      track:        "internal",
      json_key:     ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
    ).max
  rescue
    0
  end || 0

  version_code = current_version_code + 1
  version_name = ENV["APP_VERSION"] || "1.0.0"

  # ← THÊM DÒNG NÀY: đọc flavor từ env (YARA pattern)
  flavour = ENV["ANDROID_BUILD_FLAVOUR"] || "Prod"

  UI.message "📦 Building #{flavour} #{version_name} (#{version_code})..."

  gradle(
    task:        "bundle",
    # ← THÊM flavor: flavour
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

  supply(
    package_name:            ENV["APP_IDENTIFIER"],
    track:                   "internal",
    aab:                     lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
    json_key:                ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
    skip_upload_apk:         true,
    skip_upload_images:      true,
    skip_upload_screenshots: true,
    release_status:          "completed",
  )

  UI.success "✅ #{flavour} #{version_name} (#{version_code}) → Play Internal Testing!"
end
```

---

### 2.3 Cập nhật GitHub Actions workflow

File: `.github/workflows/android-beta.yml`

Thêm `ANDROID_BUILD_FLAVOUR` và `GOOGLE_PLAY_JSON_KEY_PATH` vào step `Build & Upload`:

```yaml
# ─── Decode Google Play JSON key ───────────────────────────
- name: Decode Google Play JSON key
  env:
    GOOGLE_PLAY_JSON_KEY_BASE64: ${{ secrets.GOOGLE_PLAY_JSON_KEY_BASE64 }}
  run: |
    echo "$GOOGLE_PLAY_JSON_KEY_BASE64" | base64 --decode > /tmp/play-key.json
    echo "GOOGLE_PLAY_JSON_KEY_PATH=/tmp/play-key.json" >> $GITHUB_ENV

# ─── Fastlane Build + Upload ───────────────────────────────
- name: Build & Upload to Play Internal Testing
  env:
    # Signing
    ANDROID_KEYSTORE_PATH:     ${{ env.ANDROID_KEYSTORE_PATH }}
    ANDROID_KEYSTORE_ALIAS:    ${{ secrets.ANDROID_KEYSTORE_ALIAS }}
    ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    ANDROID_KEY_PASSWORD:      ${{ secrets.ANDROID_KEY_PASSWORD }}
    # Google Play
    GOOGLE_PLAY_JSON_KEY_PATH: ${{ env.GOOGLE_PLAY_JSON_KEY_PATH }}
    APP_IDENTIFIER:            ${{ secrets.APP_IDENTIFIER }}
    APP_VERSION:               ${{ secrets.APP_VERSION }}
    # ← THÊM: YARA pattern — inject environment qua env var
    ANDROID_BUILD_FLAVOUR:     Prod
    SLACK_WEBHOOK_URL:         ${{ secrets.SLACK_WEBHOOK_URL }}
  run: bundle exec fastlane android beta

# ─── Cleanup ───────────────────────────────────────────────
- name: Cleanup secrets
  if: always()
  run: |
    rm -f /tmp/release.keystore
    rm -f /tmp/play-key.json
```

---

## Phase 3 — GitHub Secrets

Vào: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Giá trị | Lấy từ đâu |
|--------|---------|-----------|
| `ANDROID_KEYSTORE_BASE64` | base64 của `release.keystore` | Bước 1.1 |
| `ANDROID_KEYSTORE_ALIAS` | `demo-app-key` | Bước 1.1 |
| `ANDROID_KEYSTORE_PASSWORD` | store password | Bước 1.1 |
| `ANDROID_KEY_PASSWORD` | key password | Bước 1.1 |
| `GOOGLE_PLAY_JSON_KEY_BASE64` | base64 của `fastlane-ci.json` | Bước 1.3 |
| `APP_IDENTIFIER` | `com.demo_app` | package name |
| `APP_VERSION` | `1.0.0` | version hiện tại |
| `SLACK_WEBHOOK_URL` | webhook URL | Slack app settings (optional) |

---

## Phase 4 — Test & Verify

### Test local trước khi push CI

```bash
# Set env vars tạm thời
export ANDROID_KEYSTORE_PATH="android/app/release.keystore"
export ANDROID_KEYSTORE_ALIAS="demo-app-key"
export ANDROID_KEYSTORE_PASSWORD="your_password"
export ANDROID_KEY_PASSWORD="your_password"
export GOOGLE_PLAY_JSON_KEY_PATH="/path/to/fastlane-ci.json"
export APP_IDENTIFIER="com.demo_app"
export APP_VERSION="1.0.0"
export ANDROID_BUILD_FLAVOUR="Prod"

# Dry run — chỉ build, không upload
bundle exec fastlane android build_only

# Nếu build thành công:
bundle exec fastlane android beta
```

### Trigger CI pipeline

```bash
git add android/app/build.gradle fastlane/Fastfile .github/workflows/android-beta.yml
git commit -m "chore: add Prod productFlavor + YARA-style dynamic flavor build"
git push origin main
```

**Theo dõi pipeline:**
1. GitHub repo → **Actions** tab
2. Workflow `Android Beta → Play Internal` đang chạy
3. Kiểm tra từng step — expect ~15-20 phút

**Verify kết quả:**
1. Google Play Console → **Internal testing**
2. Build mới xuất hiện với `versionCode: 2` (lần trước upload thủ công là `1`)
3. Gửi test link cho tester trong group

---

## Flow hoàn chỉnh sau khi setup xong

```
Developer push code → main
         │
         ▼
[android-beta.yml triggered]
 ├── Checkout, Node, Java, Ruby
 ├── npm ci + Gradle cache
 ├── Decode keystore từ GitHub Secret
 ├── Decode Google Play JSON key từ GitHub Secret
 └── fastlane android beta (ANDROID_BUILD_FLAVOUR=Prod)
         │
         ├── query versionCode hiện tại từ Play Store API
         ├── versionCode += 1 (auto increment)
         ├── gradle bundle ProdRelease (ký bằng release.keystore)
         └── supply upload lên Internal Testing
                  │
                  └── Google Play Console
                           └── notify testers qua email

QA test → approve
         │
         ▼
PM/TL → GitHub Actions → "Run workflow" → production.yml
         │
         └── fastlane android production
                  └── supply promote Internal → Production (rollout 10%)
```

---

## Troubleshooting

| Lỗi | Nguyên nhân | Fix |
|-----|-------------|-----|
| `Supply: No AAB found` | flavor name sai trong Fastfile | Kiểm tra `ANDROID_BUILD_FLAVOUR=Prod` (P hoa) |
| `versionCode must be greater than X` | query versionCode fail | Đảm bảo first manual upload đã hoàn thành |
| `Google API: 401 Unauthorized` | Service account thiếu quyền | Kiểm tra lại bước 1.3B — Grant access |
| `Keystore was tampered with, or password was incorrect` | Base64 decode bị lỗi | Re-encode: `base64 -i release.keystore` (không dùng `-w 0` trên macOS) |
| `No matching client found for package name` | `google-services.json` thiếu package | Chưa cần thiết nếu không dùng Firebase SDK |
| `Task 'bundleProdRelease' not found` | `flavorDimensions` thiếu | Gradle sync lại sau khi sửa `build.gradle` |
| `"Truy cập API" không hiển thị trong Play Console` | Account chưa verify danh tính | Hoàn thành "Xác minh nhà phát triển Android" trong sidebar |
| `npm ci: package.json and package-lock.json out of sync` | `package.json` đã sửa nhưng chưa chạy `npm install` | Chạy `npm install` local → commit `package-lock.json` |
| `installDebug is ambiguous` khi `npm run android` | `flavorDimensions` làm mất task generic | Dùng `react-native run-android --mode prodDebug` |
| `ANDROID_APP_IDENTIFIER` vs `APP_IDENTIFIER` | iOS dùng `APP_IDENTIFIER`, Android dùng `ANDROID_APP_IDENTIFIER` | Khai báo 2 secret riêng: `APP_IDENTIFIER=com.tuanvu.demoapp`, `ANDROID_APP_IDENTIFIER=antonio.dev.demo_app` |

---

## Checklist

- [ ] Tạo `release.keystore` + backup an toàn
- [ ] Tạo app trên Google Play Console
- [ ] Tạo service account + download JSON key
- [ ] Upload AAB lần đầu thủ công lên Internal Testing
- [ ] Sửa `android/app/build.gradle` — thêm `Prod` + `Dev` flavor
- [ ] Sửa `fastlane/Fastfile` — thêm `flavor: flavour` vào `android:beta`
- [ ] Sửa `.github/workflows/android-beta.yml` — decode JSON key + inject `ANDROID_BUILD_FLAVOUR=Prod`
- [ ] Thêm 8 GitHub Secrets
- [ ] Push lên `main` → verify CI xanh
- [ ] Google Play Console → Internal Testing → build mới xuất hiện
