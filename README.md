# MK Widget Card 📇

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![100% AI Developed](https://img.shields.io/badge/Developed%20with-100%25%20AI-green.svg)](https://tranminhkhoi.dev)

**MK Widget Card** là giải pháp danh thiếp kỹ thuật số (eCard) hiện đại dành cho iOS, cho phép bạn chia sẻ thông tin liên lạc và thông tin thanh toán qua mã QR ngay trên màn hình khóa hoặc màn hình chính thông qua hệ thống Widget chuyên nghiệp.

> [!IMPORTANT]
> **Dự án này được phát triển hoàn toàn 100% bằng AI.** Từ kiến trúc hệ thống, mã nguồn React Native, cho đến các logic Swift Native cho iOS Widget và tối ưu hóa UI/UX.

---

## ✨ Tính năng nổi bật

### 📱 Danh thiếp thông minh (eCard)
- **Mã QR vCard chuẩn:** Cho phép người khác quét và lưu danh bạ trực tiếp vào điện thoại chỉ trong vài giây.
- **Tùy biến thông tin:** Cập nhật họ tên, chức danh, công ty, SĐT, Email và ảnh đại diện một cách dễ dàng.
- **Nâng cao nhận diện:** Nhúng Logo ứng dụng hoặc Logo cá nhân vào chính giữa mã QR với độ phân giải cao.

### 💸 Thanh toán nhanh (VietQR)
- **Tích hợp VietQR:** Tự động tạo mã QR thanh toán chuẩn ngân hàng Việt Nam.
- **Hỗ trợ đa ngân hàng:** Hỗ trợ hầu hết các ngân hàng lớn tại Việt Nam (MB, VCB, ICB, TCB, ACB, v.v.).
- **Chuyển khoản tức thì:** Giúp việc nhận tiền hoặc thanh toán trở nên chuyên nghiệp và nhanh chóng hơn bao giờ hết.

### 🖼️ Hệ thống Widget đa dạng (4-in-1)
Ứng dụng cung cấp 4 loại Widget riêng biệt cho iOS:
1. **QR Liên hệ (Nhỏ):** Tập trung tối đa vào mã QR vCard.
2. **QR Ngân hàng (Nhỏ):** Tập trung tối đa vào mã QR thanh toán.
3. **Danh thiếp Ngang (Lớn):** Hiển thị QR Liên hệ kèm thông tin cá nhân chi tiết.
4. **Thanh toán Ngang (Lớn):** Hiển thị QR Ngân hàng kèm thông tin tài khoản (Tên, STK, Ngân hàng).

### 🌓 Chế độ hiển thị
- Hỗ trợ đầy đủ **Dark Mode** và **Light Mode** theo hệ thống.
- Giao diện thiết kế theo ngôn ngữ hiện đại, tinh tế của iOS.

---

## 🛠️ Công nghệ sử dụng

- **Frontend:** React Native (Expo)
- **Native Logic:** Swift (iOS WidgetKit, SwiftUI)
- **Storage:** App Group (Shared container between App and Widget)
- **QR Engine:** CoreImage (Native iOS) & react-native-qrcode-svg
- **AI Tooling:** Developed 100% via Gemini/Claude via Gemini CLI.

---

## 🚀 Hướng dẫn cài đặt (Dành cho nhà phát triển)

### Yêu cầu hệ thống
- macOS với Xcode 15.0+
- Node.js & npm/yarn
- iPhone thật (để trải nghiệm Widget tốt nhất) hoặc Simulator iOS.

### Các bước cài đặt
1. **Clone dự án:**
   ```bash
   git clone https://github.com/minhkhoi-dev/mk-widget-card.git
   cd mk-widget-card
   ```

2. **Cài đặt dependencies:**
   ```bash
   npm install
   npx pod-install
   ```

3. **Chạy ứng dụng:**
   ```bash
   npx expo run:ios
   ```

---

## 📄 Giấy phép

Dự án được phát hành dưới giấy phép **MIT License**. Bạn có toàn quyền sử dụng, sửa đổi và phân phối lại mã nguồn này.

---

## 👨‍💻 Tác giả

**TRAN MINH KHOI**
- Website: [tranminhkhoi.dev](https://tranminhkhoi.dev)
- Email: [contact@tranminhkhoi.dev](mailto:contact@tranminhkhoi.dev)
- Hotline: 0988 20 40 60

Nếu bạn thấy dự án này hữu ích, hãy tặng một ⭐️ trên Github hoặc ủng hộ nhà phát triển thông qua phần **Donate** trực tiếp trong ứng dụng nhé!

---
*© 2026 MK Widget Card - Code Your Vision*
