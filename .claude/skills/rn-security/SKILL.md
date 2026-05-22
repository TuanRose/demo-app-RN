# Skill: rn-security

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Secure storage | Keychain (iOS), Keystore (Android), react-native-keychain |
| SSL Pinning | Certificate/public key pinning, MITM prevention |
| OAuth2 + PKCE | Secure authentication flow cho mobile |
| OWASP checklist | Mobile security top 10 cho React Native |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Lưu token/password an toàn, Keychain, Keystore, expo-secure-store | `references/secure-storage.md` |
| SSL pinning, chặn MITM, certificate rotation | `references/ssl-pinning.md` |
| OAuth2 PKCE flow, react-native-app-auth, deep link vulnerabilities | `references/oauth-pkce.md` |
| Security audit checklist, OWASP Mobile Top 10, common RN vulnerabilities | `references/owasp-checklist.md` |

---

## Quy tắc chung

- **Không dùng AsyncStorage** cho tokens/passwords — dùng Keychain/Keystore.
- **Không truyền sensitive data qua URL scheme** — dùng Universal Links (iOS) hoặc App Links (Android).
- **SSL** bắt buộc cho mọi API call — không dùng `http://` trong production.
- **SSL Pinning**: lưu ý certificate expiry — cần update cả server và app đồng thời.
- **Env variables**: không commit `.env` vào git, không hardcode secrets trong code.
- Giảm thiểu data collection: không request/lưu data không cần thiết.
