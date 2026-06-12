---
name: antonio-cicd-pipeline
description: Production CI/CD for React Native (Fastlane + GitHub Actions) — pipeline design, code signing, secrets, quality gates, releases (rollout/rollback/hotfix/OTA), observability, Fastlane setup. Use when designing/hardening/debugging a mobile release pipeline, adding a build environment, or working with TestFlight / Firebase App Distribution / Google Play. demo_app_bk is the reference implementation.
---

# Skill: antonio-cicd-pipeline

Production-grade standard for React Native CI/CD with **Fastlane + GitHub Actions**. Principles are general; `demo_app_bk` is the concrete example (`references/reference-implementation.md`).

**On invoke:** run Discovery → read the **one** reference file the task maps to → act. Read additional files only if the task genuinely spans them.

---

## Discovery first — ask before you configure (MANDATORY)

No universal "right" pipeline. Before recommending/implementing setup or config, gather context with `AskUserQuestion` (one grouped round). Ask only what the repo/conversation doesn't already answer:

1. **Project type** — native iOS · native Android · RN/cross-platform · multiple apps in one org
2. **Config topology** — unified root `fastlane/` vs split `ios/fastlane`+`android/fastlane`
3. **Sharing scope** — this app only, or shared across apps (separate config repo)?
4. **Environments** — prod only, or dev/qa/staging/uat?
5. **Distribution** — TestFlight · Firebase App Distribution · Play Internal · App Store · Play Production
6. **CI + build engine + secrets** — GitHub Actions (default) · other; **Fastlane (default) vs EAS Build**; GitHub Secrets vs Vault vs OIDC
7. **Existing signing** — match repo / keystore / Play App Signing already, or from zero?

Then state the recommended option **with a one-line reason** (matrices in `fastlane-init.md` / `fastlane-shared-config.md` / `eas-build.md` / `architecture.md`) and proceed. Skip answered questions; if told "use sensible defaults", pick, name the choice, move on.

---

## Map — topic → the one file to read

| Topic | File |
|-------|------|
| `fastlane init`; unified vs split ios/android topology | `fastlane-init.md` |
| Share Fastlane config across apps (`import_from_git` / plugin gem / match repo) | `fastlane-shared-config.md` |
| EAS Build / Submit (managed alternative to Fastlane); Fastlane-vs-EAS choice | `eas-build.md` |
| Pipeline topology, environment matrix, runners/cost, branching, beta-vs-prod | `architecture.md` |
| iOS Match + ASC key; Android keystore + Play App Signing; least-privilege | `code-signing.md` |
| Storing/rotating secrets; GitHub Secrets/Vault/OIDC; environment protection | `secrets-management.md` |
| lint/typecheck/test/coverage/E2E gates before build | `quality-gates.md` |
| Versioning, staged rollout, phased release, rollback, hotfix, OTA | `release-strategy.md` |
| Crash reporting, dSYM/sourcemap/mapping upload, release tagging, alerts | `observability.md` |
| Add a new build environment (Android Firebase / Android Play / iOS) | `add-environment.md` |
| Debug a build/lane/signing/upload failure | `troubleshooting.md` |
| What demo_app_bk concretely runs + its known caveats | `reference-implementation.md` |

---

## Golden rules (production — MUST enforce)

**Secrets** · never commit (Base64/encrypted → decode to `/tmp` → cleanup `if: always()`) · least privilege (ASC=App Manager, Play SA=Release manager, prefer OIDC over long-lived keys) · gate prod secrets behind GitHub Environment reviewers or Vault; rotate on schedule/offboarding.

**Signing** · iOS CI is `readonly: true` + `setup_ci` in `before_all` + `CODE_SIGN_STYLE=Manual` with explicit profile · Android signs with the upload key (Play App Signing); back up the upload keystore out-of-band.

**Quality** · gates run before build, ordered cheap→expensive (lint→typecheck→unit→build→E2E), fail-fast; prod requires green required checks.

**Release** · query build number/versionCode at runtime, monotonic, never reused · production promotes the QA-approved binary, never rebuilds (iOS `automatic_release: false`; Android staged rollout) · know the halt/rollback/OTA path before shipping.

**Operability** · upload dSYM + Hermes sourcemap + R8 mapping, tagged to match the app's release/dist · one environment = one workflow + one secrets prefix · commit lockfiles with any `Gemfile`/`package.json` change.

---

This skill reflects a point in time — before editing, confirm against the real files: `.github/workflows/*.yml`, `fastlane/Fastfile`, `fastlane/.env*`, `Appfile`, `Matchfile`, `android/app/build.gradle`.
