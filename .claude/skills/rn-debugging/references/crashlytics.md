# Reference: Firebase Crashlytics — Crash Reporting

---

## Cài đặt

```bash
npm install @react-native-firebase/app
npm install @react-native-firebase/crashlytics
cd ios && bundle exec pod install
```

---

## iOS Setup

```ruby
# ios/Podfile
pod 'Firebase/Crashlytics'
```

```
Xcode → Build Phases → + New Run Script Phase

# Script
"${PODS_ROOT}/FirebaseCrashlytics/run"

# Input files
$(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)
```

---

## Android Setup

```groovy
// android/build.gradle
buildscript {
  dependencies {
    classpath 'com.google.firebase:firebase-crashlytics-gradle:2.9.9'
  }
}

// android/app/build.gradle
apply plugin: 'com.google.firebase.crashlytics'

android {
  buildTypes {
    release {
      firebaseCrashlytics {
        mappingFileUploadEnabled true // upload ProGuard mapping
        nativeSymbolUploadEnabled true
        unstrippedNativeLibsDir 'build/intermediates/merged_native_libs/release'
      }
    }
  }
}
```

---

## Basic Usage

```tsx
import crashlytics from '@react-native-firebase/crashlytics';

// Enable/disable (dùng với user consent)
await crashlytics().setCrashlyticsCollectionEnabled(!__DEV__);

// Log message (xuất hiện trong crash report)
crashlytics().log('User tapped checkout button');

// Ghi lại non-fatal errors
try {
  await riskyOperation();
} catch (error) {
  crashlytics().recordError(error as Error);
}

// Set user identifier
crashlytics().setUserId(user.id);

// Custom attributes
crashlytics().setAttribute('plan', 'premium');
crashlytics().setAttribute('cart_size', String(cart.length));

// Multiple attributes
crashlytics().setAttributes({
  role: user.role,
  screen: 'CheckoutScreen',
  payment_method: 'credit_card',
});
```

---

## Error Boundary tích hợp Crashlytics

```tsx
import React from 'react';
import crashlytics from '@react-native-firebase/crashlytics';

interface Props {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class CrashlyticsErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    crashlytics().log(`Error boundary caught: ${info.componentStack}`);
    crashlytics().recordError(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}
```

---

## ANR (Application Not Responding) — Android

ANR xảy ra khi main thread bị block > 5 giây.

```tsx
// ❌ Block main thread — gây ANR
const data = fs.readFileSync('/large/file'); // sync I/O trên main thread

// ✅ Async operations
const data = await fs.readFile('/large/file');

// ✅ Heavy computation trên background thread
import { runOnJS } from 'react-native-reanimated';
// Hoặc dùng InteractionManager
import { InteractionManager } from 'react-native';

InteractionManager.runAfterInteractions(() => {
  // Chạy sau khi animations/interactions xong
  processLargeDataset(data);
});
```

Crashlytics tự động capture ANRs trên Android.

---

## Crash-free Users / Sessions

Trong Firebase Console → Crashlytics:
- **Crash-free users rate** — % users không gặp crash
- **Velocity alerts** — tự động alert khi crash rate tăng
- **Regression detection** — issue tái xuất sau khi mark resolved

```tsx
// Force crash để test (chỉ dùng khi test)
crashlytics().crash();
```

---

## Kết hợp Crashlytics + Sentry

Dùng cả hai: Crashlytics cho native crashes (C++/ObjC/Java), Sentry cho JS errors + performance.

```tsx
import * as Sentry from '@sentry/react-native';
import crashlytics from '@react-native-firebase/crashlytics';

// Error handler toàn cục
function handleError(error: Error, isFatal: boolean) {
  // Gửi lên cả hai
  Sentry.captureException(error);
  crashlytics().recordError(error);

  if (isFatal) {
    // Show crash UI
    Alert.alert('App Error', 'Please restart the app');
  }
}

import { ErrorUtils } from 'react-native';
ErrorUtils.setGlobalHandler(handleError);
```

---

## Debug Symbols

```bash
# iOS — upload dSYM tự động qua Build Phase
# Android — upload mapping file tự động qua Gradle plugin

# Upload dSYM thủ công nếu cần
firebase crashlytics:symbols:upload --app=APP_ID /path/to/dSYM

# Verify symbols uploaded
firebase crashlytics:symbols:list --app=APP_ID
```

---

## Custom Keys Best Practices

```tsx
// Đặt trước operations quan trọng để debug context
function initiateCheckout(cartId: string) {
  crashlytics().setAttributes({
    checkout_cart_id: cartId,
    checkout_step: 'initiated',
    item_count: String(cart.items.length),
  });

  // ... checkout logic
}

// Update khi step thay đổi
crashlytics().setAttribute('checkout_step', 'payment_processing');
```
