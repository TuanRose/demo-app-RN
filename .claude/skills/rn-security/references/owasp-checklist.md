# Reference: OWASP Mobile Top 10 — React Native Checklist

---

## M1: Improper Credential Usage

**Rủi ro:** Token, API key hardcode trong code hoặc lưu không an toàn.

```tsx
// ❌ Hardcode secrets
const API_KEY = 'sk-1234567890abcdef';

// ❌ AsyncStorage không mã hóa
await AsyncStorage.setItem('token', accessToken);

// ✅ Environment variables (không commit .env)
const API_BASE = process.env.API_BASE_URL;

// ✅ Keychain/Keystore cho credentials
await Keychain.setGenericPassword('', accessToken, { service: 'auth' });

// ✅ Backend lưu API keys, app chỉ gửi request qua backend
```

**Checklist:**
- [ ] Không có credentials trong source code
- [ ] `.env` không được commit (có trong `.gitignore`)
- [ ] Tokens lưu trong Keychain/Keystore
- [ ] Refresh token logic đúng, revoke khi logout

---

## M2: Inadequate Supply Chain Security

**Rủi ro:** Dependencies có vulnerabilities hoặc malicious packages.

```bash
# Audit dependencies
npm audit

# Fix vulnerabilities
npm audit fix

# Check for known malicious packages
npx is-website-vulnerable https://yourapp.com
```

**Checklist:**
- [ ] Chạy `npm audit` trong CI
- [ ] Lock file (`package-lock.json`) được commit
- [ ] Review packages trước khi install
- [ ] Dùng `npm ci` thay `npm install` trong CI

---

## M3: Insecure Authentication/Authorization

**Rủi ro:** Weak auth, không validate tokens, bypass authorization.

```tsx
// ✅ Validate token expiry trước khi dùng
function isTokenValid(expiryDate: string): boolean {
  return new Date(expiryDate) > new Date();
}

// ✅ Không tin tưởng client-side auth state cho sensitive operations
// Luôn validate trên server

// ✅ Biometric authentication cho sensitive actions
await Keychain.getGenericPassword({
  service: 'sensitive-data',
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
});
```

**Checklist:**
- [ ] PKCE cho OAuth2 flows
- [ ] Token expiry được check
- [ ] Sensitive features yêu cầu re-auth (biometrics)
- [ ] Session invalidation khi logout

---

## M4: Insufficient Input/Output Validation

**Rủi ro:** XSS trong WebView, SQL injection, malicious deep links.

```tsx
// ❌ Render HTML trực tiếp từ user
<WebView html={userContent} />

// ✅ Sanitize HTML content
import sanitizeHtml from 'sanitize-html';
const clean = sanitizeHtml(userContent, {
  allowedTags: ['b', 'i', 'em', 'strong'],
  allowedAttributes: {},
});

// ✅ Validate deep link params trước khi navigate
const handleDeepLink = (url: string) => {
  const parsed = Linking.parse(url);
  const chatId = parsed.queryParams?.chatId;

  // Validate — chỉ accept alphanumeric IDs
  if (!chatId || !/^[a-zA-Z0-9-]+$/.test(String(chatId))) {
    return; // reject invalid params
  }

  navigation.navigate('Chat', { chatId: String(chatId) });
};

// ✅ Parameterized queries cho SQLite (không string concat)
db.execute('SELECT * FROM users WHERE id = ?', [userId]); // ✅
db.execute(`SELECT * FROM users WHERE id = '${userId}'`); // ❌ SQL injection
```

---

## M5: Insecure Communication

**Rủi ro:** HTTP, self-signed certs, không pinning.

```tsx
// ✅ Luôn dùng HTTPS
const API_URL = 'https://api.example.com'; // ✅
const API_URL = 'http://api.example.com';  // ❌

// ✅ SSL Pinning cho production (xem ssl-pinning.md)
// ✅ Network Security Config cho Android

// ✅ Không log sensitive data
console.log('User data:', user); // ❌ nếu user có sensitive fields
console.log('Login success for user:', user.id); // ✅
```

**Checklist:**
- [ ] Tất cả API calls dùng HTTPS
- [ ] SSL pinning bật cho production
- [ ] Certificate rotation plan có sẵn
- [ ] ATS (App Transport Security) bật trên iOS

---

