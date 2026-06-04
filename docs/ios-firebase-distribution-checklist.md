# iOS Firebase App Distribution — Setup Checklist

> Checklist này dùng lại khi tạo môi trường mới (staging, UAT, v.v.).
> Thứ tự quan trọng — một số bước là prereq của bước sau.

---

## Phase 1 — Xcode Project

- [ ] **Build Configurations**: Xcode → Project → Info → Configurations
  - Duplicate `Debug` → `Debug-{ENV}` (vd `Debug-QA`)
  - Duplicate `Release` → `Release-{ENV}` (vd `Release-QA`)

- [ ] **Bundle ID riêng**: trong `project.pbxproj`, target `demo_app`, cả 2 config mới:
  ```
  PRODUCT_BUNDLE_IDENTIFIER = com.tuanvu.demoapp.{env}
  ```

- [ ] **Display name riêng**: cùng chỗ trên:
  ```
  DISPLAY_NAME = "DemoApp {ENV}"
  ```

- [ ] **Info.plist**: đổi `CFBundleDisplayName` thành `$(DISPLAY_NAME)` nếu chưa có

- [ ] **xcconfigs** (optional, cho env file):
  ```
  ios/xcconfigs/{ENV}.xcconfig       → ENVFILE = .env.{env}
  ios/xcconfigs/Debug-{ENV}.xcconfig → #include "{ENV}.xcconfig"
  ios/xcconfigs/Release-{ENV}.xcconfig
  ```

- [ ] **Scheme `demo_app-{ENV}`** (Shared — bắt buộc để CI thấy):
  - Duplicate scheme `demo_app` → đổi tên
  - Run/Test/Analyze → `Debug-{ENV}`
  - Archive/Profile → `Release-{ENV}`
  - Tick **Shared** ✅

---

## Phase 2 — Apple Developer Portal & App Store Connect

> ⚠️ Thứ tự bắt buộc: Developer Portal → App Store Connect (không đảo ngược)

- [ ] **Developer Portal** — đăng ký bundle ID mới:
  - [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers) → **+**
  - App IDs → App → Explicit: `com.tuanvu.demoapp.{env}`
  - Tick Capabilities cần thiết (Push Notifications, v.v.)
  - Register

