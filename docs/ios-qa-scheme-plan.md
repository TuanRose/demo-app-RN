# QA Build Scheme — iOS Implementation Plan

> **Branch:** `release/ios`
> **Status:** ✅ DONE — T0–T11 hoàn thành, CI workflow live trên `release/ios`
> **US:** Create dedicated QA build scheme (iOS) — side-by-side install, QA backend, distribute qua **CẢ Firebase App Distribution VÀ TestFlight**
> **Tham chiếu:** Android đã hoàn thành (`docs/android-qa-flavour-plan.md` T1–T10) — iOS tái sử dụng tối đa hạ tầng đó

---

## 0. Quyết định đã chốt (khác plan deferred cũ)

| Vấn đề | Quyết định | Lý do |
|---|---|---|
| Đưa env infra từ Android sang iOS | **Merge `release/android` → `release/ios`** | release/ios đang đứng trước sprint Android (chưa có react-native-config + env.ts). Merge mang toàn bộ shared infra sang 1 lần. |
| Bundle ID QA | **`com.tuanvu.demoapp.qa`** | iOS Prod hiện là `com.tuanvu.demoapp` → suffix `.qa`, không đụng provisioning Prod. (iOS dùng base khác Android `corleone.dev.demo_app` — chấp nhận lệch, không refactor Prod.) |
| Distribution | **CẢ Firebase App Distribution + TestFlight** | Firebase = đồng bộ dashboard với Android QA. TestFlight = không vướng UDID, tester dễ cài. Có cả 2 → linh hoạt cho QA team. |

> ⚠️ **Hệ quả của việc distribute 2 kênh:** TestFlight và Firebase cần IPA ký **khác nhau** → lane phải build **2 IPA** (2 lần `gym`):
> - **TestFlight** → ký `app-store`, upload qua `pilot`. Không cần UDID. Nhưng cần **app record riêng trong App Store Connect** cho `com.tuanvu.demoapp.qa`.
> - **Firebase** → ký `ad-hoc`, upload qua `firebase_app_distribution`. Chỉ cài trên **UDID đã đăng ký** (xem mục 7).
>
> 💰 **Chi phí CI:** 2 build trên macOS runner (~15-20 phút/build) → ~40-50 phút/run → ~$3-4/run (gấp đôi so với 1 kênh).

---

## 1. Mục tiêu

Tạo scheme `demo_app-QA` cho iOS để QA test trên QA backend:
- Trỏ QA backend (env vars qua `.xcconfig` + `react-native-config` đọc `.env.qa`)
- Bundle ID `com.tuanvu.demoapp.qa` → cài song song với Prod trên cùng device
- App name "DemoApp QA" + icon riêng (badge QA)
- Tự động build + distribute **Firebase (ad-hoc) + TestFlight (app-store)** khi push `release/ios`

---

## 2. Acceptance Criteria → Task mapping

| AC (từ US) | Task | Status |
|---|---|---|
| iOS QA scheme compiles & runs, points to QA backend | T0–T4 | ⬜ |
| QA installs side-by-side with prod | T5 (bundle ID `.qa`) | ⬜ |
| QA visually distinguishable (name + icon) | T4 (name) + T6 (icon) | ⬜ |
| Env config injected per scheme | T2 (xcconfig + RNConfig) | ⬜ |
| Provisioning/cert cho QA distribution | T8 (match ad-hoc + appstore) | ⬜ |
| CocoaPods resolve cho scheme mới | T0 (pod install) | ⬜ |
| CI/CD builds + distributes QA (Firebase + TestFlight) | T9, T10 | ⬜ |
| Documentation build/run locally | T11 | ⬜ |

---

## 3. Current state (iOS, đã verify trong repo)

