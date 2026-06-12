# Architecture — Production RN CI/CD

The topology, environments, runners, and triggering model for a production React Native pipeline. For the concrete demo_app_bk wiring, see `reference-implementation.md`.

## Beta vs production separation (the core principle)

```
Code merged to a release branch
        │
        ├──► [Beta — automatic]   every push → fresh build → QA tests immediately
        │       iOS  → TestFlight internal / Firebase App Distribution
        │       Android → Play Internal / Firebase App Distribution
        │
QA approves
        │
        └──► [Production — manual, gated]   workflow_dispatch only
                iOS  → App Store (review 1–3 days, phased release)
                Android → Play Production (staged rollout 10% → 100%)
```

- **Beta is automatic** — fast feedback; a push yields a testable build in minutes.
- **Production is a human decision** — manual trigger, behind environment protection/approval. It **promotes the QA-approved binary**, it does not rebuild.

## Environment matrix

Define environments explicitly; each gets a distinct application identifier so they install side-by-side and never collide.

| Env | Purpose | iOS bundle ID | Android applicationId | Distribution | Trigger |
|-----|---------|---------------|----------------------|--------------|---------|
| dev | local / smoke | `…app.dev` | `…app.dev` | sideload / Firebase | feature branches |
| qa / staging | QA sign-off | `…app.qa` | `…app.qa` | TestFlight + Firebase | `release/*` branch |
| uat (optional) | client/stakeholder | `…app.uat` | `…app.uat` | TestFlight + Firebase | `release/uat` |
| production | end users | `…app` | `…app` | App Store / Play Production | `workflow_dispatch` |

Per-env you also vary: display name + icon badge (visual distinction), `ENVFILE` / `google-services.json` / `GoogleService-Info.plist`, API endpoints, feature flags, crash-reporter project.

## Trigger & branching model

Two common shapes — pick one and keep it consistent:

| Model | How | Best for |
|-------|-----|----------|
| **Branch-per-environment** | `release/ios`, `release/android`, `main`→prod-beta; each branch maps to a workflow + env (demo_app_bk style; YARA maps branch→helm-environment) | Clear separation, simple mental model |
| **Trunk-based + tags** | merge to `main`; tag `v1.2.3` triggers prod; env chosen by workflow input | Fewer long-lived branches, cleaner history |

Hotfix flow in both: branch from the released tag → fix → fast-track through beta → manual production promote.

## Runner & cost strategy

| Concern | Guidance |
|---------|----------|
| iOS | Requires macOS (Xcode). `macos-15` GitHub-hosted ≈ $0.08/min. Minimize: cache Pods, skip build processing wait. |
| Android | Linux only (`ubuntu-latest` ≈ $0.008/min, ~10× cheaper). Never put Android on macOS. |
| Self-hosted | Use for: IP-allowlisted store/Vault access, faster caches, compliance, heavy E2E. Cost: maintenance + security hardening of the runner. YARA uses self-hosted `gh-runner-apac-large`. |
| Concurrency | `cancel-in-progress: true` for beta (newest wins); **`false` for production** (never cancel a release mid-flight). |
| Caching | Bundler (`bundler-cache: true`), npm (`cache: 'npm'`), Pods (key = `Podfile.lock` hash), Gradle (key = `*.gradle*` hash). Caches are the biggest time saver. |

> **Build engine choice:** Fastlane + self-hosted/GitHub macOS (full control) vs **EAS Build** (Expo-hosted, no macOS to manage). See `eas-build.md` for the trade-off and when to pick which — ask in Discovery before assuming.

## The "inject environment" pattern (YARA pattern)

One Fastfile serves every environment; the workflow injects the env var, the Fastfile reads it dynamically:

```
workflow:  env: ANDROID_BUILD_FLAVOUR: Qa
Fastfile:  flavour = ENV["ANDROID_BUILD_FLAVOUR"] || "Prod"
gradle:    bundle<Flavour>Release  →  applicationId per flavor
```

This keeps lanes DRY and makes adding an environment a config change, not a code fork. Secrets are namespaced per env (`ANDROID_<ENV>_*`) — in larger orgs, replace flat secrets with a **Vault path per environment** (see `secrets-management.md`).

## Standard job skeleton (every workflow)

```
checkout (fetch-depth: 0)            # full history for changelog/versioning
→ setup language toolchains          # node, ruby (+ xcode | java)
→ restore caches                     # bundler, npm, pods | gradle
→ install deps                       # npm ci, pod install
→ QUALITY GATES                      # lint, typecheck, unit, (E2E)   ← see quality-gates.md
→ decode secrets to ephemeral files
→ fastlane <platform> <lane>         # build + sign + upload
→ upload symbols                     # dSYM / sourcemaps / mapping    ← see observability.md
→ upload artifacts
→ cleanup secrets (if: always())
```

> demo_app_bk currently omits the quality-gate and symbol-upload steps — see `reference-implementation.md` → "Gaps vs the production standard".
