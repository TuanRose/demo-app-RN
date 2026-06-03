# QA Build Scheme — iOS Implementation Plan

> **Branch:** `release/ios`
> **Status:** ⏸️ **DEFERRED → Sprint 5** (theo US: *"iOS [moved for sprint 5] @Andrew Pham"*)
> **Owner:** Andrew Pham
> **US:** Create dedicated QA build scheme (iOS) — side-by-side install, QA backend, TestFlight distribution
> **Phụ thuộc:** chia sẻ `react-native-config` + `.env.qa` với Android (xem `docs/android-qa-flavour-plan.md` T2)

---

## ⚠️ Lưu ý sprint
iOS **không nằm trong sprint hiện tại**. Doc này capture sẵn plan để Sprint 5 bắt đầu được ngay,
không phải để implement bây giờ. Android (`release/android`) là phần làm trước.

---

## 1. Mục tiêu

Tạo scheme `demo_app-QA` cho iOS để QA test trên QA backend:
- Trỏ QA backend (env vars qua `.xcconfig` → `react-native-config`)
- Bundle ID `corleone.dev.demo_app.qa` → cài song song với Prod trên cùng device
- App name "DemoApp QA" + icon riêng
- Tự động build + upload **TestFlight** khi push `release/ios`

---

## 2. Acceptance Criteria → Task mapping

| AC (từ US) | Task | Status |
|---|---|---|
| iOS QA scheme compiles & runs, points to QA backend | T1–T4 | ⏸️ Sprint 5 |
| QA installs side-by-side with prod | T5 (bundle ID `.qa`) | ⏸️ |
| QA visually distinguishable (name + icon) | T6 | ⏸️ |
| Env config injected per scheme | T2 (xcconfig + RNConfig) | ⏸️ |
| Provisioning/cert cho QA distribution | T7 | ⏸️ |
| CocoaPods/SPM resolve cho scheme mới | T1, T8 | ⏸️ |
| CI/CD builds + distributes QA (TestFlight) | T8, T9 | ⏸️ |
| Documentation build/run locally | T10 | ⏸️ |

---

## 3. Current state (iOS, đã verify)

```
ios/demo_app.xcodeproj  → chỉ có Debug + Release (chưa có Debug-QA / Release-QA)
ios/demo_app/Info.plist
ios/demo_app/  → AppDelegate.swift, Images.xcassets, BootSplash...
KHÔNG có thư mục ios/xcconfigs/  → cần tạo
fastlane/Fastfile  → lane :beta hardcode scheme "demo_app", configuration "Release"
                     → pilot upload TestFlight (đã hoạt động cho Prod)
fastlane/Matchfile + sync_certs lane  → match-based code signing đã có
.github/workflows/deploy-testflight.yml  → template clone cho QA
```

**Kết luận:** iOS phức tạp hơn Android — phải chỉnh `project.pbxproj` (dễ conflict) + tạo scheme + provisioning cho bundle ID mới (chờ Apple). Cần Xcode + quyền Apple Developer Portal.

---

## 4. Kiến trúc sau khi hoàn thành

```
push branch release/ios
        │
        ▼
GitHub Actions (.github/workflows/ios-qa.yml, runner macos-15)
        │
        ├── Checkout + Node + Ruby + Xcode + pod install
        └── bundle exec fastlane ios beta_qa
                │
                ├── match (appstore) cho corleone.dev.demo_app.qa
                ├── gym scheme "demo_app-QA", configuration "Release-QA"
                └── pilot → TestFlight (internal testers)
```

---

## 5. Task breakdown (Sprint 5)

### ⏸️ T1 — Build configurations mới
Xcode → Project → Info → Configurations:
- Duplicate `Debug` → **`Debug-QA`**
- Duplicate `Release` → **`Release-QA`**

> Sửa qua Xcode UI để `project.pbxproj` đúng cấu trúc (edit tay dễ vỡ).

### ⏸️ T2 — xcconfig + env injection
```
ios/xcconfigs/
├── QA.xcconfig            # giá trị chung QA
├── Debug-QA.xcconfig      → #include "QA.xcconfig"
└── Release-QA.xcconfig    → #include "QA.xcconfig"
```
`QA.xcconfig`:
```
PRODUCT_BUNDLE_IDENTIFIER = corleone.dev.demo_app.qa
DISPLAY_NAME             = DemoApp QA
```
Env vars cho JS dùng chung `react-native-config`:
- Scheme `demo_app-QA` → Edit Scheme → Build → Pre-actions → set `ENVFILE=.env.qa`
- (`.env.qa` đã tạo ở Android plan — tái sử dụng, không tạo lại)

### ⏸️ T3 — Scheme `demo_app-QA`
Xcode → Manage Schemes → duplicate `demo_app` → đổi tên `demo_app-QA`:
- Run → `Debug-QA`, Archive → `Release-QA`
- ✅ **Shared** (để commit vào repo, CI đọc được)

