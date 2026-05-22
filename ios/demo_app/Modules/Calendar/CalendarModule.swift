//
//  CalendarModule.swift
//  demo_app
//
import UIKit
import React
import EventKit

// @objc(CalendarModule) phải khớp với RCT_EXTERN_MODULE ở RCTCalendarModule.m
// Kế thừa NSObject (không phải RCTEventEmitter) vì module này không phát event
@objc(CalendarModule)
class CalendarModule: NSObject {

  // false: không đụng UIKit lúc khởi tạo → RN không cần chờ main thread
  @objc static func requiresMainQueueSetup() -> Bool { return false }

  @objc func constantsToExport() -> [AnyHashable: Any]! {
    return ["DEFAULT_EVENT_NAME": "New Event"]
  }

  // Promise thay vì void — JS cần biết eventIdentifier để query/delete sau
  // Signature @objc phải khớp CHÍNH XÁC với RCT_EXTERN_METHOD trong .m
  @objc(createCalendarEvent:location:resolve:reject:)
  func createCalendarEvent(
    _ name: String,
    location: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    let store = EKEventStore()

    // requestAccess(to:) deprecated iOS 17 → dùng requestFullAccessToEvents khi có thể
    // Completion chạy trên background thread — không cần dispatch về main vì không đụng UIKit
    let handleAccess: (Bool, Error?) -> Void = { granted, error in
      if let error = error {
        reject("CALENDAR_ERROR", error.localizedDescription, error)
        return
      }
      guard granted else {
        reject("PERMISSION_DENIED", "Calendar access denied by user", nil)
        return
      }

      let event = EKEvent(eventStore: store)
      event.title = name
      event.location = location
      event.startDate = Date()
      event.endDate = Date().addingTimeInterval(3600) // 1-hour event
      event.calendar = store.defaultCalendarForNewEvents

      do {
        try store.save(event, span: .thisEvent)
        resolve(event.eventIdentifier)
      } catch {
        reject("SAVE_ERROR", error.localizedDescription, error)
      }
    }

    if #available(iOS 17.0, *) {
      store.requestFullAccessToEvents(completion: handleAccess)
    } else {
      store.requestAccess(to: .event, completion: handleAccess)
    }
  }
}
