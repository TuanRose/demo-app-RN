# rn-cicd — Fastlane + TestFlight + Google Play

**Ngày:** 2026-05-13 | **Bài:** Day 24-25 (làm sớm trước roadmap)

---

## Gotchas

### GitHub Actions: macos-14 runner không có đủ Xcode version cho RN 0.85+

**Triệu chứng:**
```
React Native requires XCode >= 16.1. Found 15.4.
[!] Invalid `Podfile` file: Please upgrade XCode.
Error: Process completed with exit code 1.
```
Fail tại step **Install Pods** — `pod install` đọc Podfile và kiểm tra Xcode version trước khi chạy.

**Root cause:** `macos-14` runner chỉ có Xcode 15.4. React Native 0.85 yêu cầu Xcode ≥ 16.1 (thông qua `use_react_native!` macro trong Podfile).

**Fix:** Đổi runner sang `macos-15` (có Xcode 16.2+):
```yaml
# ❌ Sai
runs-on: macos-14

# ✅ Đúng
runs-on: macos-15
```

**Lưu ý cho tương lai:** Khi nâng RN version, luôn kiểm tra Xcode requirement của version đó rồi chọn runner tương ứng:
- `macos-13` → Xcode 14.x
- `macos-14` → Xcode 15.x  
- `macos-15` → Xcode 16.x

---

### rbenv không active trong terminal mới — fastlane báo Ruby 2.6

**Triệu chứng:**
```
Could not find 'bundler' (2.4.10) required by your Gemfile.lock.
```
Terminal dùng system Ruby `/System/Library/Frameworks/Ruby.framework/Versions/2.6/`
thay vì rbenv Ruby 3.2.2 đã cài.

**Root cause:** rbenv shims không có trong PATH của shell session hiện tại.
`which rbenv` ra path đúng nhưng `ruby --version` vẫn trả về 2.6 — vì rbenv chưa init.

**Chẩn đoán:**
```bash
ruby --version          # nếu ra 2.6.x → lỗi này
which rbenv             # kiểm tra rbenv có không
rbenv versions          # xem Ruby nào đã cài
```

**Fix tạm thời (session hiện tại):**
```bash
export PATH="$HOME/.rbenv/shims:$PATH"
ruby --version          # phải ra 3.2.2
bundle exec fastlane build_only
```

**Fix vĩnh viễn (thêm vào ~/.zshrc):**
```bash
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.zshrc
echo 'eval "$(rbenv init - zsh)"' >> ~/.zshrc
source ~/.zshrc
```

---

### Credentials điền nhầm vào `.env.example` thay vì `.env`

**Triệu chứng:** Secrets (APPLE_ID, App-Specific Password) nằm trong file commit được.

**Rule:**
```
fastlane/.env.example  → placeholder values → COMMIT được
fastlane/.env          → credentials thật   → KHÔNG commit (gitignored)
fastlane/.env.default  → non-secret config  → COMMIT được
```

**Fix:**
```bash
cp fastlane/.env.example fastlane/.env
# Điền giá trị thật vào .env, để placeholder trong .env.example
```

Verify gitignore đang block đúng:
```bash
git check-ignore -v fastlane/.env
```

---

### Pods out of sync sau khi thêm native dependency

**Triệu chứng:**
```
error: The sandbox is not in sync with the Podfile.lock.
Run 'pod install' or update your CocoaPods installation.
** ARCHIVE FAILED **
```

**Root cause:** Thêm package có native code vào `package.json` (vd: `react-native-keychain`, `react-native-app-auth`) nhưng quên chạy `pod install` để link native module vào Xcode project.

**Fix:**
```bash
bundle exec pod install --project-directory=ios
bundle exec fastlane build_only
```

**Quy tắc:** Sau mỗi lần `npm install` package có native code → luôn chạy `pod install` trước khi build.

---

### CI: No signing certificate "iOS Development" found — automatic signing thiếu Development cert

**Triệu chứng:**
```
No signing certificate "iOS Development" found: No "iOS Development" signing certificate
matching team ID "***" with a private key was found. (in target 'demo_app' from project 'demo_app')
** ARCHIVE FAILED **
Exit status: 65
```

**Root cause:** Xcode automatic signing yêu cầu CẢ HAI loại cert ngay cả khi Archive để App Store:
- `Apple Development` → setup signing identity cho toàn bộ build pipeline
- `Apple Distribution` → ký .ipa khi export

CI runner chỉ có Distribution cert (import từ .p12) — thiếu Development cert → fail.

**Tại sao không đơn giản import thêm Development cert?**
Development cert gắn với private key sinh ra trên máy local khi tạo CSR. Không thể export private key của Development cert từ máy khác — mỗi máy/CI runner cần CSR riêng → không scalable.