## M6: Inadequate Privacy Controls

**Rủi ro:** Collect quá nhiều data, log sensitive info, screenshot nhạy cảm.

```tsx
// ✅ Blur screen khi app switch (iOS/Android recent apps)
import { Platform } from 'react-native';

useEffect(() => {
  if (Platform.OS === 'ios') {
    // iOS — dùng blurring effect trong AppDelegate
  }
}, []);

// ✅ Prevent screenshot trên màn hình nhạy cảm (Android)
import { preventScreenCapture, allowScreenCapture } from 'expo-screen-capture';

useFocusEffect(() => {
  preventScreenCapture(); // màn hình thanh toán, thông tin nhạy cảm
  return () => allowScreenCapture();
});

// ✅ Xóa clipboard sau khi paste password
import Clipboard from '@react-native-clipboard/clipboard';
setTimeout(() => Clipboard.setString(''), 60000); // clear sau 60 giây
```

---

## M7: Insufficient Binary Protections

**Rủi ro:** App bị reverse engineer, tamper, hoặc repackage.

```tsx
// ✅ Enable Hermes (minification + bytecode)
// android/app/build.gradle
// project.ext.react = [ enableHermes: true ]

// ✅ ProGuard cho Android
// android/app/proguard-rules.pro
```

```
# ios — Enable bitcode (deprecated iOS 16+, không cần nữa)
# android — R8/ProGuard tự minify code release builds
```

**Checklist:**
- [ ] Hermes enabled
- [ ] ProGuard / R8 enabled cho Android release
- [ ] Không có debug/dev features trong production build
- [ ] Root/Jailbreak detection (optional, cho banking apps)

---

## M8: Security Misconfiguration

**Rủi ro:** Debug mode bật production, cleartext traffic allowed, backup enabled.

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
  android:allowBackup="false"          <!-- tắt Android backup (backup có thể leak data) -->
  android:debuggable="false"           <!-- tắt debug mode production -->
  android:usesCleartextTraffic="false" <!-- chặn HTTP -->
  ...>
```

```xml
<!-- ios/YourApp/Info.plist -->
<!-- Không có NSAllowsArbitraryLoads: true trừ khi thực sự cần -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
</dict>
```

**Checklist:**
- [ ] `android:debuggable="false"` trong release manifest
- [ ] `android:allowBackup="false"`
- [ ] Không expose internal activities/services
- [ ] Firebase rules configured (không public read/write)

---

## M9: Insecure Data Storage

**Xem secure-storage.md** — tóm tắt:

| Data | Storage |
|------|---------|
| Tokens, passwords | Keychain/Keystore |
| User preferences | MMKV (encrypted nếu sensitive) |
| Offline data | SQLite với encryption (SQLCipher) |
| Logs | Không lưu sensitive data |
| Caches | Clear khi logout |

**Checklist:**
- [ ] Không dùng AsyncStorage cho sensitive data
- [ ] Clear cache và storage khi logout
- [ ] Database encryption nếu chứa PII

---

## M10: Insufficient Cryptography

**Rủi ro:** Dùng thuật toán yếu (MD5, SHA1, DES), hardcode IV.

```tsx
// ❌ MD5 / SHA1 không an toàn cho passwords
import CryptoJS from 'crypto-js';
const hash = CryptoJS.MD5(password); // ❌

// ✅ Dùng bcrypt hoặc hash phía server
// ✅ Client không nên hash passwords — gửi qua HTTPS, server hash

// ✅ Dùng platform crypto cho random values
import * as Crypto from 'expo-crypto';
const randomBytes = await Crypto.getRandomBytesAsync(32);

// ✅ Thuật toán khuyến nghị
// Encryption: AES-256-GCM
// Hashing: SHA-256, SHA-512
// Key derivation: PBKDF2, bcrypt, Argon2
// Asymmetric: RSA-2048+, ECDSA P-256
```

---

## Công cụ kiểm tra bảo mật

```bash
# Static analysis
npx @exodus/eslint-plugin-security  # ESLint security rules

# Dependency vulnerabilities
npm audit
npx snyk test

# Secrets trong source code
npx secretlint "**/*"
git-secrets --scan

# Dynamic testing
# MobSF (Mobile Security Framework) — phân tích APK/IPA
# OWASP ZAP — intercept proxy testing
```
