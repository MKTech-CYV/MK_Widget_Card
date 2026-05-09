# MK Widget Card 📇 - Code Your Vision

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![100% AI Developed](https://img.shields.io/badge/Developed%20with-100%25%20AI-green.svg)](https://tranminhkhoi.dev)
[![Platform: iOS](https://img.shields.io/badge/Platform-iOS-blue.svg)](https://apple.com/ios)
[![Platform: Android](https://img.shields.io/badge/Platform-Android-green.svg)](https://android.com)

**MK Widget Card** là một giải pháp danh thiếp kỹ thuật số đột phá dành cho hệ sinh thái iOS và Android. Dự án cho phép người dùng cá nhân hóa trải nghiệm kết nối thông qua các Widget thông minh trên màn hình chính và màn hình khóa, tích hợp cả thông tin liên lạc (vCard) và thanh toán nhanh (VietQR).

> [!IMPORTANT]
> **100% AI GENERATED:** Toàn bộ dự án này, từ kiến trúc hệ thống, giao diện React Native, mã nguồn Swift Native cho iOS Widget, Kotlin cho Android Widget, cho đến tài liệu này, đều được phát triển hoàn toàn bởi trí tuệ nhân tạo (AI). Đây là minh chứng cho sức mạnh của AI trong việc xây dựng sản phẩm phần mềm thực tế hoàn chỉnh.

---

## ✨ Tính năng chính

### 📱 Hệ thống Danh thiếp Số (eCard)
- **Mã QR vCard Chuẩn:** Chia sẻ thông tin liên hệ bao gồm Họ tên, Chức danh, Công ty, SĐT và Email chỉ với một lần quét. Tự động thêm vào danh bạ điện thoại.
- **Cá nhân hóa Logo:** Nhúng Logo ứng dụng hoặc ảnh cá nhân vào trung tâm mã QR để tăng tính chuyên nghiệp.
- **Quản lý Avatar:** Hỗ trợ tải lên ảnh đại diện, tự động xử lý và hiển thị trên cả App và Widget.

### 💸 Thanh toán nhanh VietQR
- **Tích hợp VietQR API:** Tự động tạo mã QR thanh toán chuẩn NAPAS cho hơn 50 ngân hàng tại Việt Nam (MB, VCB, ICB, TCB, ACB, v.v.).
- **Tiện lợi tối đa:** Cho phép người khác chuyển khoản hoặc nhận diện thông tin ngân hàng của bạn ngay lập tức mà không cần mở ứng dụng ngân hàng.

### 🖼️ Hệ thống Widget 4-trong-1 chuyên nghiệp
Tận dụng tối đa sức mạnh của iOS WidgetKit và Android App Widgets với 4 loại Widget riêng biệt:
1. **QR Liên hệ (Nhỏ):** Mã QR vCard toàn màn hình.
2. **QR Ngân hàng (Nhỏ):** Mã QR VietQR toàn màn hình.
3. **Danh thiếp Ngang (Lớn):** Kết hợp QR Liên hệ và thông tin cá nhân chi tiết.
4. **Thanh toán Ngang (Lớn):** Kết hợp QR VietQR và thông tin số tài khoản.

---

## 🛠️ Công nghệ cốt lõi

- **Frontend Framework:** React Native (Expo SDK 54)
- **Native Extensions:** 
  - **iOS:** Swift (WidgetKit, SwiftUI, CoreImage)
  - **Android:** Kotlin (AppWidgetProvider, ZXing)
- **Dữ liệu dùng chung:** App Group Container (iOS) & SharedPreferences (Android)
- **Thiết kế UI:** Modern iOS/Android Design Language (hỗ trợ 100% Dark Mode & Light Mode)
- **AI Tooling:** Gemini & Claude via Gemini CLI.

---

## 🚀 Hướng dẫn phát triển

### 📋 Yêu cầu hệ thống
- **macOS** (để build iOS) hoặc Windows/Linux (để build Android).
- **Xcode 15.0+** (để build iOS Widget).
- **Android Studio** (để build Android Widget).
- **Node.js 18+** & npm/yarn.
- **EAS CLI** (`npm install -g eas-cli`).

### 🛠️ Các bước cài đặt
1. **Clone Repo:**
   ```bash
   git clone https://github.com/minhkhoi-dev/mk-widget-card.git
   cd mk-widget-card
   ```

2. **Cài đặt Dependencies:**
   ```bash
   npm install
   ```

3. **Chạy trên iOS:**
   ```bash
   npx pod-install
   npx expo run:ios
   ```

4. **Chạy trên Android:**
   ```bash
   npx expo run:android
   ```

---

## 👨‍💻 Tác giả & Liên hệ

**TRAN MINH KHOI**
- **Website:** [tranminhkhoi.dev](https://tranminhkhoi.dev)
- **Email:** [contact@tranminhkhoi.dev](mailto:contact@tranminhkhoi.dev)
- **Hotline:** 0988 20 40 60

Nếu bạn thấy dự án này thú vị hoặc có ích cho cộng đồng, hãy ủng hộ chúng tôi bằng một ⭐️ hoặc mời nhà phát triển một ly cà phê thông qua mục **Donate** trong ứng dụng nhé!

---

## 📄 Giấy phép

Phát hành dưới giấy phép **MIT License**. Xem file `LICENSE` để biết thêm chi tiết.

*© 2026 MK Widget Card - Code Your Vision. Developed by AI.*