**Fix: Chuyển sang manual signing**

Thay vì để Xcode tự resolve cert, chỉ định tường minh cert + profile cần dùng:

1. **Export Provisioning Profile** (App Store profile cho `com.tuanvu.demoapp`):
   ```bash
   # Xcode 15+ lưu profile tại path mới (không phải ~/Library/MobileDevice/...)
   base64 -i ~/Library/Developer/Xcode/UserData/Provisioning\ Profiles/5711a9c3-b7a8-4384-af9f-ca28e01837a5.mobileprovision | pbcopy
   # → thêm vào GitHub Secret: BUILD_PROVISION_PROFILE_BASE64
   ```

2. **Thêm step install profile vào workflow** (sau "Import Distribution Certificate"):
   ```yaml
   - name: Install Provisioning Profile
     env:
       BUILD_PROVISION_PROFILE_BASE64: ${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
     run: |
       PP_PATH=$RUNNER_TEMP/profile.mobileprovision
       echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH
       mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
       cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles/
   ```

3. **Cập nhật gym trong Fastfile** — override `CODE_SIGN_STYLE=Manual` + chỉ định profile:
   ```ruby
   gym(
     ...
     xcargs: "CODE_SIGN_STYLE=Manual",
     export_options: {
       method:               "app-store",
       signingStyle:         "manual",
       teamID:               ENV["TEAM_ID"],
       provisioningProfiles: {
         ENV["APP_IDENTIFIER"] => "iOS Team Store Provisioning Profile: com.tuanvu.demoapp",
       },
     },
   )
   ```

**Manual vs Automatic signing trên CI:**

| | Automatic signing | Manual signing (CI) |
|---|---|---|
| Cert cần | Development + Distribution | Distribution only |
| Setup | Xcode tự fetch (cần match) | Pre-install cert + profile |
| Dùng khi | Local dev / có Fastlane match | CI không dùng match |

**Muốn dùng automatic signing trên CI** → cần Fastlane **match** (lưu cả 2 cert vào private git repo encrypted). Không có match, manual signing là approach đúng.

---

### No signing certificate "iOS Distribution" found

**Triệu chứng:**
```
error: exportArchive No signing certificate "iOS Distribution" found
error: exportArchive No profiles for 'com.tuanvu.demoapp' were found
** EXPORT FAILED **
```

Note: `** ARCHIVE SUCCEEDED **` — code compile OK, chỉ fail ở bước export vì thiếu certificate.

**Root cause:** Distribution Certificate và App Store Provisioning Profile chưa được tạo. Đây là lần deploy đầu tiên nên Keychain chưa có certificate nào.

**Fix — 2 bước:**

1. **Tạo certificate lần đầu qua Xcode** (chỉ cần làm 1 lần):
   - Mở `ios/demo_app.xcworkspace`
   - Target `demo_app` → Signing & Capabilities
   - Đảm bảo: **Automatically manage signing** = ON, **Team** = account đã active
   - Chuyển device sang **Any iOS Device (arm64)** (không phải simulator)
   - Menu **Product** → **Archive** → để Xcode tự tạo Distribution Certificate + Profile
   - Khi Organizer mở ra → certificate đã được tạo và lưu vào Keychain

2. **Thêm `-allowProvisioningUpdates` vào Fastfile** (để lần sau fastlane tự xử lý):
   ```ruby
   gym(
     ...
     xcargs: "-allowProvisioningUpdates",
   )
   ```

Sau khi Xcode Archive thành công một lần → `bundle exec fastlane build_only` sẽ pass.

---

### Upload thất bại — Missing app icon / CFBundleIconName

**Triệu chứng:**
```
UPLOAD FAILED with 4 errors
Missing required icon file. The bundle does not contain an app icon for
iPhone / iPod Touch of exactly '120x120' pixels
Missing required icon file... iPad '167x167'
Missing required icon file... iPad '152x152'
Missing Info.plist value. A value for the Info.plist key 'CFBundleIconName' is missing
```

Note: Build/Archive **thành công**, chỉ fail ở bước `pilot` (upload lên App Store Connect).

**Root cause:** 2 vấn đề song song:
1. `AppIcon.appiconset/Contents.json` có entries nhưng không có `"filename"` key → không trỏ tới file PNG nào. Các file PNG thực tế cũng không tồn tại.
2. `CFBundleIconName` thiếu trong `Info.plist` — Apple bắt buộc key này từ iOS 11+.

**Fix:**

