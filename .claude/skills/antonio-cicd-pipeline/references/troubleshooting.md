# Troubleshooting — demo_app_bk

## iOS

| Error | Cause | Fix |
|---|---|---|
| codesign hangs, no output | missing `setup_ci` → macOS waits for keychain password | ensure `before_all { setup_ci }` (already present) |
| "No signing certificate found" | match `readonly: true` but the cert doesn't exist yet | run `sync_certs` (readonly:false) locally once |
| "Profile doesn't match" | Automatic signing instead of Manual | `xcargs`: `CODE_SIGN_STYLE=Manual` + `PROVISIONING_PROFILE_SPECIFIER='match <Type> <bundleId>'` |
| "Error fetching provisioning profile" | Apple ID requires 2FA — unusable on CI | use the ASC API Key (already in use) |
| `latest_testflight_build_number` fails | app doesn't exist on ASC yet | create the app record on ASC first; `initial_build_number: 0` as fallback |
| `gym` "Provisioning profile not found" | match hasn't run / profile expired | `APP_IDENTIFIER=... bundle exec fastlane ios sync_certs` |
| `add_badge` "Install ImageMagick" | macOS runner doesn't pre-install it | `brew install imagemagick librsvg` before fastlane |
| `pilot` blocks CI for 5-15 min | passing `changelog` together with `skip_waiting_for_build_processing: true` | remove `changelog` from `pilot` |
| Xcode crashes when opening the project | scheme has a `<PreActions>` with an invalid ActionType | delete PreActions; inject ENVFILE via `xcargs` |
| two apps overwrite each other on device | duplicate bundle ID | check pbxproj: `Debug-<ENV>`/`Release-<ENV>` have the correct bundle ID |
| Scheme not visible on CI | scheme not marked Shared | Xcode → Manage Schemes → Shared |

## Android

| Error | Cause | Fix |
|---|---|---|
| Play Store rejects upload | uploaded APK instead of AAB | gradle task `bundle` (not `assemble`) for the Play lane |
| "App not found" on `supply` | first time — app doesn't exist on the Play Store yet | upload the AAB manually once via Play Console |
| `google_play_track_version_codes` throws | internal track has no builds yet | already wrapped in `rescue → 0` in the `beta` lane |
| build signed with debug keystore | `signingConfig signingConfigs.debug` in release | change to `signingConfigs.release` |
| "Keystore was tampered with / password incorrect" | Base64 decode error | re-encode `base64 -i release.keystore` (no `-w 0`) |
| `Task ':app:assemble<Env>Release' not found` | flavor not declared in build.gradle | add `productFlavors { <Env> { ... } }` |
| `installDebug is ambiguous` on `npm run android` | `flavorDimensions` removes the generic task | `react-native run-android --mode prodDebug` |
| "API access" not shown in Play Console | account hasn't verified identity | complete Android Developer Verification |
| `validate_play_store_json_key` passes but `supply` fails | Cloud IAM ≠ Play Console permission (two independent systems) | grant `Release Manager` in Play Console separately |
| "This project is not linked to a Google Play account" (Firebase) | `android_artifact_type: "AAB"` requires Firebase linked to Play | use `"APK"` (already used in `firebase_beta`) |
| "Using deprecated option: '--firebase_cli_path'" | plugin v1.x dropped the Firebase CLI | remove `firebase_cli_path`; `firebase_cli_token` still works |
| `Could not find gem fastlane-plugin-firebase_app_distribution` | didn't `bundle install` after editing Gemfile | `bundle install` → commit `Gemfile.lock` |
| `Invalid Firebase token` | `FIREBASE_TOKEN` wrong/revoked | re-run `firebase login:ci` → update the secret |

## General

| Error | Cause | Fix |
|---|---|---|
| `npm ci: out of sync` | edited package.json without updating the lock | `npm install` locally → commit `package-lock.json` |
| empty changelog | checkout `fetch-depth: 1` | set `fetch-depth: 0` (already in every workflow) |
| `slack` action crashes "webhook_url" | the action uses `slack_url`, not `webhook_url` | `notify_slack` is currently a no-op — no impact |

## Quick debug procedure
1. Identify which workflow triggered (based on the branch you pushed) → read the right `.github/workflows/*.yml`.
2. Read the failing step → map it to the lane in `fastlane/Fastfile`.
3. Check the secrets that lane needs are all present (`references/secrets-management.md`).
4. Reproduce locally: `bundle exec fastlane <platform> <lane>` with the matching env vars (`build_only` to build only, no upload).
