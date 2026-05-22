# CI/CD Pipelines thực tế — GitHub Actions, Bitrise, EAS Build

> Tài liệu này là phần thực hành: ghép Fastlane vào CI cụ thể, secrets management, caching, và workflow đầy đủ end-to-end.
>
> **Nguồn tham khảo chính**:
> - https://docs.github.com/en/actions
> - https://devcenter.bitrise.io
> - https://docs.expo.dev/eas/
> - https://circleci.com/docs

---

## 1. Yêu cầu của 1 mobile CI pipeline tốt

```
   ┌─────────────────────────────────────────────────────┐
   │  Mục tiêu cốt lõi của mobile CI:                    │
   │                                                     │
   │  1. Reproducible — cùng commit → cùng artifact      │
   │  2. Fast — cache aggressively, parallel khi có thể  │
   │  3. Secure — không leak cert/keystore               │
   │  4. Observable — biết build nào fail vì sao         │
   │  5. Self-serve — dev tự trigger được                │
   └─────────────────────────────────────────────────────┘
```

### 1.1. Trigger strategy chuẩn

```
   ┌─────────────────────────────────────────────────────┐
   │  PR open / push to PR        → lint + test          │
   │  Push to develop             → build dev (Firebase) │
   │  Push to release/x.y.z       → build beta (TF + IT) │
   │  Tag vX.Y.Z                  → build production     │
   │  Manual workflow_dispatch    → tuỳ chọn track       │
   └─────────────────────────────────────────────────────┘
```

### 1.2. Job topology

```
   ┌──────────┐
   │  lint    │
   └────┬─────┘
        │
        ▼
   ┌──────────┐    parallel    ┌──────────┐
   │   test   │ ─────────────► │  build   │
   └──────────┘                │ iOS+And  │
                               └────┬─────┘
                                    │
                                    ▼
                               ┌──────────┐
                               │  deploy  │
                               └──────────┘
```

→ Tách lint+test (chạy nhanh, máy Linux rẻ) khỏi build (cần macOS đắt).

---

## 2. GitHub Actions — workflow đầy đủ cho RN

### 2.1. Stack chọn

```
   ┌─────────────────────────────────────────────────────┐
   │  GitHub Actions (CI orchestrator)                   │
   │   + macos-14 runner (cho iOS)                       │
   │   + ubuntu-latest runner (cho Android, lint, test)  │
   │   + Fastlane (build + sign + upload)                │
   │   + Match (cert sync)                               │
   │   + Secrets manager: GitHub Secrets                 │
   └─────────────────────────────────────────────────────┘
```

### 2.2. Folder structure

```
.github/
└── workflows/
    ├── ci.yml              ← lint + test (mọi PR)
    ├── ios-beta.yml        ← build iOS beta
    ├── android-internal.yml ← build Android internal
    └── release.yml         ← production build (trigger by tag)
```

### 2.3. CI workflow — lint + test (chạy mọi PR)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Unit tests
        run: npm test -- --coverage

      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

### 2.4. iOS beta workflow

```yaml
# .github/workflows/ios-beta.yml
name: iOS Beta (TestFlight)

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  build-and-upload:
    runs-on: macos-14
    timeout-minutes: 60

    env:
      LANG: en_US.UTF-8
      LC_ALL: en_US.UTF-8
      MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
      MATCH_GIT_BASIC_AUTHORIZATION: ${{ secrets.MATCH_GIT_BASIC_AUTHORIZATION }}
      ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
      ASC_ISSUER_ID: ${{ secrets.ASC_ISSUER_ID }}
      ASC_KEY_CONTENT: ${{ secrets.ASC_KEY_CONTENT }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}

    steps:
      - uses: actions/checkout@v4

      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_16.app

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true   # auto cache + bundle install

      - name: Install JS deps
        run: npm ci

      - name: Cache Pods
        uses: actions/cache@v4
        with:
          path: ios/Pods
          key: pods-${{ hashFiles('ios/Podfile.lock') }}
          restore-keys: |
            pods-

      - name: Install Pods
        working-directory: ios
        run: |
          bundle exec pod install --repo-update

      - name: Run Fastlane beta
        working-directory: ios
        run: bundle exec fastlane beta

      - name: Upload .ipa as artifact
        uses: actions/upload-artifact@v4
        with:
          name: ios-ipa
          path: ios/build/*.ipa
          retention-days: 7
```

