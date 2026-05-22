# Reference: Deep Linking với React Navigation

---

## Cấu hình linking trong NavigationContainer

```tsx
const linking = {
  prefixes: [
    'myapp://',                    // Custom URL scheme
    'https://app.myapp.com',       // Universal Link (iOS) / App Link (Android)
  ],
  config: {
    screens: {
      Home: 'home',                            // myapp://home
      Profile: 'profile/:userId',              // myapp://profile/123
      Settings: 'settings',
      // Nested navigators
      Main: {
        screens: {
          Feed: 'feed',
          Explore: 'explore/:category',
        },
      },
    },
  },
};

<NavigationContainer linking={linking} fallback={<ActivityIndicator />}>
  {/* ... */}
</NavigationContainer>
```

---

## URL scheme setup — Android

`android/app/src/main/AndroidManifest.xml`:
```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    <!-- Custom URL scheme: myapp:// -->
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="myapp" />
    </intent-filter>

    <!-- App Links: https://app.myapp.com -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="https" android:host="app.myapp.com" />
    </intent-filter>
</activity>
```

**App Links yêu cầu:** file `/.well-known/assetlinks.json` trên domain của bạn.

---

## Universal Links setup — iOS

`ios/YourApp/AppDelegate.swift`:
```swift
func application(
  _ application: UIApplication,
  continue userActivity: NSUserActivity,
  restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
) -> Bool {
  return RCTLinkingManager.application(
    application,
    continue: userActivity,
    restorationHandler: restorationHandler
  )
}
```

**Xcode** — Target → Signing & Capabilities → `+` → Associated Domains:
```
applinks:app.myapp.com
```

**Universal Links yêu cầu:** file `/.well-known/apple-app-site-association` trên domain.

---

## Kiểm tra deep links

```bash
# iOS Simulator
xcrun simctl openurl booted "myapp://profile/123"

# Android Emulator
adb shell am start -W -a android.intent.action.VIEW -d "myapp://profile/123" com.yourapp

# CLI helper
npx uri-scheme open "myapp://profile/123" --ios
npx uri-scheme open "myapp://profile/123" --android
```

---

## Kết hợp với Push Notifications

```tsx
const linking = {
  prefixes: ['myapp://', 'https://app.myapp.com'],

  async getInitialURL() {
    // Kiểm tra nếu app mở từ deep link
    const url = await Linking.getInitialURL();
    if (url) return url;

    // Kiểm tra nếu app mở từ push notification
    const notificationResponse = await Notifications.getLastNotificationResponseAsync();
    return notificationResponse?.notification.request.content.data?.url ?? null;
  },

  subscribe(listener) {
    // Lắng nghe deep links khi app đang chạy
    const linkingSub = Linking.addEventListener('url', ({ url }) => listener(url));

    // Lắng nghe notification tap khi app đang chạy
    const notifSub = Notifications.addNotificationResponseReceivedListener(response => {
      const url = response.notification.request.content.data?.url;
      if (url) listener(url);
    });

    return () => {
      linkingSub.remove();
      notifSub.remove();
    };
  },

  config: { screens: { /* ... */ } },
};
```

---

## Lưu ý bảo mật

```
❌ KHÔNG: myapp://login?token=abc123
✅ ĐÚNG: myapp://home (sau khi login rồi navigate)

❌ KHÔNG: myapp://payment?amount=100&card=1234
✅ ĐÚNG: myapp://payment/confirm (data lưu trong app state)
```

> URL scheme không có centralized registration — app độc hại có thể hijack.
> Universal Links (iOS) và App Links (Android) an toàn hơn vì verify qua domain.
> Không bao giờ truyền tokens, passwords hay sensitive data qua URL.
