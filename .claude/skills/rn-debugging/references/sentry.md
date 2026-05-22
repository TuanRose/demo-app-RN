# Reference: Sentry — Error Tracking & Performance

---

## Cài đặt

```bash
npm install @sentry/react-native
cd ios && bundle exec pod install

# iOS — upload source maps tự động
npx @sentry/wizard -i reactNative
```

---

## Init (index.js — trước AppRegistry)

```tsx
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://your-dsn@sentry.io/project-id',

  // Môi trường
  environment: __DEV__ ? 'development' : 'production',
  release: `com.yourapp@${pkg.version}+${buildNumber}`,
  dist: buildNumber,

  // Performance monitoring
  tracesSampleRate: __DEV__ ? 1.0 : 0.1, // 10% trong production
  profilesSampleRate: 0.1,

  // Không gửi events khi dev (optional)
  enabled: !__DEV__,

  // Breadcrumbs
  maxBreadcrumbs: 50,

  // Trước khi gửi — filter hoặc modify events
  beforeSend(event) {
    // Không gửi nếu user chưa đồng ý analytics
    if (!userConsentGiven) return null;

    // Remove sensitive data
    if (event.user) {
      delete event.user.email; // không gửi email
    }

    return event;
  },
});
```

---

## Wrap App component

```tsx
// App.tsx — wrap root với Sentry
export default Sentry.wrap(App);

// Hoặc dùng ErrorBoundary để catch render errors
function App() {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <View>
          <Text>Something went wrong</Text>
          <Button title="Try again" onPress={resetError} />
        </View>
      )}
      showDialog // hiển thị Sentry user feedback dialog
    >
      <AppContent />
    </Sentry.ErrorBoundary>
  );
}
```

---

## Capture events

```tsx
import * as Sentry from '@sentry/react-native';

// Capture exception
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}

// Capture message (non-error event)
Sentry.captureMessage('User completed onboarding', 'info');

// Capture với extra context
Sentry.captureException(error, {
  extra: {
    userId: currentUser.id,
    screenName: 'CheckoutScreen',
    cartItems: cart.length,
  },
  tags: {
    feature: 'checkout',
    paymentMethod: 'credit_card',
  },
});
```

---

## User context

```tsx
// Set user khi login
function onLogin(user: User) {
  Sentry.setUser({
    id: user.id,
    username: user.username,
    // Không set email nếu không cần thiết (privacy)
  });
}

// Clear user khi logout
function onLogout() {
  Sentry.setUser(null);
}
```

---

## Breadcrumbs — trail dẫn đến lỗi

```tsx
// Tự động: navigation, console.log, network requests
// Thủ công cho business logic quan trọng

Sentry.addBreadcrumb({
  category: 'user.action',
  message: 'User added item to cart',
  level: 'info',
  data: { productId: '123', quantity: 2 },
});

Sentry.addBreadcrumb({
  category: 'api',
  message: 'Payment initiated',
  level: 'info',
  data: { amount: 99.99, currency: 'USD' },
});
```

---

## Performance Tracing

```tsx
// Transaction — đo thời gian một operation
const transaction = Sentry.startTransaction({
  name: 'checkout.process',
  op: 'task',
});

Sentry.getCurrentHub().configureScope(scope => {
  scope.setSpan(transaction);
});

// Span — sub-operation trong transaction
const span = transaction.startChild({
  op: 'http.client',
  description: 'POST /api/orders',
});

try {
  await api.createOrder(orderData);
  span.setStatus('ok');
} catch (error) {
  span.setStatus('internal_error');
  throw error;
} finally {
  span.finish();
}

transaction.finish();
```

### Measure React Navigation

```tsx
// Tự động track screen transitions
import * as Sentry from '@sentry/react-native';
import { NavigationContainer } from '@react-navigation/native';

const routingInstrumentation = new Sentry.ReactNavigationInstrumentation();

Sentry.init({
  integrations: [
    new Sentry.ReactNativeTracing({
      routingInstrumentation,
      enableUserInteractionTracing: true,
    }),
  ],
});

function App() {
  const navigation = useRef();

  return (
    <NavigationContainer
      ref={navigation}
      onReady={() => routingInstrumentation.registerNavigationContainer(navigation)}
    >
      {/* ... */}
    </NavigationContainer>
  );
}
```

---

## Source Maps

Source maps giúp Sentry hiển thị original TypeScript code thay vì minified bundle.

```bash
# Upload source maps thủ công
npx sentry-cli releases \
  files com.yourapp@1.0.0+1 \
  upload-sourcemaps \
  --dist 1 \
  --strip-prefix /path/to/project

# iOS — tự động qua build phase (sau khi chạy wizard)
# Android — tự động qua Gradle plugin
```

```groovy
// android/app/build.gradle
apply plugin: 'io.sentry.android.gradle'

sentry {
  autoUploadSourceContext = true
  uploadNativeSymbols = true
  autoUploadNativeSymbols = true
}
```

---

## Custom Tags & Extra

```tsx
// Global tags — áp dụng cho tất cả events
Sentry.setTag('app_version', '2.1.0');
Sentry.setTag('build_type', Platform.OS);

// Extra data
Sentry.setExtra('feature_flags', {
  newOnboarding: true,
  darkMode: false,
});

// Context — structured data
Sentry.setContext('device_info', {
  model: DeviceInfo.getModel(),
  osVersion: DeviceInfo.getSystemVersion(),
  appVersion: DeviceInfo.getVersion(),
});
```

---

## Environments & Releases

```tsx
Sentry.init({
  release: `com.yourapp@${version}+${buildNumber}`,
  // Format: package_name@version+build
  // Ví dụ: com.yourapp@2.1.0+42
});

// Alerts: set thresholds trong Sentry dashboard
// - New issue tự động tạo GitHub issue
// - Spike protection: alert khi error rate tăng đột biến
// - Release health: crash-free session rate
```
