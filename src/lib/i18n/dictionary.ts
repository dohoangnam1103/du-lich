export type Lang = "vi" | "en";

export const LANGS: Lang[] = ["vi", "en"];
export const DEFAULT_LANG: Lang = "vi";

// Flat key -> per-language string. Vietnamese is the source language.
export const dict: Record<string, Record<Lang, string>> = {
  // Brand / header
  "brand.title": { vi: "Địa Điểm Du Lịch", en: "Travel Spots" },
  "brand.tagline": { vi: "Khám phá quanh đây", en: "Discover nearby" },

  // Bottom nav
  "nav.discover": { vi: "Khám phá", en: "Discover" },
  "nav.feed": { vi: "Bảng tin", en: "Feed" },
  "nav.post": { vi: "Đăng", en: "Post" },
  "nav.collections": { vi: "Lịch trình", en: "Trips" },
  "nav.saved": { vi: "Đã lưu", en: "Saved" },

  // Auth
  "auth.login": { vi: "Đăng nhập", en: "Sign in" },
  "auth.loginGoogle": { vi: "Đăng nhập Google", en: "Sign in with Google" },
  "auth.logout": { vi: "Thoát", en: "Sign out" },

  // Common
  "common.loading": { vi: "Đang tải…", en: "Loading…" },
  "common.searching": { vi: "Đang tìm…", en: "Searching…" },
  "common.save": { vi: "Lưu", en: "Save" },
  "common.cancel": { vi: "Huỷ", en: "Cancel" },
  "common.send": { vi: "Gửi", en: "Send" },
  "common.back": { vi: "← Quay lại", en: "← Back" },
  "common.viewDetail": { vi: "Xem chi tiết →", en: "View details →" },
  "common.share": { vi: "🔗 Chia sẻ", en: "🔗 Share" },
  "common.shared": { vi: "✓ Đã sao chép", en: "✓ Copied" },

  // Home / discovery
  "home.title": { vi: "Quanh đây", en: "Nearby" },
  "home.searchArea": { vi: "Tìm khu vực (vd: Đà Lạt, Hội An)…", en: "Search an area (e.g. Da Lat, Hoi An)…" },
  "home.viewingAround": { vi: "Đang xem quanh:", en: "Viewing around:" },
  "home.searchName": { vi: "🔍 Tìm địa điểm theo tên (vd: Highlands, Phở Hòa)…", en: "🔍 Search places by name…" },
  "home.openNow": { vi: "🕒 Đang mở", en: "🕒 Open now" },
  "home.hasPhoto": { vi: "🖼️ Có ảnh", en: "🖼️ Has photo" },
  "home.sortRating": { vi: "⭐ Theo đánh giá", en: "⭐ By rating" },
  "home.sortDistance": { vi: "↕️ Theo khoảng cách", en: "↕️ By distance" },
  "home.viewList": { vi: "📋 Danh sách", en: "📋 List" },
  "home.viewMap": { vi: "🗺️ Bản đồ", en: "🗺️ Map" },
  "home.popular": { vi: "🔥 Phổ biến trong cộng đồng", en: "🔥 Popular in the community" },
  "home.recent": { vi: "Xem gần đây", en: "Recently viewed" },
  "home.geoUnsupported": { vi: "Trình duyệt không hỗ trợ định vị. Hãy tìm theo khu vực bên dưới.", en: "Your browser doesn't support geolocation. Search an area below." },
  "home.locating": { vi: "Đang định vị bạn…", en: "Locating you…" },
  "home.geoDenied": { vi: "Chưa có quyền vị trí. Bạn vẫn có thể tìm theo tên khu vực bên dưới.", en: "Location permission denied. You can still search by area below." },
  "home.geoDeniedShort": { vi: "Chưa có quyền vị trí.", en: "Location permission denied." },
  "home.expanded": { vi: "Không có kết quả gần bạn nên đã mở rộng phạm vi tìm kiếm đến", en: "No results nearby, so the search radius was widened to" },
  "home.emptyFilter": { vi: "Không có địa điểm nào khớp bộ lọc. Thử tắt bớt bộ lọc.", en: "No places match the filters. Try removing some filters." },
  "home.emptyRadius": { vi: "Không tìm thấy địa điểm nào trong bán kính", en: "No places found within" },
  "home.emptySearch": { vi: "Không tìm thấy địa điểm nào khớp", en: "No places match" },

  // Vehicle
  "vehicle.walk": { vi: "Đi bộ", en: "Walk" },
  "vehicle.motorbike": { vi: "Xe máy", en: "Motorbike" },
  "vehicle.car": { vi: "Ô tô", en: "Car" },

  // Category
  "cat.food": { vi: "Ăn uống", en: "Food" },
  "cat.cafe": { vi: "Cà phê", en: "Cafe" },
  "cat.fun": { vi: "Vui chơi", en: "Fun" },
  "cat.sightseeing": { vi: "Tham quan", en: "Sightseeing" },
  "cat.hotel": { vi: "Khách sạn", en: "Hotel" },
  "cat.atm": { vi: "ATM", en: "ATM" },
  "cat.fuel": { vi: "Cây xăng", en: "Fuel" },
  "cat.health": { vi: "Y tế", en: "Health" },
  "cat.shopping": { vi: "Mua sắm", en: "Shopping" },

  // Place detail
  "place.openNow": { vi: "Đang mở cửa", en: "Open now" },
  "place.closed": { vi: "Đã đóng cửa", en: "Closed" },
  "place.reviewsCount": { vi: "review cộng đồng", en: "community reviews" },
  "place.save": { vi: "🤍 Lưu địa điểm", en: "🤍 Save place" },
  "place.saved": { vi: "❤️ Đã lưu", en: "❤️ Saved" },
  "place.addToTrip": { vi: "🗺️ Thêm vào lịch trình", en: "🗺️ Add to trip" },
  "place.addedToTrip": { vi: "Đã thêm vào lịch trình ✓", en: "Added to trip ✓" },
  "place.addFailed": { vi: "Không thêm được", en: "Couldn't add" },
  "place.directions": { vi: "🧭 Chỉ đường", en: "🧭 Directions" },
  "place.writeReview": { vi: "Viết review", en: "Write a review" },
  "place.similar": { vi: "Địa điểm tương tự gần đây", en: "Similar places nearby" },
  "place.communityReviews": { vi: "Review cộng đồng", en: "Community reviews" },
  "place.communityPosts": { vi: "Bài đăng cộng đồng", en: "Community posts" },
  "place.noReviews": { vi: "Chưa có review nào.", en: "No reviews yet." },
  "place.noPosts": { vi: "Chưa có bài đăng nào.", en: "No posts yet." },
  "place.notFound": { vi: "Không tải được thông tin địa điểm.", en: "Couldn't load place details." },
  "place.source": { vi: "Nguồn: Wikipedia ↗", en: "Source: Wikipedia ↗" },
  "place.newTrip": { vi: "Lịch trình mới…", en: "New trip…" },
  "place.noTripYet": { vi: "Chưa có lịch trình. Tạo mới bên dưới.", en: "No trips yet. Create one below." },

  // Review form
  "review.placeholder": { vi: "Cảm nhận của bạn (tùy chọn)", en: "Your thoughts (optional)" },
  "review.addPhoto": { vi: "+ Thêm ảnh", en: "+ Add photo" },
  "review.uploading": { vi: "Đang tải lên...", en: "Uploading..." },
  "review.submit": { vi: "Gửi review", en: "Submit review" },
  "review.submitting": { vi: "Đang gửi...", en: "Submitting..." },
  "review.pickStars": { vi: "Chọn số sao (1–5)", en: "Pick a rating (1–5)" },
  "review.failed": { vi: "Gửi review thất bại", en: "Failed to submit review" },
  "review.deleteConfirm": { vi: "Xoá review này?", en: "Delete this review?" },

  // Feed
  "feed.title": { vi: "Bảng tin", en: "Feed" },
  "feed.all": { vi: "Tất cả", en: "All" },
  "feed.following": { vi: "Đang theo dõi", en: "Following" },
  "feed.emptyAll": { vi: "Chưa có bài viết nào. Hãy là người đầu tiên chia sẻ!", en: "No posts yet. Be the first to share!" },
  "feed.emptyFollowing": { vi: "Chưa có bài viết từ những người bạn theo dõi.", en: "No posts from people you follow yet." },

  // Post card / comments
  "post.like": { vi: "Thích", en: "Like" },
  "post.comment": { vi: "Viết bình luận...", en: "Write a comment..." },
  "post.commentLogin": { vi: "Đăng nhập để bình luận", en: "Sign in to comment" },
  "post.anon": { vi: "Ẩn danh", en: "Anonymous" },
  "post.deleteConfirm": { vi: "Xoá bài đăng này?", en: "Delete this post?" },

  // New post
  "newpost.title": { vi: "Đăng bài mới", en: "New post" },
  "newpost.loginPrompt": { vi: "Đăng nhập để chia sẻ chuyến đi của bạn.", en: "Sign in to share your trip." },
  "newpost.addMedia": { vi: "+ Thêm ảnh / video", en: "+ Add photo / video" },
  "newpost.caption": { vi: "Bạn đang đi chơi ở đâu?", en: "Where are you exploring?" },
  "newpost.placeName": { vi: "Tên địa điểm (tùy chọn)", en: "Place name (optional)" },
  "newpost.attachLocation": { vi: "📍 Gắn vị trí hiện tại", en: "📍 Attach current location" },
  "newpost.publish": { vi: "Đăng bài", en: "Publish" },
  "newpost.publishing": { vi: "Đang đăng...", en: "Publishing..." },

  // Favorites
  "fav.title": { vi: "Đã lưu", en: "Saved" },
  "fav.loginPrompt": { vi: "Đăng nhập để xem các địa điểm đã lưu.", en: "Sign in to see your saved places." },
  "fav.empty": { vi: "Chưa có địa điểm nào được lưu. Bấm 🤍 ở trang chi tiết để lưu.", en: "No saved places yet. Tap 🤍 on a place to save it." },
  "fav.savedPlace": { vi: "Địa điểm đã lưu", en: "Saved place" },

  // Collections
  "col.title": { vi: "Lịch trình", en: "Trips" },
  "col.loginPrompt": { vi: "Đăng nhập để tạo và quản lý lịch trình.", en: "Sign in to create and manage trips." },
  "col.namePlaceholder": { vi: "Tên lịch trình (vd: Đà Nẵng 3 ngày)", en: "Trip name (e.g. 3 days in Da Nang)" },
  "col.create": { vi: "Tạo", en: "Create" },
  "col.empty": { vi: "Chưa có lịch trình nào. Tạo một cái ở trên nhé.", en: "No trips yet. Create one above." },
  "col.places": { vi: "địa điểm", en: "places" },
  "col.fallback": { vi: "Lịch trình", en: "Trip" },
  "col.emptyItems": { vi: "Chưa có địa điểm. Mở một địa điểm và bấm “Thêm vào lịch trình”.", en: "No places yet. Open a place and tap “Add to trip”." },
  "col.buildRoute": { vi: "🧭 Tính lộ trình", en: "🧭 Build route" },
  "col.optimize": { vi: "✨ Tối ưu thứ tự", en: "✨ Optimize order" },
  "col.routing": { vi: "Đang tính…", en: "Calculating…" },
  "col.routeError": { vi: "Không tạo được lộ trình.", en: "Couldn't build the route." },
  "col.total": { vi: "Tổng:", en: "Total:" },
  "col.shareDesc": { vi: "Lịch trình chia sẻ", en: "Shared trip" },
  "col.exploreMore": { vi: "Khám phá địa điểm khác", en: "Explore more places" },
  "col.notFound": { vi: "Không tìm thấy lịch trình.", en: "Trip not found." },

  // Profile
  "profile.posts": { vi: "bài đăng", en: "posts" },
  "profile.reviews": { vi: "review", en: "reviews" },
  "profile.followers": { vi: "người theo dõi", en: "followers" },
  "profile.followingCount": { vi: "Đang theo dõi", en: "Following" },
  "profile.postsTitle": { vi: "Bài đăng", en: "Posts" },
  "profile.edit": { vi: "✏️ Sửa hồ sơ", en: "✏️ Edit profile" },
  "profile.displayName": { vi: "Tên hiển thị", en: "Display name" },
  "profile.follow": { vi: "+ Theo dõi", en: "+ Follow" },
  "profile.following": { vi: "✓ Đang theo dõi", en: "✓ Following" },
  "profile.notFound": { vi: "Không tìm thấy người dùng.", en: "User not found." },
  "profile.user": { vi: "Người dùng", en: "User" },

  // Notifications
  "notif.title": { vi: "Thông báo", en: "Notifications" },
  "notif.loginPrompt": { vi: "Đăng nhập để xem thông báo.", en: "Sign in to see notifications." },
  "notif.empty": { vi: "Chưa có thông báo nào.", en: "No notifications yet." },
  "notif.like": { vi: "đã thích bài đăng của bạn", en: "liked your post" },
  "notif.comment": { vi: "đã bình luận bài đăng của bạn", en: "commented on your post" },
  "notif.follow": { vi: "đã theo dõi bạn", en: "followed you" },
  "notif.someone": { vi: "Ai đó", en: "Someone" },
};
