# Observability — Production

A release you cannot debug in production is not production-ready. Every build must upload symbols and tag its release so crashes are readable and traceable back to a commit.

## Crash & error reporting

| Tool | Strength | Typical use |
|------|----------|-------------|
| **Sentry** | JS + native, releases, sourcemaps, breadcrumbs, alerting | primary error monitor for RN |
| **Firebase Crashlytics** | native crashes, lightweight, free | Android/iOS native crash baseline |

Pick one primary (commonly Sentry for RN because it symbolicates the JS layer). Wire crash-free-rate as the gate metric for advancing a staged rollout (see `release-strategy.md`).

## Symbol upload (mandatory — three layers)

A RN crash spans three symbol sources; upload all three or stacks stay obfuscated:

| Layer | Artifact | When |
|-------|----------|------|
| iOS native | **dSYM** | after `gym`; or download from App Store Connect if Apple re-signs |
| JS (Hermes) | **Hermes sourcemap** (`*.map` + bundle) | after the JS bundle is produced |
| Android native/JS | **R8/ProGuard `mapping.txt`** | after `gradle bundle …Release` |

Upload them in the build job, **tagged with the same release + build identifiers** the app reports at runtime — otherwise the reporter cannot match a crash to its symbols.

```ruby
# Sentry, after build — release/dist MUST match what the app sets at runtime
sentry_cli_upload(
  release: "#{version_name}",          # marketing version
  dist:    "#{build_number}",          # build number / versionCode
  # upload dSYM + sourcemaps; for Android also upload R8 mapping.txt
)
```

## Release tagging
- Create a **Sentry release** per build, associate commits (`fetch-depth: 0`) → crashes link to the commit that introduced them, regressions are attributable.
- Use `release = versionName`, `dist = buildNumber/versionCode` consistently in CI **and** in the app's runtime init, or matching silently fails.

## Build & deploy notifications

Notify the team on build/release outcome (Slack/Teams/Discord) — success and **especially failure**:
```ruby
# Fastlane error block fires on any lane failure
error do |lane, exception|
  notify_team(message: "❌ #{lane} failed: #{exception.message}", success: false)
end
```
Include: lane, platform, version+build, branch, commit author, link to the run. For production, also post the rollout % and a link to the crash-rate dashboard.

> demo_app_bk's `notify_slack` is currently a no-op (Slack removed) — see `reference-implementation.md` (Known issues). Re-implement against your webhook, and note Fastlane's `slack` action uses `slack_url:`, not `webhook_url:`.

## Build provenance (maturity step)
- Retain build artifacts (IPA/AAB/mapping) with a retention policy.
- Record what shipped: commit SHA → version+build → store track. The Sentry release + the artifact name (`…-${{ github.sha }}`) already give you this; keep it.
- Higher bar: signed provenance / SLSA attestation for supply-chain integrity.

## Minimum production checklist
- [ ] Crash reporter initialized in the app with `release` + `dist` set from native build config.
- [ ] CI uploads dSYM + Hermes sourcemap + R8 mapping on every build, tagged to match.
- [ ] Crash-free rate visible and used as the rollout-advance gate.
- [ ] Failure notifications reach a channel a human watches.
