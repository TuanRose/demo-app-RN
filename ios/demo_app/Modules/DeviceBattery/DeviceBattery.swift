//
//  DeviceBattery.swift
//  demo_app
//
//  Created by Vu MinhTuan on 21/5/26.
//

import UIKit
// import React thay vì bridging header — cùng pattern AppDelegate.swift dùng
// Swift module import đi qua -Xcc -fmodule-map-file flags, tránh PCH/RCTDeprecation issue
import React

// @objc(DeviceBattery) — tên này phải khớp với RCT_EXTERN_MODULE ở file bridge
// Kế thừa RCTEventEmitter để phát event xuống JS (nếu chỉ cần hàm thường thì kế thừa NSObject)
@objc(DeviceBattery)
class DeviceBattery: RCTEventEmitter {

  private var hasListeners = false

  override init() {
    super.init()
    UIDevice.current.isBatteryMonitoringEnabled = true
  }

  // WHY: phải true vì init() gọi UIDevice.current (UIKit) — UIKit chỉ được access trên main thread.
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["batteryLevelChanged", "lowPowerModeChanged"]
  }

  // Constants: giá trị tĩnh, JS đọc một lần lúc load — KHÔNG dùng cho dữ liệu thay đổi
  override func constantsToExport() -> [AnyHashable: Any]! {
    return ["isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled]
  }

  // --- Phương thức Promise (KHUYẾN NGHỊ cho mọi API bất đồng bộ) ---
  // Signature phải khớp y hệt với RCT_EXTERN_METHOD ở file bridge
  @objc(getBatteryLevel:rejecter:)
  func getBatteryLevel(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    let level = UIDevice.current.batteryLevel
    // batteryLevel = -1 khi không đọc được (vd: simulator cũ)
    if level < 0 {
      reject("E_BATTERY_UNAVAILABLE", "Cannot read battery level on this device", nil)
      return
    }
    resolve(Int(level * 100)) // 0.0–1.0 → phần trăm
  }

  // --- Bắt đầu/dừng quan sát: RN gọi tự động khi JS add/remove listener ---
  override func startObserving() {
    hasListeners = true
    NotificationCenter.default.addObserver(
      self, selector: #selector(batteryLevelDidChange),
      name: UIDevice.batteryLevelDidChangeNotification, object: nil)
    // NSProcessInfoPowerStateDidChangeNotification fire ngay khi user toggle Low Power Mode
    NotificationCenter.default.addObserver(
      self, selector: #selector(lowPowerModeDidChange),
      name: NSNotification.Name.NSProcessInfoPowerStateDidChange, object: nil)
  }

  override func stopObserving() {
    hasListeners = false
    NotificationCenter.default.removeObserver(self)
  }

  @objc private func batteryLevelDidChange() {
    guard hasListeners else { return }
    // WHY: UIDevice.current.batteryLevel phải đọc trên main thread
    DispatchQueue.main.async {
      self.sendEvent(withName: "batteryLevelChanged",
                body: ["level": Int(UIDevice.current.batteryLevel * 100)])
    }
  }

  @objc private func lowPowerModeDidChange() {
    guard hasListeners else { return }
    // WHY: NSProcessInfoPowerStateDidChange có thể fire trên background thread khi toggle từ Control Center
    // sendEvent không thread-safe → phải dispatch về main
    DispatchQueue.main.async {
      self.sendEvent(withName: "lowPowerModeChanged",
                body: ["isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled])
    }
  }
}