### ⏸️ T4 — Info.plist đọc xcconfig
```xml
<key>CFBundleDisplayName</key>
<string>$(DISPLAY_NAME)</string>
```
react-native-config tự inject các key còn lại khi `ENVFILE` được set.

### ⏸️ T5 — Bundle ID `.qa` (side-by-side)
`PRODUCT_BUNDLE_IDENTIFIER = corleone.dev.demo_app.qa` (đã set ở T2).
→ iOS coi là app khác → cài song song với Prod.

### ⏸️ T6 — App icon riêng QA
- Tạo asset catalog `AppIcon-QA` (hoặc thêm icon set vào `Images.xcassets`)
- `Release-QA`/`Debug-QA` → `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon-QA`
- Icon có badge "QA" để phân biệt

### ⏸️ T7 — Provisioning / certs cho QA (match)
```bash
# Thêm bundle ID corleone.dev.demo_app.qa vào Apple Developer Portal
# rồi sync qua match (appstore type cho TestFlight)
APP_IDENTIFIER=corleone.dev.demo_app.qa bundle exec fastlane ios sync_certs
```
> ⚠️ Blocking: tạo bundle ID mới trên Apple Portal có thể chờ vài giờ. Cần quyền Apple Developer.

### ⏸️ T8 — Fastlane lane `beta_qa`
```ruby
desc "Build QA scheme → upload to TestFlight"
lane :beta_qa do
  api_key = asc_api_key
  qa_app_id = ENV["QA_APP_IDENTIFIER"]  # corleone.dev.demo_app.qa

  latest_build = latest_testflight_build_number(
    api_key: api_key, app_identifier: qa_app_id, initial_build_number: 0,
  )
  increment_build_number(build_number: latest_build + 1, xcodeproj: "ios/demo_app.xcodeproj")

  match(
    type: "appstore", readonly: true, api_key: api_key,
    app_identifier: qa_app_id, git_url: ENV["MATCH_GIT_URL"],
    git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}"),
  )

  gym(
    scheme: "demo_app-QA",
    workspace: "ios/demo_app.xcworkspace",
    configuration: "Release-QA",
    export_method: "app-store",
    output_directory: "./build/ios",
    output_name: "demo_app_qa.ipa",
    include_bitcode: false,
    xcargs: [
      "CODE_SIGN_STYLE=Manual",
      "PROVISIONING_PROFILE_SPECIFIER='match AppStore #{qa_app_id}'",
      "CODE_SIGN_IDENTITY='iPhone Distribution'",
    ].join(" "),
  )

  pilot(
    api_key: api_key, ipa: "./build/ios/demo_app_qa.ipa",
    app_identifier: qa_app_id,
    skip_waiting_for_build_processing: true,
    distribute_external: false, changelog: release_notes,
  )
end
```

### ⏸️ T9 — GitHub Actions `ios-qa.yml`
Clone `deploy-testflight.yml`, đổi:
- Trigger: `release/ios`
- `run: bundle exec fastlane ios beta_qa`
- Thêm secret `QA_APP_IDENTIFIER = corleone.dev.demo_app.qa`

### ⏸️ T10 — Docs build & run QA local
```bash
# Run QA scheme trên simulator
ENVFILE=.env.qa npx react-native run-ios --scheme demo_app-QA

# Archive QA build
bundle exec fastlane ios beta_qa
```

---

## 6. Secrets cần thêm (Sprint 5)
| Secret | Giá trị |
|---|---|
| `QA_APP_IDENTIFIER` | `corleone.dev.demo_app.qa` |
| (reuse) `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` | đã có cho Prod |
| (reuse) `MATCH_GIT_URL`, `MATCH_PASSWORD`, `MATCH_GIT_TOKEN`, `TEAM_ID` | đã có |

---

## 7. Rủi ro

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| Edit `project.pbxproj` gây conflict/vỡ | 🟡 | Dùng Xcode UI, commit cẩn thận |
| Apple Portal tạo bundle ID + provisioning chờ lâu | 🟡 | Bắt đầu T7 sớm |
| Scheme không Shared → CI không thấy | 🔴 | Nhớ tick Shared (T3) |
| react-native-config iOS chưa pod install | 🟡 | `pod install` sau khi thêm lib (từ Android plan) |

---

## 8. Master progress checklist (Sprint 5)

- [ ] T1 — Build configs `Debug-QA` / `Release-QA`
- [ ] T2 — `ios/xcconfigs/*` + `ENVFILE=.env.qa` pre-action
- [ ] T3 — Scheme `demo_app-QA` (Shared)
- [ ] T4 — Info.plist `CFBundleDisplayName = $(DISPLAY_NAME)`
- [ ] T5 — Bundle ID `corleone.dev.demo_app.qa`
- [ ] T6 — App icon `AppIcon-QA`
- [ ] T7 — match provisioning cho QA bundle ID
- [ ] T8 — Fastlane lane `beta_qa`
- [ ] T9 — `.github/workflows/ios-qa.yml`
- [ ] T10 — Docs build & run QA local
- [ ] Verify TestFlight nhận build QA + tester cài được side-by-side