1. **Tạo PNG cho tất cả kích thước cần thiết** (dùng script Python hoặc tool online):
   ```
   ios/demo_app/Images.xcassets/AppIcon.appiconset/
   ├── Icon-20.png    (20×20)
   ├── Icon-29.png    (29×29)
   ├── Icon-40.png    (40×40)
   ├── Icon-58.png    (58×58)
   ├── Icon-60.png    (60×60)
   ├── Icon-76.png    (76×76)
   ├── Icon-80.png    (80×80)
   ├── Icon-87.png    (87×87)
   ├── Icon-120.png   (120×120)
   ├── Icon-152.png   (152×152)
   ├── Icon-167.png   (167×167)
   ├── Icon-180.png   (180×180)
   └── Icon-1024.png  (1024×1024)
   ```

2. **Cập nhật `Contents.json`** — thêm `"filename"` vào mỗi entry + thêm iPad entries (bị thiếu hoàn toàn trong file gốc):
   ```json
   { "filename": "Icon-120.png", "idiom": "iphone", "scale": "2x", "size": "60x60" }
   { "filename": "Icon-152.png", "idiom": "ipad",   "scale": "2x", "size": "76x76" }
   { "filename": "Icon-167.png", "idiom": "ipad",   "scale": "2x", "size": "83.5x83.5" }
   ```

3. **Thêm `CFBundleIconName` vào `ios/demo_app/Info.plist`:**
   ```xml
   <key>CFBundleIconName</key>
   <string>AppIcon</string>
   ```

**Tool tạo icon thật:** https://appicon.co — upload 1 file 1024×1024, tải về toàn bộ kích thước, copy đè vào `AppIcon.appiconset/`.

**Quy tắc:** RN project mới không có icon sẵn — phải setup trước lần deploy đầu tiên.

---

## Production CI/CD — GitHub Actions + Certificate Export + API Key

> **Approach này** phù hợp solo developer — không cần repo riêng cho certificates.
> Approach **match** (cho team) xem cuối file — TODO: implement sau.

### Tại sao cần từng thứ (WHY)

**WHY GitHub Actions?**
Build tự động khi push lên GitHub — không cần mở máy local để deploy. GitHub cung cấp macOS runner có sẵn Xcode, build iOS được mà không cần máy Mac riêng.

**WHY App Store Connect API Key (thay App-Specific Password)?**
App-Specific Password yêu cầu 2FA interactive — CI không có màn hình để nhập OTP nên bị block. API Key là machine-to-machine auth, không cần 2FA, không expire, stable cho CI.

**WHY phải có Distribution Certificate riêng?**
Apple có 2 loại cert với mục đích khác nhau:
- `Apple Development` → chạy app trên device thật khi dev (debug)
- `Apple Distribution` → ký .ipa để upload lên App Store Connect / TestFlight

Xcode automatic signing với `-allowProvisioningUpdates` chỉ tạo **Development** cert cho local build. **Distribution** cert phải tạo thủ công lần đầu qua Apple Developer portal vì nó đại diện cho danh tính của developer/team khi phân phối app.

**WHY export .p12 thay vì để Xcode tự tạo cert trên CI?**
GitHub Actions runner là máy ảo sạch — Keychain trống, không có Distribution cert. Xcode không thể tạo cert mới tự động trên CI vì quá trình tạo cert cần đăng nhập Apple ID + xác nhận 2FA (interactive). Giải pháp: export cert từ Keychain local → base64 → GitHub Secret → CI decode và import vào Keychain tạm của runner trước khi build.

**WHY cần Provisioning Profile?**
Profile là file Apple ký, liên kết 3 thứ: Distribution Certificate + App ID (`com.tuanvu.demoapp`) + danh sách capabilities (push notification, etc.). Xcode cần profile để biết app này được phép distribute qua kênh nào (App Store, Ad Hoc, Enterprise).

---

### Tổng quan kiến trúc

```
push lên main
    ↓
GitHub Actions trigger (macos-15 runner)
    ↓
1. Checkout code + setup Node 20 + Ruby 3.3
2. npm ci + bundle exec pod install
3. Decode BUILD_CERTIFICATE_BASE64  → import .p12 vào Keychain của runner
4. Decode BUILD_PROVISION_PROFILE_BASE64 → copy .mobileprovision vào đúng thư mục
5. gym → build .ipa (dùng cert + profile vừa import)
6. pilot → upload TestFlight (auth bằng ASC API Key, không cần 2FA)
```

---

### Current (manual) vs Production

