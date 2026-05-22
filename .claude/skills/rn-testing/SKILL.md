# Skill: rn-testing

Khi người dùng gọi skill này, hỏi họ cần làm gì, sau đó đọc đúng reference file và thực hiện. Trả lời bằng ngôn ngữ người dùng đang dùng.

---

## Phạm vi

| Chủ đề | Mô tả |
|--------|-------|
| Jest Unit Tests | Pure functions, mocking, async, timers, native module mocks |
| React Native Testing Library | Render, queries, userEvent, waitFor, component integration tests |
| Detox (E2E) | Gray-box E2E tests trên device/simulator thật |
| Maestro (E2E) | YAML-based E2E flows, CI integration |

---

## Routing

| Người dùng cần | File cần đọc |
|---------------|-------------|
| Unit test, mock native module, jest.fn, async test, timer mock | `references/jest-unit.md` |
| Render component, getByText/Role/TestId, userEvent.press/type, waitFor | `references/rntl.md` |
| E2E Detox, element(by.id), tap, typeText, toBeVisible, beforeAll/beforeEach | `references/detox.md` |
| E2E Maestro, YAML flow, tapOn, assertVisible, CI | `references/maestro.md` |

---

## Testing pyramid (ưu tiên từ nhiều đến ít)

```
Unit tests     → nhanh nhất, ít confidence nhất (test logic thuần)
Component tests → RNTL (test render + interaction)
Integration    → nhiều module + real deps
E2E tests      → chậm nhất, confidence cao nhất (Detox/Maestro)
```

## Quy tắc chung

- Test theo **user perspective** — getByText/Role thay vì getByTestId khi có thể.
- Không test implementation details (internal state, props) — test hành vi.
- Mock external dependencies (API, native modules), không mock logic nội bộ.
- E2E: chỉ cover critical paths (auth, checkout, core flow) — quá nhiều E2E = flaky CI.
- Snapshot tests: chỉ cho components nhỏ, tránh large snapshots.
- Test file đặt cạnh source file: `Component.tsx` → `Component.test.tsx`.