```
ios/demo_app.xcodeproj
  └── Build configs: chỉ Debug + Release  (chưa có Debug-QA / Release-QA)
  └── PRODUCT_BUNDLE_IDENTIFIER = com.tuanvu.demoapp   ← Prod
  └── PRODUCT_NAME = demo_app   (chưa set CFBundleDisplayName riêng)
  └── Shared schemes: chỉ demo_app.xcscheme
ios/demo_app/Images.xcassets/AppIcon.appiconset  ← chỉ 1 icon set
ios/demo_app/Info.plist
KHÔNG có ios/xcconfigs/                ← cần tạo (T2)
KHÔNG có GoogleService-Info.plist      ← iOS chưa setup Firebase (cần T7)

package.json: react-native-config CHƯA có (chỉ có trên release/android)  ← T0 merge mang sang
src/config/env.ts: CHƯA tồn tại trên branch này                          ← T0 merge mang sang

fastlane/
  ├── Fastfile: lane :beta  (TestFlight, app-store, pilot) ← base cho TestFlight QA
  │            lane :adhoc (match adhoc + export ad-hoc)   ← base cho Firebase QA
  │            lane :firebase_beta (Android) — pattern firebase_app_distribution để mirror
  │            lane :register_new_device / :refresh_profile ← cần cho ad-hoc UDID
  ├── Matchfile: type "appstore", app_identifier ENV["APP_IDENTIFIER"]
  └── Gemfile: fastlane-plugin-firebase_app_distribution ✅ đã có

.github/workflows/deploy-testflight.yml  → template clone (thêm Firebase + 2 export method)
```

**Kết luận:** Cả 2 base lane (`beta` cho TestFlight, `adhoc`+plugin cho Firebase) đã sẵn. iOS QA = tạo scheme/config/icon trong Xcode + match (adhoc + appstore) cho bundle ID mới + 1 lane build 2 IPA distribute 2 kênh.

---

## 4. Kiến trúc sau khi hoàn thành

```
push branch release/ios
        │
        ▼
GitHub Actions (.github/workflows/ios-qa.yml, runner macos-15)
        │
        ├── Checkout + Node + Ruby + Xcode + pod install
        ├── ENVFILE=.env.qa (tạo trong CI như Android — .env* gitignored)
        └── bundle exec fastlane ios distribute_qa
                │
                ├── increment_build_number (1 lần, dùng cho cả 2)
                │
                ├── ① TestFlight (app-store)
                │     ├── match(appstore, readonly) cho com.tuanvu.demoapp.qa
                │     ├── gym export app-store → demo_app_qa.ipa
                │     └── pilot → App Store Connect (app QA) → TestFlight internal
                │           └── Tester cài qua TestFlight app (KHÔNG cần UDID)
                │
                └── ② Firebase (ad-hoc)
                      ├── match(adhoc, readonly) cho com.tuanvu.demoapp.qa
                      ├── gym export ad-hoc → demo_app_qa_adhoc.ipa
                      └── firebase_app_distribution → group qa-testers
                            └── Tester (UDID đã đăng ký) nhận email → cài
```

---

## 5. Task breakdown (chi tiết)

### ⬜ T0 — Merge `release/android` → `release/ios` + pod install
```bash
git checkout release/ios
git merge release/android          # mang react-native-config + env.ts + .env CI handling
bundle exec pod install --project-directory=ios   # autolink RNConfig pod cho iOS
```
**Done when:** `package.json` có `react-native-config`, `src/config/env.ts` tồn tại, `ios/Podfile.lock` có pod Config, build iOS hiện tại (Prod) vẫn chạy.

> Merge dự kiến sạch: release/ios chỉ thêm `docs/ios-qa-scheme-plan.md` (file này) trên nền chung; android thêm file khác. Kiểm tra conflict ở `fastlane/Fastfile` / `.gitignore` nếu có.

---

### ⬜ T1 — Build configurations `Debug-QA` / `Release-QA`
Xcode → Project → Info → Configurations:
- Duplicate `Debug` → **`Debug-QA`**
- Duplicate `Release` → **`Release-QA`**

> Sửa qua Xcode UI để `project.pbxproj` đúng cấu trúc (edit tay rất dễ vỡ). Commit pbxproj cẩn thận, review diff.

---

