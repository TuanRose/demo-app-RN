# CI/CD Troubleshooting Log — iOS TestFlight via GitHub Actions + Fastlane

> Ghi lại toàn bộ lỗi theo thứ tự xảy ra trong quá trình setup CI/CD cho demo_app.
> Stack: GitHub Actions · Fastlane gym/pilot · Manual signing · macos-15 runner

---

## Lỗi 1 — `React Native requires XCode >= 16.1. Found 15.4`

**Bước lỗi**: Install Pods

**Log**:
```
React Native requires XCode >= 16.1. Found 15.4.
```

**Root cause**: Runner `macos-14` chỉ có Xcode 15.4 sẵn. RN 0.85 kiểm tra Xcode version trong `use_react_native!` và reject nếu < 16.1.

**Fix**:
```yaml
# .github/workflows/deploy-testflight.yml
- runs-on: macos-14   # ❌
+ runs-on: macos-15   # ✅ — macos-15 có Xcode 16.x
```

**Bài học**: Luôn check Xcode version requirement của RN version đang dùng trước khi chọn runner. RN 0.85+ cần macos-15.

---

## Lỗi 2 — `No Accounts: Add a new account. No profiles for '***' were found`

**Bước lỗi**: gym (build/archive)

**Log**:
```
No Accounts: Add a new account in Accounts settings.
No profiles for '***' were found.
```

**Root cause**: `app_store_connect_api_key` trong Fastlane chỉ truyền API key cho `pilot`/`deliver`. Nó **không** truyền key cho subprocess `xcodebuild`. Khi dùng `-allowProvisioningUpdates`, xcodebuild cần nhận key qua `-authenticationKeyPath/-authenticationKeyID/-authenticationKeyIssuerID` riêng.

**Fix ban đầu** (sau đó bị thay thế bởi manual signing):
```ruby
# Viết .p8 ra file tạm rồi truyền vào xcargs
p8_path = "#{Dir.tmpdir}/asc_key.p8"
File.write(p8_path, ENV["ASC_KEY_CONTENT"])

xcargs: "-allowProvisioningUpdates " \
        "-authenticationKeyPath '#{p8_path}' " \
        "-authenticationKeyID '#{ENV['ASC_KEY_ID']}' " \
        "-authenticationKeyIssuerID '#{ENV['ASC_ISSUER_ID']}'"
```

**Bài học**: `app_store_connect_api_key` và `xcodebuild` là hai process riêng biệt — key phải được truyền tường minh cho xcodebuild nếu cần download profile tự động.

---

## Lỗi 3 — `No signing certificate "iOS Development" found`

**Bước lỗi**: gym (archive)

**Log**:
```
No signing certificate "iOS Development" found:
No "iOS Development" signing certificate matching team ID "***"
with a private key was found.
```

**Root cause**: Automatic signing yêu cầu CẢ HAI cert: Development + Distribution. CI chỉ import Distribution cert. Xcode cần Development cert để ký các file intermediate trong quá trình build.

**Fix**: Chuyển sang **manual signing** — bỏ hoàn toàn automatic signing, chỉ cần Distribution cert + Provisioning Profile được install sẵn:

```ruby
# Fastfile — gym()
xcargs: "CODE_SIGN_STYLE=Manual",
export_options: {
  method:       "app-store",
  signingStyle: "manual",
  teamID:       ENV["TEAM_ID"],
  provisioningProfiles: {
    ENV["APP_IDENTIFIER"] => "<tên profile>",
  },
},
```

```yaml
# workflow — thêm bước install profile trước khi build
- name: Install Provisioning Profile
  env:
    BUILD_PROVISION_PROFILE_BASE64: ${{ secrets.BUILD_PROVISION_PROFILE_BASE64 }}
  run: |
    PP_PATH=$RUNNER_TEMP/profile.mobileprovision
    echo "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode > $PP_PATH
    mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
    cp $PP_PATH ~/Library/MobileDevice/Provisioning\ Profiles/
```

**Bài học**: CI không nên dùng automatic signing vì thiếu Development cert. Manual signing chỉ cần Distribution cert + profile install sẵn — đơn giản và đáng tin cậy hơn cho CI.

---

## Lỗi 4 — `base64: stdin: (null): error decoding base64 input stream`

