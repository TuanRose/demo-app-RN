# React Native Mastery Roadmap — 1 Month

> **Strategy:** Hybrid — build one cohesive spine app (FinTrack) while covering all 15 skills.  
> Each skill = one lesson folder in `src/` that contributes a real feature to FinTrack.

| | |
|---|---|
| **Start date** | ___________ |
| **Target end** | ___________ |
| **Spine app** | FinTrack — personal finance tracker |
| **Daily commitment** | ~1.5–2h weekdays · 3–4h weekends |

---

## Production Standard Notice

> **This roadmap is built to production standard — end-to-end.**

Every skill, every deliverable, every "Done when" criteria in this roadmap is held to the bar of **shipping a real app to the App Store and Google Play** — not just making it run locally.

Concretely, that means:

| Area | What "production standard" requires in this roadmap |
|---|---|
| **Architecture** | Clean Architecture with enforced module boundaries — no shortcut spaghetti imports |
| **Security** | Tokens in Keychain (never AsyncStorage), biometric auth, PKCE, SSL pinning, OWASP checklist |
| **Data** | Offline-first SQLite with migrations, sync queue, optimistic updates |
| **Notifications** | Proper channel setup, background handling, permission flow per platform |
| **Performance** | FlatList optimized, Hermes enabled, profiling done with real data (500+ items) |
| **Observability** | Sentry + Crashlytics wired before any feature is "done" — errors must be tracked |
| **Accessibility** | VoiceOver + TalkBack tested on every screen — not an afterthought |
| **Testing** | Unit (use cases) + RNTL (components) + Detox (E2E critical flows) |
| **CI/CD** | Automated lint + test on PR; EAS Build on merge; OTA update channels configured |
| **Release** | Signed APK/AAB (Android) + Xcode archive (iOS) produced manually at least once |
| **Native Modules** | Both Legacy Bridge and Turbo Module implemented — understand the JSI architecture |

> If a skill is marked ✅ but the implementation wouldn't survive a production code review, it doesn't count.

### Outcome guarantee

> **Completing this roadmap end-to-end delivers the practical skills of a React Native developer with 6+ years of real-world, production experience.**

Not "can build a demo app" — but:
- Can design and defend architecture decisions under pressure
- Can ship, monitor, and maintain an app in production
- Can onboard to any RN codebase and immediately contribute at a senior level
- Can lead technical decisions on mobile architecture for a product team

---

## Knowledge Journal Convention

> **After every completed skill or milestone, create a summary file in `.docs/`.**

`.docs/` is a personal knowledge base — built up as you go, readable anytime without opening code.

### When to write

| Trigger | Example |
|---|---|
| Skill completed (all checkboxes done) | finish `rn-navigation` → write `navigation.md` |
| Multi-day feature done | finish offline-first storage → write `offline-first.md` |
| Non-obvious decision made | chose SQLite over WatermelonDB → document the trade-off |
| Bug that took >30 min to solve | deep-link not firing on Android cold start → document the fix |

### Naming convention

```
.docs/
  rn-architecture.md
  rn-navigation.md
  rn-state-management.md
  offline-first-storage.md       ← feature-level, spans multiple skills
  native-module-legacy-vs-turbo.md
  release-checklist-ios.md
  ...
```

Use `kebab-case`. Skill summaries use the skill name. Feature/decision docs use a descriptive name.

### Template

Each file should answer these questions — skip any that don't apply:

```markdown
# {Skill / Feature Name}

## What I built
<!-- 2–3 sentences: the concrete deliverable -->

## Key concepts
<!-- Bullet points: the mental models worth keeping -->

## Decisions & trade-offs
<!-- What I chose, what I rejected, and why -->

## Gotchas
<!-- Anything that surprised me or cost time -->

## Code patterns to remember
<!-- Short snippets of the patterns I'll reuse — not full implementations -->

## References
<!-- Links to skill files, docs, or Stack Overflow answers that were useful -->
```

> The goal is **retrieval speed** — you should be able to re-learn a skill in 10 minutes by reading its `.docs/` file, not by re-reading the full skill reference.

---

## Collaboration Guidelines

