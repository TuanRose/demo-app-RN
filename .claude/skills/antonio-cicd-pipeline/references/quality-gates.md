# Quality Gates — Production

No binary is built or shipped until automated checks pass. Gates run **before** the expensive build/sign/upload steps.

## Ordering — cheap to expensive, fail-fast

```
1. lint            (ESLint + Prettier)        seconds
2. typecheck       (tsc --noEmit)             seconds
3. unit tests      (Jest + coverage)          1–3 min
4. build           (gym / gradle)             10–25 min   ← only reached if 1–3 pass
5. E2E (optional)  (Detox / Maestro)          10–30 min   ← on a real/simulated device
```

A failure at step N skips everything after it → fast feedback, minimal wasted runner minutes.

## Where gates run

| Stage | Gates | Purpose |
|-------|-------|---------|
| **Pull request** (required status checks) | lint, typecheck, unit, build-only | block merge; protect the release branch |
| **Beta workflow** (push to release branch) | re-run lint/typecheck/unit, then build + distribute | guarantee the shipped build is green |
| **Production workflow** | rely on the green beta build; optionally re-run a smoke E2E | no rebuild — just promote |

Make the PR checks **required** in branch protection so nothing merges red.

## What each gate enforces

| Gate | Command | Failure means |
|------|---------|---------------|
| Lint/format | `npm run lint` | style/convention violations, dead code |
| Types | `tsc --noEmit` (strict) | type regressions, `any` leaks |
| Unit | `npm test -- --coverage` | logic broke; coverage below threshold |
| E2E | `detox test` / `maestro test` | a real user flow (login, checkout) broke |

### Coverage thresholds
Set a floor in Jest config so coverage cannot silently rot:
```js
coverageThreshold: { global: { branches: 70, functions: 75, lines: 80, statements: 80 } }
```
Raise gradually; never lower without a documented reason.

## Example gate job (runs before build)
```yaml
quality:
  runs-on: ubuntu-latest        # gates are platform-agnostic → cheap Linux
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with: { node-version: '22', cache: 'npm' }
    - run: npm ci
    - run: npm run lint
    - run: npx tsc --noEmit
    - run: npm test -- --coverage --ci

build-ios:
  needs: quality                # build only starts if quality passed
  runs-on: macos-15
  # ...
```

## E2E in CI (when to add)
- **Detox** — gray-box, tied to the RN app; deterministic, good for critical flows; heavier setup. Runs on simulator/emulator.
- **Maestro** — black-box, YAML flows; faster to write, lower maintenance; great smoke tests.
- Run E2E on **beta** (post-build, on the artifact), not on every PR (too slow/flaky) — or a small smoke subset on PR, full suite nightly.

## Principle
Gates exist to make a red `main`/release branch impossible. If a check is flaky, fix or quarantine it — never make it non-blocking and forget it.

> demo_app_bk has no quality-gate job today. Adding this `quality` job (and `needs: quality` on the build jobs) is the single highest-value production upgrade.
