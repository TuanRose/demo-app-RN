import Config from 'react-native-config';

// WHY wrapper thay vì dùng Config trực tiếp:
// - TypeScript biết shape của env (không phải Record<string, string | undefined>)
// - Một chỗ duy nhất để thêm fallback hoặc validation
// - Dễ mock trong tests mà không cần mock cả module react-native-config
export const env = {
  API_BASE_URL: Config.API_BASE_URL ?? 'https://dummyjson.com',
  APP_ENV: Config.APP_ENV ?? 'prod',
} as const;

export type AppEnv = typeof env;