### 2.5. Android internal workflow

```yaml
# .github/workflows/android-internal.yml
name: Android Internal

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  build-and-upload:
    runs-on: ubuntu-latest
    timeout-minutes: 45

    env:
      KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
      KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
      KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
      SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '17'

      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true

      - name: Install JS deps
        run: npm ci

      - name: Decode keystore
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android/app/release.keystore
          echo "KEYSTORE_PATH=$(pwd)/android/app/release.keystore" >> $GITHUB_ENV

      - name: Decode Play Store JSON key
        run: |
          echo "${{ secrets.PLAY_STORE_JSON_KEY }}" | base64 -d > android/play-store-key.json
          echo "PLAY_STORE_JSON_KEY_PATH=$(pwd)/android/play-store-key.json" >> $GITHUB_ENV

      - name: Cache Gradle
        uses: actions/cache@v4
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: gradle-${{ hashFiles('android/**/*.gradle*', 'android/**/gradle-wrapper.properties') }}
          restore-keys: |
            gradle-

      - name: Run Fastlane
        working-directory: android
        run: bundle exec fastlane internal

      - name: Cleanup secrets
        if: always()
        run: |
          rm -f android/app/release.keystore
          rm -f android/play-store-key.json

      - uses: actions/upload-artifact@v4
        with:
          name: android-aab
          path: android/app/build/outputs/bundle/release/*.aab
          retention-days: 7
```

### 2.6. Production release (trigger by tag)

```yaml
# .github/workflows/release.yml
name: Production Release

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  ios:
    runs-on: macos-14
    # ... giống ios-beta nhưng gọi: bundle exec fastlane release
    steps:
      # ... như trên
      - name: Run Fastlane release
        working-directory: ios
        run: bundle exec fastlane release

  android:
    runs-on: ubuntu-latest
    # ... build .aab + upload track production với rollout 10%
    steps:
      # ...
      - name: Run Fastlane production
        working-directory: android
        run: bundle exec fastlane production
```

### 2.7. Cách set GitHub Secrets

```
   GitHub repo → Settings → Secrets and variables → Actions → New
```

Cần encode base64 cho file binary:

```bash
# .p8 (App Store Connect API key)
base64 -i AuthKey_ABC123XYZ.p8 | pbcopy   # macOS
base64 -w0 AuthKey_ABC123XYZ.p8           # Linux

# .keystore
base64 -i release.keystore | pbcopy

# Play Store JSON key
base64 -i play-store-key.json | pbcopy

# Match git authorization (HTTPS):
echo -n "username:personal_access_token" | base64
```

---

## 3. Bitrise — mobile-first CI

### 3.1. Bitrise vs GitHub Actions

| | GitHub Actions | Bitrise |
|---|---|---|
| Setup | YAML | UI workflow editor + bitrise.yml |
| Mobile-specific steps | ❌ tự config | ✅ steps có sẵn |
| iOS code signing | Manual / Match | ✅ Code Signing & Files manager UI |
| Pricing | Per-minute | Per-build slot |
| Self-host | ✅ macOS runners | ✅ Bitrise build machine on-prem |
| Khi nào | Đã dùng GitHub | Team mobile-only, muốn đỡ config |

### 3.2. bitrise.yml mẫu

```yaml
format_version: '11'
default_step_lib_source: https://github.com/bitrise-io/bitrise-steplib.git

workflows:
  ios-beta:
    steps:
      - activate-ssh-key@4: {}
      - git-clone@8: {}
      - cache-pull@2: {}
      - npm@1:
          inputs:
            - command: ci
      - cocoapods-install@2:
          inputs:
            - source_root_path: ios
      - fastlane@3:
          inputs:
            - work_dir: ios
            - lane: beta
      - cache-push@2: {}
      - deploy-to-bitrise-io@2: {}

trigger_map:
  - push_branch: develop
    workflow: ios-beta
```

