# iOS QA Local Build Practice

> **Mục tiêu:** Build và chạy QA variant của iOS app trên local —
> kiểm tra bundle ID riêng, display name "DemoApp QA", và env file `.env.qa`
> hoạt động đúng trước khi trigger CI.

---

## Cấu trúc QA build đã setup

| Thành phần | Giá trị |
|---|---|
| Bundle ID | `com.tuanvu.demoapp.qa` |
| Display name | `DemoApp QA` |
| Scheme | `demo_app-QA` |
| Build config (debug) | `Debug-QA` |
| Build config (release) | `Release-QA` |
| Env file | `.env.qa` |
| App icon | Badge "QA-x.x.x-orange" stamp lúc CI build |

---

## Chạy QA build trên Simulator (local debug)

```bash
# Chạy Metro bundler
npm start

# Build + chạy trên simulator với scheme QA
npx react-native run-ios --scheme "demo_app-QA" --configuration "Debug-QA"
```

App sẽ install song song với app production (khác bundle ID) — không overwrite nhau.

**Verify:**
- [ ] App icon hiển thị đúng (chưa có badge vì badge chỉ stamp trên CI)
- [ ] Display name dưới icon: **DemoApp QA** (không phải finTrackApp)
- [ ] App production vẫn còn trên simulator — 2 app cùng tồn tại

---

## Chạy QA build trên device thật (local ad-hoc)

Cần device đã đăng ký UDID trong Apple Developer Portal.

```bash
# Sync profile ad-hoc cho QA bundle ID (chỉ cần chạy lần đầu hoặc khi profile hết hạn)
APP_IDENTIFIER=com.tuanvu.demoapp.qa bundle exec fastlane ios sync_certs

# Build ad-hoc IPA (không upload)
bundle exec fastlane ios adhoc
# → output: build/ios/demo_app_adhoc.ipa  (dùng bundle ID production)
```

> Nếu muốn build ad-hoc IPA cho QA bundle ID riêng, dùng lệnh gym trực tiếp:

```bash
bundle exec gym \
  --scheme "demo_app-QA" \
  --workspace "ios/demo_app.xcworkspace" \
  --configuration "Release-QA" \
  --export_method "ad-hoc" \
  --output_directory "./build/ios" \
  --output_name "demo_app_qa_adhoc.ipa" \
  --xcargs "CODE_SIGN_STYLE=Manual PROVISIONING_PROFILE_SPECIFIER='match AdHoc com.tuanvu.demoapp.qa' CODE_SIGN_IDENTITY='iPhone Distribution' ENVFILE=.env.qa"
```

---

## Chạy full distribute_qa lane (local)

Giống CI — build 2 IPA → upload TestFlight + Firebase.

**Yêu cầu:** `fastlane/.env` phải có đủ các biến:

```bash
# Biến cần có trong fastlane/.env
QA_APP_IDENTIFIER=com.tuanvu.demoapp.qa
FIREBASE_IOS_QA_APP_ID=1:xxxxxxxxxx:ios:xxxxxxxxxxxxxxxx   # từ Firebase Console
FIREBASE_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx       # từ firebase login:ci
APP_VERSION=1.0.0
```

```bash
bundle exec fastlane ios distribute_qa
```

**Flow lane chạy:**
1. Query build number từ ASC → increment
2. Stamp badge "QA-1.0.0-orange" lên icon (chỉ trong build dir, không commit)
3. `match appstore` → `gym app-store` → `pilot` (TestFlight)
4. `match adhoc` → `gym ad-hoc` → `firebase_app_distribution`

---

## Kiểm tra env file `.env.qa`

`.env.qa` được inject vào build qua `xcargs: "ENVFILE=.env.qa"` trong `gym`.
File này cần tồn tại ở root của project (cạnh `package.json`).

```bash
# Tạo .env.qa nếu chưa có (gitignored)
cp .env.example .env.qa
# Điền các giá trị QA: API endpoint, feature flags, v.v.
```

Kiểm tra `.env.qa` được đọc đúng: thêm log tạm trong app code, chạy `Debug-QA` scheme, verify giá trị xuất hiện.

---

## Troubleshooting thường gặp

**`gym` báo "Provisioning profile not found"**
```bash
# Re-sync profile
APP_IDENTIFIER=com.tuanvu.demoapp.qa bundle exec fastlane ios sync_certs
```

**Xcode không thấy scheme `demo_app-QA`**
- Scheme phải là shared: `ios/demo_app.xcodeproj/xcshareddata/xcschemes/demo_app-QA.xcscheme`
- Mở Xcode → Product → Scheme → Manage Schemes → tick "Shared" nếu chưa tick

**App không hiển thị tên "DemoApp QA"**
- Kiểm tra `DISPLAY_NAME` trong build settings của target `demo_app`, configuration `Debug-QA`
- Kiểm tra `CFBundleDisplayName` trong `Info.plist` là `$(DISPLAY_NAME)` (không phải hardcode)

**2 app không cùng tồn tại trên simulator**
- Bundle ID phải khác nhau: production `com.tuanvu.demoapp`, QA `com.tuanvu.demoapp.qa`
- Nếu trùng → app mới overwrite app cũ

---

## CI trigger

Push lên branch `release/ios` → `.github/workflows/ios-qa.yml` tự động chạy.

```bash
git push origin release/ios
```

Manual trigger: GitHub → Actions → "iOS QA → TestFlight + Firebase" → Run workflow.
