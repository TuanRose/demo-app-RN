# Reference: Monorepo với Turborepo

Monorepo giúp share code giữa React Native app, web app, và backend trong cùng một repository.

---

## Cấu trúc Turborepo

```
my-monorepo/
├── apps/
│   ├── mobile/         ← React Native app
│   ├── web/            ← Next.js web app
│   └── backend/        ← API server (Node.js)
├── packages/
│   ├── ui/             ← Shared UI components (RN + Web)
│   ├── shared/         ← Business logic, types, utilities
│   ├── config/         ← ESLint, TypeScript, Babel configs
│   └── api-client/     ← API client shared giữa mobile/web
├── package.json        ← workspace root
└── turbo.json          ← Turborepo pipeline config
```

---

## Setup

```bash
npx create-turbo@latest my-monorepo
cd my-monorepo

# Hoặc add vào existing project
npm install turbo --save-dev
```

```json
// package.json (root)
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "devDependencies": {
    "turbo": "latest"
  }
}
```

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],    // build packages trước apps
      "outputs": ["dist/**", ".next/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,             // không cache dev servers
      "persistent": true
    }
  }
}
```

---

## Shared Package

```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.ts
│   │   └── product.ts
│   ├── utils/
│   │   ├── format.ts
│   │   └── validation.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

```json
// packages/shared/package.json
{
  "name": "@myapp/shared",
  "version": "0.0.0",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

```json
// apps/mobile/package.json
{
  "dependencies": {
    "@myapp/shared": "*"    // * = dùng workspace version
  }
}
```

---

## Shared UI Components (React Native + Web)

```
packages/ui/
├── src/
│   ├── Button/
│   │   ├── Button.native.tsx    ← React Native implementation
│   │   ├── Button.web.tsx       ← React Native Web implementation
│   │   └── index.ts             ← export
│   └── index.ts
├── package.json
└── tsconfig.json
```

```tsx
// packages/ui/src/Button/Button.native.tsx
import { TouchableOpacity, Text } from 'react-native';

export function Button({ label, onPress }: ButtonProps) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{label}</Text>
    </TouchableOpacity>
  );
}

// packages/ui/src/Button/Button.web.tsx
export function Button({ label, onPress }: ButtonProps) {
  return (
    <button onClick={onPress}>{label}</button>
  );
}
```

Metro bundler tự động resolve `.native.tsx` cho React Native.

---

## Metro config cho monorepo

```js
// apps/mobile/metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '../..');
const projectRoot = __dirname;

const config = {
  watchFolders: [workspaceRoot], // watch tất cả packages

  resolver: {
    // Tìm node_modules từ workspace root
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    // Platform-specific extensions
    platforms: ['ios', 'android', 'native', 'web'],
  },

  transformer: {
    // Transform code từ packages/ folder
    getTransformOptions: async () => ({
      transform: { experimentalImportSupport: false, inlineRequires: true },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
```

---

## TypeScript config

```json
// packages/config/tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  }
}

// apps/mobile/tsconfig.json
{
  "extends": "@myapp/config/tsconfig.base.json",
  "compilerOptions": {
    "paths": {
      "@myapp/shared": ["../../packages/shared/src"],
      "@myapp/ui": ["../../packages/ui/src"]
    }
  }
}
```

---

## Turborepo Commands

```bash
# Chạy tất cả packages
turbo build
turbo test
turbo lint

# Chỉ chạy specific app
turbo build --filter=mobile
turbo test --filter=@myapp/shared

# Chạy mobile app
turbo dev --filter=mobile

# Xem task graph
turbo build --graph

# Remote caching (chia sẻ build cache giữa CI và local)
turbo login
turbo link
```

---

## CI với Turborepo

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build & Test
        run: turbo build test lint
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}   # remote cache
          TURBO_TEAM: ${{ vars.TURBO_TEAM }}
```

---

## Khi nào dùng Monorepo?

**Nên dùng khi:**
- Có React Native + Web (Next.js) cùng codebase
- Share nhiều business logic, types, components
- Team lớn, nhiều apps cùng maintain
- API client, validation logic dùng chung

**Không cần khi:**
- Chỉ có một app mobile
- Team nhỏ, ít shared code
- Không có web counterpart
