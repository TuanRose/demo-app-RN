# Reference: Secure Storage — Keychain & Keystore

---

## react-native-keychain

Lưu sensitive data (tokens, passwords) vào iOS Keychain / Android Keystore — không thể đọc bởi app khác.

```bash
npm install react-native-keychain
cd ios && bundle exec pod install
```

### Basic usage

```tsx
import * as Keychain from 'react-native-keychain';

// Lưu credentials
await Keychain.setGenericPassword('username', 'password');
// Với service key riêng (nhiều credentials)
await Keychain.setGenericPassword('user@email.com', accessToken, {
  service: 'auth-token',
});
await Keychain.setGenericPassword('', refreshToken, {
  service: 'refresh-token',
});

// Đọc
const credentials = await Keychain.getGenericPassword({ service: 'auth-token' });
if (credentials) {
  const { username, password: token } = credentials;
}

// Xóa
await Keychain.resetGenericPassword({ service: 'auth-token' });
await Keychain.resetGenericPassword({ service: 'refresh-token' });
```

### Biometrics (Face ID / Fingerprint)

```tsx
// Kiểm tra biometrics có sẵn
const biometryType = await Keychain.getSupportedBiometryType();
// Returns: 'FaceID' | 'TouchID' | 'Fingerprint' | null

// Lưu với yêu cầu biometrics khi đọc
await Keychain.setGenericPassword('', sensitiveToken, {
  service: 'sensitive-data',
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
});

// Đọc — trigger Face ID / Fingerprint prompt
try {
  const result = await Keychain.getGenericPassword({
    service: 'sensitive-data',
    authenticationPrompt: {
      title: 'Authentication required',
      subtitle: 'Verify your identity',
      cancel: 'Cancel',
    },
  });
  if (result) {
    const token = result.password;
  }
} catch (error) {
  if (error.message === 'User canceled the operation.') {
    // User từ chối biometrics
  }
}
```

### Accessibility levels

```tsx
// iOS Keychain accessibility options
await Keychain.setGenericPassword('', token, {
  accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED,
  // WHEN_UNLOCKED             — chỉ khi device unlock (phổ biến nhất)
  // WHEN_UNLOCKED_THIS_DEVICE_ONLY — không backup lên iCloud
  // AFTER_FIRST_UNLOCK        — sau unlock lần đầu (cho background tasks)
  // ALWAYS                    — luôn accessible (kém an toàn hơn)
});
```

---

## expo-secure-store (Expo / Expo Go)

```bash
npx expo install expo-secure-store
```

```tsx
import * as SecureStore from 'expo-secure-store';

// Lưu
await SecureStore.setItemAsync('token', accessToken);
await SecureStore.setItemAsync('userData', JSON.stringify(userData), {
  requireAuthentication: true, // yêu cầu biometrics
});

// Đọc
const token = await SecureStore.getItemAsync('token');

// Xóa
await SecureStore.deleteItemAsync('token');

// Kiểm tra hỗ trợ
const isAvailable = await SecureStore.isAvailableAsync();
```

---

## Mã hóa dữ liệu nhạy cảm trong bộ nhớ

Đôi khi cần encrypt data trước khi lưu vào MMKV hoặc SQLite.

```tsx
import { MMKV } from 'react-native-mmkv';
import * as Keychain from 'react-native-keychain';
import * as Crypto from 'expo-crypto'; // hoặc react-native-quick-crypto

// Lấy encryption key từ Keychain (tạo nếu chưa có)
async function getEncryptionKey(): Promise<string> {
  const existing = await Keychain.getGenericPassword({ service: 'mmkv-encryption-key' });
  if (existing) return existing.password;

  // Tạo key ngẫu nhiên 256-bit
  const key = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${Date.now()}-${Math.random()}`
  );

  await Keychain.setGenericPassword('mmkv', key, { service: 'mmkv-encryption-key' });
  return key;
}

// Tạo encrypted MMKV instance
async function createSecureStorage() {
  const encryptionKey = await getEncryptionKey();
  return new MMKV({
    id: 'secure-store',
    encryptionKey,
  });
}
```

---

## Pattern: Token Manager

Tập trung quản lý auth tokens, tránh token lưu rải rác.

```tsx
const TOKEN_SERVICE = 'app-tokens';

const TokenManager = {
  async saveTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      Keychain.setGenericPassword('access', accessToken, { service: `${TOKEN_SERVICE}-access` }),
      Keychain.setGenericPassword('refresh', refreshToken, { service: `${TOKEN_SERVICE}-refresh` }),
    ]);
  },

  async getAccessToken(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({ service: `${TOKEN_SERVICE}-access` });
    return result ? result.password : null;
  },

  async getRefreshToken(): Promise<string | null> {
    const result = await Keychain.getGenericPassword({ service: `${TOKEN_SERVICE}-refresh` });
    return result ? result.password : null;
  },

  async clearTokens() {
    await Promise.all([
      Keychain.resetGenericPassword({ service: `${TOKEN_SERVICE}-access` }),
      Keychain.resetGenericPassword({ service: `${TOKEN_SERVICE}-refresh` }),
    ]);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return !!token;
  },
};
```

---

## Không lưu sensitive data ở đây

| Không dùng | Lý do |
|-----------|-------|
| `AsyncStorage` | Không mã hóa, plain text trên disk |
| `MMKV` (không encrypt) | Không mã hóa theo mặc định |
| Redux store | Có thể bị serialize vào crash logs |
| `console.log` với tokens | Xuất hiện trong device logs |
| Hardcode trong source code | Bị expose trong bundle |

---

## Android Keystore specifics

```tsx
// Android tự động dùng Android Keystore System
// Không cần config thêm khi dùng react-native-keychain

// Kiểm tra security level
const level = await Keychain.getSecurityLevel();
// SECURE_HARDWARE  — lưu trong hardware-backed keystore (TEE)
// SECURE_SOFTWARE  — lưu trong software keystore
// ANY              — không có secure keystore

// Android 28+ có StrongBox — chip bảo mật riêng
await Keychain.setGenericPassword('', token, {
  storage: Keychain.STORAGE_TYPE.RSA,  // RSA với Android Keystore
});
```
