# Reference: React Native Testing Library (RNTL)

Test từ **user perspective** — focus vào những gì user nhìn thấy và tương tác, không phải implementation details.

---

## Cài đặt

```bash
npm install --save-dev @testing-library/react-native
npm install --save-dev @testing-library/jest-native # matchers thêm
```

`jest.setup.js`:
```js
import '@testing-library/react-native/extend-expect';
```

---

## Render + screen

```tsx
import { render, screen } from '@testing-library/react-native';

it('renders correctly', () => {
  render(<MyComponent name="John" />);

  // screen là global helper sau khi render
  expect(screen.getByText('Hello John')).toBeTruthy();
});
```

---

## Queries — tìm elements

### `getBy*` — throw nếu không tìm thấy (dùng khi chắc element tồn tại)

```tsx
// Ưu tiên theo thứ tự này (theo accessibility, user-friendly)
screen.getByRole('button', { name: 'Submit' });  // 1. Role + name
screen.getByLabelText('Email');                   // 2. Accessibility label
screen.getByPlaceholderText('Enter email');       // 3. Placeholder
screen.getByText('Hello');                        // 4. Text content
screen.getByDisplayValue('current value');        // 5. Input value
screen.getByTestId('submit-button');              // 6. testID (last resort)
```

### `queryBy*` — trả về null nếu không tìm thấy (dùng để assert element KHÔNG tồn tại)

```tsx
expect(screen.queryByText('Error')).toBeNull();
// hoặc với RNTL matchers
expect(screen.queryByText('Error')).not.toBeOnTheScreen();
```

### `findBy*` — async, chờ cho đến khi element xuất hiện

```tsx
// Dùng cho elements xuất hiện sau async operations
const submitBtn = await screen.findByRole('button', { name: 'Submit' });
```

### `getAllBy*`, `queryAllBy*`, `findAllBy*` — nhiều elements

```tsx
const buttons = screen.getAllByRole('button');
expect(buttons).toHaveLength(3);
```

---

## userEvent — preferred cách interact

```tsx
import { userEvent } from '@testing-library/react-native';

const user = userEvent.setup();

it('submits form', async () => {
  render(<LoginForm />);

  // Type text
  await user.type(screen.getByPlaceholderText('Email'), 'john@example.com');
  await user.type(screen.getByPlaceholderText('Password'), 'password123');

  // Press
  await user.press(screen.getByRole('button', { name: 'Login' }));

  // Long press
  await user.longPress(screen.getByTestId('hold-button'));

  // Scroll
  await user.scrollTo(screen.getByTestId('scroll-view'), { y: 200 });

  await waitFor(() => {
    expect(screen.getByText('Welcome!')).toBeOnTheScreen();
  });
});
```

---

## fireEvent — lower-level (dùng khi userEvent không đủ)

```tsx
import { fireEvent } from '@testing-library/react-native';

// Khi cần simulate events không có trong userEvent
fireEvent.changeText(input, 'new value');
fireEvent.press(button);
fireEvent.scroll(scrollView, {
  nativeEvent: { contentOffset: { y: 100 } },
});
fireEvent(element, 'onSwipeLeft');
```

---

## waitFor — chờ async changes

```tsx
import { waitFor } from '@testing-library/react-native';

it('loads data', async () => {
  render(<UserList />);

  // Chờ cho đến khi text xuất hiện (default timeout 1000ms)
  await waitFor(() => {
    expect(screen.getByText('John Doe')).toBeOnTheScreen();
  }, { timeout: 3000 });
});
```

---

## within — scope queries vào container

```tsx
import { within } from '@testing-library/react-native';

it('each list item has delete button', () => {
  render(<TodoList items={['A', 'B']} />);

  const itemA = screen.getByTestId('item-A');
  const { getByRole } = within(itemA);

  // Tìm button trong phạm vi itemA thôi
  expect(getByRole('button', { name: 'Delete' })).toBeTruthy();
});
```

---

## Wrap với providers

```tsx
// Tạo helper render với providers
function renderWithProviders(ui: React.ReactElement, options = {}) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <NavigationContainer>
        {children}
      </NavigationContainer>
    </Provider>
  );
  return render(ui, { wrapper: Wrapper, ...options });
}

// Dùng
renderWithProviders(<MyScreen />);
```

---

## RNTL-specific matchers (sau khi extend-expect)

```tsx
expect(element).toBeOnTheScreen();     // element được render và visible
expect(element).toBeEnabled();         // không bị disabled
expect(element).toBeDisabled();
expect(element).toHaveTextContent('Hello');
expect(element).toHaveProp('value', 'test');
expect(element).toHaveStyle({ color: 'red' });
expect(element).toBeEmptyElement();
```

---

## Lưu ý

- Ưu tiên `getByRole` và `getByLabelText` — query theo accessibility, gần với UX nhất.
- Tránh `getByTestId` khi có thể — đây là last resort.
- `userEvent` simulate behavior thực tế hơn `fireEvent` — ưu tiên userEvent.
- Không test implementation details (internal state, component props nội bộ).