### 3.3. Code Signing trên Bitrise

Bitrise có **Code Signing & Files** UI:
- Upload `.p12` cert + `.mobileprovision` profile.
- Hoặc upload Match repo credentials.
- Step `certificate-and-profile-installer@1` tự cài vào keychain runner.

→ Đỡ config hơn GitHub Actions, nhưng vendor lock-in nhẹ.

---

## 4. EAS Build — cho Expo & RN bare

### 4.1. EAS là gì?

```
   ┌────────────────────────────────────────────────────┐
   │  EAS (Expo Application Services)                   │
   │                                                    │
   │   - eas build       → cloud build .ipa / .aab      │
   │   - eas submit      → upload TF / Play             │
   │   - eas update      → OTA JS bundle                │
   │   - eas credentials → quản lý cert/profile         │
   │                                                    │
   │   → Không cần Mac, không cần Fastlane              │
   │   → Hoạt động cho cả bare RN, không chỉ Expo       │
   └────────────────────────────────────────────────────┘
```

### 4.2. Setup

```bash
npm install -g eas-cli
eas login

# Init eas.json
eas build:configure
```

### 4.3. eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "resourceClass": "m-medium" },
      "android": { "buildType": "apk" }
    },
    "production": {
      "channel": "production",
      "ios": { "resourceClass": "m-medium" },
      "android": { "buildType": "app-bundle" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345",
        "appleId": "dev@mycompany.com"
      },
      "android": {
        "serviceAccountKeyPath": "./play-store-key.json",
        "track": "internal"
      }
    }
  }
}
```

### 4.4. Lệnh chạy

```bash
# Build cloud
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all

# Submit
eas submit --profile production --platform ios --latest
eas submit --profile production --platform android --latest

# OTA update
eas update --branch production --message "Bug fixes"
```

### 4.5. EAS quản lý credentials thế nào

```
   ┌──────────────────────────────────────────────────┐
   │  Lần đầu chạy `eas build`:                       │
   │   - EAS hỏi → "Bạn muốn EAS quản lý cert?"       │
   │   - Yes → EAS tạo cert + profile, lưu trên cloud │
   │   - Hoặc upload .p12 / .mobileprovision có sẵn   │
   │                                                  │
   │   Build trên cloud machine của Expo, không cần   │
   │   secret nào trong CI cả.                        │
   └──────────────────────────────────────────────────┘
```

### 4.6. EAS + GitHub Actions

```yaml
name: EAS Production Build

on:
  push:
    tags: ['v*.*.*']

jobs:
  build:
    runs-on: ubuntu-latest    # ✅ Linux đủ! Build chạy trên Expo cloud
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: npm ci
      - run: eas build --platform all --profile production --non-interactive --no-wait
      - run: eas submit --platform all --profile production --non-interactive --latest
```

### 4.7. Khi nào EAS thay được Fastlane?

| | EAS | Fastlane |
|---|---|---|
| Cần Mac runner? | ❌ | ✅ |
| Cấu hình | JSON đơn giản | Ruby Fastfile (linh hoạt hơn) |
| Custom logic | Hạn chế (eas.json + hooks) | Free-form |
| Hỗ trợ RN bare | ✅ | ✅ |
| Vendor lock-in | Cao (Expo cloud) | Thấp |
| Free tier | Có giới hạn build/tháng | Miễn phí (tính tiền CI runner) |

→ **Project nhỏ-vừa, không cần native module phức tạp**: EAS đơn giản hơn Fastlane.
→ **Project enterprise, cần fine control**: Fastlane + GitHub Actions linh hoạt hơn.
→ **Lai**: dùng EAS cho dev/preview build, Fastlane cho production.

---

## 5. Caching strategy — cách giảm thời gian build

### 5.1. Cái gì nên cache

```
   ┌────────────────────────────────────────────────────┐
   │  Cache key                          | Hit speedup  │
   │ ────────────────────────────────────|──────────────│
   │  node_modules      (package-lock)   |  ~3-5 phút   │
   │  ios/Pods          (Podfile.lock)   |  ~5-10 phút  │
   │  ~/.gradle/caches  (gradle files)   |  ~3-7 phút   │
   │  ~/Library/Caches/CocoaPods (specs) |  ~2 phút     │
   │  Ruby gems         (Gemfile.lock)   |  ~1-2 phút   │
   │  Hermes precompile (deterministic)  |  ~1 phút     │
   └────────────────────────────────────────────────────┘
