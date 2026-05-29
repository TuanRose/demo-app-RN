# CICD Production Standard — React Native Mobile App (English)

> A comprehensive reference covering all techniques for building a production-grade CICD pipeline for iOS and Android.
> Based on real implementation across demo_app and sh-farmcare-mobile.

---

## Table of Contents

1. [Pipeline Architecture Overview](#1-pipeline-architecture-overview)
2. [iOS — Code Signing with Fastlane Match](#2-ios--code-signing-with-fastlane-match)
3. [iOS — Build and Upload to TestFlight](#3-ios--build-and-upload-to-testflight)
4. [iOS — Submit to App Store](#4-ios--submit-to-app-store)
5. [Android — Build AAB and Upload to Play Store](#5-android--build-aab-and-upload-to-play-store)
6. [Android — Staged Rollout to Production](#6-android--staged-rollout-to-production)
7. [Fastlane — Standard Fastfile Structure](#7-fastlane--standard-fastfile-structure)
8. [GitHub Actions — Workflows](#8-github-actions--workflows)
9. [Secrets and Environment Variables](#9-secrets-and-environment-variables)
10. [Common Errors and Fixes](#10-common-errors-and-fixes)
11. [End-to-End Release Flow](#11-end-to-end-release-flow)
12. [Pre-release Checklist](#12-pre-release-checklist)

---

## 1. Pipeline Architecture Overview

```
Code push to main
       │
       ├──► [iOS Beta Workflow]            ──► TestFlight (internal testers)
       │    macos-15 runner (~25-40 min)
       │
       └──► [Android Beta Workflow]        ──► Play Internal Testing
            ubuntu-latest (~15-25 min)

QA approves on TestFlight + Play Internal
       │
       ▼
[Production Workflow] — MANUAL trigger only
       │
       ├──► iOS: App Store (review 1-3 days)
       └──► Android: Play Production (staged rollout 10% → 100%)
```

### Why separate beta and production?

- **Beta is automatic**: every push to main → new build immediately → QA can test right away
- **Production is manual**: the release decision belongs to humans, not bots
- **Cost**: ubuntu runner (~$0.008/min) is 10x cheaper than macos runner (~$0.08/min) → Android always uses ubuntu

---

## 2. iOS — Code Signing with Fastlane Match

### What is Match?

Match is a centralized certificate and provisioning profile management solution. The entire team shares a single set of certificates stored in an encrypted git repository.

**Problems Match solves:**
- New developer joins → self-syncs profiles, no need to ask anyone
- CI runner has no Apple account → only needs a git token to clone the match repo
- Certificate expires → one person renews, pushes to match repo → everyone self-syncs

### The 3 profile types you need

```
development  → dev builds, debug on real devices
adhoc        → QA distribution (bypasses App Store)
appstore     → TestFlight + App Store release
```

### Setting up Match for the first time

```bash
# 1. Create a private git repo on GitHub: my-org/ios-certificates
# 2. Run sync_certs lane to generate/upload certificates:
bundle exec fastlane ios sync_certs
# → Fastlane will ask for MATCH_PASSWORD to encrypt — save this password
```

### Matchfile

```ruby
git_url(ENV["MATCH_GIT_URL"])
storage_mode("git")
type("appstore")            # default type
app_identifier([ENV["APP_IDENTIFIER"]])
username(ENV["APPLE_ID"])   # local only; CI uses API key
```

### Match on CI (no SSH, no Apple ID)

CI runners can't use SSH keys or Apple IDs (2FA blocks them). You must use:

```ruby
# HTTPS with a personal access token
git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}")

# App Store Connect API Key (replaces Apple ID/password)
api_key = app_store_connect_api_key(
  key_id:      ENV["ASC_KEY_ID"],
  issuer_id:   ENV["ASC_ISSUER_ID"],
  key_content: ENV["ASC_KEY_CONTENT"],
  duration:    1200,  # 20 minutes — default 500s can expire mid-build
)
```

### How to obtain an App Store Connect API Key

1. App Store Connect → Users and Access → Integrations → App Store Connect API
2. Create a new key with the "App Manager" role (Admin is not required)
3. Download the `.p8` file — **can only be downloaded once**
4. Record the Key ID and Issuer ID
5. Read the .p8 content: `cat AuthKey_XXXXXXXX.p8` → copy everything including the header

---

## 3. iOS — Build and Upload to TestFlight

### Full flow of the `ios beta` lane

```
1. Create API Key object (ASC API)
2. Query current build number from TestFlight → +1
3. Set build number in Xcode project
4. Sync match certificate (readonly — does not create new ones on CI)
5. Build .ipa with gym
6. Upload to TestFlight with pilot
```

### Why query the build number instead of hardcoding?

```ruby
# Wrong: hardcode or increment manually
increment_build_number(build_number: 42)

# Right: query from TestFlight → never conflicts
latest = latest_testflight_build_number(
  api_key: api_key,
  app_identifier: ENV["APP_IDENTIFIER"],
  initial_build_number: 0,  # fallback when no builds exist yet
)
increment_build_number(build_number: latest + 1, xcodeproj: "ios/demo_app.xcodeproj")
```

### gym configuration (build)

```ruby
gym(
  scheme:           "demo_app",
  workspace:        "ios/demo_app.xcworkspace",
  configuration:    "Release",
  export_method:    "app-store",
  output_directory: "./build/ios",
  output_name:      "demo_app.ipa",
  include_bitcode:  false,   # Bitcode deprecated since Xcode 14
  xcargs: [
    "CODE_SIGN_STYLE=Manual",
    "PROVISIONING_PROFILE_SPECIFIER='match AppStore #{ENV['APP_IDENTIFIER']}'",
    "CODE_SIGN_IDENTITY='iPhone Distribution'",
  ].join(" "),
)
```

**Why `CODE_SIGN_STYLE=Manual`?**

By default Xcode uses "Automatic" signing → tries to find a certificate from the Keychain → on CI there is no developer Keychain → error. Setting `Manual` and pointing to the match profile ensures it always works.

**Why `setup_ci` in `before_all`?**

```ruby
before_all do
  setup_ci  # Creates a temporary Keychain on the CI runner
end
```

Without `setup_ci` → when importing the certificate into the Keychain → macOS prompts for a password → CI blocks, build hangs forever.

### pilot configuration (upload to TestFlight)

```ruby
pilot(
  api_key:                           api_key,
  ipa:                               "./build/ios/demo_app.ipa",
  skip_waiting_for_build_processing: true,  # IMPORTANT: don't wait for Apple to process
  distribute_external:               false,  # internal testers only first
  changelog:                         release_notes,
)
```

**Why `skip_waiting_for_build_processing: true`?**

Apple takes 5–30 minutes to process a build. Without skipping → the CI runner sits and waits → burns money, may timeout.

---

## 4. iOS — Submit to App Store

### The `ios production` lane

```ruby
lane :production do
  api_key = asc_api_key
  deliver(
    api_key:           api_key,
    app_identifier:    ENV["APP_IDENTIFIER"],
    submit_for_review: true,          # auto-submit after upload
    automatic_release: false,         # do NOT auto-release when Apple approves
    force:             true,          # skip browser confirmation
    skip_screenshots:  true,          # screenshots already on ASC
    skip_metadata:     true,          # metadata already on ASC
    phased_release:    true,          # enable App Store phased release
  )
end
```

**Why `automatic_release: false`?**

If `true` → when Apple approves → app goes live to 100% of users immediately. There's no opportunity to stop if a bug is discovered after submission. With `false` → Apple approves → app enters "Pending Developer Release" state → team decides when to release.

**Production workflow does NOT rebuild** — it submits the QA-approved build from TestFlight to the App Store.

---

## 5. Android — Build AAB and Upload to Play Store

### AAB vs APK

| | APK | AAB |
|---|---|---|
| Google Play requires | No (since 2021) | **Required** |
| Size | Larger | Smaller (Google optimizes per device) |
| Gradle task | `assemble` | **`bundle`** |
| Output | app-release.apk | app-release.aab |

```ruby
gradle(
  task:        "bundle",      # NOT "assemble"
  build_type:  "Release",
  project_dir: "android/",
)
```

### Android signing without hardcoding in build.gradle

**Wrong** (hardcoded in build.gradle):
```gradle
signingConfigs {
  release {
    storeFile file("release.keystore")  # committing keystore to git — DANGEROUS
    storePassword "my_password"         # password exposed in git history
  }
}
```

**Right** (injected from env vars via Fastlane):
```ruby
# In Fastfile — Fastlane passes properties to Gradle
gradle(
  task: "bundle",
  build_type: "Release",
  project_dir: "android/",
  properties: {
    "android.injected.signing.store.file"     => ENV["ANDROID_KEYSTORE_PATH"],
    "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
    "android.injected.signing.key.alias"      => ENV["ANDROID_KEYSTORE_ALIAS"],
    "android.injected.signing.key.password"   => ENV["ANDROID_KEY_PASSWORD"],
    "versionCode"                             => version_code,
    "versionName"                             => ENV["APP_VERSION"] || "1.0.0",
  }
)
```

```gradle
// In build.gradle — reads from project properties
defaultConfig {
    versionCode project.findProperty('versionCode')?.toInteger() ?: 1
    versionName project.findProperty('versionName') ?: "1.0.0"
}
signingConfigs {
    release {
        def ksPath = System.getenv('ANDROID_KEYSTORE_PATH')
        storeFile     ksPath ? rootProject.file(ksPath) : file('debug.keystore')
        storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: 'android'
        keyAlias      System.getenv('ANDROID_KEYSTORE_ALIAS')    ?: 'androiddebugkey'
        keyPassword   System.getenv('ANDROID_KEY_PASSWORD')       ?: 'android'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release  // NOT signingConfigs.debug
    }
}
```

### Auto-incrementing versionCode

```ruby
# Query current versionCode from Play Store → +1
current = begin
  google_play_track_version_codes(
    package_name: ENV["APP_IDENTIFIER"],
    track: "internal",
    json_key: ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
  ).max
rescue
  0  # fallback: first upload, no builds exist yet
end || 0

version_code = current + 1
```

**Note**: The first upload **must be done manually via Play Console** because `supply` requires the app to already exist on the Play Store.

### Uploading with supply

```ruby
supply(
  package_name:            ENV["APP_IDENTIFIER"],
  track:                   "internal",
  aab:                     lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH],
  json_key:                ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
  skip_upload_apk:         true,   # AAB only
  skip_upload_images:      true,   # don't update screenshots
  skip_upload_screenshots: true,
)
```

---

## 6. Android — Staged Rollout to Production

### Why staged rollout?

There is no Apple-style review for Android (can release immediately). Staged rollout lets you catch bugs before 100% of users are affected:

```
Internal Testing → Closed Testing → Open Testing → Production (10%) → 25% → 50% → 100%
```

### Promote to Production (no rebuild required)

```ruby
lane :production do
  rollout = (ENV["ROLLOUT_PERCENTAGE"] || "0.1").to_f

  supply(
    package_name:     ENV["APP_IDENTIFIER"],
    track:            "internal",       # source track
    track_promote_to: "production",     # promote to production
    rollout:          rollout.to_s,     # "0.1" = 10%
    json_key:         ENV["GOOGLE_PLAY_JSON_KEY_PATH"],
    skip_upload_apk:  true,
    skip_upload_aab:  true,             # DO NOT re-upload — just promote
    skip_upload_images: true,
    skip_upload_screenshots: true,
  )
end
```

### Gradual rollout schedule

| Stage | Rollout | When |
|---|---|---|
| Initial | 10% (`0.1`) | At release |
| Expand | 25% (`0.25`) | After 24h, no crash spike |
| Expand | 50% (`0.5`) | After 48h, stable |
| Full | 100% (`1.0`) | After 1 week, confident |

---

## 7. Fastlane — Standard Fastfile Structure

### Shared helpers (outside any `platform` block)

```ruby
# DRY: define once, use everywhere
def asc_api_key
  app_store_connect_api_key(
    key_id:      ENV.fetch("ASC_KEY_ID",      ""),
    issuer_id:   ENV.fetch("ASC_ISSUER_ID",   ""),
    key_content: ENV.fetch("ASC_KEY_CONTENT", ""),
    duration:    1200,
  )
end

def release_notes
  changelog = `git log -10 --pretty=format:"• %s" --no-merges`.strip
  changelog.empty? ? "No changelog available" : changelog
end

def notify_slack(message:, success: true, payload: {})
  return unless ENV["SLACK_WEBHOOK_URL"]
  slack(
    message:      message,
    webhook_url:  ENV["SLACK_WEBHOOK_URL"],
    success:      success,
    payload:      payload.merge(
      "Build"  => ENV["BUILD_NUMBER"] || "local",
      "Branch" => ENV["GIT_BRANCH"] || `git rev-parse --abbrev-ref HEAD`.strip,
    ),
    default_payloads: [:lane, :test_result, :git_author],
  )
end
```

### Platform block structure

```ruby
platform :ios do
  before_all do
    setup_ci  # ALWAYS PRESENT: creates temp keychain
  end

  lane :sync_certs do ... end    # manage certificates
  lane :beta do ... end          # build + TestFlight
  lane :production do ... end    # App Store submission
  lane :adhoc do ... end         # adhoc build for QA
  lane :build_only do ... end    # build without uploading
  lane :bump_version do ... end  # increment version number
  lane :refresh_profile do ... end  # renew profile when adding devices

  error do |lane, exception|
    notify_slack(message: "iOS #{lane} failed: #{exception.message}", success: false)
  end
end

platform :android do
  lane :beta do ... end
  lane :production do ... end
  lane :build_only do ... end
  lane :bump_version do ... end

  error do |lane, exception|
    notify_slack(message: "Android #{lane} failed: #{exception.message}", success: false)
  end
end
```

### Important utility lanes

**`bump_version`** — increment version before a release:
```ruby
lane :bump_version do |options|
  version = options[:version] || ENV["APP_VERSION"] || UI.input("Version: ")
  increment_version_number(version_number: version, xcodeproj: "ios/demo_app.xcodeproj")
  UI.success "Bumped to #{version}"
end
```

**`register_new_device`** — add a new device for dev/QA:
```ruby
lane :register_new_device do
  device_name = UI.input("Device name: ")
  udid        = UI.input("UDID: ")
  register_devices(devices: { device_name => udid }, api_key: asc_api_key)
  match(type: "development", force_for_new_devices: true, ...)
  match(type: "adhoc",       force_for_new_devices: true, ...)
end
```

---

## 8. GitHub Actions — Workflows

### iOS Beta (`deploy-testflight.yml`)

```yaml
on:
  push:
    branches: [main]
    paths-ignore: ['**.md', 'docs/**', '.github/workflows/android-*.yml']
  workflow_dispatch:

concurrency:
  group: ios-beta
  cancel-in-progress: true   # old build is cancelled when a new push arrives

jobs:
  deploy-ios:
    runs-on: macos-15          # REQUIRED: needs Xcode
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }   # full history needed for release notes
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - uses: ruby/setup-ruby@v1
        with: { ruby-version: '3.3', bundler-cache: true }
      - uses: maxim-lobanov/setup-xcode@v1
        with: { xcode-version: 'latest-stable' }
      - run: npm ci
      - uses: actions/cache@v4      # CocoaPods cache
        with:
          path: ios/Pods
          key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
      - run: bundle exec pod install --project-directory=ios
      - run: bundle exec fastlane ios beta
        env:
          ASC_KEY_ID: ${{ secrets.ASC_KEY_ID }}
          # ... all secrets
```

### Android Beta (`android-beta.yml`)

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: android-beta
  cancel-in-progress: true

jobs:
  deploy-android:
    runs-on: ubuntu-latest    # Ubuntu = 10x cheaper than macos
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }  # AGP 8+ requires Java 17
      - uses: actions/cache@v4      # Gradle cache
        with:
          path: |
            ~/.gradle/caches
            ~/.gradle/wrapper
          key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}
      - uses: android-actions/setup-android@v3
      - name: Decode Android Keystore    # Binary → Base64 secret → file
        run: |
          echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > /tmp/release.keystore
          echo "ANDROID_KEYSTORE_PATH=/tmp/release.keystore" >> $GITHUB_ENV
      - run: bundle exec fastlane android beta
        env:
          ANDROID_KEYSTORE_PATH: ${{ env.ANDROID_KEYSTORE_PATH }}
          # ... all secrets
      - name: Cleanup keystore    # remove keystore after build
        if: always()
        run: rm -f /tmp/release.keystore
```

### Production Release (`production.yml`)

```yaml
on:
  workflow_dispatch:           # MANUAL ONLY — no auto trigger
    inputs:
      platform:
        type: choice
        options: [both, ios, android]
      android_rollout:
        default: '0.1'

concurrency:
  group: production-release
  cancel-in-progress: false    # NEVER cancel a running production release

jobs:
  release-ios:
    if: ${{ inputs.platform == 'ios' || inputs.platform == 'both' }}
    runs-on: macos-15
    # ...

  release-android:
    if: ${{ inputs.platform == 'android' || inputs.platform == 'both' }}
    runs-on: ubuntu-latest
    # ...

  summary:
    needs: [release-ios, release-android]
    if: always()    # runs even if upstream jobs were skipped or failed
    runs-on: ubuntu-latest
```

---

## 9. Secrets and Environment Variables

### Storing a binary keystore in GitHub Secrets

GitHub Secrets are text-only. A keystore is a binary file:

```bash
# Encode keystore to Base64
base64 -i release.keystore | pbcopy   # copies to clipboard (macOS)
# Paste into GitHub Secret: ANDROID_KEYSTORE_BASE64

# Decode back on CI
echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/release.keystore
```

### Full list of secrets to create

**iOS:**
```
ASC_KEY_ID          → Key ID from App Store Connect API
ASC_ISSUER_ID       → Issuer ID from App Store Connect API
ASC_KEY_CONTENT     → Contents of .p8 file (including BEGIN PRIVATE KEY header)
APPLE_ID            → Apple ID email (local only, not needed on CI)
TEAM_ID             → 10-character Apple Team ID (found in Membership)
APP_IDENTIFIER      → Bundle ID: com.company.appname
MATCH_GIT_URL       → https://github.com/org/ios-certificates
MATCH_GIT_TOKEN     → GitHub Personal Access Token (repo scope)
MATCH_PASSWORD      → Password used to encrypt the match repo
```

**Android:**
```
ANDROID_KEYSTORE_BASE64   → Keystore file encoded as Base64
ANDROID_KEYSTORE_ALIAS    → Key alias inside the keystore
ANDROID_KEYSTORE_PASSWORD → Keystore password
ANDROID_KEY_PASSWORD      → Key password
GOOGLE_PLAY_JSON_KEY_PATH → Path to JSON key file (or file contents)
```

**Shared:**
```
APP_VERSION         → "1.0.0" — current version (or use bump_version lane)
SLACK_WEBHOOK_URL   → Slack webhook URL for notifications (optional)
```

### fastlane/.env.default vs fastlane/.env

| File | Commit to git? | Contains |
|---|---|---|
| `.env.default` | ✅ Yes | Non-secret defaults: ROLLOUT_PERCENTAGE=0.1, APP_VERSION=1.0.0 |
| `.env` | ❌ No (add to .gitignore) | Local developer secrets |
| `.env.example` | ✅ Yes | Template with all variables and instructions on how to obtain them |
| GitHub Secrets | N/A | Secrets for CI/CD |

---

## 10. Common Errors and Fixes

### iOS

**Error: codesign hangs, no output**
```
Cause:  Missing setup_ci → macOS prompts for Keychain password → CI blocks
Fix:    Add setup_ci to the before_all block
```

**Error: "No signing certificate found"**
```
Cause:  match readonly:true but certificate has not been created yet
Fix:    Run sync_certs lane with readonly:false at least once
```

**Error: "Profile doesn't match"**
```
Cause:  Using "Automatic" signing instead of Manual
Fix:    Add xcargs CODE_SIGN_STYLE=Manual and PROVISIONING_PROFILE_SPECIFIER
```

**Error: "Error fetching provisioning profile from Apple"**
```
Cause:  Apple ID requires 2FA — cannot be used on CI
Fix:    Use App Store Connect API Key instead of Apple ID
```

**Error: `latest_testflight_build_number` fails**
```
Cause:  App does not yet exist on App Store Connect
Fix:    Create the app on ASC first (identifier must match bundle ID)
        Add initial_build_number: 0 as a fallback
```

### Android

**Error: Play Store rejects the upload**
```
Cause:  Uploaded APK instead of AAB (Google Play requires AAB since 2021)
Fix:    Change gradle task from "assemble" to "bundle"
```

**Error: "App not found" when supply uploads**
```
Cause:  First upload ever — app does not exist on the Play Store
Fix:    Upload manually once via Play Console, then use supply from there on
```

**Error: Build signed with debug keystore uploaded to Play Store**
```
Cause:  build.gradle has signingConfig signingConfigs.debug in the release buildType
Fix:    Change to signingConfig signingConfigs.release
```

**Error: `google_play_track_version_codes` throws an exception**
```
Cause:  Internal track has no builds yet (first upload)
Fix:    Wrap in rescue: begin ... rescue; 0 end || 0
```

**Error: "Cannot store binary .keystore in Secrets"**
```
Cause:  GitHub Secrets are text; keystores are binary
Fix:    Encode: base64 -i release.keystore | pbcopy
        Decode on CI: echo "$SECRET" | base64 --decode > /tmp/release.keystore
```

---

## 11. End-to-End Release Flow

### One-time setup

```bash
# 1. Create iOS certificates repo
#    GitHub → New repo → "ios-certificates" (private)

# 2. Create match certificates
bundle exec fastlane ios sync_certs

# 3. Create a release keystore (Android)
keytool -genkey -v -keystore release.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# 4. Encode keystore
base64 -i release.keystore | pbcopy
# → Paste into GitHub Secret: ANDROID_KEYSTORE_BASE64

# 5. Create Google Play JSON key
#    Play Console → Setup → API access → Create service account
#    Download JSON file → save contents to secret or path reference

# 6. First Play Store upload (manual)
#    Play Console → Dashboard → Create app → Upload AAB manually
#    ONLY THEN can you use fastlane supply

# 7. Create app on App Store Connect
#    ASC → Apps → "+" → New App → Bundle ID must match exactly
```

### Regular release workflow

```
Developer pushes to main
       │
       ├─ GitHub Actions runs automatically:
       │  ├─ iOS beta build → TestFlight (25–40 min)
       │  └─ Android beta build → Play Internal (15–25 min)
       │
QA tests for 1–2 days
       │
       ├─ QA approves
       │
PM/TL → GitHub → Actions → Production Release → Run workflow
       │
       ├─ Select platform: both / ios / android
       ├─ Enter version (optional)
       ├─ Enter android_rollout: 0.1 (10%)
       │
       ├─ iOS: submitted to App Store → Apple review 1–3 days
       └─ Android: promoted to Production at 10% → monitor crash rate

After 24h stable → increase Android rollout → 25% → 50% → 100%
When Apple approves iOS → manually release from ASC (automatic_release: false)
```

---

## 12. Pre-release Checklist

### iOS

- [ ] `APP_IDENTIFIER` matches the Bundle ID in Xcode
- [ ] App created on App Store Connect
- [ ] `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` set in secrets
- [ ] `MATCH_GIT_URL`, `MATCH_GIT_TOKEN`, `MATCH_PASSWORD` set in secrets
- [ ] `TEAM_ID` is the 10-character Apple Team ID
- [ ] `sync_certs` has been run at least once (certificates exist in match repo)
- [ ] `setup_ci` is present in `before_all`
- [ ] `CODE_SIGN_STYLE=Manual` in xcargs
- [ ] `skip_waiting_for_build_processing: true` in pilot
- [ ] `automatic_release: false` in production lane

### Android

- [ ] Release keystore has been created and encoded as Base64
- [ ] `ANDROID_KEYSTORE_BASE64` secret set
- [ ] `ANDROID_KEYSTORE_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD` set
- [ ] `GOOGLE_PLAY_JSON_KEY_PATH` points to a valid JSON key
- [ ] App created on Play Console
- [ ] First upload done manually via Play Console
- [ ] `build.gradle` uses `signingConfig signingConfigs.release` in the release buildType
- [ ] Gradle task is `bundle` (not `assemble`)
- [ ] `skip_upload_aab: true` in production lane (promote only, no re-upload)

### GitHub Actions

- [ ] All secrets set in GitHub repo → Settings → Secrets and variables → Actions
- [ ] `fetch-depth: 0` in checkout step (for release notes)
- [ ] `bundler-cache: true` in ruby/setup-ruby
- [ ] Gradle cache key includes hash of build.gradle files
- [ ] CocoaPods cache key includes hash of Podfile.lock
- [ ] Keystore cleanup in an `if: always()` step
- [ ] Java 17 for Android (AGP 8+)
- [ ] Production workflow uses `cancel-in-progress: false`

---

*Last updated: May 2026*
*Project: demo_app (React Native 0.85.2)*
*Practice ground for: sh-farmcare-mobile (production)*
