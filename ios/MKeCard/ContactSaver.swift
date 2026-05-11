import Contacts
import Foundation
import React

@objc(ContactSaver)
class ContactSaver: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(saveContact:resolver:rejecter:)
  func saveContact(
    _ payload: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let store = CNContactStore()

    let save = {
      let contact = CNMutableContact()
      let fullName = Self.stringValue(payload["fullName"])
      let nameParts = Self.splitName(fullName)

      contact.givenName = nameParts.givenName
      contact.familyName = nameParts.familyName
      contact.organizationName = Self.stringValue(payload["company"])
      contact.jobTitle = Self.stringValue(payload["title"])

      let phone = Self.stringValue(payload["phone"])
      if !phone.isEmpty {
        contact.phoneNumbers = [
          CNLabeledValue(label: CNLabelPhoneNumberMobile, value: CNPhoneNumber(stringValue: phone))
        ]
      }

      let email = Self.stringValue(payload["email"])
      if !email.isEmpty {
        contact.emailAddresses = [
          CNLabeledValue(label: CNLabelWork, value: email as NSString)
        ]
      }

      let request = CNSaveRequest()
      request.add(contact, toContainerWithIdentifier: nil)

      do {
        try store.execute(request)
        resolve(["saved": true])
      } catch {
        reject("contacts_save_failed", "Unable to save contact.", error)
      }
    }

    switch CNContactStore.authorizationStatus(for: .contacts) {
    case .authorized:
      save()
    case .notDetermined:
      store.requestAccess(for: .contacts) { granted, error in
        if granted {
          save()
        } else {
          reject("contacts_permission_denied", "Contacts permission was denied.", error)
        }
      }
    case .denied, .restricted:
      reject("contacts_permission_denied", "Contacts permission was denied.", nil)
    @unknown default:
      reject("contacts_permission_denied", "Contacts permission is unavailable.", nil)
    }
  }

  private static func stringValue(_ value: Any?) -> String {
    guard let value = value as? String else {
      return ""
    }

    return value.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private static func splitName(_ fullName: String) -> (givenName: String, familyName: String) {
    let parts = fullName
      .split(whereSeparator: { $0.isWhitespace })
      .map(String.init)

    guard parts.count > 1 else {
      return (fullName, "")
    }

    return (parts.dropLast().joined(separator: " "), parts.last ?? "")
  }
}