```

### 5.2. GitHub Actions caching — 2 layers

```yaml
# Layer 1: built-in cho actions/setup-* (đơn giản, có sẵn)
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'                       # cache ~/.npm

- uses: ruby/setup-ruby@v1
  with:
    bundler-cache: true                # auto cache vendor/bundle

# Layer 2: actions/cache cho cache custom
- uses: actions/cache@v4
  with:
    path: ios/Pods
    key: pods-${{ runner.os }}-${{ hashFiles('ios/Podfile.lock') }}
    restore-keys: |
      pods-${{ runner.os }}-
```

### 5.3. CocoaPods specific — cache repo

```yaml
- uses: actions/cache@v4
  with:
    path: ~/Library/Caches/CocoaPods
    key: cocoapods-${{ runner.os }}-${{ hashFiles('ios/Podfile.lock') }}
```

### 5.4. Gradle caching

```yaml
- uses: gradle/actions/setup-gradle@v3
  with:
    cache-disabled: false
    cache-read-only: ${{ github.ref != 'refs/heads/develop' }}
```

→ Plugin chính chủ Gradle, hiệu quả hơn `actions/cache` thông thường.

---

## 6. Self-hosted Mac runner — khi build quá nhiều

GitHub Actions macos runner đắt (~$0.08/phút). Nếu build 50 lần/ngày, 1 Mac mini M2 (~$600) hoàn vốn trong 2-3 tháng.

### 6.1. Setup runner

```bash
# Trên Mac (đã cài Xcode, Ruby, Node, ...)
mkdir actions-runner && cd actions-runner

# Tải runner từ https://github.com/<org>/<repo>/settings/actions/runners/new
curl -o actions-runner-osx-arm64-2.x.x.tar.gz -L <url>
tar xzf actions-runner-osx-arm64-2.x.x.tar.gz

./config.sh --url https://github.com/<org>/<repo> --token <token>
./svc.sh install        # service auto-start
./svc.sh start
```

```yaml
# Workflow
jobs:
  build:
    runs-on: [self-hosted, macOS, arm64]
```

### 6.2. Lưu ý self-host

- Cleanup giữa các job (Fastlane `setup_ci` lo phần keychain).
- Disk thường đầy (Pods, DerivedData) → cron clean.
- Update Xcode khi có bản mới — manual.
- Bảo mật: không expose runner ra internet, dùng GitHub-managed token.

---

## 7. Secrets management nâng cao

### 7.1. Tránh leak khi log

```yaml
- name: Print version  # OK, không touch secret
  run: echo "v${{ github.ref_name }}"

- name: Use secret    # GitHub auto-redact secret từ stdout/stderr
  run: echo "Match pwd is $MATCH_PASSWORD"  # log: "Match pwd is ***"
```

GitHub Actions tự redact value của secrets nhưng:
- Nếu secret bị transform (vd `base64 → decode`), sẽ KHÔNG redact bản giải mã.
- Đừng `echo $SECRET | xxd` để debug.

### 7.2. Tách per-environment

```
   GitHub Environments (Settings → Environments):
   ┌────────────────────────────────────────────────┐
   │  development                                   │
   │   - ASC_KEY_ID = dev key                       │
   │  staging                                       │
   │   - ASC_KEY_ID = staging key                   │
   │  production                                    │
   │   - ASC_KEY_ID = prod key                      │
   │   - Required reviewers: tech-lead              │
   └────────────────────────────────────────────────┘
