# Bài 06 — Legacy Native Module (Swift)

## Mục tiêu

- [ ] Hiểu flow: TypeScript wrapper → NativeModules → ObjC bridge (.m) → Swift class
- [ ] Implement `RCT_EXTERN_MODULE` + `RCT_EXTERN_METHOD` để expose Swift method
- [ ] Dùng `RCTEventEmitter` để push event từ native → JS
- [ ] Expose constants qua `constantsToExport()`
- [ ] Viết TypeScript wrapper (`NativeModules.XYZ`) thay vì gọi trực tiếp
- [ ] Viết custom hook để encapsulate native module logic
- [ ] Hiểu tại sao dùng `import React` (Swift module import) thay vì bridging header

## Done when

- App build thành công (no Swift/ObjC compile errors)
- Màn `DeviceBatteryScreen` hiện đúng battery level trên thiết bị thật
- Event `batteryLevelChanged` cập nhật UI khi cắm/rút sạc

## Key files

| File | Vai trò |
|---|---|
| `NativeDeviceBattery.legacy.ts` | TypeScript wrapper + NativeEventEmitter |
| `hooks/useBatteryLevel.ts` | Hook encapsulate promise + event |
| `screens/DeviceBatteryScreen.tsx` | Demo UI |
| `ios/demo_app/Modules/DeviceBattery/DeviceBattery.swift` | Native impl |
| `ios/demo_app/Modules/DeviceBattery/DeviceBattery.m` | ObjC bridge |

## Ghi chú

### TurboModule crash: `std::__throw_bad_function_call` khi toggle Low Power Mode

**Triệu chứng**: App crash khi kéo Control Center và toggle Low Power Mode. Mở lại thì state đúng nhưng không update real-time.

**Root cause**: `DeviceBatteryImpl.init()` đăng ký NotificationCenter ngay lập tức. Nếu notification fire trước khi `getTurboModule` chạy xong, `EventEmitter_` (một `std::function` do TurboModule runtime set) vẫn đang empty → gọi vào empty function → crash.

**Legacy không bị** vì `RCTEventEmitter.startObserving()` chỉ đăng ký notification khi JS add listener — lúc đó module đã fully initialized.

**Fix**: Thêm `_isInstalled` flag trong `.mm`, set `YES` trong `getTurboModule`, guard trước mọi `emitOn*` call.

```objc
// RCTNativeDeviceBattery.mm
- (std::shared_ptr<...>)getTurboModule:(...) {
  _isInstalled = YES;  // EventEmitter_ được set từ đây mới safe để emit
  return std::make_shared<...>(params);
}
```

**Threading rule**:
- `UIDevice.current.batteryLevel` → phải đọc trên main thread → dispatch trong Swift
- `ProcessInfo.processInfo.isLowPowerModeEnabled` → thread-safe → không cần dispatch trong Swift
- `emitOn*` (CodeGen) → phải gọi trên main thread → dispatch trong `.mm`

---

### Tại sao `import React` trong Swift, không dùng bridging header?

Dùng `SWIFT_OBJC_BRIDGING_HEADER` trong RN 0.74+ sẽ gây lỗi:
```
module 'RCTDeprecation' ... not defined in any loaded module map file
```

`RCTBridgeModule.h` import `<RCTDeprecation/RCTDeprecation.h>`.
Khi bridging header được compile thành PCH, Swift validate PCH không tìm được module map của `RCTDeprecation`.

`import React` trong Swift đi qua Swift module system (dùng `-Xcc -fmodule-map-file` flags từ xcconfig) — cùng path `AppDelegate.swift` đã dùng thành công.

**Kết luận**: xóa `SWIFT_OBJC_BRIDGING_HEADER` khỏi pbxproj, dùng `import React` trực tiếp.