Rules for working through this roadmap together — apply from Day 1.

### Debate & challenge

- Push back at any point: "why not X instead of Y?", "is this still the right approach?", "this seems over-engineered for this case"
- Claude will question decisions too — if something in the roadmap or your implementation looks off, expect a challenge, not silent agreement
- No rubber-stamping: the goal is understanding, not completion

### Every decision gets 3 options

For any implementation choice — library, pattern, architecture, approach — Claude will always present **at least 3 alternatives** before you choose.

Format used consistently:

---

**Option A: [Name]**
- Pros: ...
- Cons: ...
- Trade-off: ...
- Best when: ...

**Option B: [Name]**
- Pros: ...
- Cons: ...
- Trade-off: ...
- Best when: ...

**Option C: [Name]**
- Pros: ...
- Cons: ...
- Trade-off: ...
- Best when: ...

**Recommendation:** [which one, and the specific reason given this context]

---

> Never pick the first option presented just because it's first. The recommendation is a starting point, not a verdict.

---

## Skill Coverage Tracker

| # | Skill | Approach | Week | Status |
|---|---|---|---|---|
| 1 | `rn-architecture` | Project | 1 | ⬜ Not started |
| 2 | `rn-navigation` | Project | 1 | ⬜ Not started |
| 3 | `rn-state-management` | Project | 1 | ⬜ Not started |
| 4 | `rn-storage` | Project | 2 | ⬜ Not started |
| 5 | `rn-push-notifications` | Project | 2 | ⬜ Not started |
| 6 | `rn-security` | Deep-dive | 2 | ⬜ Not started |
| 7 | `rn-animation` | Project | 3 | ⬜ Not started |
| 8 | `rn-accessibility` | Project | 3 | ⬜ Not started |
| 9 | `rn-native-performance` | Project | 3 | ⬜ Not started |
| 10 | `rn-debugging` | Project | 3 | ⬜ Not started |
| 11 | `rn-testing` | Project | 4 | ⬜ Not started |
| 12 | `rn-cicd` | Project | 4 | ⬜ Not started |
| 13 | `rn-native-legacy` | Deep-dive | 4 | ⬜ Not started |
| 14 | `rn-native-platform` | Deep-dive | 4 | ⬜ Not started |
| 15 | `rn-platform-guides` | Deep-dive | 4 | ⬜ Not started |

---

## Spine App: FinTrack

A production-grade personal finance tracker — intentionally scoped to touch every skill naturally.

### Screens

| Screen | Key skills exercised |
|---|---|
| Onboarding / Login | navigation (auth flow), security (biometric) |
| Dashboard | state management, animation (charts), performance |
| Transaction List | performance (FlatList), state, storage |
| Add / Edit Transaction | navigation, state, storage |
| Budget Overview | state, animation |
| Settings | storage (MMKV), security, notifications |
| Notifications permission | push notifications |

### Lesson folder mapping

Each skill maps to a `src/` lesson folder. Build FinTrack features inside that folder's `screens/` and `components/`, then wire into the main app.

```
src/
  01_architecture/        ← FinTrack project scaffold, Clean Arch setup
  02_navigation/          ← All navigators, deep linking, auth flow
  03_state_management/    ← Redux Toolkit slices + TanStack Query
  04_storage/             ← MMKV settings + SQLite transactions
  05_push_notifications/  ← FCM setup + Notifee channels
  06_security/            ← Keychain tokens + PKCE auth + SSL pinning
  07_animation/           ← Chart animations + swipe-to-delete
  08_accessibility/       ← Full a11y on all FinTrack screens
  09_performance/         ← FlatList tuning + JS loading + profiling
  10_debugging/           ← Sentry + Crashlytics integration
  11_testing/             ← Unit tests (use cases) + RNTL + Detox flows
  12_cicd/                ← EAS Build config + GitHub Actions workflow
  13_native_legacy/       ← Custom native module (device biometric info)
  14_native_platform/     ← Turbo Module version of same module
  15_platform_guides/     ← Release build, signing, App Store / Play Store
```

---

## Week 1 — Foundation (Days 1–7)

**Goal:** Solid architectural base. App navigates between all screens (even if empty).