| | Manual (hiện tại) | Production (CI) |
|---|---|---|
| **Trigger** | Chạy tay `npm run deploy:ios:beta` | Auto khi push lên `main` |
| **Code signing** | Xcode tự quản lý (local Keychain) | Import cert từ GitHub Secret |
| **Auth với Apple** | App-Specific Password (cần 2FA) | ASC API Key (không cần 2FA) |
| **Build machine** | MacBook local | GitHub Actions macOS runner |
| **Secrets** | `fastlane/.env` local | GitHub Secrets |

---

### Q&A — Cert, Provisioning Profile và API Key lấy từ đâu?

**Q: Khi build và deploy local, Xcode/Fastlane lấy cert và Provisioning Profile ở đâu?**

| Thứ | Lấy từ đâu | Dạng lưu |
|---|---|---|
| Distribution cert | `login.keychain` của macOS | Cert + private key, xem trong Keychain Access → My Certificates |
| Provisioning Profile | `~/Library/Developer/Xcode/UserData/Provisioning Profiles/*.mobileprovision` | File .mobileprovision Xcode tự fetch về khi Archive lần đầu |
| API Key (.p8) | File .p8 lưu tùy ý trên disk, trỏ path vào `.env` | Chỉ dùng bởi `pilot` để upload — không liên quan đến signing |

---

**Q: Khi CI/CD dùng manual signing, cert và Provisioning Profile lấy từ đâu?**

| Thứ | Lấy từ đâu | Cơ chế |
|---|---|---|
| Distribution cert | GitHub Secret `BUILD_CERTIFICATE_BASE64` | Workflow decode .p12 → `security import` vào Keychain tạm của runner |
| Provisioning Profile | GitHub Secret `BUILD_PROVISION_PROFILE_BASE64` | Workflow decode .mobileprovision → copy vào `~/Library/MobileDevice/Provisioning Profiles/` |
| API Key (.p8) | GitHub Secret `ASC_KEY_CONTENT` | Fastlane dùng `app_store_connect_api_key` → pass cho `pilot` khi upload |

CI phải tự "dựng" lại môi trường signing mà máy local có sẵn — vì runner là máy ảo sạch, reset sau mỗi job.

```
LOCAL                              CI (manual signing)
─────────────────────              ──────────────────────────────────
Keychain (login.keychain)    ←→    Keychain tạm ← .p12 decode từ Secret
  └── Apple Distribution cert        └── Apple Distribution cert

~/Library/Developer/Xcode/    ←→   ~/Library/MobileDevice/
  UserData/Provisioning Profiles/     Provisioning Profiles/
  └── *.mobileprovision               └── profile.mobileprovision ← Secret

fastlane/.env                  ←→   GitHub Secrets
  └── ASC_KEY_FILEPATH                └── ASC_KEY_CONTENT (nội dung .p8)
       → path đến file .p8 local
```

---

**Q: Fastfile cấu hình API Key như thế nào để chạy được cả local lẫn CI?**

Local dùng `key_filepath` (path đến file .p8), CI dùng `key_content` (nội dung .p8 từ Secret). Fastlane ưu tiên `key_content` nếu cả hai đều được truyền — nên một Fastfile dùng được cho cả hai môi trường:

```ruby
api_key = app_store_connect_api_key(
  key_id:       ENV["ASC_KEY_ID"],
  issuer_id:    ENV["ASC_ISSUER_ID"],
  # WHY: CI set ASC_KEY_CONTENT (content), local set ASC_KEY_FILEPATH (path)
  # Fastlane ưu tiên key_content nếu có — không cần if/else
  key_content:  ENV["ASC_KEY_CONTENT"],   # CI: có giá trị
  key_filepath: ENV["ASC_KEY_FILEPATH"],  # Local: có giá trị
)
```

`fastlane/.env` (local):
```bash
ASC_KEY_FILEPATH=/Users/antonio/secrets/AuthKey_J3KNUM7683.p8
# ASC_KEY_CONTENT không set
```

GitHub Secrets (CI):
```
ASC_KEY_CONTENT = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
# ASC_KEY_FILEPATH không set
```

---

### Bước 1 — Tạo App Store Connect API Key ✅

**Đã làm:** 2026-05-14

**Key ID:** `J3KNUM7683`
**Issuer ID:** `ba2d3599-ee7e-4eda-9acb-12200186ab4f`
**File .p8:** Download 1 lần duy nhất — lưu an toàn ngoài repo

**Cách tạo:**
1. App Store Connect → **Users and Access** → **Integrations** → **App Store Connect API**
2. Nhấn **"+"** → Name: `fastlane-ci` → Role: **App Manager**
3. Download `.p8` ngay (chỉ download được **1 lần**)

---

### Bước 2 — Tạo Distribution Certificate ✅

**Đã làm:** 2026-05-14

