# Reference: APNs — iOS Push Notifications

---

## Certificates & Entitlements

### Xcode Capabilities
1. **Signing & Capabilities** → **+ Capability** → **Push Notifications**
2. Tự động thêm `aps-environment` vào entitlements:

```xml
<!-- ios/YourApp/YourApp.entitlements -->
<key>aps-environment</key>
<string>development</string>  <!-- hoặc production -->
```

### APNs Key (p8) — khuyến nghị thay certificates
- Apple Developer → **Certificates, IDs & Profiles** → **Keys** → tạo key với APNs enabled
- Download `.p8` file (chỉ download được 1 lần)
- Cần: Key ID, Team ID, Bundle ID

---

## AppDelegate setup

```objc
// ios/YourApp/AppDelegate.mm
#import <UserNotifications/UserNotifications.h>
#import <RNCPushNotificationIOS.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Firebase — init trước
  [FIRApp configure];

  // Request permission
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  center.delegate = self;

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// APNs token đã đăng ký
- (void)application:(UIApplication *)application
  didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [FIRMessaging messaging].APNSToken = deviceToken;
  [RNCPushNotificationIOS didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

// Registration thất bại
- (void)application:(UIApplication *)application
  didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [RNCPushNotificationIOS didFailToRegisterForRemoteNotificationsWithError:error];
}

// Nhận notification khi foreground
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler
{
  // .banner + .sound = hiển thị notification khi app foreground
  completionHandler(UNNotificationPresentationOptionBanner | UNNotificationPresentationOptionSound);
}

// User tap notification
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler
{
  [RNCPushNotificationIOS didReceiveNotificationResponse:response];
  completionHandler();
}

@end
```

---

## Silent Push (Background fetch)

Silent push không hiển thị notification — dùng để sync data ngầm.

```json
// Payload từ server — KHÔNG có "alert", có "content-available": 1
{
  "aps": {
    "content-available": 1
  },
  "data": {
    "type": "SYNC",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

**Xcode Capabilities** → **Background Modes** → bật **Remote notifications**

```objc
// AppDelegate.mm
- (void)application:(UIApplication *)application
  didReceiveRemoteNotification:(NSDictionary *)userInfo
        fetchCompletionHandler:(void (^)(UIBackgroundFetchResult))completionHandler
{
  // Xử lý silent push — gọi trong 30 giây
  [self syncDataWithCompletion:^{
    completionHandler(UIBackgroundFetchResultNewData);
  }];
}
```

```tsx
// React Native — lắng nghe silent push
import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  if (!remoteMessage.notification) {
    // Data-only message (silent push)
    await syncLocalData(remoteMessage.data);
  }
});
```

---

## Notification Categories (Quick Actions)

```tsx
import { Platform } from 'react-native';
import notifee from '@notifee/react-native';

// Tạo category với actions
await notifee.setNotificationCategories([
  {
    id: 'chat',
    actions: [
      {
        id: 'reply',
        title: 'Reply',
        input: true, // inline text input (iOS)
      },
      {
        id: 'mark-as-read',
        title: 'Mark as Read',
        destructive: false,
        authenticationRequired: false,
      },
    ],
  },
  {
    id: 'order',
    actions: [
      { id: 'track', title: 'Track Order' },
      { id: 'cancel', title: 'Cancel', destructive: true },
    ],
  },
]);

// Hiển thị notification với category
await notifee.displayNotification({
  title: 'New message',
  body: 'John: Hey!',
  ios: {
    categoryId: 'chat', // liên kết với category đã tạo
    sound: 'default',
  },
});
```

---

## APNs Payload — cấu trúc đầy đủ

```json
{
  "aps": {
    "alert": {
      "title": "New Message",
      "subtitle": "From John",
      "body": "Hey, how are you?",
      "launch-image": "splash"
    },
    "badge": 5,
    "sound": {
      "name": "notification.aiff",
      "critical": 0,
      "volume": 1.0
    },
    "category": "chat",
    "thread-id": "chat-123",       // group notifications cùng thread
    "content-available": 1,        // silent push flag
    "mutable-content": 1,          // Notification Service Extension
    "interruption-level": "active" // active | passive | time-sensitive | critical
  },
  "customKey": "customValue"
}
```

---

## Notification Service Extension (iOS 10+)

Dùng để: modify notification content trước khi hiển thị (thêm image, decrypt, badge).

```
Xcode → File → New → Target → Notification Service Extension
```

```swift
// NotificationService.swift
import UserNotifications

class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(_ request: UNNotificationRequest,
      withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    guard let content = bestAttemptContent,
          let imageURLString = content.userInfo["imageUrl"] as? String,
          let imageURL = URL(string: imageURLString) else {
      contentHandler(request.content)
      return
    }

    // Download và attach image
    downloadImage(from: imageURL) { attachment in
      if let attachment = attachment {
        content.attachments = [attachment]
      }
      contentHandler(content)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    // Gọi khi sắp timeout (30 giây)
    if let contentHandler = contentHandler,
       let bestAttemptContent = bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }
}
```

---

## Troubleshooting

| Vấn đề | Nguyên nhân | Giải pháp |
|--------|------------|-----------|
| Không nhận push trên simulator | APNs không hoạt động trên simulator | Dùng real device hoặc Xcode drag `.apns` file |
| `apnsToken` nil | APNs chưa register | Kiểm tra entitlements, network, thử `UIApplication.shared.registerForRemoteNotifications()` |
| Push đến nhưng không hiện | `willPresentNotification` thiếu | Implement delegate method, set `completionHandler(.banner)` |
| Push silent không wake app | Background Mode chưa bật | Bật "Remote notifications" trong Capabilities |

### Test APNs với file `.apns`

```json
// test.apns — drag vào simulator trong Xcode
{
  "aps": {
    "alert": "Test notification",
    "badge": 1
  },
  "Simulator Target Bundle": "com.yourapp.bundleid"
}
```
