//
//  DeviceBatteryImpl.swift
//  demo_app
//
import Foundation
import UIKit

// public + @objc public: bắt buộc để file .mm nhìn thấy qua demo_app-Swift.h
// Không import React ở đây — class này độc lập với RN, dễ unit test
@objc(DeviceBatteryImpl)
public class DeviceBatteryImpl: NSObject {

  @objc public var onBatteryChange: (([String: Any]) -> Void)?
  @objc public var onLowPowerModeChange: (([String: Any]) -> Void)?

  @objc public override init() {
    super.init()
    UIDevice.current.isBatteryMonitoringEnabled = true
    NotificationCenter.default.addObserver(
      self, selector: #selector(batteryChanged),
      name: UIDevice.batteryLevelDidChangeNotification, object: nil)
    NotificationCenter.default.addObserver(
      self, selector: #selector(powerModeChanged),
      name: NSNotification.Name.NSProcessInfoPowerStateDidChange, object: nil)
  }

  @objc public var isLowPowerMode: Bool {
    ProcessInfo.processInfo.isLowPowerModeEnabled
  }

  // Trả NSNumber để .mm bridge dễ chuyển đổi — Int32 không bridging tốt sang ObjC
  @objc public func currentBatteryLevel() -> NSNumber {
    let level = UIDevice.current.batteryLevel
    return NSNumber(value: level < 0 ? -1 : Int(level * 100))
  }

  @objc private func batteryChanged() {
    // WHY: UIDevice.current.batteryLevel chỉ được đọc trên main thread
    DispatchQueue.main.async { [weak self] in
      let level = UIDevice.current.batteryLevel
      self?.onBatteryChange?(["level": level < 0 ? -1 : Int(level * 100)])
    }
  }

  @objc private func powerModeChanged() {
    // ProcessInfo.processInfo.isLowPowerModeEnabled là thread-safe — không cần dispatch ở đây.
    // .mm caller sẽ dispatch về main trước khi emit lên JS.
    onLowPowerModeChange?(["isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled])
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}