### ⬜ T2 — xcconfig + env injection (react-native-config iOS)
```
ios/xcconfigs/
├── QA.xcconfig            # giá trị chung QA
├── Debug-QA.xcconfig      → #include "QA.xcconfig"
└── Release-QA.xcconfig    → #include "QA.xcconfig"
```
`QA.xcconfig`:
```
PRODUCT_BUNDLE_IDENTIFIER = com.tuanvu.demoapp.qa
DISPLAY_NAME             = DemoApp QA
```
Gán xcconfig vào config tương ứng: Xcode → Project → Info → Configurations → Debug-QA/Release-QA → set file.

**Env vars cho JS (react-native-config):**
- iOS đọc env qua build phase script của react-native-config → cần biến `ENVFILE`.
- Scheme `demo_app-QA` → Edit Scheme → Build → Pre-actions → `export ENVFILE=.env.qa` (provide build settings from `demo_app`).
- `.env.qa` tái sử dụng từ Android (đã có local) — KHÔNG tạo lại. Trên CI sẽ tạo file như Android.

**Done when:** chạy QA scheme → `Config.API_BASE_URL === https://fakestoreapi.com` (khác Prod `dummyjson.com`).

---

### ⬜ T3 — Scheme `demo_app-QA`
Xcode → Manage Schemes → duplicate `demo_app` → đổi tên `demo_app-QA`:
- Run → `Debug-QA`, Archive/Profile → `Release-QA`
- ✅ **Shared** (BẮT BUỘC — không tick thì CI không thấy scheme → build fail)

---

### ⬜ T4 — Info.plist đọc DISPLAY_NAME
```xml
<key>CFBundleDisplayName</key>
<string>$(DISPLAY_NAME)</string>
```
→ Prod giữ tên "demo_app", QA hiện "DemoApp QA" dưới icon. Phân biệt bằng mắt (AC).

---

### ⬜ T5 — Bundle ID `.qa` (side-by-side)
`PRODUCT_BUNDLE_IDENTIFIER = com.tuanvu.demoapp.qa` (đã set ở T2 qua xcconfig).
→ iOS coi là app khác → cài song song với Prod trên cùng device.

---

### ⬜ T6 — App icon riêng QA
- Thêm icon set `AppIcon-QA` vào `Images.xcassets` (badge "QA" để phân biệt).
- `Debug-QA`/`Release-QA` → build setting `ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon-QA`.

> iOS không có plugin kiểu easylauncher tiện như Android → phải tạo icon set thủ công (hoặc dùng tool badge icon). Đây là khác biệt so với Android T4.

---

### ⬜ T7 — Đăng ký app QA ở 2 nơi (Firebase + App Store Connect)

**7a. Firebase Console (cho Firebase App Distribution):**
1. Firebase Console → project hiện tại (chung với Android) → **Add app** → iOS
2. Bundle ID: `com.tuanvu.demoapp.qa`
3. Download `GoogleService-Info.plist` → đặt vào `ios/demo_app/`
4. Ghi lại **App ID** iOS (`1:xxxx:ios:yyyy`) → secret `FIREBASE_IOS_QA_APP_ID`
5. App Distribution → dùng lại group `qa-testers` (đã tạo ở Android T6)

> `GoogleService-Info.plist` chỉ bắt buộc nếu app dùng Firebase SDK. Với App Distribution, Fastlane chỉ cần `FIREBASE_IOS_QA_APP_ID` + `FIREBASE_TOKEN`. Thêm plist cho an toàn + tương lai.

**7b. App Store Connect (cho TestFlight) — BƯỚC MỚI do thêm TestFlight:**
1. App Store Connect → My Apps → **+ New App** → iOS
2. Bundle ID: chọn `com.tuanvu.demoapp.qa` (phải đã tạo trên Apple Developer Portal — xem T8)
3. SKU + tên app (vd "DemoApp QA") — không cần điền metadata vì chỉ dùng TestFlight internal
4. TestFlight → Internal Testing → thêm tester (App Store Connect users)

> ⚠️ Mỗi bundle ID = 1 app record riêng trong App Store Connect. `pilot` upload sẽ fail nếu app QA chưa tồn tại. Đây là prereq bắt buộc cho nhánh TestFlight.

**Done when:** Firebase Console hiện app iOS `.qa` + App Store Connect có app record `.qa`.

---

