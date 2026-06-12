# Secrets Management — Production

## Storage options (least → most hardened)

| Mechanism | When to use | Notes |
|-----------|-------------|-------|
| **GitHub Secrets** (repo) | small teams, single repo | text-only → Base64-encode binaries; auto-masked in logs |
| **GitHub Environments** + protection rules | gating production | required reviewers, wait timers, branch restrictions before prod secrets are exposed |
| **OIDC keyless** (Workload Identity Federation) | cloud auth (GCP/AWS/Azure) | **no long-lived cloud key**; GitHub mints a short-lived token per run. Preferred for Play/Cloud access |
| **HashiCorp Vault** | orgs, many apps/envs | per-environment policy path; dynamic/short-TTL secrets; central rotation. YARA pattern |

**Direction of travel for a real app:** flat repo secrets → environment-scoped secrets with required reviewers on production → OIDC for cloud APIs → Vault if you run many apps/environments.

## Hardening rules
- **Least privilege** on every credential: ASC key = App Manager; Play SA = Release manager; Match token = scoped read.
- **Gate production**: production deploy job runs in a protected GitHub Environment (or behind a Vault policy) requiring human approval.
- **Rotate** certs/keys/tokens on a schedule and immediately on offboarding. Keep a documented rotation runbook.
- **Decode to ephemeral storage** (`/tmp`) at runtime; **always clean up** (`if: always()`). Never write secrets to the workspace or artifacts.
- **Scan**: enable push protection / secret scanning to catch accidental commits.
- **Backups out-of-band**: upload keystore, Match password, `.p8` — store in a password manager / KMS, never in the repo.

## Storing binaries in text secrets
```bash
base64 -i release.keystore | pbcopy     # macOS — do NOT use -w 0
# CI: echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/release.keystore
```

## Fastlane env files
| File | Commit? | Contains |
|------|---------|----------|
| `.env.default` | ✅ | non-secret defaults (`ROLLOUT_PERCENTAGE=0.1`, `APP_VERSION`) |
| `.env.example` | ✅ | template + how to obtain each value |
| `.env`, `.env.<env>` | ❌ gitignored | local/runtime secrets; on CI written from a secret then used as `ENVFILE` |

---

## demo_app_bk secret inventory (concrete)

Stored as flat GitHub Secrets today. For production, scope the production ones behind an Environment with required reviewers.

**iOS — shared:** `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_CONTENT` (`.p8` content incl. header), `APP_IDENTIFIER`, `TEAM_ID`, `APP_VERSION`, `MATCH_GIT_URL`, `MATCH_GIT_TOKEN` (PAT, repo scope), `MATCH_PASSWORD`.

**iOS QA** (`ios-qa.yml`): `QA_APP_IDENTIFIER` (`com.tuanvu.demoapp.qa`), `FIREBASE_IOS_QA_APP_ID` (`1:xxx:ios:yyy`), `FIREBASE_TOKEN` (shared, from `firebase login:ci`), `ENV_QA` (full `.env.qa` content).

**Android Prod** (`android-beta.yml`): `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_ALIAS`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_PASSWORD`, `GOOGLE_PLAY_JSON_KEY_BASE64`, `ANDROID_APP_IDENTIFIER` (separate from iOS `APP_IDENTIFIER`), `APP_VERSION`.

**Android Qa** (`android-qa.yml`): `ANDROID_QA_{KEYSTORE_BASE64,KEYSTORE_ALIAS,KEYSTORE_PASSWORD,KEY_PASSWORD,FIREBASE_APP_ID}`, `FIREBASE_TOKEN`, `APP_VERSION`.

**Android Antonio** (`android-antonio.yml`): `ANDROID_ANTONIO_{KEYSTORE_BASE64,KEYSTORE_ALIAS,KEYSTORE_PASSWORD,KEY_PASSWORD,FIREBASE_APP_ID}`, `FIREBASE_TOKEN`, `APP_VERSION`.

> ⚠️ `production.yml` passes `GOOGLE_PLAY_JSON_KEY_PATH` directly (no Base64 decode like `android-beta.yml`) — verify before the first production promote. See `reference-implementation.md` (Known issues #2).

### Naming convention for a new environment
- Android: `ANDROID_<ENV>_*` (e.g. `ANDROID_STAGING_KEYSTORE_BASE64`).
- iOS: `<ENV>_APP_IDENTIFIER`, `FIREBASE_IOS_<ENV>_APP_ID`, `ENV_<ENV>`.
- Match + ASC + `FIREBASE_TOKEN` → **shared**, do not duplicate.

### Get the shared Firebase token (once)
```bash
./node_modules/.bin/firebase login:ci   # token 1//0g… — offline, valid until revoked
```
