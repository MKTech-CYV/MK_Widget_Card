import WidgetKit
import SwiftUI
import CoreImage.CIFilterBuiltins

struct UserData: Codable {
    let fullName: String
    let phone: String
    let email: String
    let title: String
    let company: String
    let avatar: String?
    let bankName: String?
    let bankAccount: String?
    let countryCode: String?
}

extension UserData {
    static let preview = UserData(
        fullName: "Nguyễn Văn A",
        phone: "0901234567",
        email: "a@example.com",
        title: "Giám đốc",
        company: "MKTech",
        avatar: nil,
        bankName: "MB",
        bankAccount: "0335337802",
        countryCode: "84"
    )
    
    var normalizedCountryCode: String {
        let digits = (countryCode ?? "84").filter { $0.isNumber }
        return digits.isEmpty ? "84" : digits
    }
    
    var formattedPhone: String {
        "+\(normalizedCountryCode)\(phone)"
    }
    
    var vCard: String {
        "BEGIN:VCARD\nVERSION:3.0\nFN:\(fullName)\nTEL:\(formattedPhone)\nEMAIL:\(email)\nORG:\(company)\nTITLE:\(title)\nEND:VCARD"
    }
    
    var bankDisplayName: String {
        let value = (bankName ?? "MB").trimmingCharacters(in: .whitespacesAndNewlines)
        return value.isEmpty ? "MB" : value
    }
    
    var bankQrUrl: String? {
        let account = (bankAccount ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        guard !account.isEmpty else { return nil }
        
        let encodedName = fullName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        return "https://img.vietqr.io/image/\(bankDisplayName)-\(account)-compact.png?accountName=\(encodedName)"
    }
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), userData: .preview)
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let data = context.isPreview ? UserData.preview : fetchUserData() ?? .preview
        let entry = SimpleEntry(date: Date(), userData: data)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date(), userData: fetchUserData() ?? .preview)
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
    
    private func fetchUserData() -> UserData? {
        let defaults = UserDefaults(suiteName: "group.com.mk.ecard")
        guard let jsonString = defaults?.string(forKey: "userData"),
              let data = jsonString.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(UserData.self, from: data)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let userData: UserData?
    
    var user: UserData {
        userData ?? .preview
    }
}

// 1. Small Contact QR
struct ContactQRSmall: Widget {
    let kind: String = "ContactQRSmall"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ContactQRSmallView(entry: entry)
        }
        .configurationDisplayName("QR Liên hệ (Nhỏ)")
        .description("Mã QR danh thiếp cá nhân.")
        .supportedFamilies([.systemSmall])
    }
}

// 2. Small Bank QR
struct BankQRSmall: Widget {
    let kind: String = "BankQRSmall"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            BankQRSmallView(entry: entry)
        }
        .configurationDisplayName("QR Ngân hàng (Nhỏ)")
        .description("Mã QR thanh toán nhanh.")
        .supportedFamilies([.systemSmall])
    }
}

// 3. Medium Contact Info
struct ContactMedium: Widget {
    let kind: String = "ContactMedium"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ContactMediumView(entry: entry)
        }
        .configurationDisplayName("Danh thiếp (Ngang)")
        .description("QR và thông tin liên hệ.")
        .supportedFamilies([.systemMedium])
    }
}

// 4. Medium Bank Info
struct BankMedium: Widget {
    let kind: String = "BankMedium"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            BankMediumView(entry: entry)
        }
        .configurationDisplayName("Thanh toán (Ngang)")
        .description("QR và thông tin tài khoản.")
        .supportedFamilies([.systemMedium])
    }
}

@main
struct MKeCardWidgetBundle: WidgetBundle {
    var body: some Widget {
        ContactQRSmall()
        BankQRSmall()
        ContactMedium()
        BankMedium()
    }
}

// MARK: - Views

struct ContactQRSmallView: View {
    var entry: SimpleEntry
    var body: some View {
        ZStack {
            QRWithLogo(content: entry.user.vCard, size: 155)
        }
        .containerBackground(.white, for: .widget)
    }
}

struct BankQRSmallView: View {
    var entry: SimpleEntry
    var body: some View {
        ZStack {
            RemoteImage(url: entry.user.bankQrUrl, size: 155)
        }
        .containerBackground(.white, for: .widget)
    }
}

