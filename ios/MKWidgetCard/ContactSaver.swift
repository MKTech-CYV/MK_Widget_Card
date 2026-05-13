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
      contact.departmentName = Self.stringValue(payload["department"])

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

      let address = Self.stringValue(payload["address"])
      if !address.isEmpty {
        let postalAddress = CNMutablePostalAddress()
        postalAddress.street = address
        contact.postalAddresses = [
          CNLabeledValue(label: CNLabelWork, value: postalAddress)
        ]
      }

      let website = Self.stringValue(payload["website"])
      let linkedin = Self.stringValue(payload["linkedin"])
      let facebook = Self.stringValue(payload["facebook"])
      let zaloUrl = Self.stringValue(payload["zaloUrl"])
      let whatsappUrl = Self.stringValue(payload["whatsappUrl"])
      let telegramUrl = Self.stringValue(payload["telegramUrl"])
      let bio = Self.stringValue(payload["bio"])
      contact.urlAddresses = [
        website.isEmpty ? nil : CNLabeledValue(label: CNLabelURLAddressHomePage, value: website as NSString),
        linkedin.isEmpty ? nil : CNLabeledValue(label: "LinkedIn", value: linkedin as NSString),
        facebook.isEmpty ? nil : CNLabeledValue(label: "Facebook", value: facebook as NSString),
        zaloUrl.isEmpty ? nil : CNLabeledValue(label: "Zalo", value: zaloUrl as NSString),
        whatsappUrl.isEmpty ? nil : CNLabeledValue(label: "WhatsApp", value: whatsappUrl as NSString),
        telegramUrl.isEmpty ? nil : CNLabeledValue(label: "Telegram", value: telegramUrl as NSString),
        bio.isEmpty ? nil : CNLabeledValue(label: "Bio", value: bio as NSString)
      ].compactMap { $0 }

      let zalo = Self.stringValue(payload["zalo"])
      let whatsapp = Self.stringValue(payload["whatsapp"])
      let telegram = Self.stringValue(payload["telegram"])
      contact.instantMessageAddresses = [
        zalo.isEmpty ? nil : CNLabeledValue(label: "Zalo", value: CNInstantMessageAddress(username: zalo, service: "Zalo")),
        whatsapp.isEmpty ? nil : CNLabeledValue(label: "WhatsApp", value: CNInstantMessageAddress(username: whatsapp, service: "WhatsApp")),
        telegram.isEmpty ? nil : CNLabeledValue(label: "Telegram", value: CNInstantMessageAddress(username: telegram, service: "Telegram"))
      ].compactMap { $0 }

      contact.socialProfiles = [
        linkedin.isEmpty ? nil : CNLabeledValue(label: "LinkedIn", value: CNSocialProfile(urlString: linkedin, username: "", userIdentifier: "", service: "LinkedIn")),
        facebook.isEmpty ? nil : CNLabeledValue(label: "Facebook", value: CNSocialProfile(urlString: facebook, username: "", userIdentifier: "", service: "Facebook"))
      ].compactMap { $0 }

      if let imageData = Self.photoData(from: Self.stringValue(payload["avatarUrl"])) {
        contact.imageData = imageData
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
    case .authorized, .limited:
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

  private static func photoData(from value: String) -> Data? {
    guard !value.isEmpty else {
      return nil
    }

    if value.lowercased().hasPrefix("data:image/"),
       let commaIndex = value.firstIndex(of: ",") {
      let base64 = String(value[value.index(after: commaIndex)...])
      return Data(base64Encoded: base64)
    }

    guard let url = URL(string: value) else {
      return nil
    }

    if url.isFileURL {
      return try? Data(contentsOf: url)
    }

    guard ["http", "https"].contains(url.scheme?.lowercased() ?? "") else {
      return nil
    }

    return try? Data(contentsOf: url)
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