### ⬜ T8 — Provisioning / certs cho QA (match **ad-hoc + appstore**)
Distribute 2 kênh → cần **cả 2** loại profile cho `com.tuanvu.demoapp.qa`:
- `appstore` → cho TestFlight (`pilot`)
- `adhoc` → cho Firebase
```bash
# 1. Thêm bundle ID com.tuanvu.demoapp.qa vào Apple Developer Portal (hoặc match tự tạo)
# 2. Sync TẤT CẢ cert + profile cho bundle ID mới:
APP_IDENTIFIER=com.tuanvu.demoapp.qa bundle exec fastlane ios sync_certs
#    sync_certs tạo development + adhoc + appstore → dùng adhoc (Firebase) + appstore (TestFlight)
```

> ⚠️ **Giới hạn ad-hoc — chỉ áp dụng cho nhánh Firebase:** IPA ad-hoc chỉ cài trên UDID đã đăng ký. Tester mới (nếu cài qua Firebase) phải:
> 1. Cài Firebase App Tester → đăng ký device → Firebase thu UDID
> 2. Dev thêm UDID vào Portal: `APP_IDENTIFIER=com.tuanvu.demoapp.qa bundle exec fastlane ios register_new_device`
> 3. Build lại (profile ad-hoc đã refresh) → tester mới cài được
>
> ✅ **TestFlight không có giới hạn này** — đây chính là lý do có cả 2 kênh: tester ngại UDID thì dùng TestFlight, cần cài nhanh/offline thì dùng Firebase.

---

### ⬜ T9 — Fastlane lane `distribute_qa` (build 2 IPA → TestFlight + Firebase)
1 lane orchestrator: increment build number 1 lần, rồi build app-store IPA → pilot, build ad-hoc IPA → Firebase.
```ruby
desc "Build QA scheme → distribute to BOTH TestFlight (app-store) and Firebase (ad-hoc)"
lane :distribute_qa do
  api_key      = asc_api_key
  qa_app_id    = ENV["QA_APP_IDENTIFIER"] || "com.tuanvu.demoapp.qa"
  version_name = ENV["APP_VERSION"]        || "1.0.0"

  # WHY query TestFlight rồi +1: App Store Connect YÊU CẦU build number unique.
  # Firebase không yêu cầu → dùng chung số này cho cả 2 là an toàn.
  latest_build = latest_testflight_build_number(
    api_key: api_key, app_identifier: qa_app_id, initial_build_number: 0,
  )
  new_build_number = latest_build + 1
  increment_build_number(build_number: new_build_number, xcodeproj: "ios/demo_app.xcodeproj")

  # ─── ① TestFlight (app-store) ───────────────────────────────
  match(
    type: "appstore", readonly: true, api_key: api_key, app_identifier: qa_app_id,
    git_url: ENV["MATCH_GIT_URL"],
    git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}"),
  )
  gym(
    scheme: "demo_app-QA", workspace: "ios/demo_app.xcworkspace", configuration: "Release-QA",
    export_method: "app-store", output_directory: "./build/ios",
    output_name: "demo_app_qa.ipa", include_bitcode: false,
    xcargs: [
      "CODE_SIGN_STYLE=Manual",
      "PROVISIONING_PROFILE_SPECIFIER='match AppStore #{qa_app_id}'",
      "CODE_SIGN_IDENTITY='iPhone Distribution'",
    ].join(" "),
  )
  pilot(
    api_key: api_key, ipa: "./build/ios/demo_app_qa.ipa", app_identifier: qa_app_id,
    skip_waiting_for_build_processing: true, distribute_external: false, changelog: release_notes,
  )

  # ─── ② Firebase (ad-hoc) ────────────────────────────────────
  match(
    type: "adhoc", readonly: true, api_key: api_key, app_identifier: qa_app_id,
    git_url: ENV["MATCH_GIT_URL"],
    git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}"),
  )
  gym(
    scheme: "demo_app-QA", workspace: "ios/demo_app.xcworkspace", configuration: "Release-QA",
    export_method: "ad-hoc", output_directory: "./build/ios",
    output_name: "demo_app_qa_adhoc.ipa", include_bitcode: false,
    xcargs: [
      "CODE_SIGN_STYLE=Manual",
      "PROVISIONING_PROFILE_SPECIFIER='match AdHoc #{qa_app_id}'",
      "CODE_SIGN_IDENTITY='iPhone Distribution'",
    ].join(" "),
  )
  firebase_app_distribution(
    app: ENV["FIREBASE_IOS_QA_APP_ID"],   # 1:xxx:ios:yyy (KHÁC bundle ID)
    groups: ENV["FIREBASE_GROUPS"] || "qa-testers",
    firebase_cli_token: ENV["FIREBASE_TOKEN"],
    release_notes: release_notes,
    ipa_path: "./build/ios/demo_app_qa_adhoc.ipa",
  )

  UI.success "✅ iOS QA #{version_name} (#{new_build_number}) → TestFlight + Firebase!"
end
```