**Kết quả:**
```
"Apple Distribution: Tuan Vu Minh (C4JH9DSY4X)"
```

**Vấn đề gặp phải:** Chạy `fastlane ios build_only` rồi check Keychain vẫn không thấy Distribution cert — vì lane này chỉ tạo Development cert cho local run. Distribution cert phải tạo thủ công.

**Cách tạo (chỉ làm 1 lần, cert valid 1 năm):**
1. Mở Keychain Access → menu bar **Keychain Access** → **Certificate Assistant** → **Request a Certificate from a Certificate Authority...**
2. Điền email Apple ID, Common Name tùy ý → chọn **Saved to disk** → lưu `.certSigningRequest`
3. [developer.apple.com](https://developer.apple.com) → **Certificates** → **+** → chọn **Apple Distribution**
4. Upload `.certSigningRequest` → Download `.cer`
5. Double-click `.cer` → import vào Keychain
6. Verify: `security find-identity -v -p codesigning` → thấy `Apple Distribution: ...`

---

### Quản lý Certificates — giới hạn và lưu ý

**Giới hạn (Apple Developer Program):**
- `Apple Distribution` manual: tối đa **3 cert per team**
- `Apple Development` manual: tối đa **2 per developer**
- Nếu đủ giới hạn → revoke cert cũ trước khi tạo mới

**Revoke cert:**
- developer.apple.com → Certificates → click cert → **Revoke**
- Revoke cert cũ **không ảnh hưởng** app đã install trên device
- Chỉ ảnh hưởng: không ký/build được build mới bằng cert đó nữa

**Vượt giới hạn mà không revoke:** Apple chặn ngay tại bước tạo, báo lỗi và không cho submit CSR — bắt buộc revoke ít nhất 1 cert cũ trước.

**Tái sử dụng cho nhiều app:** 1 Distribution cert dùng được cho **tất cả app trong cùng team** — cert đại diện cho danh tính developer/team, không gắn với app cụ thể. App ID (`com.tuanvu.demoapp`) được kiểm soát bởi Provisioning Profile, không phải cert. Setup chuẩn: **1 cert + nhiều profile** (mỗi profile cho 1 app).

**Distribution Managed vs Distribution (manual):**
- `Distribution Managed` — Xcode tự tạo khi Archive với automatic signing. Private key nằm trong Keychain nhưng khó export đáng tin cậy.
- `Distribution` (manual) — tạo thủ công qua portal với CSR. Private key do máy local sinh ra → export `.p12` được đầy đủ.
- **Cho CI/CD: luôn dùng cert manual** — predictable, exportable, kiểm soát được ngày expire.

---

### Bước 3 — Export Distribution Certificate (.p12) ⬜

Distribution cert cần export kèm **private key** (dạng `.p12`) để CI có thể import vào Keychain của runner. Chỉ export `.cer` không đủ — `.cer` chỉ có public cert, thiếu private key thì không ký được.

**Cách export:**
1. Mở Keychain Access → **login** keychain → tab **My Certificates**
2. Tìm `Apple Distribution: Tuan Vu Minh` → right-click → **Export**
3. Chọn format **Personal Information Exchange (.p12)** → lưu ra Desktop: `distribution.p12`
4. Đặt password bảo vệ file (lưu lại — cần cho GitHub Secret `P12_PASSWORD`)

**Base64 encode để lưu làm GitHub Secret:**
```bash
base64 -i ~/Desktop/distribution.p12 | pbcopy
# → paste vào GitHub Secret: BUILD_CERTIFICATE_BASE64
```

---

### Bước 4 — Export Provisioning Profile ✅ (bỏ qua — không cần)

**Vấn đề gặp phải:** Xcode 15+ với automatic signing không lưu `.mobileprovision` ra file local — folder `~/Library/MobileDevice/Provisioning Profiles/` trống hoàn toàn.

**Giải pháp:** Không cần export profile riêng. Vì CI đã có:
- Distribution cert (.p12) trong Keychain → có signing key
- ASC API Key → authenticate được với Apple

Dùng `-allowProvisioningUpdates` trong `gym` — Xcode tự download đúng Provisioning Profile từ Apple trong lúc build. API Key xác thực, Xcode fetch profile về tự động.

```
CI runner:
1. Import .p12 vào Keychain  → có signing key
2. gym + -allowProvisioningUpdates + API Key  → Xcode tự download profile
3. pilot + API Key  → upload TestFlight (không cần 2FA)
```

---

### Bước 5 — Cập nhật Fastfile ✅

Giữ `-allowProvisioningUpdates`, thêm API Key để pilot không dùng App-Specific Password nữa:

```ruby
platform :ios do
  lane :beta do
    api_key = app_store_connect_api_key(
      key_id:      ENV["ASC_KEY_ID"],
      issuer_id:   ENV["ASC_ISSUER_ID"],
      key_content: ENV["ASC_KEY_CONTENT"],
    )

    increment_build_number(xcodeproj: "ios/demo_app.xcodeproj")

    gym(
      scheme:           "demo_app",
      workspace:        "ios/demo_app.xcworkspace",
      configuration:    "Release",
      export_method:    "app-store",
      output_directory: "./build",
      output_name:      "demo_app.ipa",
      include_bitcode:  false,
      # WHY: kết hợp với API Key, Xcode tự download Provisioning Profile từ Apple
      xcargs:           "-allowProvisioningUpdates",
    )

    pilot(
      api_key:                           api_key,
      ipa:                               "./build/demo_app.ipa",
      skip_waiting_for_build_processing: true,
      distribute_external:               false,
    )

    UI.success "✅ iOS: Upload thành công!"
  end
end
```

---

### Bước 6 — GitHub Actions Workflow ✅

File: `.github/workflows/deploy-testflight.yml`

**Lưu ý:** trigger branch đang set là `learn_deployed_app_production` (branch học tập) thay vì `main` — đổi lại thành `main` khi merge vào production.

```yaml
name: Deploy to TestFlight

on:
  push:
    branches: [learn_deployed_app_production]  # đổi thành [main] khi production

jobs:
  deploy:
    runs-on: macos-15

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.3'
          bundler-cache: true

      - name: Install JS deps
        run: npm ci

      - name: Cache CocoaPods
        uses: actions/cache@v4
        with:
          path: ios/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}

      - name: Install Pods
        run: bundle exec pod install --project-directory=ios

      - name: Import Distribution Certificate
        env:
          BUILD_CERTIFICATE_BASE64: ${{ secrets.BUILD_CERTIFICATE_BASE64 }}
          P12_PASSWORD:             ${{ secrets.P12_PASSWORD }}
          KEYCHAIN_PASSWORD:        ${{ secrets.KEYCHAIN_PASSWORD }}
        run: |
          CERT_PATH=$RUNNER_TEMP/distribution.p12
          KEYCHAIN_PATH=$RUNNER_TEMP/app-signing.keychain-db

          echo -n "$BUILD_CERTIFICATE_BASE64" | base64 --decode -o $CERT_PATH

          # Tạo keychain tạm — runner sạch không có keychain sẵn
          security create-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security set-keychain-settings -lut 21600 $KEYCHAIN_PATH
          security unlock-keychain -p "$KEYCHAIN_PASSWORD" $KEYCHAIN_PATH
          security import $CERT_PATH -P "$P12_PASSWORD" -A -t cert -f pkcs12 -k $KEYCHAIN_PATH
          security list-keychain -d user -s $KEYCHAIN_PATH

      - name: Install Provisioning Profile
        env:
          BUILD_PROVISION_PROFILE_BASE64: ${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
        run: |
          PP_PATH=$RUNNER_TEMP/profile.mobileprovision
          echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH
          mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
          cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles/

      - name: Deploy to TestFlight
        env:
          ASC_KEY_ID:              ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID:           ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_CONTENT:         ${{ secrets.ASC_KEY_CONTENT }}
          APP_IDENTIFIER:          ${{ secrets.APP_IDENTIFIER }}
          TEAM_ID:                 ${{ secrets.TEAM_ID }}
          PROVISIONING_PROFILE_NAME: ${{ secrets.PROVISIONING_PROFILE_NAME }}
        run: bundle exec fastlane ios beta
```

---

### Bước 7 — GitHub Secrets ✅

**Đã thêm:** 2026-05-14

Settings → Secrets and variables → Actions → New repository secret:

| Secret | Lấy từ đâu | Nhạy cảm |
|---|---|---|
| `BUILD_CERTIFICATE_BASE64` | base64 file `distribution.p12` | ✅ SECRET |
| `P12_PASSWORD` | Password đặt khi export .p12 | ✅ SECRET |
| `KEYCHAIN_PASSWORD` | Đặt tùy ý (chỉ dùng trong runner) | ✅ SECRET |
| `ASC_KEY_ID` | `J3KNUM7683` | ⚠️ |
| `ASC_ISSUER_ID` | `ba2d3599-ee7e-4eda-9acb-12200186ab4f` | ⚠️ |
| `ASC_KEY_CONTENT` | Toàn bộ nội dung file `.p8` | ✅ SECRET |
| `APP_IDENTIFIER` | `com.tuanvu.demoapp` | ⚠️ |
| `TEAM_ID` | `C4JH9DSY4X` | ⚠️ |

---

### Thứ tự triển khai

```
✅ Bước 1 — Tạo App Store Connect API Key
✅ Bước 2 — Tạo Distribution Certificate
✅ Bước 3 — Export .p12 từ Keychain + base64 encode
✅ Bước 4 — Export Provisioning Profile (bỏ qua — Xcode tự download qua API Key)
✅ Bước 5 — Cập nhật Fastfile (API Key + -allowProvisioningUpdates)
✅ Bước 6 — Tạo GitHub Actions workflow (trigger: learn_deployed_app_production)
✅ Bước 7 — Thêm GitHub Secrets (8/8)
🔄 Bước 8 — Commit + push → trigger CI → đã fix runner (macos-14→15), đang verify tiếp
```

---

## Android — Fastlane + Google Play

### Cấu trúc Fastfile (dual platform)

Fastfile dùng `platform` blocks để tách iOS và Android — cùng một file, hai nền tảng:

```ruby
platform :ios do
  lane :beta do ... end        # fastlane ios beta
  lane :build_only do ... end  # fastlane ios build_only
end

platform :android do
  lane :beta do ... end        # fastlane android beta
  lane :build_only do ... end  # fastlane android build_only
end
```

### Commands

```bash
# Deploy
npm run deploy:ios:beta          # build .ipa + upload TestFlight
npm run deploy:android:beta      # build .aab + upload Google Play Internal

# Build only (không upload — test local)
npm run deploy:ios:build
npm run deploy:android:build

# Xem tất cả lanes
npm run deploy:lanes
```

### Cơ chế phân biệt platform

```
bundle exec fastlane  ios  beta
                      ↑    ↑
                      │    └── lane :beta trong block platform :ios
                      └─────── vào đúng platform block
```

### Android prerequisites (trước khi `android beta` chạy được)

**1. Tạo Release Keystore** (1 lần duy nhất, lưu file `.keystore` an toàn):
```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias <your-alias> \
  -keyalg RSA -keysize 2048 -validity 10000
```

Điền vào `fastlane/.env`:
```
ANDROID_KEYSTORE_PATH=/absolute/path/to/release.keystore
ANDROID_KEYSTORE_ALIAS=your-alias
ANDROID_KEYSTORE_PASSWORD=your-store-password
ANDROID_KEY_PASSWORD=your-key-password
```

**2. Tạo Google Play service account** (để `supply` upload được):
1. Google Play Console > **Setup** > **API access**
2. Link với Google Cloud project → **Create service account**
3. Grant role: **Release Manager**
4. Download JSON key → lưu path vào `.env`:
```
GOOGLE_PLAY_JSON_KEY_PATH=/path/to/google-play-key.json
```

**3. Upload thủ công lần đầu** qua Google Play Console (APK/AAB):
- `supply` chỉ hoạt động từ lần upload thứ 2 trở đi
- Tương tự iOS: phải Archive qua Xcode 1 lần trước khi Fastlane tự chạy

### Appfile — dual platform

```ruby
# iOS
app_identifier ENV["APP_IDENTIFIER"]
apple_id       ENV["APPLE_ID"]
team_id        ENV["TEAM_ID"]

# Android — reuse APP_IDENTIFIER (same bundle ID)
package_name   ENV["APP_IDENTIFIER"]
```

---

## Security — phân loại credentials

| Biến | Nhạy cảm | Lưu ở đâu |
|---|---|---|
| `APP_IDENTIFIER` | ⚠️ (muốn ẩn) | `.env` |
| `TEAM_ID` | ⚠️ (muốn ẩn) | `.env` |
| `APPLE_ID` | ⚠️ (personal info) | `.env` |
| `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` | ✅ SECRET | `.env` |
| `ANDROID_KEYSTORE_PASSWORD` | ✅ SECRET | `.env` |
| `ANDROID_KEY_PASSWORD` | ✅ SECRET | `.env` |
| `GOOGLE_PLAY_JSON_KEY_PATH` | ✅ SECRET (path tới file key) | `.env` |

App-Specific Password chỉ hiển thị **một lần** khi tạo — không xem lại được.
Nếu mất → revoke và tạo mới tại `appleid.apple.com > Sign-In & Security`.

File `.keystore` và Google Play JSON key — **backup riêng**, mất là phải tạo lại từ đầu.

---

## Fastlane match (team cert management) ✅

**Khi nào dùng:** ≥ 2 developer cần share cùng Distribution Certificate — tránh "works on my machine".

**Cơ chế:** match lưu cert + provisioning profile vào **private git repo riêng**, mã hóa bằng passphrase. Mọi máy (dev + CI) đều fetch từ đó thay vì tự quản lý cert riêng.

```
[Apple Developer Portal]
        ↓ match init/appstore (1 lần)
[Private cert repo — encrypted]
        ↓ match readonly (mỗi lần build)
[CI Runner / Local Machine]
```

---

### Setup (1 lần duy nhất)

**1. Tạo private GitHub repo** cho certs (repo rỗng, private):
```
github.com/<you>/demo-app-certs
```

**2. Tạo GitHub Personal Access Token (PAT)** với scope `repo`:
- GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
- Permissions: Contents (read/write) trên repo `demo-app-certs`

**3. Thêm 3 GitHub Secrets mới** vào repo chính (`RN-Claude-AI`):

| Secret | Giá trị |
|---|---|
| `MATCH_GIT_URL` | `https://github.com/<you>/demo-app-certs.git` |
| `MATCH_PASSWORD` | Passphrase tự chọn (dùng để encrypt/decrypt) |
| `MATCH_GIT_BASIC_AUTH` | `<github-username>:<PAT>` |

**4. Init match và tạo cert lần đầu** (chạy local 1 lần):
```bash
# Thêm vào fastlane/.env:
MATCH_GIT_URL=https://github.com/<you>/demo-app-certs.git
MATCH_PASSWORD=your-passphrase

# Chạy để init Matchfile và push cert lên repo:
bundle exec fastlane match init        # chọn "git", nhập URL
bundle exec fastlane ios sync_certs    # tạo cert + profile, push lên cert repo (encrypted)
```

Sau bước này, cert repo sẽ có cấu trúc:
```
demo-app-certs/
├── certs/
│   └── distribution/
│       ├── <hash>.cer
│       └── <hash>.p12  ← encrypted
└── profiles/
    └── appstore/
        └── AppStore_com.tuanvu.demoapp.mobileprovision  ← encrypted
```

---

### Cách hoạt động trên CI

Workflow không còn cần bước "Import Distribution Certificate" và "Install Provisioning Profile" thủ công. `match(readonly: true)` trong Fastfile tự:
1. Clone cert repo (dùng `MATCH_GIT_BASIC_AUTH`)
2. Decrypt cert + profile (dùng `MATCH_PASSWORD`)
3. Import cert vào keychain tạm
4. Install provisioning profile

**Secrets CI cần** (cũ + mới):

| Secret | Vai trò |
|---|---|
| `ASC_KEY_ID` | App Store Connect API |
| `ASC_ISSUER_ID` | App Store Connect API |
| `ASC_KEY_CONTENT` | App Store Connect API |
| `APP_IDENTIFIER` | Bundle ID |
| `TEAM_ID` | Apple Team ID |
| `MATCH_GIT_URL` | URL của cert repo |
| `MATCH_PASSWORD` | Decrypt cert repo |
| `MATCH_GIT_BASIC_AUTH` | Auth để clone cert repo |

**Secrets không còn cần** (có thể xóa):
- ~~`BUILD_CERTIFICATE_BASE64`~~ — match quản lý
- ~~`P12_PASSWORD`~~ — match quản lý
- ~~`KEYCHAIN_PASSWORD`~~ — match quản lý
- ~~`BUILD_PROVISION_PROFILE_BASE64`~~ — match quản lý

---

### Fastfile — các lanes liên quan

```ruby
# Sync cert một lần khi setup máy mới hoặc cert hết hạn
lane :sync_certs do
  api_key = app_store_connect_api_key(...)
  match(type: "appstore", readonly: false, api_key: api_key, app_identifier: ENV["APP_IDENTIFIER"])
end

# Beta lane — match readonly trên CI
lane :beta do
  api_key = app_store_connect_api_key(...)
  # ... increment_build_number ...
  match(type: "appstore", readonly: true, api_key: api_key, app_identifier: ENV["APP_IDENTIFIER"])
  gym(scheme: "demo_app", workspace: "ios/demo_app.xcworkspace", ...)
  pilot(api_key: api_key, ...)
end
```

---

### So sánh: Manual signing vs Match

| | Manual signing (cũ) | Fastlane match (mới) |
|---|---|---|
| Cert lưu ở | GitHub Secrets (base64) | Private git repo (encrypted) |
| Profile lưu ở | GitHub Secrets (base64) | Private git repo (encrypted) |
| Workflow steps | Import cert + Install profile thủ công | Không cần — match lo |
| Thêm dev mới | Copy/share cert thủ công | Chạy `match readonly: false` |
| Cert hết hạn | Tạo lại + update Secrets | Chạy `sync_certs` |
| Phù hợp | Solo dev, không có cert repo | Team, nhiều app, long-term |
