# Reference: GitHub Actions cho React Native

---

## Workflow cơ bản — Test + Lint trên mỗi PR

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Test & Lint
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'  # cache node_modules

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: TypeScript check
        run: npx tsc --noEmit

      - name: Tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
```

---

## Workflow — Build iOS với EAS

`.github/workflows/build-ios.yml`:
```yaml
name: Build iOS

on:
  push:
    branches: [main]
  workflow_dispatch:  # cho phép trigger thủ công
    inputs:
      profile:
        description: 'Build profile'
        required: true
        default: 'preview'
        type: choice
        options: [development, preview, production]

jobs:
  build:
    name: Build iOS
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile ${{ inputs.profile || 'preview' }} --non-interactive
```

---

## Workflow — Build Android với EAS

```yaml
name: Build Android

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive

      - name: Submit to Play Store
        if: github.ref == 'refs/heads/main'
        run: eas submit --platform android --latest --non-interactive
```

---

## Workflow — OTA Update khi merge vào main

```yaml
name: OTA Update

on:
  push:
    branches: [main]

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci

      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Publish EAS Update
        run: |
          eas update --channel production \
            --message "Deploy: ${{ github.event.head_commit.message }}" \
            --non-interactive
```

---

## Secrets cần thiết

```
GitHub repo → Settings → Secrets and variables → Actions

EXPO_TOKEN         ← từ https://expo.dev/accounts/[username]/settings/access-tokens
CODECOV_TOKEN      ← từ codecov.io
```

---

## Cache optimization

```yaml
# Cache Gradle (Android build)
- name: Cache Gradle
  uses: actions/cache@v4
  with:
    path: |
      ~/.gradle/caches
      ~/.gradle/wrapper
    key: ${{ runner.os }}-gradle-${{ hashFiles('**/*.gradle*') }}

# Cache CocoaPods (iOS build — cần macOS runner)
- name: Cache Pods
  uses: actions/cache@v4
  with:
    path: ios/Pods
    key: ${{ runner.os }}-pods-${{ hashFiles('ios/Podfile.lock') }}
```

---

## Matrix builds — test nhiều Node versions

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: ['18', '20', '22']
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```
