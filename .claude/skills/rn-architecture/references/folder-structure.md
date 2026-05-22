# Reference: Folder Structure — Feature-Based Architecture

---

## Feature-Based Structure (khuyến nghị)

Thay vì organize theo type (components/, screens/, hooks/), organize theo feature. Tất cả code liên quan đến một feature nằm cùng nhau.

```
src/
├── app/                        # App-level config (không business logic)
│   ├── App.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   └── navigationRef.ts
│   └── providers/
│       ├── QueryProvider.tsx
│       └── ThemeProvider.tsx
│
├── features/                   # Mỗi feature là một module độc lập
│   ├── auth/
│   │   ├── screens/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── SignupScreen.tsx
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   └── SocialLoginButtons.tsx
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── store/
│   │   │   └── authSlice.ts
│   │   ├── api/
│   │   │   └── authApi.ts
│   │   ├── types/
│   │   │   └── auth.types.ts
│   │   └── index.ts            # public API của feature
│   │
│   ├── products/
│   │   ├── screens/
│   │   │   ├── ProductListScreen.tsx
│   │   │   └── ProductDetailScreen.tsx
│   │   ├── components/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductFilter.tsx
│   │   │   └── PriceTag.tsx
│   │   ├── hooks/
│   │   │   ├── useProducts.ts
│   │   │   └── useProductSearch.ts
│   │   ├── api/
│   │   │   └── productsApi.ts
│   │   └── index.ts
│   │
│   └── cart/
│       └── ...
│
├── shared/                     # Code dùng chung across features
│   ├── components/             # Generic UI components
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.test.tsx
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   └── useNetworkStatus.ts
│   ├── utils/
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── storage.ts
│   ├── types/
│   │   └── common.types.ts
│   └── constants/
│       ├── theme.ts
│       └── config.ts
│
├── services/                   # External service integrations
│   ├── api/
│   │   ├── client.ts           # axios instance, interceptors
│   │   └── endpoints.ts
│   ├── notifications/
│   │   └── notificationService.ts
│   └── analytics/
│       └── analyticsService.ts
│
└── assets/
    ├── images/
    ├── fonts/
    └── icons/
```

---

## Module Boundaries

Quy tắc quan trọng để tránh spaghetti dependencies:

```tsx
// ✅ Features import từ shared
import { Button } from '@shared/components';
import { useDebounce } from '@shared/hooks';

// ✅ Features import từ services
import { api } from '@services/api';

// ❌ Feature import từ feature khác (tight coupling)
import { CartItem } from '@features/cart'; // trong products feature

// ✅ Nếu cần share types giữa features → đưa vào shared/types
import { CartItem } from '@shared/types';

// ❌ Shared/services import từ features
import { authSlice } from '@features/auth'; // trong shared/
```

---

## Barrel Exports (index.ts)

```tsx
// features/products/index.ts — public API
export { ProductListScreen } from './screens/ProductListScreen';
export { ProductDetailScreen } from './screens/ProductDetailScreen';
export { useProducts } from './hooks/useProducts';
export type { Product } from './types/product.types';

// Không export internal implementation details
// export { ProductApiClient } // ❌ — internal

// shared/components/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Modal } from './Modal';
```

---

## Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@services/*": ["src/services/*"],
      "@assets/*": ["src/assets/*"]
    }
  }
}
```

```js
// babel.config.js
module.exports = {
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@features': './src/features',
        '@shared': './src/shared',
        '@services': './src/services',
        '@assets': './src/assets',
      },
    }],
  ],
};
```

```bash
npm install --save-dev babel-plugin-module-resolver
```

---

## Component File Structure

```tsx
// Button/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { /* ... */ },
  primary: { /* ... */ },
  secondary: { /* ... */ },
  disabled: { opacity: 0.5 },
  label: { /* ... */ },
});
```

---

## Khi nào chia feature?

Chia thành feature riêng khi:
- Có ≥ 2 screens liên quan
- Có state/logic riêng biệt
- Có thể disable/enable độc lập

Giữ trong shared khi:
- Component dùng ở ≥ 3 features khác nhau
- Utility function không thuộc business domain
- Type definition cần share giữa features