> **Alternative (modular):** tách thành 2 lane `beta_qa` (TestFlight) + `firebase_beta_ios` (Firebase) để chạy độc lập local. Nhưng build number cần increment 1 lần chung → orchestrator `distribute_qa` ở trên gọn hơn cho CI. Có thể thêm 2 lane con sau nếu cần test riêng từng kênh.

**Done when:** lane chạy local (có cert + token + app records) build 2 IPA + upload cả TestFlight lẫn Firebase thành công.

---

### ⬜ T10 — GitHub Actions `ios-qa.yml`
Clone `deploy-testflight.yml`, đổi:
- Trigger: `push: branches: [release/ios]`, `paths-ignore: ['**.md','docs/**']`
- Concurrency group: `ios-qa`
- Thêm step **Create env files** (tạo `.env` + `.env.qa` như android-qa.yml — `.env*` gitignored)
- `run: bundle exec fastlane ios distribute_qa`
- Upload cả 2 IPA artifact (app-store + ad-hoc)

```yaml
      - name: Build & Distribute QA (TestFlight + Firebase)
        env:
          ASC_KEY_ID:            ${{ secrets.ASC_KEY_ID }}
          ASC_ISSUER_ID:         ${{ secrets.ASC_ISSUER_ID }}
          ASC_KEY_CONTENT:       ${{ secrets.ASC_KEY_CONTENT }}
          TEAM_ID:               ${{ secrets.TEAM_ID }}
          MATCH_GIT_URL:         ${{ secrets.MATCH_GIT_URL }}
          MATCH_PASSWORD:        ${{ secrets.MATCH_PASSWORD }}
          MATCH_GIT_TOKEN:       ${{ secrets.MATCH_GIT_TOKEN }}
          QA_APP_IDENTIFIER:     com.tuanvu.demoapp.qa
          FIREBASE_IOS_QA_APP_ID: ${{ secrets.FIREBASE_IOS_QA_APP_ID }}
          FIREBASE_GROUPS:       qa-testers
          FIREBASE_TOKEN:        ${{ secrets.FIREBASE_TOKEN }}
          APP_VERSION:           ${{ secrets.APP_VERSION }}
        run: bundle exec fastlane ios distribute_qa
```
> Không cần `APP_VERSION_CODE` từ `github.run_number` nữa — lane `distribute_qa` query TestFlight để lấy build number (ASC yêu cầu unique, không thể dùng run_number tùy ý).

**Done when:** push `release/ios` → workflow xanh, TestFlight + Firebase đều nhận build QA, 2 IPA artifact xuất hiện.

---

### ⬜ T11 — Docs: build & run QA locally
Thêm vào `docs/ios-local-build-practice.md` (hoặc tạo mới nếu chưa có):
```bash
# Run QA scheme trên simulator
ENVFILE=.env.qa npx react-native run-ios --scheme demo_app-QA

# Build + distribute CẢ TestFlight + Firebase (local, cần cert + token + app records)
QA_APP_IDENTIFIER=com.tuanvu.demoapp.qa \
FIREBASE_IOS_QA_APP_ID=1:xxx:ios:yyy \
FIREBASE_TOKEN=<token> \
bundle exec fastlane ios distribute_qa

# Đăng ký device tester mới cho ad-hoc (chỉ cần cho nhánh Firebase)
APP_IDENTIFIER=com.tuanvu.demoapp.qa bundle exec fastlane ios register_new_device
```

