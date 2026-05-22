# Reference: Jest Unit Testing

---

## Cấu trúc test (AAA Pattern)

```tsx
describe('colorForDueDate', () => {
  // Arrange — chuẩn bị
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  it('given a past date, returns red', () => {
    // Act
    const result = colorForDueDate('2000-10-20');
    // Assert
    expect(result).toBe('red');
  });
});
```

---

## Mock functions

```tsx
// jest.fn() — mock function
const mockCallback = jest.fn();
mockCallback('arg1');
expect(mockCallback).toHaveBeenCalledWith('arg1');
expect(mockCallback).toHaveBeenCalledTimes(1);

// mockReturnValue
const mockFn = jest.fn().mockReturnValue(42);
expect(mockFn()).toBe(42);

// mockResolvedValue (async)
const mockAsync = jest.fn().mockResolvedValue({ data: 'ok' });
await expect(mockAsync()).resolves.toEqual({ data: 'ok' });

// mockRejectedValue (error)
const mockError = jest.fn().mockRejectedValue(new Error('fail'));
await expect(mockError()).rejects.toThrow('fail');
```

---

## Mock modules

```tsx
// Mock toàn bộ module
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
}));

// Mock module với factory
jest.mock('../services/api', () => ({
  fetchUser: jest.fn().mockResolvedValue({ id: 1, name: 'John' }),
}));

// Spy — mock một method của object thật
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... test
consoleSpy.mockRestore();
```

---

## Mock native modules

```tsx
// Mock native module không có trong test environment
jest.mock('react-native-mmkv', () => ({
  useMMKVString: jest.fn().mockReturnValue(['value', jest.fn()]),
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn().mockReturnValue('stored'),
    set: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock @react-native-firebase/messaging
jest.mock('@react-native-firebase/messaging', () => () => ({
  requestPermission: jest.fn().mockResolvedValue(1),
  getToken: jest.fn().mockResolvedValue('mock-token'),
  onMessage: jest.fn(() => jest.fn()), // trả về unsubscribe fn
  setBackgroundMessageHandler: jest.fn(),
}));
```

---

## Async testing

```tsx
// Dùng async/await
it('fetches user successfully', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('John');
});

// waitFor — chờ đến khi assertion pass
import { waitFor } from '@testing-library/react-native';

it('shows loading then content', async () => {
  render(<UserProfile userId={1} />);
  expect(screen.getByText('Loading...')).toBeTruthy();

  await waitFor(() => {
    expect(screen.getByText('John')).toBeTruthy();
  });
});
```

---

## Timer mocks

```tsx
// Fake timers — kiểm soát setTimeout, setInterval
beforeEach(() => { jest.useFakeTimers(); });
afterEach(() => { jest.useRealTimers(); });

it('calls callback after 1000ms', () => {
  const callback = jest.fn();
  setTimeout(callback, 1000);

  jest.advanceTimersByTime(1000);
  expect(callback).toHaveBeenCalledTimes(1);
});

// Chạy tất cả timers pending
jest.runAllTimers();

// Chỉ chạy timers hiện tại (không trigger timer mới)
jest.runOnlyPendingTimers();
```

---

## Common matchers

```tsx
// Equality
expect(value).toBe(42);              // strict equality (===)
expect(obj).toEqual({ a: 1 });       // deep equality
expect(arr).toContain('item');
expect(obj).toMatchObject({ a: 1 }); // partial match

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(num).toBeGreaterThan(5);
expect(num).toBeLessThanOrEqual(10);
expect(num).toBeCloseTo(0.3, 2); // float comparison

// Strings
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');

// Arrays/Objects
expect(arr).toHaveLength(3);
expect(obj).toHaveProperty('nested.path', 'value');

// Errors
expect(() => fn()).toThrow('error message');
expect(() => fn()).toThrow(CustomError);
```

---

## Setup file — `jest.setup.js`

```js
// jest.config.js
module.exports = {
  preset: '@react-native/jest-preset',
  setupFilesAfterFramework: ['./jest.setup.js'],
};

// jest.setup.js
import '@testing-library/react-native/extend-expect'; // RNTL matchers

// Mock common native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
}));
```
