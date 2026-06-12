# EAS Build & Submit — the managed alternative to Fastlane

EAS (Expo Application Services) is a managed cloud build + submit service. It replaces the Fastlane + self-hosted-macOS layer: Expo builds and signs in the cloud, you describe everything declaratively in `eas.json`. Works for Expo **and** bare RN apps.

## Fastlane vs EAS Build — when to pick which

| | Fastlane + GitHub Actions | EAS Build |
|---|---|---|
| Control | full (custom lanes, any tool) | declarative profiles; less low-level control |
| macOS runner | you provide (cost/maintenance) | Expo-hosted (no macOS to manage) |
| Signing | you manage (Match / keystore) | EAS-managed credentials (or bring your own) |
| Best for | complex/native-heavy pipelines, existing Fastlane, cost control at scale | Expo apps, small teams, fast setup, no CI macOS |
| OTA | CodePush/EAS Update bolted on | EAS Update is first-class |

→ **Default to Fastlane** when you already have it (like demo_app_bk) or need fine control. **Choose EAS** for Expo apps or to avoid running/maintaining macOS CI. Ask in Discovery before assuming.

## eas.json — build profiles map to environments
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal",
      "ios": { "simulator": true }, "android": { "buildType": "apk" }, "env": { "APP_ENV": "development" } },
    "preview":     { "distribution": "internal", "channel": "preview",
      "android": { "buildType": "apk" }, "ios": { "distribution": "internal" }, "env": { "APP_ENV": "staging" } },
    "production":  { "autoIncrement": true, "channel": "production",
      "android": { "buildType": "app-bundle" }, "ios": { "distribution": "store" }, "env": { "APP_ENV": "production" } }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./play-service-account.json" },
      "ios": { "appleId": "you@email.com", "ascAppId": "12345678" }
    }
  }
}
```
Profiles are the EAS equivalent of the environment matrix (`architecture.md`): `development`/`preview`/`production` ↔ dev/qa/prod, each with its own `env`, distribution, and `channel`.

## Build & submit
```bash
eas build --platform all --profile production            # cloud build iOS+Android
eas build --platform ios --profile development --local   # build on your machine
eas build:list                                           # inspect builds
eas submit --platform ios   --latest                     # → TestFlight
eas submit --platform android --track internal --latest  # → Play Internal
eas build --platform all --profile production --auto-submit   # build + submit in one
```
Production rules still hold (`release-strategy.md`): production AABs, monotonic build numbers (`autoIncrement: true`), staged rollout via `eas submit` track + Play Console.

## Credentials
```bash
eas credentials --platform ios       # EAS-managed certs/profiles (or import your own)
eas credentials --platform android   # EAS-managed keystore (back it up: eas credentials → download)
```
EAS can hold credentials for you; you can still bring an existing Match repo / keystore. Same least-privilege rules apply (`code-signing.md`).

## CI integration (GitHub Actions)
EAS runs on Linux runners (the heavy build happens in Expo's cloud, not on the runner — no macOS needed):
```yaml
- uses: expo/expo-github-action@v8
  with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
- run: eas build --platform all --profile production --non-interactive --auto-submit
```
Secrets: `EXPO_TOKEN` (from expo.dev access tokens). Build-time env/secrets: `eas env:create` / `eas secret:create` (not exposed in logs) instead of GitHub Secrets for build-scoped values.

## OTA (EAS Update)
EAS Update ships JS/asset-only changes without a store review, gated by `runtimeVersion`, targeted by `channel`. Full mechanics, channel/branch mapping, mandatory-vs-optional, and rollback live in **`release-strategy.md` → OTA updates** — not duplicated here.

## Quality gates still apply
Run lint/typecheck/unit before `eas build` exactly as in `quality-gates.md`. EAS does not replace your test gates.
