# Reference: iOS — Simulator, Linking Libraries, App Store Publishing

---

## Phần 1 — Chạy trên iOS Simulator

### Lệnh cơ bản

```bash
npm run ios
# hoặc
yarn ios
```

### Chỉ định thiết bị

```bash
# Theo tên (default: "iPhone 14")
npm run ios -- --simulator="iPhone SE (3rd generation)"

# Kèm iOS version
npm run ios -- --simulator="iPhone 14 Pro (16.0)"

# Theo UDID
npm run ios -- --udid="AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"
```

**Xem danh sách thiết bị có sẵn:**
```bash
xcrun simctl list devices
```

---

## Phần 2 — Linking Libraries iOS (Manual)

Dùng khi thư viện có native code và auto-linking không hoạt động.

### Bước 1 — Thêm `.xcodeproj` vào Xcode

- Tìm file `.xcodeproj` trong folder thư viện
- Kéo vào group `Libraries` trong Xcode project

### Bước 2 — Link static library

1. Click vào main project file (`.xcodeproj` của app)
2. Chọn tab **Build Phases**
3. Mở **Link Binary With Libraries**
4. Kéo static library từ folder `Products` của thư viện vừa thêm vào đây

### Bước 3 — Cấu hình Header Search Paths (chỉ khi cần gọi từ native code)

> Bỏ qua nếu chỉ dùng từ JavaScript.

1. Vào **Build Settings** của project
2. Tìm **Header Search Paths**
3. Thêm đường dẫn đến headers của thư viện
4. **Không dùng** flag `recursive` — có thể gây lỗi build subtle, đặc biệt với CocoaPods

---

## Phần 3 — Publishing to App Store

### Bước 1 — Cấu hình Release Scheme

- **Product** → **Scheme** → **Edit Scheme**
- Chọn tab **Run**
- Set **Build Configuration** → `Release`

**Tùy chọn: bỏ qua bundle trong Debug** (tăng tốc build dev):

Thêm vào Xcode Build Phase script (`Bundle React Native code and images`):
```bash
if [ "${CONFIGURATION}" == "Debug" ]; then
  export SKIP_BUNDLING=true
fi
```

### Bước 2 — Build

```bash
# CLI
npm run ios -- --mode="Release"
# hoặc
yarn ios --mode Release
```

Hoặc trong Xcode: **Cmd ⌘ + B** / **Product** → **Build**

### Bước 3 — Archive và Submit

1. Mở workspace: `open ios/YOUR_APP_NAME.xcworkspace`
2. Set device to **"Any iOS Device (arm64)"**
3. **Product** → **Archive**
4. Trong Organizer: **Distribute App** → **App Store Connect** → **Upload**
5. Chọn signing method → **Upload**
6. Trên **App Store Connect** → **TestFlight** → điền thông tin → **Submit For Review**

**Kiểm tra:** Bundle Identifier phải khớp chính xác với Apple Developer Dashboard.

### Screenshots

- App Store yêu cầu screenshots cho các device mới nhất.
- Xem specifications: [Apple Screenshot Specifications](https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications/)

### Lưu ý

- Release build tự động tắt Dev Menu.
- JS được bundle cục bộ → có thể test offline trên device.
- Nếu dùng Expo: dùng [Expo's App Stores deployment guide](https://docs.expo.dev/distribution/app-stores/).
