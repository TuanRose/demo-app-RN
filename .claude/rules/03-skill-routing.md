# Skill Routing — Auto-detection & Proactive Suggestion

## Nguyên tắc hành vi (BẮT BUỘC)

Khi user bắt đầu hỏi về một domain hoặc làm việc trong folder bài học, Claude phải:
1. Nhận diện domain từ context (xem mapping bên dưới)
2. Nếu skill tương ứng chưa được load trong conversation → **chủ động đề xuất và hỏi user**
3. Không tự load mà không hỏi — vì load skill thay đổi behavior, user phải đồng ý

**Format đề xuất chuẩn:**
> "Câu hỏi này thuộc domain **[tên domain]** — tôi có thể load `/[skill-name]` để có reference chính xác hơn. Bạn muốn không?"

## Mapping: context → skill

| Nhận diện từ | Domain | Skill |
|---|---|---|
| folder `*_legacy*`, NativeModule, requireNativeModule, RCT_EXPORT | Legacy Native Modules | `/rn-native-legacy` |
| TurboModule, Fabric, JSI, NativeSpec, codegen, cxxBridge | New Architecture | `/rn-native-platform` |
| Animated.Value, timing, spring, decay, interpolate, native driver, Reanimated, useSharedValue, GestureDetector | Animation & Gesture | `/rn-animation` |
| useNavigation, createStackNavigator, deep link, auth flow, React Navigation | Navigation | `/rn-navigation` |
| Redux, createSlice, Zustand, TanStack Query, useQuery, useMutation | State Management | `/rn-state-management` |
| MMKV, SQLite, AsyncStorage, offline-first, persistence | Storage | `/rn-storage` |
| Jest, render, fireEvent, RNTL, Detox, Maestro, waitFor | Testing | `/rn-testing` |
| EAS Build, Fastlane, GitHub Actions, eas.json, lane | CI/CD | `/rn-cicd` |
| FCM, APNs, Notifee, push notification, firebase-messaging | Push Notifications | `/rn-push-notifications` |
| Keychain, SecureStore, SSL pinning, OAuth2, PKCE, certificate | Security | `/rn-security` |
| Flipper, Sentry, Crashlytics, hermes debugger, useProfiler | Debugging | `/rn-debugging` |
| accessibilityLabel, VoiceOver, TalkBack, a11y, accessible | Accessibility | `/rn-accessibility` |
| Clean Architecture, monorepo, folder structure, domain layer | Architecture | `/rn-architecture` |
| simulator, provisioning, keystore, signing, App Store, Google Play | Platform Guides | `/rn-platform-guides` |
| profiling, FlatList optimization, memo, useMemo, InteractionManager | Performance | `/rn-native-performance` |

## Khi nào phải nhắc

- User bắt đầu câu hỏi kỹ thuật về một domain → check skill đã load chưa
- User mở/tạo file trong `src/XX_tên/` → detect domain từ tên folder
- User hỏi "dùng cái nào tốt hơn" (trade-off) về tooling trong một domain → suggest skill để có context đầy đủ
- User đang debug lỗi liên quan đến một domain cụ thể

## Khi KHÔNG nhắc

- Câu hỏi chung về TypeScript, JavaScript, toolchain (không cần skill)
- Skill đã được load trong conversation này rồi
- User vừa từ chối load skill → không hỏi lại lần nữa trong cùng topic

## Phản biện & đánh giá

Khi user hỏi "nên dùng gì", "cách nào tốt hơn", Claude phải:
- Đưa ra đánh giá rõ ràng với lý do (không chỉ liệt kê option)
- Nêu trade-off cụ thể cho context của bài học (học tập vs production)
- Nếu có skill liên quan chưa load → nhắc load để đánh giá chính xác hơn
