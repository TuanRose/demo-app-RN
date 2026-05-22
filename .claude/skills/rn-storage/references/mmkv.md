# Reference: MMKV — Fast Key-Value Storage

MMKV nhanh hơn AsyncStorage ~30x, dùng memory mapping (mmap). Thay thế tốt nhất cho AsyncStorage.

---

## Cài đặt

```bash
npm install react-native-mmkv
cd ios && bundle exec pod install
```

---

## Basic usage

```tsx
import { MMKV } from 'react-native-mmkv';

// Default storage (global)
const storage = new MMKV();

// Đọc / ghi
storage.set('token', 'abc123');
storage.set('userId', 42);
storage.set('isOnboarded', true);
storage.set('profile', JSON.stringify({ name: 'John', age: 30 }));

// Đọc (trả về undefined nếu không tồn tại)
const token = storage.getString('token');
const userId = storage.getNumber('userId');
const isOnboarded = storage.getBoolean('isOnboarded');
const profile = JSON.parse(storage.getString('profile') ?? '{}');

// Xóa
storage.delete('token');
storage.clearAll();

// Kiểm tra tồn tại
storage.contains('token'); // boolean
```

---

## Instance riêng cho từng mục đích

```tsx
// Mỗi instance lưu vào file riêng — tốt cho tổ chức data
const authStorage = new MMKV({ id: 'auth' });
const settingsStorage = new MMKV({ id: 'settings' });
const cacheStorage = new MMKV({ id: 'cache' });
```

---

## Encryption

```tsx
// Encrypted storage cho sensitive data
const secureStorage = new MMKV({
  id: 'secure-storage',
  encryptionKey: 'your-encryption-key', // nên lấy từ native Keychain
});

// Lấy key từ Keychain (React Native Keychain)
import * as Keychain from 'react-native-keychain';

async function getEncryptedStorage() {
  let encryptionKey = await Keychain.getGenericPassword({ service: 'mmkv-key' });

  if (!encryptionKey) {
    const key = generateSecureKey(); // tạo key ngẫu nhiên
    await Keychain.setGenericPassword('mmkv', key, { service: 'mmkv-key' });
    encryptionKey = { password: key };
  }

  return new MMKV({
    id: 'secure',
    encryptionKey: encryptionKey.password,
  });
}
```

---

## React hooks

```tsx
import { useMMKVString, useMMKVNumber, useMMKVBoolean, useMMKVObject } from 'react-native-mmkv';

function SettingsScreen() {
  // [value, setter] — re-render khi value thay đổi
  const [theme, setTheme] = useMMKVString('theme');
  const [volume, setVolume] = useMMKVNumber('volume');
  const [isEnabled, setIsEnabled] = useMMKVBoolean('feature-flag');
  const [profile, setProfile] = useMMKVObject<UserProfile>('profile');

  return (
    <View>
      <Switch value={isEnabled ?? false} onValueChange={setIsEnabled} />
    </View>
  );
}
```

---

## Kết hợp với Zustand persist

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'zustand' });

const mmkvStorage = createJSONStorage(() => ({
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => storage.delete(name),
}));

export const useSettingsStore = create(
  persist(
    (set) => ({ theme: 'light', setTheme: (t) => set({ theme: t }) }),
    { name: 'settings', storage: mmkvStorage }
  )
);
```

---

## So sánh với AsyncStorage

| | MMKV | AsyncStorage |
|---|------|-------------|
| Speed | ~30x nhanh hơn | Baseline |
| API | Synchronous | Asynchronous |
| Encryption | Built-in | Không có |
| Data types | String, Number, Boolean | String only |
| File | Binary (mmap) | Text file |
| Max size | Không giới hạn thực tế | ~6MB (Android) |
| React hooks | Có sẵn | Cần tự làm |

> **Migration từ AsyncStorage:** Đọc từ AsyncStorage, ghi vào MMKV, xóa AsyncStorage.
