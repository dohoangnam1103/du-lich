# Địa Điểm Du Lịch — Thiết kế MVP

**Ngày:** 2026-06-15
**Loại sản phẩm:** Web responsive (mở bằng trình duyệt điện thoại, không phải app cài đặt)
**Stack:** Next.js full-stack (frontend + API routes)

## 1. Tổng quan

Web dùng GPS điện thoại để xác định vị trí hiện tại, dùng Google Places API tìm các địa điểm ăn uống / vui chơi quanh đây. Người dùng lọc theo phương tiện di chuyển (đi bộ / xe máy / ô tô) và danh mục. Bổ sung một feed mạng xã hội thu nhỏ cho phép user đăng ảnh/video gắn location, comment và review.

**Phần lõi (A):** Discovery — tìm địa điểm quanh đây. Đây là trái tim sản phẩm, ai cũng dùng được không cần đăng nhập.

**Phần bổ sung (B):** Social feed — giữ chân user. Cần đăng nhập khi tương tác.

## 2. Phạm vi MVP

**Trong phạm vi:**
- GPS → tìm địa điểm quanh đây qua Google Places (gọi từ backend).
- Filter phương tiện theo bán kính cố định, luôn sort gần → xa.
- Chip lọc danh mục: Ăn uống / Cà phê / Vui chơi / Tham quan.
- Màn chi tiết địa điểm: thông tin + rating + review + ảnh từ Google, trộn với nội dung do user đăng.
- Đăng nhập Google OAuth (chỉ bắt buộc khi tương tác).
- Feed social: đăng ảnh/video + gắn location, comment, review (1..5 sao), lưu yêu thích.

**Ngoài phạm vi (để sau):**
- Tính thời gian di chuyển thực (Google Distance Matrix).
- Hiệu ứng refraction / displacement glass xịn (chỉ làm glass cơ bản ở MVP).
- Bản đồ tương tác (MVP dùng list).
- Like cho post.
- Thông báo, follow, nhắn tin.

## 3. Kiến trúc & luồng dữ liệu

```
[Trình duyệt ĐT]
  │  1. xin GPS (navigator.geolocation)
  │  2. gửi {lat, lng, vehicle, category}
  ▼
[Next.js API route]  ← API key Google giấu ở đây
  │  3. map vehicle → bán kính (đi bộ 1km / xe máy 5km / ô tô 15km)
  │  4. gọi Google Places Nearby Search
  │  5. sort gần → xa, trả list địa điểm + place_id
  ▼
[Trình duyệt]  hiển thị list (chip lọc category)
  │  6. bấm 1 địa điểm → xin chi tiết
  ▼
[Next.js API route] → Google Place Details (rating, ~5 review, ảnh)
  │  + query Postgres lấy bài đăng/review của USER cho place_id đó
  ▼
[Trình duyệt] màn chi tiết: thông tin Google + nội dung user
```

### Hai nguồn dữ liệu tách biệt

- **Google (mượn hiển thị, KHÔNG cache/lưu):** rating, review (tối đa ~5/địa điểm), ảnh địa điểm. Gọi tươi mỗi lần, hiển thị kèm attribution (tên tác giả, link Google) theo ToS.
- **DB của mình (lưu thoải mái):** user, bài đăng, comment, review, favorites. Khoá liên kết địa điểm là `place_id` (place_id được phép lưu vĩnh viễn theo ToS).

### Quyết định kỹ thuật then chốt

- **Gọi Google từ backend (Next.js API route), không gọi từ trình duyệt.** Lý do: giấu API key ở server, kiểm soát quota, tránh lạm dụng → tiết kiệm chi phí.
- **Filter phương tiện theo bán kính cố định** (không dùng Distance Matrix). Lý do: rẻ, đơn giản; ô tô đi xa nên bán kính lớn, xe máy vừa, đi bộ nhỏ; luôn sort gần → xa.

### API routes chính

- `GET /api/places/nearby?lat&lng&vehicle&category` — tìm quanh đây.
- `GET /api/places/[placeId]` — chi tiết Google + trộn nội dung user.
- `POST /api/posts`, `GET /api/posts` — feed (đăng cần login).
- `POST /api/comments` — comment (cần login).
- `POST /api/reviews` — review (cần login).
- `POST /api/favorites`, `DELETE /api/favorites/[placeId]` — lưu yêu thích (cần login).

### Map phương tiện → bán kính

| Phương tiện | Bán kính |
|-------------|----------|
| Đi bộ 🚶    | 1 km     |
| Xe máy 🛵   | 5 km     |
| Ô tô 🚗     | 15 km    |