---

## 6. Secrets cần thêm (GitHub repo)
| Secret | Giá trị | Ghi chú |
|---|---|---|
| `FIREBASE_IOS_QA_APP_ID` | `1:xxxx:ios:yyyy` | App ID iOS QA từ T7 |
| `QA_APP_IDENTIFIER` | `com.tuanvu.demoapp.qa` | (hoặc hardcode trong workflow) |
| (reuse) `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` | đã có cho Prod | match + api key |
| (reuse) `MATCH_GIT_URL`, `MATCH_PASSWORD`, `MATCH_GIT_TOKEN`, `TEAM_ID` | đã có | code signing |
| (reuse) `FIREBASE_TOKEN`, `APP_VERSION` | đã có (từ Android) | dùng chung |

---

## 7. Rủi ro & quyết định

| Rủi ro | Mức | Ghi chú |
|---|---|---|
| **Ad-hoc chỉ cài trên UDID đã đăng ký** | 🔴 | Chỉ ảnh hưởng nhánh Firebase. Tester mới = register UDID + rebuild (T8). TestFlight không vướng. |
| **TestFlight cần app record riêng trong ASC** | 🟡 | `pilot` fail nếu app QA chưa tạo. Prereq T7b. |
| 2 build/run → CI macOS ~$3-4/run | 🟡 | Cái giá của 2 kênh. Cân nhắc nếu CI budget hạn chế. |
| Edit `project.pbxproj` gây conflict/vỡ | 🟡 | Dùng Xcode UI, review diff trước commit |
| Scheme không Shared → CI không thấy | 🔴 | Nhớ tick Shared (T3) |
| Apple Portal tạo bundle ID + profile chờ | 🟡 | Chạy `sync_certs` sớm (T8) — tạo cả adhoc + appstore |
| Merge release/android gây conflict | 🟡 | T0 — review conflict ở Fastfile/.gitignore |
| react-native-config iOS chưa pod install | 🟡 | `pod install` sau merge (T0) |

---

## 8. Thứ tự thực thi đề xuất

```
T0 (merge + pod) → T1 (configs) → T2 (xcconfig+env) → T3 (scheme) → T4 (name) → T5 (bundle id) → T6 (icon)
                                                                                          │
T7 (Firebase + ASC app) → T8 (match adhoc+appstore) → T9 (lane distribute_qa) → T10 (workflow) → T11 (docs)
```
Ước lượng: **~7–9h** (iOS chậm hơn Android: pbxproj/scheme thủ công + ad-hoc device friction + 2 kênh distribution).

---

## 9. So sánh nhanh với Android (đã xong)

| Khía cạnh | Android (xong) | iOS (plan này) |
|---|---|---|
| Variant | productFlavor `Qa` | scheme `demo_app-QA` + config Debug-QA/Release-QA |
| Env injection | `envConfigFiles` map trong build.gradle | xcconfig + `ENVFILE` pre-action |
| Bundle ID | `corleone.dev.demo_app.qa` | `com.tuanvu.demoapp.qa` |
| Icon | easylauncher plugin (ribbon tự động) | icon set `AppIcon-QA` thủ công |
| Signing | keystore chung, fallback debug | match **ad-hoc + appstore** (cert chung) |
| Distribution | Firebase (APK, cài tự do) | **Firebase (ad-hoc, chỉ UDID) + TestFlight (app-store, tự do)** |
| Số build mỗi run | 1 (APK+AAB cùng gradle) | **2 IPA riêng** (app-store + ad-hoc) |
| CI runner | ubuntu-latest | macos-15 (~$3-4/run do 2 build) |

---

## 10. Master progress checklist

