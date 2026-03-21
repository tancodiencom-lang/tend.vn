# tenD — Hướng dẫn cài đặt Sveltia CMS
## Cho phép nhân viên tự đăng bài không cần biết code

---

## Tổng quan

Sau khi cài xong, nhân viên sẽ:
- Vào `tend-vn.netlify.app/admin` → đăng nhập GitHub
- Thấy giao diện quản trị giống WordPress
- Thêm/sửa dự án, blog, thông tin công ty
- Nhấn "Publish" → website tự cập nhật

---

## Bước 1: Tạo GitHub Repository (5 phút)

1. Đăng nhập https://github.com (tạo tài khoản miễn phí nếu chưa có)
2. Nhấn **"New repository"**
3. Đặt tên: `tend-website`
4. Chọn: **Public** (hoặc Private nếu muốn)
5. ✅ Tick "Add a README file"
6. Nhấn **"Create repository"**

### Upload files:
1. Trong repo vừa tạo → nhấn **"Add file" → "Upload files"**
2. Kéo thả toàn bộ nội dung thư mục `tend-cms-deploy/` vào (bao gồm index.html, admin/, data/)
3. Nhấn **"Commit changes"**

---

## Bước 2: Kết nối Netlify với GitHub (3 phút)

1. Vào https://app.netlify.com
2. Nhấn **"Add new site" → "Import an existing project"**
3. Chọn **GitHub** → authorize
4. Chọn repo **tend-website**
5. Settings:
   - Branch: `main`
   - Build command: *(để trống)*
   - Publish directory: `.` (dấu chấm)
6. Nhấn **"Deploy site"**

---

## Bước 3: Setup OAuth Authentication (10 phút)

### Cách A — Dùng GitHub OAuth App (đơn giản nhất):

1. Vào https://github.com/settings/developers
2. Nhấn **"New OAuth App"**
3. Điền:
   - Application name: `tenD CMS`
   - Homepage URL: `https://tend-vn.netlify.app`
   - Authorization callback URL: `https://tend-vn.netlify.app/admin/`
4. Nhấn **"Register application"**
5. Copy **Client ID** và tạo **Client Secret**

### Cách B — Dùng Sveltia CMS Auth (Cloudflare Worker — khuyên dùng):

1. Vào https://github.com/sveltia/sveltia-cms-auth
2. Nhấn nút **"Deploy to Cloudflare"** 
3. Đăng nhập Cloudflare (miễn phí)
4. Điền GitHub OAuth Client ID + Secret
5. Worker sẽ tạo tại: `https://tend-cms-auth.YOUR-SUBDOMAIN.workers.dev`
6. Copy URL này → thay vào `base_url` trong `admin/config.yml`

### Cập nhật config.yml:
```yaml
backend:
  name: github
  repo: YOUR_GITHUB_USERNAME/tend-website  # ← đổi
  branch: main
  base_url: https://tend-cms-auth.YOUR-SUBDOMAIN.workers.dev  # ← đổi
```

---

## Bước 4: Test Admin Panel

1. Truy cập: `https://tend-vn.netlify.app/admin/`
2. Nhấn **"Login with GitHub"**
3. Authorize ứng dụng
4. Bạn sẽ thấy giao diện quản trị với các mục:
   - ⚙️ Cài đặt chung (hotline, email, địa chỉ)
   - 🏠 Dự án (thêm/sửa/xóa dự án)
   - 📝 Blog Chung cư (7 bài hiện có)
   - 📝 Blog Biệt thự (4 bài hiện có)
   - 📄 Nội dung trang (sửa text trang chủ, About)

---

## Cấu trúc thư mục hoàn chỉnh

```
tend-website/
├── index.html              ← Website chính (tất cả 10 trang SPA)
├── admin/
│   ├── index.html          ← Trang quản trị Sveltia CMS
│   └── config.yml          ← Cấu hình collections & fields
├── data/
│   ├── company.json        ← Thông tin công ty
│   ├── homepage.json       ← Nội dung trang chủ
│   └── about.json          ← Nội dung trang Về tenD
├── content/
│   ├── projects/           ← Dự án (mỗi file .md = 1 dự án)
│   └── blog/
│       ├── apartment/      ← Blog chung cư
│       └── villa/          ← Blog biệt thự
├── images/                 ← Ảnh upload qua CMS
├── _redirects              ← Netlify SPA routing
└── _headers                ← Security headers
```

---

## Lộ trình cho 5 website của Quân

### Giai đoạn 1 — Ngay bây giờ (tuần này):
- [x] Website tenD chạy trên Netlify (đã xong)
- [ ] Tạo GitHub repo + upload files
- [ ] Setup OAuth
- [ ] Test admin panel

### Giai đoạn 2 — Vận hành (tháng sau):
- [ ] Nhân viên đăng dự án mới qua /admin
- [ ] Viết blog SEO qua admin panel  
- [ ] Upload ảnh công trình thực tế

### Giai đoạn 3 — Mở rộng:
- [ ] Tạo website tancodien.com (New Roma) cùng cấu trúc
- [ ] Tạo website cho các thương hiệu khác
- [ ] Kết nối domain tenD.vn / newroma.vn

---

## Lưu ý quan trọng

### Sveltia CMS vs Decap CMS (2026):
- ✅ Sveltia CMS: 300KB, active development, v1.0 sắp ra, không phụ thuộc Netlify Identity
- ❌ Decap CMS: 1.5MB, Netlify Identity deprecated 2025, ít được maintain
- ❌ Static CMS: Đã ngừng phát triển

### Về nội dung hiện tại:
Website hiện tại là file HTML tĩnh (index.html). Sveltia CMS quản lý nội dung trong thư mục content/ và data/ dưới dạng Markdown + JSON. 

Để website tự động đọc nội dung từ CMS, cần thêm 1 bước build (dùng 11ty hoặc Hugo). Tuy nhiên, ở giai đoạn đầu, bạn có thể:
1. Dùng CMS để quản lý blog posts và dự án
2. Khi cần cập nhật lên website → export nội dung → tôi (Claude) tích hợp vào file HTML
3. Khi scale lên → chuyển sang static site generator (11ty recommended)

### Cách nhanh nhất hiện tại:
Combo **Cách 1 (Claude sửa) + Cách 2 (tự sửa text nhỏ)** cho thay đổi website.
Sveltia CMS dùng cho **quản lý kho nội dung** (blog, dự án, ảnh) — chuẩn bị cho khi chuyển sang SSG.