```

```yaml
jobs:
  release:
    environment: production    # cần approval của reviewer
    runs-on: macos-14
    steps:
      - run: echo $ASC_KEY_ID
```

### 7.3. Rotate secrets — quy trình

```
   ┌─────────────────────────────────────────────────┐
   │  Khi cert/keystore lộ:                          │
   │                                                 │
   │  iOS:                                           │
   │  1. Revoke cert trên Apple Dev Portal           │
   │  2. Match: nuke + regenerate                    │
   │     bundle exec fastlane match nuke development │
   │     bundle exec fastlane match nuke distribution│
   │     bundle exec fastlane match appstore         │
   │  3. Update GitHub secret MATCH_PASSWORD nếu cần │
   │                                                 │
   │  Android Upload Key:                            │
   │  1. Tạo upload key mới                          │
   │  2. Play Console → App integrity → Upload key   │
   │     → Request reset, Google email link          │
   │  3. Replace keystore trong CI secret            │
   │                                                 │
   │  ASC API Key:                                   │
   │  1. App Store Connect → Users and Access → Keys │
   │  2. Revoke key cũ, tạo key mới                  │
   │  3. Update CI secret                            │
   └─────────────────────────────────────────────────┘
```

---

## 8. Notification & Observability

### 8.1. Slack notification

```ruby
# Trong Fastfile
after_all do |lane|
  slack(
    message: "✅ Lane #{lane} succeeded",
    payload: {
      "Build Date" => Time.now.to_s,
      "Built by" => "Fastlane",
      "Version" => get_version_number
    },
    default_payloads: [:git_branch, :git_author, :last_git_commit_message],
    slack_url: ENV['SLACK_WEBHOOK_URL']
  )
end
```

### 8.2. Comment lên PR

```yaml
# GitHub Actions
- name: Comment on PR
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '✅ Build successful! Download: ...'
      });
```

### 8.3. Dashboards

| | What |
|---|---|
| **GitHub Actions Insights** | Built-in: success rate, duration trends |
| **Datadog CI Visibility** | Cross-CI dashboard |
| **Bitrise Insights** | Built-in, mobile-specific metrics (build time, queue) |

---

## 9. Pipeline tối ưu cho RN — 3 cấp độ

### 9.1. Level 1 — minimal viable

```
   PR → lint + test (ubuntu)
   Push develop → Fastlane beta iOS + Android
   Tag → Fastlane production
```

→ ~30-60 phút build. Đủ dùng cho team < 5 dev.

### 9.2. Level 2 — caching + parallel

```
   PR → lint + test
   Push develop → parallel:
     - iOS build + TF upload (macos-14, cache pods)
     - Android build + Internal upload (ubuntu, cache gradle)
   Tag → release
