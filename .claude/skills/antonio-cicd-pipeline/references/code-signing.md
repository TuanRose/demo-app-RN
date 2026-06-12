# Code Signing — Production

## iOS — Fastlane Match

Centralized certs + profiles in an **encrypted private git repo**; the whole team and CI share one source of truth.

| Profile type | Use |
|---|---|
| `development` | debug on registered devices |
| `adhoc` | QA distribution outside the App Store (Firebase/Diawi), registered UDIDs only |
| `appstore` | TestFlight + App Store |

### Rules
- **CI is `readonly: true`** — fetch existing certs only; never mint on CI. New certs via `sync_certs` run locally (`readonly: false`).
- **`setup_ci` in `before_all`** — creates a temp keychain; without it codesign blocks on a password prompt and the build hangs to timeout.
- **Manual signing in `gym xcargs`**: `CODE_SIGN_STYLE=Manual` + `PROVISIONING_PROFILE_SPECIFIER='match <AppStore|AdHoc> <bundleId>'` + `CODE_SIGN_IDENTITY='iPhone Distribution'`. Automatic signing breaks on a runner with no developer keychain.
- **HTTPS + token, not SSH** — CI has no SSH keys: `git_basic_authorization: Base64.strict_encode64("x-access-token:#{ENV['MATCH_GIT_TOKEN']}")`.

### App Store Connect API Key (replaces Apple ID)
- 2FA blocks Apple-ID auth on CI → use an ASC API Key (a service account).
- Role **"App Manager"** is sufficient (Admin not required — least privilege).
- `.p8` is downloadable **once**; store its content as a secret. Set `duration: 1200` so the token outlives a 15–25 min build.
- Rotate yearly / on offboarding; revoking a key does not affect the Apple ID.

### Symbolication
Distribution builds upload to App Store with bitcode off (deprecated). Upload **dSYMs** to your crash reporter so production crashes symbolicate — see `observability.md`.

---

## Android — Keystore + Play App Signing

### Play App Signing (production default)
- **Google holds the *app signing key*; you hold the *upload key*.** CI signs the AAB with the upload key; Google re-signs with the app signing key for distribution.
- **Benefits**: losing the upload key is recoverable (reset via Play Console); the real signing key never leaves Google.
- **Without** Play App Signing, losing the keystore = you can never update the app. Back up the upload keystore out-of-band regardless.

### Signing on CI without hardcoding
Inject credentials via AGP properties — never put passwords in `build.gradle`:
```ruby
gradle(task: "bundle", build_type: "Release", flavor: flavour, project_dir: "android/",
  properties: {
    "android.injected.signing.store.file"     => ENV["ANDROID_KEYSTORE_PATH"],
    "android.injected.signing.store.password" => ENV["ANDROID_KEYSTORE_PASSWORD"],
    "android.injected.signing.key.alias"      => ENV["ANDROID_KEYSTORE_ALIAS"],
    "android.injected.signing.key.password"   => ENV["ANDROID_KEY_PASSWORD"],
    "versionCode" => version_code, "versionName" => version_name,
  })
```
Keystore is stored Base64 in secrets, decoded to `/tmp` at runtime, removed in `if: always()`.

### Service account (Google Play API)
- Create in Google Cloud Console (JSON key) → grant in **Play Console** with **"Release manager"** only.
- **Cloud IAM ≠ Play Console permission** — they are independent; granting Owner in Cloud does nothing for uploads. Grant explicitly in Play Console.
- Validate without uploading: `fastlane run validate_play_store_json_key json_key:key.json`.

### AAB vs APK
| | APK | AAB |
|--|-----|-----|
| Play Store | rejected since 2021 | **required** |
| Gradle task | `assemble` | `bundle` |
| Firebase App Distribution | works directly | needs Firebase↔Play link to process splits |

→ **Play Store: AAB via `supply`. Firebase internal testing: APK** (simpler, no Play link).

---

## Adding a bundle ID / package to signing (new environment)
- iOS: register the bundle ID in the Developer Portal **first**, then `APP_IDENTIFIER=<id> fastlane ios sync_certs` to generate all three profiles. Register tester UDIDs for adhoc.
- Android: add the `productFlavor` with its `applicationId`; reuse the upload keystore unless the package must be an independent Play listing.
