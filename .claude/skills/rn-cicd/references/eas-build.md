# Reference: EAS Build + EAS Update (OTA)

---

## Cài đặt

```bash
npm install -g eas-cli
eas login
eas build:configure  # tạo eas.json
```

---

## eas.json — Build profiles

```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "android": { "buildType": "apk" },
      "env": { "APP_ENV": "development" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "ios": { "distribution": "internal" },
      "channel": "preview",
      "env": { "APP_ENV": "staging" }
    },
    "production": {
      "autoIncrement": true,
      "android": { "buildType": "app-bundle" },
      "ios": { "distribution": "store" },
      "channel": "production",
      "env": { "APP_ENV": "production" }
    }
  },
  "submit": {
    "production": {
      "android": { "serviceAccountKeyPath": "./google-service-account.json" },
      "ios": { "appleId": "you@email.com", "ascAppId": "12345678" }
    }
  }
}
```

---

## Build commands

```bash
# Build iOS
eas build --platform ios --profile production
eas build --platform ios --profile preview

# Build Android
eas build --platform android --profile production

# Build cả hai
eas build --platform all --profile production

# Build local (debug)
eas build --platform ios --profile development --local

# Xem builds
eas build:list
eas build:view [BUILD_ID]
```

---

## EAS Submit — upload lên stores

```bash
# Submit iOS build mới nhất lên TestFlight
eas submit --platform ios

# Submit Android lên Play Store (internal track)
eas submit --platform android --track internal

# Submit build cụ thể
eas submit --platform ios --id [BUILD_ID]

# Build + Submit liền
eas build --platform all --profile production --auto-submit
```

---

## EAS Update — OTA Updates

OTA (Over-The-Air) cập nhật JS bundle mà không cần submit lên store.
**Chỉ update được:** JS code, assets, images.
**Không update được:** native code, permissions, SDK version changes.

### Setup

```bash
npx expo install expo-updates
```

`app.json`:
```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "checkAutomatically": "ON_LOAD"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Publish update

```bash
# Publish tới channel 'production'
eas update --channel production --message "Fix login bug"

# Publish tới branch cụ thể
eas update --branch main --message "Update UI"

# Preview update trước khi publish
eas update --channel preview
```

### Channels và branches

```
Channel 'production' → app từ App Store/Play Store
Channel 'preview'    → internal testers
Channel 'development' → developers

Branch = nhánh code
Channel = target audience (ai nhận update)

Mapping: eas channel:edit production --branch main
```

### Update trong app (manual check)

```tsx
import * as Updates from 'expo-updates';

async function checkForUpdate() {
  if (!Updates.isEnabled) return;

  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    // Reload app để apply update
    await Updates.reloadAsync();
  }
}
```

---

## Environment variables trong EAS

```bash
# Set secret (không expose trong build logs)
eas secret:create --name API_KEY --value "secret123" --scope project

# Push variable
eas env:create --name APP_ENV --value "production" --environment production
```

`eas.json`:
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.prod.com"
      }
    }
  }
}
```

---

## Credentials management

```bash
# iOS — tạo/sync certificates và provisioning profiles
eas credentials --platform ios

# Android — tạo keystore
eas credentials --platform android

# List credentials
eas credentials:list
```