**Skills:** `rn-architecture` · `rn-navigation` · `rn-state-management`

---

### Day 1–2 · Architecture `rn-architecture`

**Read:**
- [ ] `/rn-architecture` → `folder-structure.md`
- [ ] `/rn-architecture` → `clean-architecture.md`

**Build — `src/01_architecture/`:**
- [ ] Scaffold FinTrack folder structure: `features/`, `shared/`, `services/`, `app/`
- [ ] Configure path aliases: `tsconfig.json` `paths` + `babel-plugin-module-resolver`
- [ ] Define Domain layer: `Transaction`, `Budget`, `Category` entities + repository interfaces
- [ ] Write `README.md` explaining the Clean Architecture decisions (WHY each layer exists)

**Done when:** `npx tsc --noEmit` passes with path aliases resolving correctly.

---

### Day 3–4 · Navigation `rn-navigation`

**Read:**
- [ ] `/rn-navigation` → `core-navigators.md`
- [ ] `/rn-navigation` → `auth-flow.md`
- [ ] `/rn-navigation` → `deep-linking.md`

**Build — `src/02_navigation/`:**
- [ ] RootNavigator: conditional Auth stack vs App stack based on auth state
- [ ] App stack: Bottom Tab (Dashboard, Transactions, Budgets, Settings) + Stack for modals
- [ ] Type-safe navigation params for all screens
- [ ] Deep link config: `fintrack://transaction/:id` opens Transaction detail
- [ ] Demo all screens wired (placeholder content is fine)

**Done when:** Auth → Dashboard navigation works; deep link opens correct screen.

---

### Day 5–7 · State Management `rn-state-management`

**Read:**
- [ ] `/rn-state-management` → `when-to-use.md` (decision tree first)
- [ ] `/rn-state-management` → `redux-toolkit.md`
- [ ] `/rn-state-management` → `tanstack-query.md`
- [ ] `/rn-state-management` → `zustand.md`

**Build — `src/03_state_management/`:**
- [ ] Redux Toolkit: `authSlice` (user, token), `budgetSlice` (local budget state)
- [ ] TanStack Query: `useTransactions` hook with `queryFn` (mock API for now)
- [ ] Zustand: `useUIStore` for theme + filter preferences
- [ ] Write commentary in code on WHY each library was chosen for each use case
- [ ] Wiring: Dashboard reads from TanStack Query; Settings reads from Zustand

**Done when:** Dashboard renders mock transactions from TanStack Query; theme toggle via Zustand persists across re-renders.

---

## Week 2 — Data & Connectivity (Days 8–14)

**Goal:** App works offline, sends notifications, tokens secured properly.

**Skills:** `rn-storage` · `rn-push-notifications` · `rn-security`

---

### Day 8–9 · Storage `rn-storage`

**Read:**
- [ ] `/rn-storage` → `mmkv.md`
- [ ] `/rn-storage` → `sqlite.md`
- [ ] `/rn-storage` → `offline-patterns.md`

**Build — `src/04_storage/`:**
- [ ] MMKV: persist Zustand `useUIStore` (theme, currency, filters)
- [ ] SQLite (op-sqlite): `transactions` table with migrations, WAL mode enabled
- [ ] `TransactionRepository` implementation using SQLite (wires to Clean Arch interface from Day 1)
- [ ] Offline-first: optimistic add transaction → sync queue for when network returns
- [ ] Replace TanStack Query mock with real SQLite reads

**Done when:** Add transaction → close app → reopen → data persists. App works in Airplane mode.

---

### Day 10–11 · Push Notifications `rn-push-notifications`

**Read:**
- [ ] `/rn-push-notifications` → `fcm-setup.md`
- [ ] `/rn-push-notifications` → `apns-ios.md`
- [ ] `/rn-push-notifications` → `local-notifications.md`
- [ ] `/rn-push-notifications` → `notification-handling.md`

**Build — `src/05_push_notifications/`:**
- [ ] FCM setup (iOS + Android), permission request flow
- [ ] Notifee channels: `budget-alert` (high importance) + `daily-reminder` (default)
- [ ] Local notification: daily spending reminder (scheduled, 9:00 AM)
- [ ] Budget alert: trigger notification when spending exceeds 80% of budget
- [ ] Tap notification → navigate to relevant screen via deep link

