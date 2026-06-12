# Reference Implementation — demo_app_bk

The concrete pipeline `demo_app_bk` runs today. Use it as a template for the general standard. Always confirm against the real files before editing.

## Pipeline map

```
push main ─────────────┬──► deploy-testflight.yml  (macos-15)  → ios beta        → TestFlight (Prod)
                       └──► android-beta.yml       (ubuntu)    → android beta     → Play Internal (Prod, AAB)

push release/ios   ────────► ios-qa.yml            (macos-15)  → ios distribute_qa → TestFlight + Firebase (2 IPA)
push release/android ──────► android-qa.yml        (ubuntu)    → android firebase_beta (Qa)      → Firebase (APK)
push antonio       ────────► android-antonio.yml   (ubuntu)    → android firebase_beta (Antonio) → Firebase (APK)

workflow_dispatch ─────────► production.yml        (both)      → ios production / android production
                                                                 → App Store + Play Production (promote, no rebuild)
```

## Workflow → lane → target table

| Workflow | Trigger | Runner | Lane | Flavor/Env | Target | Artifact |
|---|---|---|---|---|---|---|
| `deploy-testflight.yml` | push `main` | macos-15 | `ios beta` | Prod | TestFlight internal | `demo_app.ipa` |
| `ios-qa.yml` | push `release/ios` | macos-15 | `ios distribute_qa` | QA (`com.tuanvu.demoapp.qa`) | TestFlight **+** Firebase | appstore IPA + adhoc IPA |
| `android-beta.yml` | push `main`, `feat/demo_deploy_Android` | ubuntu | `android beta` | `Prod` | Play Internal | AAB |
| `android-qa.yml` | push `release/android` | ubuntu | `android firebase_beta` | `Qa` | Firebase `qa-testers` | APK (+AAB) |
| `android-antonio.yml` | push `antonio` | ubuntu | `android firebase_beta` | `Antonio` | Firebase `antonio-testers` | APK (+AAB) |
| `production.yml` | **manual** | macos-15 + ubuntu | `ios production` / `android production` | — | App Store + Play Production | promote only |

## Lanes in the Fastfile

**iOS** (`platform :ios`, `before_all { setup_ci }`):
`sync_certs` · `beta` · `production` · `adhoc` · `build_only` · `bump_version` · `distribute_qa` · `refresh_profile` · `register_new_device` · `error`

**Android** (`platform :android`):
`beta` (Play Internal, AAB) · `firebase_beta` (Firebase, APK+AAB) · `production` (promote, staged rollout) · `build_only` · `bump_version` · `error`

## Shared helpers (top of Fastfile)
- `asc_api_key` — ASC API Key object, `duration: 1200` (avoids mid-build expiry).
- `release_notes` — `git log -10` as changelog (requires `fetch-depth: 0`).
- `notify_slack` — **currently an empty no-op** (Slack removed). See Known issues #1 below.

## Concurrency groups
- `ios-beta`, `ios-qa`, `android-beta`, `android-qa`, `android-antonio` → `cancel-in-progress: true`.
- `production-release` → `cancel-in-progress: false` (never cancel a production release).

## Common build steps
Follows the standard job skeleton (`architecture.md`) with these concrete versions: node 22, ruby 3.3 (`bundler-cache: true`), iOS xcode latest-stable, Android java 17. **Deltas:** no quality-gate step and no symbol-upload step (see Gaps below).

## Gaps vs the production standard (what demo_app_bk does NOT yet do)
These are intentionally absent in the learning repo; add them for a true production app (see the matching reference files):
- **No quality gates** — no lint/typecheck/test/E2E job blocks the build (`quality-gates.md`).
- **No observability** — no Sentry/Crashlytics, no dSYM / Hermes sourcemap / R8 mapping upload (`observability.md`).
- **No OTA channel** — JS-only hotfixes still require a full store build (`release-strategy.md`).
- **Secrets are flat GitHub Secrets** — no environment protection rules / Vault / OIDC (`secrets-management.md`).
- **Slack notifications disabled** — `notify_slack` is a no-op (see Known issues #1 below).

---

## Known issues / caveats

Present at the time of writing. None block builds, but know them before touching the area. Read the real file/line first — the skill may be stale.

1. **`notify_slack` is an empty no-op** (`Fastfile:46-48`). Lanes still call it and `deploy-testflight.yml`/`production.yml` still pass `SLACK_WEBHOOK_URL` → harmless dead code + unused secret. Remove the calls/var, or re-implement (Fastlane's `slack` action uses `slack_url:`, not `webhook_url:`).
2. **`production.yml` Android uses the JSON key path directly** (`production.yml:149`: `GOOGLE_PLAY_JSON_KEY_PATH` from a secret), unlike `android-beta.yml` which Base64-decodes to `/tmp/play-key.json`. If the secret holds JSON content (not a real runner path), `android production` fails when `supply` reads the file. **Fix:** add a decode step like `android-beta.yml`. Verify before the first production promote.
3. **Inconsistent APK artifact path casing** — `android-qa.yml:155` uses `apk/Qa/release/...` (capital), `android-antonio.yml:145` uses `apk/antonio/release/...` (lowercase). Gradle usually lowercases the flavor in the APK dir (`apk/qa/release/`) but keeps camelCase for AAB (`bundle/QaRelease/`). Wrong path → `upload-artifact` fails (not the build). Verify from the real `gradle assemble<Flavor>Release` output.
4. **`android-beta.yml` still triggers an old dev branch** (`:25` — `branches: [main, feat/demo_deploy_Android]`). Consider removing the feature branch once merged to avoid unintended Prod builds.
