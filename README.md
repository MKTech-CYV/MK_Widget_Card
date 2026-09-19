# MK Widget Card 📇 - Code Your Vision

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Website](https://img.shields.io/badge/Website-mktechvn.com-0A66C2.svg)](https://mktechvn.com)
[![App Store](https://img.shields.io/badge/App%20Store-T%E1%BA%A3i%20v%E1%BB%81-000000?logo=apple&logoColor=white)](https://apps.apple.com/us/app/mk-widget-card-qr-ng%C3%A2n-h%C3%A0ng/id6768935113)
[![Google Play](https://img.shields.io/badge/Google%20Play-T%E1%BA%A3i%20v%E1%BB%81-34A853?logo=googleplay&logoColor=white)](https://play.google.com/store/apps/details?id=com.mktech.widgetcard)

**MK Widget Card** là một giải pháp danh thiếp kỹ thuật số dành cho hệ sinh thái iOS và Android. Ứng dụng cho phép bạn tạo danh thiếp điện tử (eCard) và mã QR ngân hàng, chia sẻ bằng một đường link gọn gàng hoặc mã QR, và đặt ngay lên màn hình chính hay màn hình khóa dưới dạng Widget thông minh, tích hợp thông tin liên lạc (vCard) và thanh toán nhanh (VietQR).

## 📲 Tải ứng dụng

| Nền tảng | Liên kết |
|---|---|
| 🍎 **App Store** (iPhone, iPad) | [MK Widget Card trên App Store](https://apps.apple.com/us/app/mk-widget-card-qr-ng%C3%A2n-h%C3%A0ng/id6768935113) |
| 🤖 **Google Play** (Android) | [MK Widget Card trên Google Play](https://play.google.com/store/apps/details?id=com.mktech.widgetcard) |
| 🌐 **Website** | [mktechvn.com](https://mktechvn.com) |

Website còn là nơi mở các link eCard được chia sẻ (`mktechvn.com/c/...`), trang chính sách quyền riêng tư và điều khoản dịch vụ.

---

## ✨ Tính năng chính

### 📱 Hệ thống Danh thiếp Số (eCard)
- **Mã QR vCard chuẩn:** Chia sẻ Họ tên, Chức danh, Công ty, SĐT và Email chỉ với một lần quét, tự động thêm vào danh bạ điện thoại.
- **Link chia sẻ ngắn gọn:** Mỗi eCard có một đường link dạng `mktechvn.com/c/xxxxxxxx`. Người nhận mở ra thấy đầy đủ thông tin, và luôn được cập nhật khi bạn chỉnh sửa eCard.
- **Trang eCard hiện đại:** Ảnh đại diện, chức danh, phần **Về tôi**, số điện thoại chuẩn quốc tế, liên kết mạng xã hội, nút gọi/nhắn tin nhanh và nút lưu vào danh bạ.
- **Cá nhân hóa Logo:** Nhúng logo hoặc ảnh cá nhân vào trung tâm mã QR.
- **Nhiều mẫu eCard:** Lưu và chuyển đổi giữa các mẫu eCard và QR ngân hàng trong tài khoản.

### 💸 Thanh toán nhanh VietQR
- **Tích hợp VietQR:** Tự động tạo mã QR thanh toán chuẩn NAPAS cho hơn 50 ngân hàng tại Việt Nam.
- **Tiện lợi tối đa:** Người khác chuyển khoản ngay bằng cách quét mã mà không cần nhập số tài khoản.

### 🖼️ Hệ thống Widget 4-trong-1
Tận dụng iOS WidgetKit và Android App Widgets với 4 loại Widget:
1. **QR Liên hệ (Nhỏ):** Mã QR vCard toàn màn hình.
2. **QR Ngân hàng (Nhỏ):** Mã QR VietQR toàn màn hình.
3. **Danh thiếp Ngang (Lớn):** Kết hợp QR Liên hệ và thông tin cá nhân.
4. **Thanh toán Ngang (Lớn):** Kết hợp QR VietQR và thông tin tài khoản.

### 🔐 Tài khoản & đồng bộ
- Đăng nhập bằng **Google**, **Apple** hoặc email; dữ liệu đồng bộ giữa các thiết bị.
- Hoạt động tốt khi mạng chậm hoặc ngoại tuyến: dữ liệu và hình ảnh (avatar, logo) được lưu trên máy.
- Xóa tài khoản và toàn bộ dữ liệu ngay trong ứng dụng.

---

## 🛠️ Công nghệ

- **Ứng dụng:** React Native (Expo SDK 54), cập nhật nhanh bằng EAS Update.
- **Widget:** iOS: Swift (WidgetKit, SwiftUI, CoreImage). Android: Kotlin (AppWidgetProvider, ZXing).
- **Dữ liệu dùng chung với widget:** App Group Container (iOS) và SharedPreferences (Android).
- **Backend:** Firebase (Authentication, Cloud Firestore, Cloud Storage).
- **Website:** Next.js (Vercel), trang quản trị dùng Firebase Auth và Firebase Admin SDK.
- **Quảng cáo:** Google AdMob.

---

## 🚀 Hướng dẫn phát triển

### 📋 Yêu cầu hệ thống
- **macOS** và **Xcode** mới (để build iOS), hoặc Windows/Linux (để build Android).
- **Android Studio** và JDK 17 (để build Android).
- **Node.js 20+** và npm.
- **EAS CLI** (`npm install -g eas-cli`).

### 🛠️ Các bước cài đặt
1. **Clone repo:**
   ```bash
   git clone https://github.com/MKTech-CYV/MK_Widget_Card.git
   cd MK_Widget_Card
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

3. **Chạy trên iOS:**
   ```bash
   npx expo run:ios
   ```

4. **Chạy trên Android:**
   ```bash
   npx expo run:android
   ```

Cấu hình Firebase (`GoogleService-Info.plist`, `google-services.json`) đã có sẵn trong repo; khóa quản trị và thông tin bí mật không được đưa vào git.

---

## 👨‍💻 Tác giả & Liên hệ

**TRẦN MINH KHÔI**
- **Website ứng dụng:** [mktechvn.com](https://mktechvn.com)
- **Website cá nhân:** [tranminhkhoi.dev](https://tranminhkhoi.dev)
- **Email:** [contact@tranminhkhoi.dev](mailto:contact@tranminhkhoi.dev)
- **Hotline:** 0988 20 40 60

Nếu bạn thấy dự án hữu ích, hãy ủng hộ bằng một ⭐️ hoặc mời nhà phát triển một ly cà phê thông qua mục **Donate** trong ứng dụng nhé!

---

## 📄 Giấy phép

Phát hành dưới giấy phép **MIT License**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

*© 2026 MK Widget Card - Code Your Vision.*