**Done when:** Schedule a reminder → receive it; exceed budget threshold → alert fires.

---

### Day 12–14 · Security `rn-security` *(Deep-dive)*

**Read:**
- [ ] `/rn-security` → `secure-storage.md`
- [ ] `/rn-security` → `oauth-pkce.md`
- [ ] `/rn-security` → `ssl-pinning.md`
- [ ] `/rn-security` → `owasp-checklist.md`

**Build — `src/06_security/`:**
- [ ] TokenManager: store access/refresh tokens in Keychain (not AsyncStorage)
- [ ] Biometric login: `ACCESS_CONTROL.BIOMETRY_ANY` on token retrieval
- [ ] PKCE auth flow: `react-native-app-auth` with auto-refresh interceptor
- [ ] SSL pinning setup (demo with a test endpoint — document why pinning matters)
- [ ] OWASP self-audit: go through checklist, mark which items FinTrack addresses and which are N/A

**Done when:** Tokens survive app restart, biometric prompt blocks access without fingerprint/face.

---

## Week 3 — UX & Quality (Days 15–21)

**Goal:** App feels polished, is accessible, performs well, and has observability.

**Skills:** `rn-animation` · `rn-accessibility` · `rn-native-performance` · `rn-debugging`

---

### Day 15–16 · Animation `rn-animation`

**Read:**
- [ ] `/rn-animation` → `reanimated.md`
- [ ] `/rn-animation` → `gesture-handler.md`
- [ ] `/rn-animation` → `layout-animations.md`
- [ ] `/rn-animation` → `animated-api.md` (skim — understand when to use vs Reanimated)

**Build — `src/07_animation/`:**
- [ ] Transaction list: swipe-to-delete with `Gesture.Pan` + `useAnimatedStyle`
- [ ] Dashboard: animated progress bar for budget usage (`useSharedValue` + `withSpring`)
- [ ] Add transaction modal: `entering={SlideInDown}` / `exiting={SlideOutDown}`
- [ ] Micro-interaction: button press feedback with `withSpring` scale

**Done when:** Swipe gesture deletes transaction with smooth animation running at 60fps (verify in Perf Monitor).

---

### Day 17–18 · Accessibility `rn-accessibility`

**Read:**
- [ ] `/rn-accessibility` → `a11y-props.md`
- [ ] `/rn-accessibility` → `screen-reader.md`
- [ ] `/rn-accessibility` → `a11y-patterns.md`

**Build — `src/08_accessibility/`:**
- [ ] Audit all FinTrack screens: add `accessibilityRole`, `accessibilityLabel`, `accessibilityState`
- [ ] Transaction list items: group amount + category + date into single accessible element
- [ ] Budget progress bar: `accessibilityRole="progressbar"` + `accessibilityValue` with min/max/now
- [ ] Form inputs: `accessibilityRequired`, error state with `liveRegion="assertive"`
- [ ] Test with VoiceOver (iOS) + TalkBack (Android) — log issues found

**Done when:** Full Dashboard → Add Transaction flow is navigable with screen reader without confusion.

---

### Day 19–20 · Performance `rn-native-performance`

**Read:**
- [ ] `/rn-native-performance` → `performance-overview.md`
- [ ] `/rn-native-performance` → `flatlist.md`
- [ ] `/rn-native-performance` → `js-loading.md`
- [ ] `/rn-native-performance` → `profiling.md`

**Build — `src/09_performance/`:**
- [ ] Transaction list: `getItemLayout`, `keyExtractor`, `React.memo` on item component
- [ ] Measure before/after: use Perf Monitor to capture FPS with 500 mock transactions
- [ ] Hermes: verify it's enabled; profile JS bundle size with `react-native-bundle-visualizer`
- [ ] Identify one real bottleneck in FinTrack and fix it (document the profiling steps)

**Done when:** Transaction list scrolls at steady 60fps with 500 items; documented profiling report in `README.md`.

---

### Day 21 · Debugging `rn-debugging`

