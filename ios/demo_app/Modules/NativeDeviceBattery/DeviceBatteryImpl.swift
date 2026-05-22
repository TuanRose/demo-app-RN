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
    let level = UIDevice.current.batteryLevel
    onBatteryChange?(["level": level < 0 ? -1 : Int(level * 100)])
  }

  @objc private func powerModeChanged() {
    onLowPowerModeChange?(["isLowPowerMode": ProcessInfo.processInfo.isLowPowerModeEnabled])
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
  }
}
