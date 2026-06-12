# Fastlane Init & Config Topology

How to initialize Fastlane and decide where its config lives **inside one repo** (unified vs split). For sharing config across many apps, see `fastlane-shared-config.md`.

## Mental model: Fastlane runs relative to the current directory

`fastlane <lane>` finds the nearest `fastlane/` folder and loads its `Fastfile`. **Every path inside the Fastfile is relative to the directory you invoke it from.** This single fact drives the whole config-location decision.

## Step 0 — always install via Bundler (never global)
```ruby
# Gemfile at the repo ROOT (shared by both platforms)
source "https://rubygems.org"
gem "fastlane"
```
```bash
bundle install
```
> CI needs a pinned version (`Gemfile.lock`) for reproducible builds. A global install drifts per machine.

## The two topologies

| | Unified (root) | Split (per-platform) |
|---|---|---|
| Location | `fastlane/` at repo root | `ios/fastlane/` + `android/fastlane/` |
| Fastfiles | 1 (holds both `platform :ios` and `:android`) | 2 (each platform standalone) |
| Invoke | `fastlane ios beta` / `fastlane android beta` | `cd ios && fastlane beta` / `cd android && fastlane beta` |
| Paths in Fastfile | `ios/App.xcworkspace`, `project_dir: "android/"` | `App.xcworkspace`, `project_dir: "."` |
| Example | `demo_app_bk` (unified root) | `sh-yara-connect-mobile` (Fastfile at `android/fastlane/`) |

Native single-platform projects are split by definition. The choice only matters for cross-platform / React Native.

## How `fastlane init` generates config (split flow)
```bash
cd ios     && bundle exec fastlane init   # detects .xcworkspace → ios/fastlane/{Appfile,Fastfile}
cd android && bundle exec fastlane init   # detects build.gradle → android/fastlane/{Appfile,Fastfile}
```
`init` auto-detects the project, asks a few questions (Apple ID / app_identifier / scheme for iOS; package_name / Play JSON key for Android), then scaffolds the files. It also creates a `Gemfile` if none exists.

## Directory layout — split
```
project/
├── Gemfile / Gemfile.lock        ← shared at root
├── ios/
│   ├── MyApp.xcworkspace
│   └── fastlane/{Appfile, Fastfile, Matchfile}   ← iOS lanes only, no platform block
└── android/
    ├── app/build.gradle
    └── fastlane/{Appfile, Fastfile}              ← Android lanes only, no platform block
```

`Appfile` differs per platform:
```ruby
# ios/fastlane/Appfile
app_identifier("com.company.app"); apple_id("dev@company.com"); team_id("ABCDE12345")
# android/fastlane/Appfile
json_key_file("/path/to/play-service-account.json"); package_name("com.company.app")
```

A split Fastfile has **no `platform` block** (platform is implied by directory):
```ruby
# android/fastlane/Fastfile — already inside android/
default_platform(:android)
lane :beta do
  gradle(task: "bundle", build_type: "Release", project_dir: ".")   # "." not "android/"
  supply(track: "internal", aab: lane_context[SharedValues::GRADLE_AAB_OUTPUT_PATH])
end
```

## The path gotcha (most common migration bug)

| Invoked from | `gym workspace` | `gradle project_dir` | `firebase_cli_path` |
|---|---|---|---|
| Root (`fastlane/`) | `ios/MyApp.xcworkspace` | `android/` | `./node_modules/.bin/firebase` |
| Split (`ios/fastlane/`) | `MyApp.xcworkspace` | — | `../node_modules/.bin/firebase` |
| Split (`android/fastlane/`) | — | `.` | `../node_modules/.bin/firebase` |

> `demo_app_bk` (unified) uses `project_dir: "android/"` and `../node_modules/.bin/firebase`. Moving to split requires changing these, or gradle/firebase fail with "not found".

## Choosing — unified vs split
- **Unified root** when one team owns both platforms and you want to **share helpers** (`asc_api_key`, `release_notes`, `notify_slack`) once across iOS + Android. Cleaner commands, no `cd`.
- **Split per-platform** when iOS and Android are owned by separate teams (independent review/ownership), need different Ruby deps/plugins, or you follow an org standard that places the Fastfile under `android/fastlane/`.

→ For a typical RN app, **unified root wins** because shared helpers are Fastlane's biggest payoff in RN. Split only earns its cost when the org/people are genuinely split.
