# Playbook — Adding a New Environment

Pick a track based on need. All follow the YARA pattern: **dedicated workflow + dedicated secrets prefix + same Fastfile lane**.

---

## A. Android → Firebase App Distribution (like `Qa`, `Antonio`)

Simplest — no Google Play needed. Templates: `android-qa.yml` / `android-antonio.yml`.

1. **`android/app/build.gradle`** — add a productFlavor:
   ```groovy
   flavorDimensions "environment"
   productFlavors {
       Prod    { dimension "environment"; applicationId "corleone.dev.demo_app" }
       <Env>   { dimension "environment"; applicationId "corleone.dev.demo_app.<env>" }
   }
   ```
   > You must keep `Prod` once `flavorDimensions` is declared — otherwise the `bundleRelease` task disappears and the existing CI breaks.

2. **Fastfile** — no new lane needed. The `firebase_beta` lane is already dynamic via `ANDROID_BUILD_FLAVOUR`.

3. **`.github/workflows/android-<env>.yml`** — clone `android-qa.yml`, change:
   - `branches: [release/<env>]`, `concurrency.group: android-<env>`
   - keystore decode → `/tmp/<env>.keystore`
   - env block: `ANDROID_<ENV>_*` secrets, `FIREBASE_GROUPS: <env>-testers`, `ANDROID_BUILD_FLAVOUR: <Env>`
   - artifact paths: APK `apk/<flavorLowercase>/release/`, AAB `bundle/<flavor>Release/` — see `reference-implementation.md` (Known issues #3) about casing.

4. **Firebase Console** — Add Android app (package `...demo_app.<env>`) → record the App ID → App Distribution → create the `<env>-testers` group.

5. **GitHub Secrets** — `ANDROID_<ENV>_{KEYSTORE_BASE64,KEYSTORE_ALIAS,KEYSTORE_PASSWORD,KEY_PASSWORD,FIREBASE_APP_ID}` + `FIREBASE_TOKEN` (shared) + `APP_VERSION`.

6. **Verify** — push branch `release/<env>` → CI green → build appears in Firebase Console → group receives email.

> `android_artifact_type: "APK"` (not AAB) — AAB requires the Firebase project to be linked to Google Play to process splits. See troubleshooting.

---

## B. Android → Google Play (like `Prod`)

Template: `android-beta.yml` / lane `beta`. Differs from Firebase: uses `supply` + service account, AAB.

1. **build.gradle** — the `Prod` flavor has no suffix (it IS the app on the Play Store).
2. **The first upload MUST be done manually** via Play Console (`supply` only works from the second upload). Build locally: `bundle exec fastlane android build_only`.
3. **Service account** — Google Cloud Console → create SA → JSON key. Play Console → Setup → API access → Grant `Release manager`.
   > "API access" is hidden if the account hasn't completed Android Developer Verification. Cloud IAM ≠ Play Console permission — you must grant it in Play Console separately.
4. **Secrets** — `ANDROID_KEYSTORE_*`, `GOOGLE_PLAY_JSON_KEY_BASE64`, `ANDROID_APP_IDENTIFIER`, `APP_VERSION`.
5. The `beta` lane queries the versionCode from the Play API → +1 → `gradle bundle <Flavor>Release` → `supply track: internal`.

---

## C. iOS → TestFlight + Firebase (like `QA`)

Template: `ios-qa.yml` / lane `distribute_qa`. Full checklist in `docs/ios-firebase-distribution-checklist.md`. Summary:

1. **Xcode** — duplicate config `Debug-<ENV>` / `Release-<ENV>`; bundle ID `com.tuanvu.demoapp.<env>`; dedicated DISPLAY_NAME; scheme `demo_app-<ENV>` (tick **Shared**). Inject ENVFILE via `xcargs`, NOT via scheme PreActions (causes Xcode to crash).
2. **`pod install`** again after adding the build configuration.
3. **Developer Portal** → register the bundle ID → **App Store Connect** create the app record (mandatory order, do not reverse).
4. **Firebase** — Add iOS app (`...demoapp.<env>`) → `GoogleService-Info.plist` → record the App ID → group `<env>-testers`.
5. **Match** — `APP_IDENTIFIER=com.tuanvu.demoapp.<env> bundle exec fastlane ios sync_certs` (creates development/adhoc/appstore). Register UDID if adhoc is needed.
6. **Fastfile** — add a `distribute_<env>` lane following the `distribute_qa` template:
   - resolve build number from ASC → `add_badge` (needs ImageMagick) → match appstore → gym app-store → pilot → match adhoc → gym ad-hoc → firebase.
   - gym `xcargs`: `CODE_SIGN_STYLE=Manual`, `PROVISIONING_PROFILE_SPECIFIER='match <AppStore|AdHoc> <bundleId>'`, `CODE_SIGN_IDENTITY='iPhone Distribution'`, `ENVFILE=.env.<env>`.
   - pilot: do NOT pass `changelog` when `skip_waiting_for_build_processing: true`.
7. **Workflow `ios-<env>.yml`** — clone `ios-qa.yml`: trigger branch, `brew install imagemagick librsvg` before fastlane, `echo "${{ secrets.ENV_<ENV> }}" > .env.<env>`.
8. **Secrets** — `<ENV>_APP_IDENTIFIER`, `FIREBASE_IOS_<ENV>_APP_ID`, `ENV_<ENV>` + match/ASC/`FIREBASE_TOKEN` shared.
9. **Verify** — push branch → CI green → build appears in Firebase + TestFlight → the two apps install side by side without overwriting (different bundle IDs).

---

## Production hardening (for a real env, not a demo flavor)
When the new environment is production-facing, also:
- Add the **quality-gate job** as a dependency of the build job (`quality-gates.md`).
- Add **symbol upload** (dSYM / Hermes sourcemap / R8 mapping) to the build job (`observability.md`).
- Put production secrets behind a **GitHub Environment with required reviewers**, or a Vault path (`secrets-management.md`).
- Define the **rollout + rollback** path before first ship (`release-strategy.md`).
- Use **Play App Signing** and back up the upload keystore out-of-band (`code-signing.md`).

## Commit checklist (don't forget the lockfile)
```
android/app/build.gradle
android/app/google-services.json          # if using Firebase SDK
fastlane/Fastfile                          # if adding an iOS lane
.github/workflows/<env>.yml
Gemfile + Gemfile.lock                     # if adding a plugin
package.json + package-lock.json           # if adding a dependency
```