**Read:**
- [ ] `/rn-debugging` → `devtools.md`
- [ ] `/rn-debugging` → `sentry.md`
- [ ] `/rn-debugging` → `crashlytics.md`

**Build — `src/10_debugging/`:**
- [ ] Sentry: `Sentry.init` + `Sentry.wrap(App)` + `ReactNavigationInstrumentation`
- [ ] ErrorBoundary with `<Sentry.ErrorBoundary>` on transaction list
- [ ] Crashlytics: iOS Build Phase script + Android Gradle plugin, `recordError` in catch blocks
- [ ] Custom global error handler: Sentry + Crashlytics combined
- [ ] Test: deliberately throw an error, verify it appears in Sentry dashboard

**Done when:** A caught error is visible in both Sentry and Crashlytics with correct stack trace.

---

## Week 4 — Testing, Ship & Native (Days 22–28)

**Goal:** App is tested, shippable via CI/CD, and demonstrates native module knowledge.

**Skills:** `rn-testing` · `rn-cicd` · `rn-native-legacy` · `rn-native-platform` · `rn-platform-guides`

---

### Day 22–23 · Testing `rn-testing`

**Read:**
- [ ] `/rn-testing` → `jest-unit.md`
- [ ] `/rn-testing` → `rntl.md`
- [ ] `/rn-testing` → `detox.md`
- [ ] `/rn-testing` → `maestro.md` (skim)

**Build — `src/11_testing/`:**
- [ ] Unit tests: `GetTransactionsByBudget` use case (pure Domain layer — no mocks needed beyond repo interface)
- [ ] Unit tests: `TransactionRepositoryImpl` with mocked SQLite
- [ ] RNTL: `TransactionListItem` renders correct amount + category; swipe gesture triggers delete callback
- [ ] RNTL: Add Transaction form — validation errors appear on empty submit
- [ ] Detox: E2E flow — login → add transaction → verify it appears in list

**Done when:** `npm test` passes; Detox E2E runs on simulator without failure.

---

### Day 24–25 · CI/CD `rn-cicd`

**Read:**
- [ ] `/rn-cicd` → `eas-build.md`
- [ ] `/rn-cicd` → `github-actions.md`
- [ ] `/rn-cicd` → `fastlane-ios.md` (skim)
- [ ] `/rn-cicd` → `fastlane-android.md` (skim)

**Build — `src/12_cicd/`:**
- [ ] `eas.json`: development + preview + production profiles
- [ ] GitHub Actions workflow: on PR → lint + test; on merge to main → EAS build (preview channel)
- [ ] OTA update channel config: `preview` for QA, `production` for store
- [ ] Document in `README.md`: branching strategy + which pipeline triggers what

**Done when:** Push a commit → GitHub Actions runs lint + tests successfully. EAS build config is valid (`eas build --platform all --profile preview --dry-run`).

---

### Day 26 · Native Legacy Modules `rn-native-legacy` *(Deep-dive)*

**Read:**
- [ ] `/rn-native-legacy` → `SKILL.md` (overview + JS wrapper patterns)
- [ ] `/rn-native-legacy` → `module-android.md`
- [ ] `/rn-native-legacy` → `module-ios.md`

**Build — `src/13_native_legacy/`:**
- [ ] Native module: `BiometricInfoModule` — exposes device biometric type (fingerprint / faceID / none) to JS
- [ ] Android: `ReactContextBaseJavaModule` + `@ReactMethod` + `ReactPackage`
- [ ] iOS: `RCTBridgeModule` + `RCT_EXPORT_METHOD`
- [ ] JS wrapper with TypeScript types + `NativeModules` bridge
- [ ] Use in FinTrack Settings screen: display "Login with Face ID / Fingerprint / PIN"

**Done when:** Module returns correct biometric type on both platforms via `BiometricInfoModule.getBiometricType()`.

---

### Day 27 · New Architecture `rn-native-platform` *(Deep-dive)*

**Read:**
- [ ] `/rn-native-platform` → `SKILL.md`
- [ ] `/rn-native-platform` → `turbo-module-android.md`
- [ ] `/rn-native-platform` → `turbo-module-ios.md`