## 4. Data Model (Postgres)

Chỉ lưu dữ liệu của mình; địa điểm Google chỉ giữ `place_id` làm khoá.

```
users
  id            uuid    PK
  google_id     text    unique        -- từ Google OAuth
  display_name  text
  avatar_url    text
  created_at    timestamptz

posts                                  -- bài đăng feed (ảnh/video + location)
  id            uuid    PK
  user_id       uuid    FK → users
  place_id      text                   -- gắn địa điểm Google (nullable: đăng tự do)
  place_name    text                   -- snapshot tên lúc đăng (render feed nhanh)
  caption       text
  lat, lng      double precision       -- toạ độ lúc check-in
  created_at    timestamptz

post_media                             -- nhiều ảnh/video / 1 bài
  id            uuid    PK
  post_id       uuid    FK → posts
  url           text                   -- link file ở object storage
  type          text                   -- 'image' | 'video'
  position      int                    -- thứ tự hiển thị

comments
  id            uuid    PK
  post_id       uuid    FK → posts
  user_id       uuid    FK → users
  body          text
  created_at    timestamptz

reviews                                -- review địa điểm của user (tách khỏi post)
  id            uuid    PK
  user_id       uuid    FK → users
  place_id      text                   -- địa điểm Google
  rating        int                    -- 1..5
  body          text
  created_at    timestamptz
  UNIQUE(user_id, place_id)            -- 1 user 1 review / địa điểm

favorites                              -- lưu yêu thích
  user_id       uuid    FK → users
  place_id      text
  created_at    timestamptz
  PK(user_id, place_id)
```

### Lý do thiết kế

- **`posts` vs `reviews` tách riêng:** post là "khoảnh khắc trải nghiệm" (feed, nhiều media, có thể không chấm điểm); review là "đánh giá có điểm số" gắn địa điểm. Khác mục đích → 2 bảng.
- **`place_name` snapshot:** lưu tên lúc đăng để render feed nhanh, không phải gọi Google cho từng bài. Tên Google đổi thì vẫn còn tên cũ — chấp nhận được cho feed.
- **Media để object storage** (Supabase Storage hoặc S3); DB chỉ giữ URL.

### Lựa chọn hạ tầng DB

- Postgres qua Supabase hoặc Neon (free tier ổn, tích hợp Next.js tốt).
- Supabase tiện vì có sẵn Storage cho media + Auth, nhưng quyết định cuối ở giai đoạn lập kế hoạch.

## 5. Màn hình & UX (MVP)

1. **Discovery (màn chính):** thanh phương tiện (🚶 / 🛵 / 🚗), chip lọc danh mục (Ăn uống / Cà phê / Vui chơi / Tham quan), list địa điểm sắp gần → xa kèm khoảng cách + rating Google.
2. **Chi tiết địa điểm:** ảnh + rating + review từ Google (có attribution); nút Lưu yêu thích / Viết review; danh sách bài đăng cộng đồng cho địa điểm đó (từ DB).
3. **Feed:** lưới bài đăng ảnh/video gắn location của cộng đồng; lướt xuống xem; bấm vào bài → chi tiết + comment.

MVP dùng **list** (không bản đồ tương tác).

## 6. Hướng thiết kế UI

**Glassmorphism kiểu iOS 26 (liquid glass):** nền mờ blur, lớp kính trong suốt, bo góc lớn, viền sáng gradient, đổ bóng mềm.

- **MVP:** glass "tốt vừa đủ" bằng `backdrop-filter: blur()` + transparency + viền sáng gradient. Đảm bảo mượt trên điện thoại.
- **Để sau (polish):** hiệu ứng khúc xạ / bẻ cong ánh sáng thật (SVG filter + displacement) — nặng trên máy yếu nên không làm ở MVP.

## 7. Bảo mật & tuân thủ

- **API key Google:** chỉ ở server (env var), không bao giờ gửi xuống client.
- **Google ToS:** không cache/lưu review hay ảnh Google; hiển thị tươi kèm attribution; chỉ lưu `place_id`.
- **Auth:** Google OAuth; các route ghi (POST/DELETE) yêu cầu session hợp lệ.
- **GPS:** xin quyền qua trình duyệt; nếu user từ chối → fallback (nhập địa chỉ thủ công hoặc thông báo cần quyền vị trí).

## 8. Câu hỏi mở cho giai đoạn lập kế hoạch

- Chọn Supabase hay Neon + S3 cho media.
- Thư viện UI / cách tổ chức component cho glass effect.
- Xử lý phân trang feed và nearby (infinite scroll vs nút "tải thêm").
