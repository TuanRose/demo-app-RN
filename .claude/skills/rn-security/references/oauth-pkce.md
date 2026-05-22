# Reference: OAuth2 PKCE — Authentication Flow

PKCE (Proof Key for Code Exchange) là standard bắt buộc cho mobile OAuth2 — ngăn authorization code interception attacks.

---

## react-native-app-auth

```bash
npm install react-native-app-auth
cd ios && bundle exec pod install
```

---

## iOS Setup

```xml
<!-- ios/YourApp/Info.plist — đăng ký URL scheme cho redirect -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.yourapp.auth</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>com.yourapp</string>
    </array>
  </dict>
</array>
```

```objc
// AppDelegate.mm
#import <React/RCTLinkingManager.h>

- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey, id> *)options
{
  return [RCTLinkingManager application:app openURL:url options:options];
}
```

---

## Android Setup

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<activity
  android:name="net.openid.appauth.RedirectUriReceiverActivity"
  android:exported="true">
  <intent-filter>
    <action android:name="android.intent.action.VIEW"/>
    <category android:name="android.intent.category.DEFAULT"/>
    <category android:name="android.intent.category.BROWSABLE"/>
    <data android:scheme="com.yourapp"/>
  </intent-filter>
</activity>
```

---

## Basic PKCE Flow

```tsx
import { authorize, refresh, revoke } from 'react-native-app-auth';

const authConfig = {
  issuer: 'https://auth.example.com',        // OIDC discovery URL
  clientId: 'your-client-id',
  redirectUrl: 'com.yourapp://oauth/callback',
  scopes: ['openid', 'profile', 'email', 'offline_access'],

  // PKCE tự động được handle bởi library
  usePKCE: true,

  // Additional params
  additionalParameters: {
    prompt: 'login',
  },

  // Android — dùng Chrome Custom Tab thay WebView
  androidAllowCustomBrowsers: ['com.android.chrome'],
  useNonce: true,
};

// Đăng nhập
async function signIn() {
  try {
    const result = await authorize(authConfig);

    // result chứa tokens
    await TokenManager.saveTokens(result.accessToken, result.refreshToken);

    // Lưu token expiry để biết khi nào cần refresh
    storage.set('tokenExpiry', result.accessTokenExpirationDate);

    return result;
  } catch (error) {
    if (error.message === 'User cancelled flow') {
      // User đóng browser
    }
    throw error;
  }
}

// Refresh token
async function refreshTokens() {
  const refreshToken = await TokenManager.getRefreshToken();
  if (!refreshToken) throw new Error('No refresh token');

  const result = await refresh(authConfig, { refreshToken });

  await TokenManager.saveTokens(result.accessToken, result.refreshToken ?? refreshToken);
  storage.set('tokenExpiry', result.accessTokenExpirationDate);

  return result.accessToken;
}

// Đăng xuất
async function signOut() {
  const tokens = await Keychain.getGenericPassword({ service: 'auth-token' });

  if (tokens) {
    await revoke(authConfig, {
      tokenToRevoke: tokens.password,
      includeBasicAuth: true,
    });
  }

  await TokenManager.clearTokens();
}
```

---

## Auto Token Refresh

```tsx
import axios from 'axios';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

// Xử lý queue khi refresh xong
function processQueue(error: Error | null, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token!);
  });
  failedQueue = [];
}

// Interceptor tự động refresh khi 401
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Đợi refresh xong, queue request hiện tại
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axios(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newToken = await refreshTokens();
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        await signOut(); // refresh thất bại → logout
        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Google Sign-In (@react-native-google-signin)

```tsx
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

// Config (App.tsx hoặc một lần khi init)
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: true, // để lấy serverAuthCode gửi lên backend
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    // Gửi idToken lên backend để verify và tạo session
    const { idToken } = await GoogleSignin.getTokens();
    await api.authWithGoogle(idToken);

  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancel
    } else if (error.code === statusCodes.IN_PROGRESS) {
      // Sign in đang xử lý
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      // Google Play Services không available
    }
  }
}
```

---

## Deep Link Security

Redirect URI phải dùng custom scheme hoặc Universal/App Links — không dùng HTTP.

```tsx
// ❌ Không an toàn — bất kỳ app nào có thể intercept
redirectUrl: 'http://localhost/callback'

// ✅ Custom scheme — chỉ app của bạn handle
redirectUrl: 'com.yourapp://oauth/callback'

// ✅ Universal Links (iOS) / App Links (Android) — tốt nhất
// Yêu cầu .well-known/assetlinks.json trên server
redirectUrl: 'https://yourapp.com/oauth/callback'
```

Không bao giờ đặt access_token trong URL query params — dùng POST body hoặc Authorization header.
