# Reference: SSL Pinning — Certificate & Public Key Pinning

SSL pinning ngăn chặn MITM (Man-in-the-Middle) attacks bằng cách verify certificate/public key của server.

---

## react-native-ssl-pinning

```bash
npm install react-native-ssl-pinning
cd ios && bundle exec pod install
```

```tsx
import { fetch } from 'react-native-ssl-pinning';

const response = await fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' }),
  sslPinning: {
    certs: ['cert1', 'cert2'], // tên file trong bundle (không có extension)
  },
  timeoutInterval: 10000,
});

const data = await response.json();
```

### Thêm certificate vào bundle

```
# iOS
ios/YourApp/cert1.cer

# Android
android/app/src/main/res/raw/cert1.cer
```

### Lấy certificate từ server

```bash
# Download certificate
openssl s_client -connect api.example.com:443 </dev/null \
  | openssl x509 -outform DER -out cert1.cer

# Xem thông tin certificate
openssl x509 -inform DER -in cert1.cer -text -noout

# Lấy public key hash (cho public key pinning)
openssl x509 -inform DER -in cert1.cer -pubkey -noout \
  | openssl pkey -pubin -outform DER \
  | openssl dgst -sha256 -binary \
  | openssl base64
```

---

## OkHttp Certificate Pinning (Android native)

```kotlin
// android/app/src/main/java/com/yourapp/MainApplication.kt
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient

val certificatePinner = CertificatePinner.Builder()
  // Public key hash (sha256/)
  .add("api.example.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
  .add("api.example.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=") // backup key
  .build()

val client = OkHttpClient.Builder()
  .certificatePinner(certificatePinner)
  .build()
```

---

## NSURLSession Pinning (iOS native)

```swift
// Implement URLSessionDelegate
class PinnedSession: NSObject, URLSessionDelegate {
  func urlSession(_ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {

    guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          let serverTrust = challenge.protectionSpace.serverTrust else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    // Lấy certificate từ server
    let serverCert = SecTrustGetCertificateAtIndex(serverTrust, 0)!
    let serverCertData = SecCertificateCopyData(serverCert) as Data

    // So sánh với certificate đã bundle
    guard let localCertPath = Bundle.main.path(forResource: "cert1", ofType: "cer"),
          let localCertData = try? Data(contentsOf: URL(fileURLWithPath: localCertPath)) else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    if serverCertData == localCertData {
      completionHandler(.useCredential, URLCredential(trust: serverTrust))
    } else {
      completionHandler(.cancelAuthenticationChallenge, nil)
    }
  }
}
```

---

## Axios với SSL Pinning (React Native)

```tsx
import axios from 'axios';
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

// Wrapper dùng pinned fetch thay axios
async function apiRequest<T>(
  url: string,
  options: RequestInit & { sslCerts?: string[] }
): Promise<T> {
  const response = await pinnedFetch(url, {
    ...options,
    sslPinning: {
      certs: options.sslCerts ?? ['api_cert'],
    },
  });
  return response.json();
}

// Dùng
const data = await apiRequest<User>('https://api.example.com/user', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## Certificate Rotation Strategy

Certificate có expiry date — cần rotate trước khi hết hạn, nếu không app sẽ fail.

```tsx
// 1. Bundle nhiều certificates (current + next)
sslPinning: {
  certs: ['cert_current', 'cert_next'], // accept cả hai
}

// 2. Remote config để disable pinning khi khẩn cấp
import remoteConfig from '@react-native-firebase/remote-config';

const isPinningEnabled = remoteConfig().getValue('ssl_pinning_enabled').asBoolean();

if (isPinningEnabled) {
  // dùng pinned fetch
} else {
  // fallback về fetch thường (chỉ khi certificate emergency)
}

// 3. Monitor certificate expiry
// Kiểm tra expiry date trong CI/CD pipeline
// Alert khi còn < 60 ngày
```

---

## Network Security Config (Android)

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <domain-config>
    <domain includeSubdomains="true">api.example.com</domain>
    <pin-set expiration="2025-01-01">
      <!-- sha256 của SubjectPublicKeyInfo (SPKI) -->
      <pin digest="SHA-256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
      <pin digest="SHA-256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>
    </pin-set>
  </domain-config>

  <!-- Development: trust user-installed CAs (chỉ debug build) -->
  <debug-overrides>
    <trust-anchors>
      <certificates src="user"/>
    </trust-anchors>
  </debug-overrides>
</network-security-config>
```

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
  android:networkSecurityConfig="@xml/network_security_config"
  ...>
```

---

## Testing với Charles Proxy / mitmproxy

```tsx
// __DEV__ only — bypass pinning để dùng proxy debug
if (__DEV__) {
  // Không apply ssl pinning
  return axios.get(url);
} else {
  return pinnedFetch(url, { sslPinning: { certs: ['cert'] } });
}
```

| | Certificate Pinning | Public Key Pinning |
|--|--|--|
| Pin | Certificate đầy đủ | Public key hash |
| Rotation | Phải update app | Có thể giữ nguyên key |
| Flexibility | Thấp | Cao hơn |
| Security | Tương đương | Tương đương |