**Build — `src/14_native_platform/`:**
- [ ] TypeScript spec: `NativeBiometricInfo.ts` using `TurboModuleRegistry`
- [ ] Android: `NativeBiometricInfoSpec` (CodeGen) + `BaseReactPackage`
- [ ] iOS: `.mm` Objective-C++ with `getTurboModule`
- [ ] Side-by-side comparison notes: Legacy vs Turbo Module — what changed and WHY (sync calls, JSI, no bridge)

**Done when:** Same `getBiometricType()` works via Turbo Module; document the architecture diff.

---

### Day 28 · Release & Platform Guides `rn-platform-guides` *(Deep-dive)*

**Read:**
- [ ] `/rn-platform-guides` → `android-release.md`
- [ ] `/rn-platform-guides` → `ios-release.md`
- [ ] `/rn-platform-guides` → `android-communication.md` (skim)
- [ ] `/rn-platform-guides` → `ios-communication.md` (skim)

**Build — `src/15_platform_guides/`:**
- [ ] Android: generate keystore, configure Gradle signing for release build
- [ ] Android: produce signed APK/AAB — `./gradlew bundleRelease`
- [ ] iOS: configure scheme for release, build archive via Xcode or `xcodebuild`
- [ ] Document: App Store submission checklist + Google Play checklist (screenshots, metadata, privacy policy URL)
- [ ] Reflection: what EAS Build automates vs what you'd do manually

**Done when:** Release APK builds successfully; README documents the full manual release steps.

---

## Weekly Check-ins

Use these questions at the end of each week to gauge depth, not just completion.

### Week 1 Retrospective
- [ ] Can I explain Clean Architecture layers to a junior dev without notes?
- [ ] Can I set up type-safe nested navigation from scratch?
- [ ] Can I articulate when to use RTK vs TanStack Query vs Zustand?

### Week 2 Retrospective
- [ ] Can I implement offline-first SQLite sync without looking at the reference?
- [ ] Can I set up FCM + local notifications end-to-end on a fresh project?
- [ ] Can I explain PKCE flow and why it's safer than implicit grant?

### Week 3 Retrospective
- [ ] Can I build a Reanimated gesture from scratch (no copy-paste)?
- [ ] Can I audit a screen for a11y issues and fix them confidently?
- [ ] Can I profile a FlatList bottleneck and articulate the fix?

### Week 4 Retrospective
- [ ] Can I write a use-case unit test with a mock repository from memory?
- [ ] Can I set up a GitHub Actions RN pipeline in under 30 minutes?
- [ ] Can I explain the difference between Legacy Bridge and JSI/Turbo Module architecture?

---

## Notes & Blockers

> Use this section to log decisions, trade-offs discovered, or anything that took longer than expected.

| Date | Skill | Note |
|---|---|---|
| | | |

---

## Completion

- [ ] All 15 skills covered
- [ ] FinTrack runs on both iOS and Android
- [ ] CI/CD pipeline green
- [ ] All weekly retrospective questions answered without notes

**Total lessons created:** _____ / 15

---

## Beyond This Roadmap

### Next Horizon: Senior iOS & Android Native Developer

After this roadmap, the next path targets **native mobile development** — going below the React Native layer to understand and build at the platform level directly.

| Platform | Language | Goal |
|---|---|---|
| iOS | Swift + SwiftUI / UIKit | Senior iOS Developer |
| Android | Kotlin + Jetpack Compose | Senior Android Developer |

**Why this matters for Solution Architect:**  
Understanding native platforms removes the "black box" from every RN decision. When you know what Swift/Kotlin can do natively, you make better trade-off calls on what belongs in native code vs JS, what performance bottlenecks are actually fixable, and what the bridge/JSI layer is actually doing.

> **Status:** Placeholder — skills and detailed roadmap will be defined in a separate learning track. Native iOS and Android skills will be added to `.claude/skills/` when ready to begin.

### Full mobile stack picture

```
[Current]  React Native (JS/TS layer)         ← this roadmap
[Next]     Swift / Kotlin (native layer)       ← next track
[Later]    Solution Architect (system layer)   ← long-term goal
```