- [ ] **App Store Connect** — tạo app record (cần cho TestFlight, bỏ qua nếu chỉ dùng Firebase):
  - [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → **+**
  - Platform: iOS, Bundle ID: chọn từ dropdown (phải đã register ở trên)
  - SKU + tên app → Create

---

## Phase 3 — Firebase Console

- [ ] **Thêm iOS app** vào Firebase project:
  - Firebase Console → Project → **Add app** → iOS
  - Bundle ID: `com.tuanvu.demoapp.{env}`
  - Download `GoogleService-Info.plist` → đặt vào `ios/demo_app/`
  - Ghi lại **App ID** (dạng `1:xxx:ios:yyy`) → dùng cho `FIREBASE_IOS_{ENV}_APP_ID`

- [ ] **Tạo group tester** (nếu chưa có):
  - App Distribution → Testers & Groups → **+** tạo group `{env}-testers`
  - Thêm email tester vào group

---

## Phase 4 — Code Signing (match)

- [ ] **Sync certificates + profiles** cho bundle ID mới:
  ```bash
  APP_IDENTIFIER=com.tuanvu.demoapp.{env} bundle exec fastlane ios sync_certs
  ```
  Tạo 3 profiles: `development`, `adhoc`, `appstore`

- [ ] **Đăng ký UDID tester** cho ad-hoc (nếu tester mới, chưa có UDID):
  ```bash
  APP_IDENTIFIER=com.tuanvu.demoapp.{env} bundle exec fastlane ios register_new_device
  ```

---

## Phase 5 — Fastlane Lane

- [ ] **Thêm lane `distribute_{env}`** vào `fastlane/Fastfile`:

  Cấu trúc lane (xem `distribute_qa` làm mẫu):
  ```
  1. latest_testflight_build_number → increment (nếu có TestFlight)
  2. add_badge (QA shield — cần ImageMagick trên CI)
  3. match appstore → gym app-store → pilot      (kênh TestFlight)
  4. match adhoc   → gym ad-hoc   → firebase_app_distribution (kênh Firebase)
  ```

  > Nếu chỉ distribute Firebase, bỏ bước 1 + 3. Build number dùng `github.run_number` là đủ.

- [ ] **gym xcargs** phải có:
  ```
  CODE_SIGN_STYLE=Manual
  PROVISIONING_PROFILE_SPECIFIER='match AdHoc com.tuanvu.demoapp.{env}'
  CODE_SIGN_IDENTITY='iPhone Distribution'
  ENVFILE=.env.{env}
  ```

- [ ] **pilot**: KHÔNG truyền `changelog` khi dùng `skip_waiting_for_build_processing: true`
  (truyền cả 2 → CI block chờ Apple process 5-15 phút)

---

## Phase 6 — GitHub Actions

- [ ] **Tạo `.github/workflows/ios-{env}.yml`** (clone từ `ios-qa.yml`):
  - Trigger: `push: branches: [release/ios-{env}]` (hoặc branch phù hợp)
  - Step `brew install imagemagick librsvg` trước fastlane (runner không pre-install)
  - Step `echo "${{ secrets.ENV_{ENV} }}" > .env.{env}` trước fastlane
  - `run: bundle exec fastlane ios distribute_{env}`

- [ ] **Thêm GitHub Secrets** (repo → Settings → Secrets → Actions):

  | Secret | Giá trị |
  |---|---|
  | `{ENV}_APP_IDENTIFIER` | `com.tuanvu.demoapp.{env}` |
  | `FIREBASE_IOS_{ENV}_APP_ID` | App ID từ Firebase Console |
  | `FIREBASE_TOKEN` | Output của `firebase login:ci` (dùng chung nếu đã có) |
  | `ENV_{ENV}` | Toàn bộ nội dung file `.env.{env}` local |
  | `MATCH_GIT_URL`, `MATCH_PASSWORD`, `MATCH_GIT_TOKEN` | Dùng chung với env khác |
  | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` | Dùng chung với env khác |

---

## Phase 7 — Verify

- [ ] Push lên branch trigger → CI xanh
- [ ] Firebase App Distribution: build mới xuất hiện, group nhận email
- [ ] Tester cài app → verify display name đúng (vd "DemoApp QA"), bundle ID khác Prod
- [ ] 2 app cài song song trên device không overwrite nhau

---

## Pitfalls thường gặp

| Triệu chứng | Nguyên nhân | Fix |
|---|---|---|
| ASC "Bundle ID" dropdown trống | Bundle ID chưa register trên Developer Portal | Register ở Developer Portal trước, reload ASC |
| `gym` lỗi "Provisioning profile not found" | match chưa chạy hoặc profile hết hạn | `APP_IDENTIFIER=... bundle exec fastlane ios sync_certs` |
| `add_badge` lỗi "Install ImageMagick" | macOS runner không có ImageMagick | Thêm `brew install imagemagick librsvg` vào workflow trước fastlane |
| `pilot` block CI 5-15 phút | Truyền `changelog` cùng `skip_waiting_for_build_processing: true` | Bỏ `changelog` khỏi `pilot` |
| Xcode crash khi mở project | Scheme XML có `ActionType` không hợp lệ trong `<PreActions>` | Xóa `<PreActions>` block; inject ENVFILE qua `xcargs` thay vì pre-action |
| 2 app overwrite nhau trên device | Bundle ID trùng | Kiểm tra pbxproj: config Debug-{ENV} và Release-{ENV} đúng bundle ID |
| Scheme không thấy trên CI | Scheme không được tick Shared | Xcode → Manage Schemes → tick Shared |
