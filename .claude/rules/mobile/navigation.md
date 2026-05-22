---
paths: src/**/navigation/**/*.tsx, src/**/navigation/**/*.ts, src/**/*Navigator*.tsx, src/**/*Screen*.tsx
---
# React Navigation Rules

Khi bài học liên quan đến navigation, dùng React Navigation v7 (`@react-navigation/native`).

## Setup cơ bản
- Wrap `NavigationContainer` ở root (trong App.tsx, bên trong `SafeAreaProvider`)
- Stack: `@react-navigation/native-stack` (Native Stack, performant hơn JS Stack)

## TypeScript
- Khai báo `RootStackParamList` type cho toàn bộ navigator
- Dùng `NativeStackScreenProps<RootStackParamList, 'ScreenName'>` cho screen props
- Tham khảo skill `/rn-navigation` → `core-navigators.md`

## Patterns
- KHÔNG navigate từ outside component bừa bãi — dùng `navigationRef` nếu cần
- Deep linking: cấu hình `linking` prop trên `NavigationContainer`
- Auth flow: conditional stack (không dùng navigate để chuyển auth state)

## Rules
- Screen component KHÔNG chứa business logic — chỉ layout và delegate xuống hooks/utils
- Tên screen trong ParamList phải match tên route string