- [x] T0 — Merge release/android + pod install (react-native-config + env.ts sang iOS)
- [x] T1 — Build configs `Debug-QA` / `Release-QA`
- [x] T2 — `ios/xcconfigs/*` + `ENVFILE=.env.qa` via xcargs trong gym
- [x] T3 — Scheme `demo_app-QA` (Shared)
- [x] T4 — Info.plist `CFBundleDisplayName = $(DISPLAY_NAME)` = "DemoApp QA"
- [x] T5 — Bundle ID `com.tuanvu.demoapp.qa` (side-by-side)
- [x] T6 — App icon badge via `fastlane-plugin-badge` (stamp CI, không commit icon thay đổi)
- [x] T7 — Firebase Console iOS app `.qa` + App Store Connect app record `.qa` (manual)
- [x] T8 — match **ad-hoc + appstore** cho `com.tuanvu.demoapp.qa`
- [x] T9 — Fastlane lane `distribute_qa` (2 IPA → TestFlight + Firebase)
- [x] T10 — `.github/workflows/ios-qa.yml` (macos-15, trigger `release/ios`)
- [x] T11 — `docs/ios-local-qa-build-practice.md`
- [ ] Verify: push `release/ios` → CI xanh → TestFlight + Firebase nhận build QA

---

## 11. Journal — Những gì học được & quyết định thực tế

### Sai lệch so với plan ban đầu

| Plan | Thực tế | Lý do |
|---|---|---|
| ENVFILE inject qua Xcode scheme pre-action | Inject qua `xcargs: "ENVFILE=.env.qa"` trong gym | Pre-action dùng `ActionType` không hợp lệ → Xcode 26 crash (SIGABRT). xcargs không phụ thuộc UI scheme. |
| xcconfig assign qua Xcode dropdown | Set `DISPLAY_NAME` + `PRODUCT_BUNDLE_IDENTIFIER` trực tiếp trong pbxproj | xcconfig file không có file reference trong pbxproj → không hiện trong dropdown Xcode. Sửa pbxproj trực tiếp an toàn hơn drag-and-drop. |
| Icon set `AppIcon-QA` riêng trong xcassets | `fastlane-plugin-badge` stamp lúc CI | Icon set thủ công tốn thời gian + khó maintain. Badge plugin stamp ephemeral → không cần Xcode asset mới, không commit thay đổi icon. |

### Pitfall Xcode 26 — scheme crash

Scheme XML có `<PreActions>` block với `ActionType = "Xcode.IDEStandardExecutionActionsCore..."` → Xcode 26 crash ngay khi mở project (`DVTInvalidExtension initWithIdentifier`). Fix: xóa toàn bộ `<PreActions>` block → ENVFILE chuyển sang xcargs.

**Bài học:** Không edit `ActionType` identifier trong scheme XML tay. Nếu cần pre-action, luôn tạo qua Xcode UI rồi copy XML kết quả.

### Bundle ID phân kỳ iOS vs Android

iOS Prod: `com.tuanvu.demoapp` → QA: `com.tuanvu.demoapp.qa`
Android Prod: `corleone.dev.demo_app` → QA: `corleone.dev.demo_app.qa`

Không refactor lại cho đồng nhất — risk cao, không có giá trị học tập, và bundle ID đã publish không nên đổi.

### 2 kênh distribution = 2 lần `gym`

App-store signed IPA ≠ ad-hoc signed IPA. Không thể reuse IPA giữa TestFlight và Firebase. Lane `distribute_qa` phải chạy 2 `match` + 2 `gym`: tốn ~35-50 phút và ~$3-4/run trên macOS runner.

### `.env.qa` gitignored → cần inject trên CI

`.env.*` bị ignore theo convention (trừ `.env.example`). CI cần file này trước khi gym build. Giải pháp: lưu nội dung `.env.qa` vào GitHub Secret `ENV_QA`, workflow write ra file trước khi chạy fastlane:
```yaml
- name: Write .env.qa
  run: echo "${{ secrets.ENV_QA }}" > .env.qa
```

### Apple Developer Portal → App Store Connect: thứ tự bắt buộc

Bundle ID phải **register trong Developer Portal trước**, ASC mới thấy trong dropdown "Bundle ID". Nếu tạo app trong ASC trước khi register → dropdown trống, không create được. Đây là flow 1 chiều: Developer Portal → ASC.
