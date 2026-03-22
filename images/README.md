# tenD — Hướng dẫn thêm ảnh

## Ảnh cần chuẩn bị:

### Bắt buộc:
- `og-cover.jpg` — Ảnh preview khi share lên Facebook/Zalo (1200x630px)
- `favicon-32.png` — Icon tab trình duyệt (32x32px)
- `favicon-16.png` — Icon tab nhỏ (16x16px)  
- `apple-touch-icon.png` — Icon iPhone (180x180px)

### Dự án (thay placeholder đen):
- `img-project-ocean-park.jpg` — Ảnh dự án Ocean Park S1 (800x600px trở lên)
- `img-project-smart-city.jpg` — Ảnh dự án Smart City
- `img-project-grand-park.jpg` — Ảnh dự án Grand Park
- `img-project-metropolis.jpg` — Ảnh dự án Metropolis
- `img-project-royal-city.jpg` — Ảnh dự án Royal City
- `img-project-ecopark.jpg` — Ảnh dự án Ecopark
- `img-project-nha-pho.jpg` — Ảnh nhà phố Hai Bà Trưng

### Blog (tùy chọn):
- `img-blog-1.jpg` đến `img-blog-11.jpg` — Ảnh đại diện cho mỗi bài blog

## Cách thêm ảnh vào website:

### Cách 1: Qua GitHub
1. Upload ảnh vào thư mục `images/` trên GitHub
2. Trong file `index.html`, tìm element có `data-img-id="tên-ảnh"`
3. Thêm: `background-image:url('/images/tên-ảnh.jpg');`

### Cách 2: Qua CMS Admin (tend.vn/admin)
1. Vào mục Dự án → chọn dự án → upload ảnh đại diện
2. Ảnh tự động lưu vào thư mục `images/`

## Kích thước khuyến nghị:
- Dự án thumbnail: 800x600px (tỷ lệ 4:3)
- Blog thumbnail: 1200x630px (tỷ lệ 16:9)
- OG Cover: 1200x630px
- Favicon: 32x32px, 16x16px
- Nén ảnh bằng: tinypng.com hoặc squoosh.app