**Bước lỗi**: Install Provisioning Profile

**Log**:
```
base64: stdin: (null): error decoding base64 input stream
```

**Root cause**: Cú pháp `base64 --decode -o $FILE` không hoạt động đúng trên macOS runner khi biến env chứa newline hoặc có vấn đề encoding. Flag `-o` gây ra lỗi "(null)".

**Fix**:
```bash
# ❌ Sai — dùng -o flag
echo -n "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode -o $PP_PATH

# ✅ Đúng — redirect vào file
echo "$BUILD_PROVISION_PROFILE_BASE64" | base64 --decode > $PP_PATH
```

**Bài học**: Trên macOS, luôn dùng redirect `>` thay vì `-o` khi decode base64 ra file. Bỏ cả flag `-n` ở `echo` để tránh trim newline cần thiết.

---

## Lỗi 5 — `"demo_app" requires a provisioning profile`

**Bước lỗi**: gym (archive)

**Log**:
```
"demo_app" requires a provisioning profile.
Select a provisioning profile in the Signing & Capabilities editor.
(in target 'demo_app' from project 'demo_app')
** ARCHIVE FAILED **
Exit status: 65
```

**Root cause**: `CODE_SIGN_STYLE=Manual` đã được set trong xcargs nhưng thiếu `PROVISIONING_PROFILE_SPECIFIER`. xcodebuild chuyển sang manual signing nhưng không biết profile nào cần dùng cho **build/archive phase**. `export_options` chỉ áp dụng cho **export phase** — hai phase này độc lập.

**Fix**:
```ruby
xcargs: "CODE_SIGN_STYLE=Manual " \
        "CODE_SIGN_IDENTITY='Apple Distribution' " \
        "PROVISIONING_PROFILE_SPECIFIER='<tên profile>'",
```

**Bài học**: Manual signing cần chỉ định profile ở **hai nơi**:
- `xcargs`: cho build/archive phase (`xcodebuild archive`)
- `export_options.provisioningProfiles`: cho export phase (`xcodebuild -exportArchive`)

---

## Lỗi 6 — `Provisioning profile is Xcode managed, but signing settings require a manually managed profile`

**Bước lỗi**: gym (archive)

**Log**:
```
Provisioning profile "iOS Team Store Provisioning Profile: ***" is Xcode managed,
but signing settings require a manually managed profile.
(in target 'demo_app' from project 'demo_app')
** ARCHIVE FAILED **
Exit status: 65
```

**Root cause**: Profile được export từ máy local (`~/Library/Developer/Xcode/UserData/Provisioning Profiles/`) là "**Xcode managed profile**" — được tạo tự động bởi Xcode automatic signing. Khi set `CODE_SIGN_STYLE=Manual`, xcodebuild từ chối Xcode managed profile và yêu cầu profile được tạo thủ công.

**Phân biệt**:
| Loại profile | Tạo bởi | Tương thích với |
|---|---|---|
| **Xcode managed** | Xcode automatic signing | Chỉ dùng được khi `CODE_SIGN_STYLE=Automatic` |
| **Manually managed** | Apple Developer Portal | Dùng được khi `CODE_SIGN_STYLE=Manual` |

