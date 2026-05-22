# Skill: rn-cicd

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Fastlane iOS | match (certs), gym (build), deliver/pilot (submit) |
| Fastlane Android | supply (Play Store), gradle (build), signing |
| GitHub Actions | Workflow YAML, cache, secrets, matrix builds |
| EAS Build + OTA | EAS Build profiles, EAS Update (OTA), CodePush |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Fastlane iOS, certificates, TestFlight, App Store submission | `references/fastlane-ios.md` |
| Fastlane Android, Play Store, keystore, automated signing | `references/fastlane-android.md` |
| GitHub Actions workflow cho RN (test, build, deploy) | `references/github-actions.md` |
| EAS Build profiles, internal distribution, EAS Update OTA | `references/eas-build.md` |

---

## Quy tắc chung

- **Secrets**: không commit API keys, keystore, certificates vào git — dùng GitHub Secrets hoặc `.env`.
- **Fastlane match**: dùng cho iOS certificate/profile management theo team — không manage certificates thủ công.
- **EAS Build**: phù hợp Expo và non-Expo apps — dễ setup hơn Fastlane.
- **OTA updates** (EAS Update / CodePush): chỉ update JS bundle — không thể update native code.
- Luôn test release build trên real device trước khi submit.
- Tách `development`, `staging`, `production` build profiles với bundle IDs khác nhau.