```

→ ~15-30 phút. Phù hợp 5-20 dev.

### 9.3. Level 3 — enterprise

```
   PR → lint + test + visual regression test
   Push develop → matrix build (iOS / Android / E2E test)
                → Firebase App Distribution + dogfood
                → Telemetry: build time, app size, dependency count
   Push release/* → beta channel
   Tag → production with staged rollout (1% → 10% → 100%)
   Hotfix → cherry-pick + tag patch
```

→ Cần infra team riêng. Phù hợp > 50 dev hoặc app revenue cao.

---

## 10. Cost estimation

### 10.1. GitHub Actions

```
   macos-14 runners: ~$0.08/phút
   ubuntu-latest:    ~$0.008/phút

   Ví dụ team 10 dev:
   - 50 PRs/tuần × 5 phút (ubuntu) = 250 phút × $0.008 = $2/tuần
   - 5 beta build/tuần × 25 phút (macos) = 125 phút × $0.08 = $10/tuần
   - 2 prod build/tuần × 30 phút = 60 phút × $0.08 = $4.80/tuần
   - Tổng: ~$17/tuần = ~$70/tháng
```

### 10.2. EAS Build

```
   Free tier: 30 medium iOS builds/tháng
   Production tier: $99/tháng (300 builds + queue priority)
   Enterprise: $299+/tháng
```

### 10.3. Bitrise

```
   Hobby: free, giới hạn build minute
   Velocity: $30+/tháng/concurrency
   Enterprise: contact sales
```

### 10.4. Self-hosted

```
   Mac mini M2: ~$600 one-time
   Điện + bảo trì: ~$10/tháng
   Hoà vốn so với GitHub Actions sau ~3 tháng dùng intensive
```

---

## 11. Ví dụ end-to-end: từ commit → user thấy build

```
   Dev push code lên branch develop
            │
            ▼
   GitHub webhook → Actions trigger
            │
            ▼
   ┌────────────────────────────────────────┐
   │ Job 1: lint + test (ubuntu, 3 phút)    │
   └────────────────────────────────────────┘
            │
            ▼ pass
   ┌────────────────────────────────────────┐
   │ Job 2 + 3 (parallel):                  │
   │                                        │
   │  iOS (macos-14, 20 phút):              │
   │   - npm ci + pod install               │
   │   - bundle exec fastlane beta          │
   │     ├ match (cert + profile)          │
   │     ├ build_app                        │
   │     ├ upload_to_testflight             │
   │     └ slack notify                     │
   │                                        │
   │  Android (ubuntu, 12 phút):            │
   │   - npm ci                             │
   │   - decode keystore                    │
   │   - bundle exec fastlane internal      │
   │     ├ gradle bundleRelease             │
   │     ├ upload_to_play_store (internal)  │
   │     └ slack notify                     │
   └────────────────────────────────────────┘
            │
            ▼
   Slack:  "✅ Build #234 ready
            iOS: TestFlight in 15 min
            Android: Play Internal in 5 min"
            │
            ▼
   QA tester nhận TestFlight push
   Internal Track Android available
            │
            ▼
   QA pass → tạo PR develop → release/x.y.z
            │
            ▼
   Tag v1.2.3 → workflow release.yml chạy
            │
            ▼
   - iOS submit App Store (chờ Apple review 1-3 ngày)
   - Android promote internal → production 10% rollout
            │
            ▼
   User cuối tải app từ store
```

---

## 12. Checklist ship 1 build production

```
   Trước build:
   □ All test pass
   □ Changelog updated (CHANGELOG.md hoặc release notes)
   □ Version bump đúng (semver)
   □ Native dependencies update (pod install / npm install)
   □ Hermes bundle build OK (dev / release)
   □ Source maps gen OK (cho Sentry)

   Trong build:
   □ Cert + profile match production
   □ Build number > build trước trên TF/Play
   □ App size không tăng đột biến (compare so với last build)
   □ dSYM upload Sentry/Crashlytics

   Sau upload:
   □ TestFlight processing complete
   □ Smoke test trên 1 device thật iOS + Android
   □ Crash report monitoring → 0 crash trong 24h đầu (internal)
   □ Submit App Store / Play production
   □ Monitor staged rollout (Play 10% → 100% qua 3-7 ngày)
   □ Hotfix plan: hot-rollback + OTA update sẵn sàng
```

---

## 13. Đọc thêm

| Tài liệu | Link |
|---|---|
| GitHub Actions docs | https://docs.github.com/en/actions |
| GitHub macOS runners | https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners |
| Bitrise Devcenter | https://devcenter.bitrise.io |
| EAS Build | https://docs.expo.dev/build/introduction |
| EAS Submit | https://docs.expo.dev/submit/introduction |
| Codemagic | https://docs.codemagic.io |
| CircleCI mobile | https://circleci.com/docs/mobile-deployment |
| Fastlane on CI | https://docs.fastlane.tools/best-practices/continuous-integration |
| Self-hosted runners (security) | https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/about-self-hosted-runners#self-hosted-runner-security |
