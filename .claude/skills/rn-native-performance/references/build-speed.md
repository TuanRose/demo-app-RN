# Reference: Build Speed Optimization

---

## Android — Chỉ Build 1 ABI (Giảm ~75% thời gian build native)

Mặc định build cả 4 ABIs: `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`. Khi dev, chỉ cần ABI của thiết bị đang dùng.

**Cách 1 — React Native CLI:**
```bash
yarn react-native run-android --active-arch-only
```

**Cách 2 — Gradle trực tiếp:**
```bash
./gradlew :app:assembleDebug -PreactNativeArchitectures=x86_64
# Thiết bị vật lý arm64:
./gradlew :app:assembleDebug -PreactNativeArchitectures=arm64-v8a
```

**Cách 3 — `android/gradle.properties` (persistent):**
```properties
reactNativeArchitectures=arm64-v8a
```

> **Quan trọng:** Xóa giá trị này khi tạo release build — cần hỗ trợ tất cả ABI.

---

## Android — Gradle Configuration Caching (RN 0.79+)

Bỏ qua Configuration phase trong lần build tiếp theo, hữu ích khi thay đổi native code thường xuyên.

`android/gradle.properties`:
```properties
org.gradle.configuration-cache=true
```

---

## Android — Maven Mirror

Tăng tốc download dependencies bằng internal proxy:

`android/gradle.properties`:
```properties
exclusiveEnterpriseRepository=https://my.internal.proxy.net/
```

> Dependencies chỉ được fetch từ repository này.

---

## Cross-Platform — Compiler Caching với ccache

Cache kết quả compile C++ và Objective-C, giúp rebuild nhanh hơn khi code ít thay đổi.

**Cài đặt:**
```bash
brew install ccache
```

**Kiểm tra hiệu quả:**
```bash
ccache -s              # xem stats
ccache --zero-stats    # reset stats trước build
ccache --clear         # xóa cache
```

### iOS — Bật ccache trong Podfile

`ios/Podfile`:
```ruby
post_install do |installer|
  react_native_post_install(
    installer,
    config[:reactNativePath],
    :mac_catalyst_enabled => false,
    :ccache_enabled => true
  )
end
```

### CI/CD

- Cache path: `/Users/$USER/Library/Caches/ccache` (macOS)
- Dùng option `compiler_check content` thay vì timestamps trên CI
- Nên clean build hoàn toàn trên CI để tránh poisoned cache

---

## Cross-Platform — Distributed Cache với sccache

Dành cho team lớn có nhiều CI builds. Xem [sccache distributed compilation quickstart](https://github.com/mozilla/sccache/blob/main/docs/DistributedQuickstart.md).

---

## Tóm tắt ưu tiên

| Kỹ thuật | Platform | Tác động | Khi nào dùng |
|----------|----------|---------|-------------|
| Single ABI | Android | ~75% giảm native build | Dev hàng ngày |
| Gradle config cache | Android | Tiết kiệm config phase | Hay đổi native code |
| ccache | iOS + Android | Rebuild nhanh hơn | Local dev & CI |
| Maven mirror | Android | Download nhanh hơn | Team với internal repo |
| sccache | iOS + Android | Distributed cache | Team lớn, CI nặng |