struct ContactMediumView: View {
    var entry: SimpleEntry
    var body: some View {
        let user = entry.user
        
        HStack(spacing: 20) {
            QRWithLogo(content: user.vCard, size: 110)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(user.fullName).font(.system(size: 15, weight: .bold)).foregroundColor(.primary)
                Text(user.title).font(.system(size: 11)).foregroundColor(.secondary)
                Text(user.company).font(.system(size: 11, weight: .semibold)).foregroundColor(.blue)
                Divider().padding(.vertical, 4)
                HStack(spacing: 4) {
                    Image(systemName: "phone.fill").font(.system(size: 8))
                    Text(user.formattedPhone).font(.system(size: 10))
                }.foregroundColor(.secondary)
            }
            Spacer()
        }
        .padding(.horizontal, 15)
        .containerBackground(.white, for: .widget)
    }
}

struct BankMediumView: View {
    var entry: SimpleEntry
    var body: some View {
        let user = entry.user
        
        HStack(spacing: 20) {
            RemoteImage(url: user.bankQrUrl, size: 110)
            
            VStack(alignment: .leading, spacing: 4) {
                Text("THANH TOÁN")
                    .font(.system(size: 10, weight: .black))
                    .foregroundColor(.blue)
                    .padding(.bottom, 2)
                
                Text(user.fullName)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.primary)
                
                Text(user.bankDisplayName)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
                
                Text(user.bankAccount ?? "")
                    .font(.system(size: 16, weight: .black))
                    .foregroundColor(.primary)
            }
            Spacer()
        }
        .padding(.horizontal, 15)
        .containerBackground(.white, for: .widget)
    }
}

// MARK: - Helpers

struct QRWithLogo: View {
    let content: String
    let size: CGFloat
    let filter = CIFilter.qrCodeGenerator()
    let context = CIContext()
    
    var body: some View {
        ZStack {
            if let qrImage = generateQRCode(from: content) {
                Image(uiImage: qrImage)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .frame(width: size, height: size)
                
                AppLogoBadge(logo: loadAppLogo(), size: size)
            }
        }
    }
    
    func generateQRCode(from string: String) -> UIImage? {
        let data = Data(string.utf8)
        filter.setValue(data, forKey: "inputMessage")
        filter.setValue("H", forKey: "inputCorrectionLevel")
        if let outputImage = filter.outputImage {
            let transformedImage = outputImage.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
            if let cgImage = context.createCGImage(transformedImage, from: transformedImage.extent) {
                return UIImage(cgImage: cgImage)
            }
        }
        return nil
    }
}

private final class WidgetBundleToken {}

private func loadAppLogo() -> UIImage? {
    let bundles = [Bundle.main, Bundle(for: WidgetBundleToken.self)]
    
    for bundle in bundles {
        if let logo = UIImage(named: "AppLogo", in: bundle, compatibleWith: nil) {
            return logo
        }
        
        if let path = bundle.path(forResource: "AppLogo", ofType: "png"),
           let logo = UIImage(contentsOfFile: path) {
            return logo
        }
    }
    
    return UIImage(named: "AppLogo")
}

struct AppLogoBadge: View {
    let logo: UIImage?
    let size: CGFloat
    
    var body: some View {
        let badgeSize = size * 0.3
        let imageSize = size * 0.23
        
        ZStack {
            RoundedRectangle(cornerRadius: badgeSize * 0.22, style: .continuous)
                .fill(Color.white)
            
            if let logo {
                Image(uiImage: logo)
                    .resizable()
                    .scaledToFit()
                    .frame(width: imageSize, height: imageSize)
                    .clipShape(RoundedRectangle(cornerRadius: imageSize * 0.16, style: .continuous))
            } else {
                Text("MK")
                    .font(.system(size: size * 0.11, weight: .black))
                    .foregroundColor(.blue)
            }
        }
        .frame(width: badgeSize, height: badgeSize)
    }
}

struct RemoteImage: View {
    let url: String?
    let size: CGFloat
    
    var body: some View {
        ZStack {
            if let urlString = url,
               let urlObj = URL(string: urlString),
               let data = try? Data(contentsOf: urlObj),
               let image = UIImage(data: data) {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
            } else {
                VietQrFallback(size: size)
            }
        }
        .frame(width: size, height: size)
    }
}

struct VietQrFallback: View {
    let size: CGFloat
    
    var body: some View {
        VStack(spacing: size * 0.04) {
            Image(systemName: "qrcode")
                .font(.system(size: size * 0.28, weight: .semibold))
            Text("VietQR")
                .font(.system(size: max(10, size * 0.11), weight: .black))
        }
        .foregroundColor(.blue.opacity(0.75))
        .frame(width: size, height: size)
        .background(
            RoundedRectangle(cornerRadius: size * 0.08, style: .continuous)
                .fill(Color.blue.opacity(0.06))
        )
    }
}