**Fix**:
1. Vào [developer.apple.com](https://developer.apple.com) → Certificates, Identifiers & Profiles → Profiles
2. Tạo mới: **App Store Connect** → chọn App ID → chọn Distribution cert → đặt tên
3. Download `.mobileprovision`
4. Base64 encode: `base64 -i ~/Downloads/<file>.mobileprovision | pbcopy`
5. Update GitHub Secret `BUILD_PROVISION_PROFILE_BASE64`
6. Update tên profile trong Fastfile (xcargs + export_options)

**Bài học**: Profile export từ Xcode local ≠ profile tạo từ Developer Portal. Cho CI/manual signing luôn dùng profile tải thẳng từ Developer Portal.

---

## Lỗi 7 — `The bundle version must be higher than the previously uploaded version: '6'`

**Bước lỗi**: pilot (upload lên TestFlight)

**Trạng thái khi lỗi**: Archive và IPA export **thành công** — lỗi chỉ xảy ra ở bước upload.

**Log**:
```
The bundle version must be higher than the previously uploaded version: '6'.
ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE
```

**Root cause**: CI runner là ephemeral — mỗi lần chạy là một máy sạch, không giữ state. `increment_build_number` đọc build number từ file `.xcodeproj` trong repo (luôn là giá trị cũ), increment lên 6. Nhưng build number 6 đã được upload ở lần CI trước → Apple từ chối duplicate.

Vấn đề cốt lõi: build number trong repo không đồng bộ với build number đã upload lên ASC.

**Fix**: Query ASC để lấy build number cao nhất hiện tại, rồi +1:

```ruby
# Fastfile
api_key = app_store_connect_api_key(...)

# WHY: CI runner là ephemeral — xcodeproj trong repo luôn giữ build number cũ.
# Phải query ASC để lấy build number thực tế đang cao nhất, rồi +1.
latest_build = latest_testflight_build_number(
  api_key:        api_key,
  app_identifier: ENV["APP_IDENTIFIER"],
)
increment_build_number(
  build_number: latest_build + 1,
  xcodeproj:    "ios/demo_app.xcodeproj"
)
```

**Tại sao `latest_testflight_build_number` phải đặt sau `app_store_connect_api_key`**: action này cần `api_key` để authenticate với ASC API.

**Bài học**: Trên CI, không bao giờ dùng `increment_build_number` thuần (không truyền `build_number`). Luôn query ASC để đồng bộ build number thực tế.

---

## Lỗi 8 — `Must be built with the iOS 26 SDK or later`

**Bước lỗi**: pilot (upload lên TestFlight)

**Trạng thái khi lỗi**: Archive và IPA export **thành công** — lỗi xảy ra ở bước upload validation.

**Log**:
```
This app was built with the iOS 18.5 SDK. All iOS and iPadOS apps must be built
with the iOS 26 SDK or later, included in Xcode 26 or later, in order to be
uploaded to App Store Connect or submitted for distribution.
STATE_ERROR.VALIDATION_ERROR
```

**Root cause**: Đây là **Apple policy change** — không phải lỗi code. Apple đã yêu cầu tất cả app submission phải dùng iOS 26 SDK (Xcode 26+). Runner `macos-15` mặc định dùng Xcode 16.4 (iOS 18.5 SDK), dù Xcode 26 có thể đã được cài sẵn trên runner. Cần chỉ định rõ version Xcode trước khi build.

**Fix**: Thêm step chọn Xcode 26 trước Install Pods trong workflow:

```yaml
# .github/workflows/deploy-testflight.yml
- name: Select Xcode 26
  uses: maxim-lobanov/setup-xcode@v1
  with:
    xcode-version: 'latest-stable'
```

`latest-stable` tự động chọn Xcode stable mới nhất có trên runner — không cần hardcode version number, tránh phải update lại khi Xcode ra phiên bản mới.

**Vị trí đặt step**: Trước `Install Pods` — CocoaPods cần đúng Xcode toolchain để resolve native dependencies.

**Bài học**: 
- Apple thay đổi SDK requirement định kỳ — không thể dùng runner mặc định mãi mãi.
- Luôn dùng `maxim-lobanov/setup-xcode` để pin hoặc auto-select Xcode version thay vì phụ thuộc vào runner default.
- Khi thấy lỗi `STATE_ERROR.VALIDATION_ERROR` từ altool → kiểm tra Apple developer news, có thể là policy change không phải lỗi code.

---

## Lỗi 9 — `Could not find 'bundler' (2.4.10)` khi chạy local

**Bước lỗi**: `bundle exec fastlane ios sync_certs` trên máy local

**Log**:
```
Could not find 'bundler' (2.4.10) required by your /Gemfile.lock. (Gem::GemNotFoundException)
To install the missing version, run `gem install bundler:2.4.10`
```

**Root cause**: Terminal đang dùng **system Ruby 2.6** của macOS (`/usr/bin/bundle`) thay vì Ruby được quản lý bởi rbenv. Shell session đó không load rbenv init — thường xảy ra khi mở terminal bằng bash thay vì zsh, hoặc profile chưa được source.

**Fix**:
```bash
# Option 1: Init rbenv trong session hiện tại
eval "$(rbenv init -)"
bundle exec fastlane ios sync_certs

# Option 2: Mở terminal mới (iTerm/Terminal.app)
# zsh profile sẽ load rbenv tự động
cd <project-path>
bundle exec fastlane ios sync_certs
```

**Kiểm tra**: `which bundle` phải trả về path của rbenv shim, không phải `/usr/bin/bundle`:
```bash
which bundle   # ✅ /Users/<you>/.rbenv/shims/bundle
               # ❌ /usr/bin/bundle
```

**Bài học**: Trên macOS, luôn dùng rbenv/asdf để quản lý Ruby — không dùng system Ruby 2.6 vốn bị Apple deprecate. Nếu bị lỗi bundler khi chạy local, kiểm tra `which bundle` trước.

---

## Lỗi 10 — `invalid curve name (OpenSSL::PKey::ECError)` khi đọc `.p8` key

**Bước lỗi**: `app_store_connect_api_key` khi chạy local

**Log**:
```
[!] invalid curve name (OpenSSL::PKey::ECError)
spaceship/lib/spaceship/connect_api/token.rb:71:in `initialize'
WARNING: Support for your Ruby version (3.2.2) is going away.
fastlane will soon require Ruby 3.3.0 or newer.
```

**Root cause**: Ruby 3.2.2 từ rbenv được link với OpenSSL không nhận tên curve của Apple `.p8` key (EC P-256/prime256v1). Ruby 3.3.x fix vấn đề này vì được link với Homebrew `openssl@3` có đầy đủ curve name support. Fastlane cũng đã deprecate Ruby 3.2.x.

**Fix**:
```bash
# Update rbenv và ruby-build để có Ruby 3.3.x
brew upgrade rbenv ruby-build

# Install Ruby 3.3.6 (hoặc latest 3.3.x)
rbenv install 3.3.6

# Set cho project
rbenv local 3.3.6        # tạo .ruby-version

# Reinstall bundler và tất cả gems với Ruby mới
gem install bundler
bundle install

# Chạy lại
bundle exec fastlane ios sync_certs
```

**Bài học**: Luôn dùng Ruby version mà Fastlane đang support (hiện tại 3.3+). Khi thấy `OpenSSL::PKey::ECError` với key từ Apple — nguyên nhân gần như luôn là OpenSSL version, không phải nội dung key sai.

---

## Lỗi 11 — `Could not parse PKey` / `ASC_KEY_CONTENT` empty khi chạy local

**Bước lỗi**: `app_store_connect_api_key` khi chạy `bundle exec fastlane ios sync_certs` local

**Log**:
```
[!] Could not parse PKey (OpenSSL::PKey::PKeyError)
spaceship/lib/spaceship/connect_api/token.rb:71:in `read'
```

**Root cause**: `fastlane/.env` lưu `ASC_KEY_CONTENT` dạng multiline **không có double quotes**. Dotenv parser của Fastlane chỉ đọc đến hết dòng đầu tiên — kết quả là `ASC_KEY_CONTENT` nhận được chỉ là `-----BEGIN PRIVATE KEY-----` (thiếu body và footer), hoặc rỗng hoàn toàn. `OpenSSL::PKey.read` nhận chuỗi cụt → fail.

Ngoài ra file `.env` còn thiếu `ASC_KEY_ID` và `ASC_ISSUER_ID`.

**Fix** — wrap `ASC_KEY_CONTENT` trong double quotes trong `fastlane/.env`:
```bash
# ❌ Sai — dotenv chỉ đọc dòng đầu
ASC_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEA...
-----END PRIVATE KEY-----

# ✅ Đúng — toàn bộ nội dung được đọc
ASC_KEY_CONTENT="-----BEGIN PRIVATE KEY-----
MIGTAgEA...
-----END PRIVATE KEY-----"
```

Thêm đủ các biến còn thiếu:
```bash
ASC_KEY_ID=<key_id>
ASC_ISSUER_ID=<issuer_id>
MATCH_GIT_BASIC_AUTH=<username>:<PAT>
```

**Bài học**: Giá trị multiline trong `.env` file **bắt buộc phải có double quotes**. Khi gặp lỗi parse key, kiểm tra env var có được set không trước khi đi sâu vào debug OpenSSL.

---

## Lỗi 12 — `fatal: protocol 'MATCH_GIT_URL=https' is not supported`

**Bước lỗi**: `match` khi chạy `bundle exec fastlane ios sync_certs` local

**Log**:
```
fatal: protocol 'MATCH_GIT_URL=https' is not supported
$ git clone MATCH_GIT_URL\=https://username:token@github.com/...
```

**Root cause**: Khi sửa `fastlane/.env` để embed credentials vào URL, user gõ nhầm thành:
```bash
# ❌ Sai — lặp tên biến
MATCH_GIT_URL=MATCH_GIT_URL=https://username:token@github.com/...
```
Dotenv đọc toàn bộ phần sau dấu `=` đầu tiên là value — bao gồm cả `MATCH_GIT_URL=https://...`. Git nhận URL là `MATCH_GIT_URL=https://...` → không nhận ra protocol.

**Fix**:
```bash
# ✅ Đúng — credentials embed trực tiếp trong URL
MATCH_GIT_URL=https://username:ghp_TOKEN@github.com/org/certs-repo.git
```

**Bài học**: Khi embed credentials vào `MATCH_GIT_URL`, chỉ ghi tên biến **một lần**. Nếu `MATCH_GIT_BASIC_AUTH` không hoạt động (do dotenv quirks), dùng URL có credentials là cách đáng tin cậy hơn cho local. CI dùng `MATCH_GIT_BASIC_AUTH` vì env var được inject trực tiếp (không qua dotenv parsing).

---

## Lỗi 13 — `remote: Invalid username or token. Password authentication is not supported`

**Bước lỗi**: `match` (clone certs repo trên CI)

**Log**:
```
remote: Invalid username or token. Password authentication is not supported for Git operations.
fatal: Authentication failed for '***/'
[!] Error cloning certificates repo
```

**Root cause**: Secret `MATCH_GIT_TOKEN` **chưa được tạo** trên GitHub Actions secrets của RN app repo. Khi CI runner thực thi step `git config url.insteadOf` / `credential.helper store`, token được inject là chuỗi rỗng → GitHub nhận auth request không hợp lệ.

Các approach đã thử trước đó thất bại:
- Embed credentials vào `MATCH_GIT_URL` → fastlane strip credentials trước khi clone
- `git_basic_authorization` trong Fastfile → secret `MATCH_GIT_BASIC_AUTH` không được set
- `git_url: ENV["MATCH_GIT_URL"]` explicit trong match → không giải quyết auth, chỉ redundant với Matchfile
- `url.insteadOf` → đúng cơ chế nhưng token rỗng vì secret chưa tồn tại

**Fix** — Tạo secret `MATCH_GIT_TOKEN` + dùng `git_basic_authorization` trong Fastfile (fastlane-native, không cần workflow step riêng):

```ruby
# Fastfile — cả sync_certs và beta lane
match(
  type:                    "appstore",
  readonly:                true,
  api_key:                 api_key,
  app_identifier:          ENV["APP_IDENTIFIER"],
  git_url:                 ENV["MATCH_GIT_URL"],
  git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}"),
)
```

```yaml
# .github/workflows/deploy-testflight.yml — thêm MATCH_GIT_TOKEN vào env của fastlane step
- name: Deploy to TestFlight
  env:
    MATCH_GIT_URL:   ${{ secrets.MATCH_GIT_URL }}
    MATCH_PASSWORD:  ${{ secrets.MATCH_PASSWORD }}
    MATCH_GIT_TOKEN: ${{ secrets.MATCH_GIT_TOKEN }}   # ← thêm dòng này
    # ... các env khác
  run: bundle exec fastlane ios beta
```

GitHub Secrets cần có (không thay đổi so với cách cũ, chỉ khác cách dùng):
- `MATCH_GIT_TOKEN` = PAT với scope `repo` (read access trên certs repo)
- `MATCH_GIT_URL` = `https://github.com/Antonio-Corleone/demo-app-certs.git` (plain HTTPS, không token)

**Tại sao `git_basic_authorization` tốt hơn `credential.helper store`**:
- Không cần step riêng trong workflow — self-contained trong Fastfile
- Scoped chỉ trong match — không pollute git config của toàn runner
- Fastlane-native first-class param — không phụ thuộc git config behavior của runner

**Bài học**: Khi thấy "Invalid username or token" (khác với "could not read Username") → token được inject nhưng sai hoặc rỗng, không phải vấn đề cơ chế. Kiểm tra secret đã tồn tại chưa trước khi debug approach.

---

## Lỗi 14 — `No profiles for '***' were found` sau khi match pass

**Bước lỗi**: `gym` (archive)

**Log**:
```
No profiles for '***' were found: Xcode couldn't find any iOS App Development
provisioning profiles matching '***'. Automatic signing is disabled and unable
to generate a profile.
** ARCHIVE FAILED **
Exit status: 65
```

**Root cause**: Match đã download và install profile thành công (`MATCH_PROVISIONING_PROFILE_MAPPING` trong Lane Context có giá trị). Nhưng Xcode project có `PROVISIONING_PROFILE_SPECIFIER` hardcoded khác với tên profile match tạo ra. Match naming convention: `match AppStore <bundle_id>` — Xcode project không biết điều này.

**Fix**: Override `PROVISIONING_PROFILE_SPECIFIER` trong xcargs của gym:

```ruby
# Fastfile — gym()
xcargs: "PROVISIONING_PROFILE_SPECIFIER='match AppStore #{ENV["APP_IDENTIFIER"]}' " \
        "CODE_SIGN_IDENTITY='iPhone Distribution'",
```

**Bài học**: Match install profile thành công ≠ Xcode tự biết dùng profile đó. Phải chỉ định tường minh qua xcargs. Profile name luôn theo format `match AppStore <bundle_id>` — deterministic, không cần hardcode tên.

---

## Lỗi 15 — `conflicting provisioning settings: automatically signed but manually specified`

**Bước lỗi**: `gym` (archive)

**Log**:
```
demo_app has conflicting provisioning settings. demo_app is automatically signed,
but provisioning profile match AppStore *** has been manually specified.
Set the provisioning profile value to "Automatic" in the build settings editor,
or switch to manual signing in the Signing & Capabilities editor.
** ARCHIVE FAILED **
Exit status: 65
```

**Root cause**: Xcode project đang bật **Automatic Signing** (`CODE_SIGN_STYLE = Automatic`). Khi xcargs chỉ định `PROVISIONING_PROFILE_SPECIFIER`, xcodebuild phát hiện conflict — automatic signing không cho phép chỉ định profile cứng.

**Tại sao phải dùng Manual Signing với match**:
| | Automatic Signing | Manual Signing (match) |
|--|--|--|
| Ai quản lý cert/profile? | Xcode tự tạo/chọn | match (git repo) |
| Cần Apple ID login? | Có | Không |
| CI ephemeral runner | ❌ | ✅ |

**Fix**: Thêm `CODE_SIGN_STYLE=Manual` vào xcargs:

```ruby
# Fastfile — gym()
xcargs: "CODE_SIGN_STYLE=Manual " \
        "PROVISIONING_PROFILE_SPECIFIER='match AppStore #{ENV["APP_IDENTIFIER"]}' " \
        "CODE_SIGN_IDENTITY='iPhone Distribution'",
```

**Bài học**: Dùng match = bắt buộc manual signing. Automatic Signing và match không thể cùng tồn tại — match quản lý cert/profile, Automatic Signing cũng muốn tự quản lý → conflict.

---

## Tổng quan các GitHub Secrets cần thiết

> Phiên bản hiện tại: **Fastlane match** + `credential.helper store` cho git auth

| Secret | Nội dung |
|---|---|
| `ASC_KEY_ID` | Key ID của App Store Connect API Key |
| `ASC_ISSUER_ID` | Issuer ID của ASC API Key |
| `ASC_KEY_CONTENT` | Nội dung file `.p8` (toàn bộ text kể cả header/footer) |
| `APP_IDENTIFIER` | Bundle ID: `com.tuanvu.demoapp` |
| `TEAM_ID` | Apple Team ID |
| `MATCH_GIT_URL` | Plain HTTPS URL của certs repo: `https://github.com/org/repo.git` |
| `MATCH_PASSWORD` | Mật khẩu encrypt/decrypt match repo |
| `MATCH_GIT_TOKEN` | PAT (classic, scope `repo`) để clone private certs repo |

> Secrets cũ không còn dùng (có thể xóa): `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `KEYCHAIN_PASSWORD`, `BUILD_PROVISION_PROFILE_BASE64`, `MATCH_GIT_BASIC_AUTH`

---

## Checklist hoàn thiện CI sau khi sync_certs thành công

- [ ] Set/update các GitHub Secrets trên repo RN app:
  - `MATCH_GIT_URL` = `https://github.com/Antonio-Corleone/demo-app-certs.git`
  - `MATCH_PASSWORD` = mật khẩu match repo
  - `MATCH_GIT_TOKEN` = PAT classic với scope `repo`
  - Kiểm tra còn đủ: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT`, `APP_IDENTIFIER`, `TEAM_ID`
- [ ] Xóa secrets cũ không còn dùng: `BUILD_CERTIFICATE_BASE64`, `P12_PASSWORD`, `KEYCHAIN_PASSWORD`, `BUILD_PROVISION_PROFILE_BASE64`, `MATCH_GIT_BASIC_AUTH`
- [ ] Push branch `CICD-Fastlane-match` để trigger CI pipeline
- [ ] Verify CI chạy thành công end-to-end (gym build + pilot upload)

---

## Timeline tóm tắt

```
Lỗi 1: macos-14 → Xcode 15.4 quá cũ
  Fix: đổi sang macos-15

Lỗi 2: API key không truyền được vào xcodebuild
  Fix: thử viết .p8 ra file tạm (bị thay thế bởi manual signing)

Lỗi 3: automatic signing cần Development cert — CI không có
  Fix: chuyển sang manual signing, install profile thủ công

Lỗi 4: base64 decode lỗi cú pháp -o flag
  Fix: dùng redirect > thay vì -o

Lỗi 5: CODE_SIGN_STYLE=Manual nhưng thiếu PROVISIONING_PROFILE_SPECIFIER
  Fix: thêm PROVISIONING_PROFILE_SPECIFIER + CODE_SIGN_IDENTITY vào xcargs

Lỗi 6: profile từ local là Xcode managed — không dùng được với manual signing
  Fix: tạo profile thủ công từ Apple Developer Portal

Lỗi 7: build number duplicate — CI runner reset, số cũ đã upload lên ASC
  Fix: dùng latest_testflight_build_number + 1 thay vì increment thuần

Lỗi 8: Apple policy — yêu cầu iOS 26 SDK, runner default dùng Xcode 16.4
  Fix: thêm maxim-lobanov/setup-xcode@v1 với xcode-version: 'latest-stable'

Lỗi 9: bundle exec dùng system Ruby 2.6 thay vì rbenv Ruby — bundler version không khớp
  Fix: eval "$(rbenv init -)" rồi chạy lại, hoặc mở terminal mới

Lỗi 10: OpenSSL::PKey::ECError — invalid curve name khi đọc .p8 key
  Fix: nâng Ruby lên 3.3.x (rbenv install 3.3.6) để link đúng openssl@3

Lỗi 11: Could not parse PKey — ASC_KEY_CONTENT multiline không có quotes trong .env
  Fix: wrap giá trị multiline trong double quotes, thêm ASC_KEY_ID + ASC_ISSUER_ID

Lỗi 12: fatal: protocol 'MATCH_GIT_URL=https' — tên biến bị lặp trong .env value
  Fix: MATCH_GIT_URL=https://username:token@github.com/... (chỉ một lần tên biến)

✅ sync_certs thành công — certs + profiles đã push lên demo-app-certs repo

Lỗi 13: Invalid username or token — MATCH_GIT_TOKEN secret chưa được tạo trên GitHub
  Fix: tạo secret MATCH_GIT_TOKEN + dùng credential.helper store inject vào ~/.git-credentials

Lỗi 14: No profiles found — match install xong nhưng Xcode không biết dùng profile nào
  Fix: thêm PROVISIONING_PROFILE_SPECIFIER='match AppStore <bundle_id>' vào gym xcargs

Lỗi 15: conflicting provisioning settings — Xcode project bật Automatic Signing, conflict với match
  Fix: thêm CODE_SIGN_STYLE=Manual vào gym xcargs
```
