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
    // WHY: UIDevice.current.batteryLevel phải đọc trên main thread
    DispatchQueue.main.async { [weak self] in
      let level = UIDevice.current.batteryLevel
      self?.onBatteryChange?(["level": level < 0 ? -1 : Int(level * 100)])
    }
  }

  @objc private func powerModeChanged() {
    // WHY: NSProcessInfoPowerStateDidChange có thể fire trên background thread khi toggle từ Control Center
    // emitOnLowPowerModeChange (CodeGen TurboModule) không thread-safe → phải dispatch về main
    DispatchQueue.main.async { [weak self] in
      self?.onLowPowerModeChange?(["isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled])
    }
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}
