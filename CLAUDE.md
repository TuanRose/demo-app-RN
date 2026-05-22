# demo_app — React Native Learning Repo

React Native 0.85, React 19, TypeScript — bootstrapped với `@react-native-community/cli`.

## Stack
- Runtime: React Native 0.85 (bare workflow)
- Language: TypeScript strict
- Navigation: react-native-safe-area-context (safe area only, nav chưa setup)
- Toolchain: Metro, Babel `@react-native/babel-preset`, Jest `@react-native/jest-preset`

## Commands
```sh
npm start              # Metro bundler
npm run ios            # iOS default simulator
npm run ios:sim        # iPhone 17 Pro Max
npm run android        # Android emulator
npm run lint           # ESLint + Prettier
npm test               # Jest
bundle exec pod install  # iOS native deps (sau khi thêm native lib)
```

## Learning Modules
Code học tập nằm trong `src/`. Naming: `{02d}_{tên_skill}` — ví dụ: `01_legacy_native_module`.

- Tạo bài học mới: `/project:new-lesson <tên>`
- Review bài học: `/project:review-lesson <path>`
- Xem quy ước đầy đủ: `src/README.md`

## Skills
Gọi skill khi bắt đầu bài học mới — Claude sẽ load đúng references cho domain đó:

| Command | Domain |
|---|---|
| `/rn-native-legacy` | Legacy Native Modules & UI Components |
| `/rn-native-platform` | New Architecture — Turbo Modules, Fabric |
| `/rn-platform-guides` | Android/iOS platform guides & release |
| `/rn-native-performance` | Performance profiling & optimization |
| `/rn-animation` | Animated API, Reanimated, Gesture Handler |
| `/rn-testing` | Jest, RNTL, Detox, Maestro |
| `/rn-navigation` | React Navigation, deep linking, auth flow |
| `/rn-state-management` | Redux Toolkit, Zustand, TanStack Query |
| `/rn-cicd` | EAS Build, GitHub Actions, Fastlane |
| `/rn-storage` | MMKV, SQLite, offline-first patterns |
| `/rn-push-notifications` | FCM, APNs, Notifee |
| `/rn-security` | Keychain, SSL pinning, OAuth2 PKCE |
| `/rn-debugging` | DevTools, Sentry, Crashlytics |
| `/rn-accessibility` | a11y props, VoiceOver, TalkBack |
| `/rn-architecture` | Folder structure, Clean Architecture, Monorepo |

## Workflow & Prompts
- Quy trình làm việc đầy đủ: `docs/WORKFLOW.md`
- Prompt templates copy-paste: `docs/PROMPTS.md`
- Roadmap 1 tháng: `ROADMAP.md`

## Rules
Xem `.claude/rules/` để biết conventions chi tiết theo từng domain.
