import Foundation
import WidgetKit
import React

@objc(WidgetUpdater)
class WidgetUpdater: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc(reloadAll)
  func reloadAll() {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      print("MK eCard: Widgets reloaded")
    }
  }
}
