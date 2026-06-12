# Release Strategy — Production

## Versioning

- **versionName / marketing version** = SemVer `MAJOR.MINOR.PATCH` — human-facing, bumped intentionally per release (`bump_version` lane).
- **build number / versionCode** = monotonic integer, **never reused**, **never hardcoded** → query the store at runtime:
  - iOS: `latest_testflight_build_number(...) + 1` (fallback `initial_build_number: 0`).
  - Android Play: `google_play_track_version_codes(track: "internal").max + 1` (rescue → 0 on first upload).
  - Firebase-only flavors: `github.run_number` is sufficient (no monotonic requirement across the store). YARA adds a legacy offset (`+ 44070`) to stay above old CI numbers — apply an offset only when migrating from a prior numbering scheme.

## Release flow (beta → production)

```
merge → release branch
   │  (automatic)
   ├─ iOS beta  → TestFlight    │ Android beta → Play Internal
   │
QA tests 1–2 days, signs off
   │  (manual, gated)
   └─ workflow_dispatch "production"
        iOS: submit to App Store (no rebuild) → Apple review 1–3 days → manual release
        Android: promote Internal → Production (no rebuild) → staged rollout
```

**Production promotes the QA-approved binary — it never rebuilds.** Rebuilding would invalidate QA's testing.

## Android staged rollout

| Stage | Rollout | Gate to advance |
|-------|---------|-----------------|
| Initial | 10% (`0.1`) | at release |
| Expand | 25% (`0.25`) | 24h, no crash-rate spike |
| Expand | 50% (`0.5`) | 48h stable |
| Full | 100% (`1.0`) | ~1 week confident |

Promote without re-upload: `supply(track: "internal", track_promote_to: "production", rollout: "0.1", skip_upload_aab: true, ...)`.

## iOS phased release

- `automatic_release: false` → after Apple approves, the app sits in "Pending Developer Release"; a human clicks release. Prevents an accidental 100% launch.
- Enable **phased release** (`phased_release: true` in `deliver`) → Apple rolls the update over 7 days to existing users automatically.

## Rollback / halt (know this BEFORE shipping)

| Platform | Mechanism | Effect |
|----------|-----------|--------|
| Android | **Halt rollout** in Play Console | stops further % exposure immediately |
| Android | Release a higher versionCode hotfix | supersedes the bad build |
| iOS | **Pause phased release** in App Store Connect | freezes the rollout |
| iOS | Remove from sale / expedited review hotfix | Apple has no instant rollback — forward-fix |
| JS-only bug | **OTA rollback** (see below) | instant, no store review |

You cannot "un-release" a native binary instantly on either store → for native bugs the answer is a fast forward-fix; design for it.

## Hotfix flow

```
branch from the released tag (not main HEAD)
→ minimal fix + bump PATCH
→ fast-track beta → QA smoke
→ manual production promote (Android higher rollout, iOS expedited if needed)
→ forward-merge the fix back into main
```

## OTA updates (JS-only)

For JS/asset-only changes you can ship **without a store review** via **EAS Update** (current) or self-hosted CodePush (App Center is retiring — migrate off).

- **Only JS + assets** — native changes (new pod, native module, permission) still require a store build. Gate updates to a compatible **runtime/native version**.
- **Mandatory vs optional** — force-update for critical fixes; optional for minor.
- **Rollback** — point the channel back to the previous update; clients fetch it on next launch.
- **Caution** — OTA bypasses review; keep the same quality gates, and respect store policy (no changing the app's purpose via OTA).

## Changelog / release notes
- Auto-generate from git for QA (`git log -10`); requires `fetch-depth: 0`.
- For store listings, maintain curated user-facing notes separately (don't dump commit messages to end users).
