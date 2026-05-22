# Reference: Detox E2E Testing

Detox là framework E2E "gray-box" — test chạy trên real device/simulator, có thể sync với React Native runtime.

---

## Cài đặt

```bash
npm install detox --save-dev
npm install jest jest-circus --save-dev

# Init cấu hình
npx detox init
```

`.detoxrc.js`:
```js
module.exports = {
  testRunner: {
    args: { $0: 'jest', config: 'e2e/jest.config.js' },
    jest: { setupTimeout: 120000 },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/YourApp.app',
      build: 'xcodebuild -workspace ios/YourApp.xcworkspace -scheme YourApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_7_API_34' },
    },
  },
  configurations: {
    'ios.sim.debug': { device: 'simulator', app: 'ios.debug' },
    'android.emu.debug': { device: 'emulator', app: 'android.debug' },
  },
};
```

---

## Chạy tests

```bash
# Build app (chỉ cần một lần hoặc khi native thay đổi)
npx detox build --configuration ios.sim.debug

# Chạy tests
npx detox test --configuration ios.sim.debug

# Chạy test cụ thể
npx detox test --configuration ios.sim.debug e2e/login.test.ts

# Chạy với headless (CI)
npx detox test --configuration ios.sim.debug --headless
```

---

## Cấu trúc test

```tsx
// e2e/login.test.ts
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative(); // reload JS trước mỗi test
  });

  it('should show login screen', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('should login with valid credentials', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    // Chờ navigation
    await expect(element(by.text('Welcome'))).toBeVisible();
  });

  it('should show error with invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('wrong');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });
});
```

---

## Element matchers (`by.*`)

```tsx
by.id('testID')             // bằng testID prop
by.text('Button Text')      // bằng text hiển thị
by.label('Accessibility')   // bằng accessibilityLabel
by.type('RCTView')          // bằng native class
by.traits(['button'])       // bằng accessibility traits (iOS)

// Kết hợp
by.id('list').withAncestor(by.id('screen'))
by.id('item').withDescendant(by.text('Delete'))
```

---

## Actions

```tsx
await element(by.id('button')).tap();
await element(by.id('input')).typeText('hello');
await element(by.id('input')).clearText();
await element(by.id('input')).replaceText('new text');

// Scroll
await element(by.id('scroll-view')).scroll(300, 'down');
await element(by.id('scroll-view')).scrollTo('bottom');

// Swipe
await element(by.id('list')).swipe('left', 'fast', 0.75);

// Long press
await element(by.id('item')).longPress(2000); // 2 giây

// Tap tại tọa độ cụ thể
await element(by.id('map')).tapAtPoint({ x: 100, y: 200 });

// Multi-tap
await element(by.id('button')).multiTap(2); // double tap
```

---

## Expectations

```tsx
// Visibility
await expect(element(by.id('modal'))).toBeVisible();
await expect(element(by.id('hidden'))).not.toBeVisible();
await expect(element(by.id('removed'))).not.toExist();

// Text
await expect(element(by.id('label'))).toHaveText('Expected text');

// Value (TextInput)
await expect(element(by.id('input'))).toHaveValue('typed text');

// Count
await expect(element(by.id('item')).atIndex(0)).toBeVisible();
```

---

## Device API

```tsx
// App lifecycle
await device.launchApp({ newInstance: true });  // fresh launch
await device.reloadReactNative();               // hot reload JS
await device.terminateApp();
await device.sendToBackground();
await device.bringToForeground();

// Permissions
await device.launchApp({
  permissions: { notifications: 'YES', camera: 'YES' },
});

// Push notifications (iOS simulator)
await device.sendUserNotification({
  trigger: { type: 'push' },
  title: 'Test notification',
  body: 'Test body',
});

// Screenshots
await device.takeScreenshot('test-name');
```

---

## testID trong React Native

```tsx
// Đặt testID cho element cần Detox tương tác
<TextInput testID="email-input" placeholder="Email" />
<TouchableOpacity testID="login-button" onPress={onLogin}>
  <Text>Login</Text>
</TouchableOpacity>
```

---

## Best practices

- Đặt `testID` chỉ cho elements E2E tests cần tương tác — không spam testID.
- `beforeEach`: `reloadReactNative()` — đảm bảo clean state giữa các tests.
- `beforeAll`: `launchApp()` — chỉ launch một lần (nhanh hơn).
- Test critical paths: login, onboarding, checkout — không test mọi thứ với E2E.
- CI: dùng `--headless` và record artifacts (screenshots, videos) khi test fail.
