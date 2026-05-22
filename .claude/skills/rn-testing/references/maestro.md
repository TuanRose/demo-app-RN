# Reference: Maestro E2E Testing

Maestro sử dụng YAML flows — đơn giản hơn Detox, setup nhanh, ít config.

---

## Cài đặt

```bash
# macOS/Linux
curl -Ls "https://get.maestro.mobile.dev" | bash

# Verify
maestro --version
```

---

## Chạy flow

```bash
# Chạy một flow
maestro test e2e/login.yaml

# Chạy tất cả flows trong folder
maestro test e2e/

# Chạy và watch (re-run khi file thay đổi)
maestro test --watch e2e/login.yaml

# Interactive studio (record flows)
maestro studio
```

---

## Cấu trúc flow cơ bản

```yaml
# e2e/login.yaml
appId: com.yourapp  # Bundle ID (iOS) hoặc package name (Android)

---
- launchApp
- assertVisible: "Login"          # Kiểm tra text visible
- tapOn: "Email"                  # Tap vào element có text "Email"
- inputText: "test@example.com"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Login"
- assertVisible: "Welcome"
- assertNotVisible: "Login"
```

---

## Commands phổ biến

### App lifecycle

```yaml
- launchApp                         # Launch app (mặc định)
- launchApp:
    clearState: true                # Clear app data trước khi launch
    clearKeychain: true             # Clear keychain (iOS)
    permissions:
      notifications: allow
      camera: allow
- stopApp
- clearState                        # Clear app data
```

### Tap / Interaction

```yaml
- tapOn: "Button Text"              # Tap theo text
- tapOn:
    id: "submit-button"             # Tap theo testID/accessibilityId
- tapOn:
    text: "Submit"
    index: 1                        # Nếu có nhiều elements cùng text
- longPressOn: "Delete"
- doubleTapOn: "Image"
- swipe:
    direction: LEFT                 # UP, DOWN, LEFT, RIGHT
    duration: 500
- scroll
- scrollUntilVisible:
    element:
      text: "Target Item"
    direction: DOWN
```

### Input

```yaml
- tapOn: "Search"
- inputText: "React Native"
- clearText
- pressKey: Delete
- pressKey: Enter
- hideKeyboard
```

### Assertions

```yaml
- assertVisible: "Welcome John"           # Text visible
- assertVisible:
    id: "success-icon"                    # ID visible
- assertNotVisible: "Error message"       # Text không visible
- assertVisible:
    text: ".*Loading.*"                   # Regex match
- assertTrue:
    condition: ${name == "John"}          # JavaScript condition
```

### Navigation

```yaml
- back                                    # Android back button
- pressKey: Home                         # Home button
```

---

## Variables và subflows

```yaml
# Định nghĩa variables
env:
  EMAIL: "test@example.com"
  PASSWORD: "password123"

---
- inputText: ${EMAIL}
- inputText: ${PASSWORD}
```

```yaml
# Gọi subflow trong flow khác (reuse)
- runFlow: setup/login.yaml
- runFlow:
    file: setup/login.yaml
    env:
      EMAIL: "admin@example.com"
```

---

## JavaScript trong Maestro

```yaml
- evalScript: ${output.result = 'Hello ' + name}
- assertVisible: ${output.result}

# runScript — chạy JS file
- runScript:
    file: scripts/generateData.js
    env:
      INPUT: "test"
```

---

## CI Integration

```bash
# Cài Maestro trên CI
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"

# Chạy với report
maestro test e2e/ --format junit --output test-results.xml
```

**GitHub Actions:**
```yaml
- name: Install Maestro
  run: curl -Ls "https://get.maestro.mobile.dev" | bash

- name: Run E2E Tests
  run: |
    export PATH="$PATH:$HOME/.maestro/bin"
    maestro test e2e/ --format junit --output report.xml

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: maestro-results
    path: report.xml
```

---

## So sánh Maestro vs Detox

| | Maestro | Detox |
|---|---------|-------|
| Config | YAML, đơn giản | JS/TS, chi tiết |
| Setup | Nhanh (CLI tool) | Phức tạp hơn |
| Sync | Tự động | Tự động (gray-box) |
| Debug | Có studio | Có artifacts |
| CI | Dễ | Cần build artifacts |
| Native access | Hạn chế | Tốt hơn |
| Best for | Quick E2E, non-devs viết tests | Complex flows, teams lớn |
