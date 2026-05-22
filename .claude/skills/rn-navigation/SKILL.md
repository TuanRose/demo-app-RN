# Skill: rn-navigation

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Core navigators | Stack, Tab, Drawer, params, TypeScript types |
| Deep linking | Universal Links (iOS), App Links (Android), linking config |
| Auth flow | Conditional stacks, token persistence, protected routes |
| Advanced patterns | Nested navigators, modal stack, reset, back button |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Stack/Tab/Drawer setup, navigate/goBack/push/replace, params, TypeScript | `references/core-navigators.md` |
| Universal Links, App Links, Android intent filters, iOS associated domains | `references/deep-linking.md` |
| Login/logout flow, token restore, protected screens, conditional navigation | `references/auth-flow.md` |
| Nested navigators, modal, reset stack, tab badge, header customization | `references/advanced-patterns.md` |

---

## Quy tắc chung

- Dùng `createNativeStackNavigator` (không phải `createStackNavigator`) — performance tốt hơn.
- TypeScript: define `RootStackParamList` cho tất cả screens — type-safe navigation.
- Auth flow: KHÔNG gọi `navigation.navigate('Home')` sau login — để React Navigation tự xử lý qua conditional screens.
- Deep link: không truyền sensitive data (token) qua URL scheme.
- `NavigationContainer` phải là wrapper ngoài cùng (sau SafeAreaProvider).
