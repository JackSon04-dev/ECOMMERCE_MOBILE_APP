// ============================================================ //
// LANGUAGE FILE — S-Shop Portfolio                             //
// Supported: 'vi' (Vietnamese) | 'en' (English)               //
// ============================================================ //

const LANG = {

  // ─── PAGE META ────────────────────────────────────────────
  vi: {
    page_title: 'S-Shop | Kiến Trúc Hệ Thống — clothesstores.app',
    page_desc: 'Sơ đồ kiến trúc tương tác của nền tảng E-Commerce S-Shop triển khai trên AWS EC2 với Docker, Nginx và đầy đủ microservices stack.',

    // ─── HEADER ──────────────────────────────────────────────
    badge: 'Production Architecture',
    header_title_plain: 'Kiến trúc ',
    header_title_gradient: 'S-Shop Platform',
    header_subtitle: 'Sơ đồ triển khai toàn bộ hệ thống E-Commerce trên AWS EC2 với Docker Compose — từ domain <strong>clothesstores.app</strong> đến từng service bên trong container.',
    hint_click: 'Click xem chi tiết 3D',
    hint_drag: 'Kéo thả module di chuyển tự do',
    reset_btn: 'Reset vị trí',

    // ─── METRICS ─────────────────────────────────────────────
    metric_containers_label: 'Docker Containers',
    metric_schemas_label: 'Mongoose Schemas',
    metric_queues_label: 'RabbitMQ Queues',
    metric_services_label: 'Express Core MVC',
    metric_apps_label: 'Flutter & Vue 3',
    metric_domain_label: 'AWS EC2 · HSTS',

    // ─── FOOTER ──────────────────────────────────────────────
    footer_text: 'Built by <strong>Ngọc Sơn</strong> &nbsp;|&nbsp; Full-Stack E-Commerce Platform &nbsp;|&nbsp; 2024',

    // ─── LOADER ──────────────────────────────────────────────
    loader_hint: 'Loading architecture...',

    // ─── DEPLOY WIDGET ───────────────────────────────────────
    deploy_title: '🚀 Deployment & Infrastructure',
    deploy_subtitle: 'AWS EC2 · Docker Compose · Nginx SSL · Let\'s Encrypt · 6 Containers',

    deploy_s1_title: 'Mobile App Build (APK) & Keystore',
    deploy_s1_item1_title: 'Tạo Keystore (Khóa bí mật):',
    deploy_s1_item1_desc: 'Trước khi build ứng dụng Flutter, phải tạo một Keystore để làm khóa bí mật. Khóa này đảm bảo tính xác thực cho app và bắt buộc phải lưu trữ cẩn thận để có quyền phát hành các bản cập nhật (updates) của app sau này.',
    deploy_s1_item2_title: 'Build APK Release:',
    deploy_s1_item2_desc: 'Cấu hình file build để liên kết với Keystore, sau đó chạy lệnh build xuất ra file cài đặt <span class="bw-tag">.apk</span> tối ưu dung lượng để cài đặt trực tiếp trên thiết bị Android.',

    deploy_s2_title: 'AWS EC2, Docker & HTTPS SSL',
    deploy_s2_item1_title: 'Thiết lập AWS EC2 & Domain:',
    deploy_s2_item1_desc: 'Khởi tạo Instance EC2 trên AWS tại khu vực Singapore (ap-southeast-1). Lấy IPv4 Public của VPS dán vào DNS Namecheap cho domain <span class="bw-tag">clothesstores.app</span> và SSH vào VPS để Git Clone source code.',
    deploy_s2_item2_title: 'Cấu hình SSL (Let\'s Encrypt):',
    deploy_s2_item2_desc: 'SSH lại vào VPS, tải một số công cụ để cấu hình HTTPS và trích xuất chứng chỉ SSL. Nhận được 2 key quan trọng để liên kết vào Nginx:<br><code style="font-size: 0.8em; color: var(--green); display: block; margin-top: 5px;">ssl_certificate /etc/letsencrypt/live/clothesstores.app/fullchain.pem;</code><code style="font-size: 0.8em; color: var(--green); display: block;">ssl_certificate_key /etc/letsencrypt/live/clothesstores.app/privkey.pem;</code>',
    deploy_s2_item3_title: 'Docker Compose (6 Containers):',
    deploy_s2_item3_desc: 'Hệ thống được chia làm 6 containers (Redis, RabbitMQ, Backend API, Background Worker, Cron Job, Admin Web). Khi chạy ở môi trường Local, hệ thống chỉ chạy HTTP ở Port 80. Khi deploy lên VPS, Nginx được mount volume chứa SSL và mở ra Port 443 (HTTPS) an toàn.',
    deploy_s2_item4_title: 'Cấu hình Nginx (Force HTTPS):',
    deploy_s2_item4_desc: 'File <code>nginx.conf</code> cấu hình lắng nghe cả port 80 (HTTP) và 443 (HTTPS). Nếu user truy cập qua cổng 80, Nginx lập tức bắt buộc chuyển hướng qua 443 (<code>return 301 https://$host$request_uri;</code>) để đảm bảo security. Mọi request tới <code>/api</code> được <code>proxy_pass</code> đẩy ngầm xuống container backend nội bộ cùng header <code>X-Real-IP</code>.',

    deploy_s3_title: 'MongoDB Atlas Cloud Database',
    deploy_s3_item1_title: 'Triển khai MongoDB Atlas (Low Latency):',
    deploy_s3_item1_desc: 'Khởi tạo Cluster cơ sở dữ liệu trên MongoDB Atlas. Điểm mấu chốt là chọn <strong>cùng Region Singapore</strong> với máy chủ AWS EC2. Tư duy thiết kế Global này giúp khoảng cách vật lý giữa API và Database gần như bằng 0, tối ưu hóa triệt để độ trễ mạng khi các service giao tiếp nội bộ.',

    // ─── BACKEND WIDGET ──────────────────────────────────────
    backend_title: '⚙️ Backend Module Overview',
    backend_subtitle: 'Node.js · Express.js · MVC · 11 Services · 8 Schemas',

    backend_s1_title: 'Layered Architecture',
    backend_s2_title: 'Security',
    backend_s2_item1_title: 'Authentication & Authorization:',
    backend_s2_item1_desc: 'JWT Access Token, Refresh Token, Google OAuth, Role-Based Access Control.',
    backend_s2_item2_title: 'Validation:',
    backend_s2_item2_desc: 'Tích hợp Joi Validation ở tầng HTTP request và payload từ client trước khi xử lí — tránh request rác.',
    backend_s2_item3_title: 'Centralized Error Handler:',
    backend_s2_item3_desc: 'Hệ thống xử lý lỗi tập trung tự phân loại lỗi, trả JSON chuẩn format. Kết hợp <span class="bw-tag">asyncHandler</span> loại bỏ toàn bộ try-catch lặp lại trong mọi controller.',

    backend_s3_title: 'Improving Performance',
    backend_s3_item1_title: 'Response Compression:',
    backend_s3_item1_desc: 'Toàn bộ phản hồi nén Gzip. Giảm kích thước từ <span class="bw-tag">23KB → 1.5KB</span> với 20 object sản phẩm/request.',
    backend_s3_item2_title: 'Redis Caching:',
    backend_s3_item2_desc: 'Lưu đệm dữ liệu thường xuyên (danh sách sản phẩm, bộ lọc). Giảm thời gian phản hồi từ <span class="bw-tag">130ms → 60ms</span> khi cache hit.',
    backend_s3_item3_title: 'MongoDB Indexing:',
    backend_s3_item3_desc: 'Tạo Indexes cho các trường hay truy vấn để tăng hiệu năng.',
    backend_s3_item4_title: 'Full-text Search & Autocomplete:',
    backend_s3_item4_desc: 'Atlas Search Index với logic AND + Autocomplete Index riêng cho gợi ý real-time khi gõ.',
    backend_s3_item5_title: 'Keyset Pagination:',
    backend_s3_item5_desc: 'Cursor-based dùng <span class="bw-tag">lastId</span> thay skip/limit. Hiệu năng ổn định khi dữ liệu lớn.',

    backend_s4_title: 'Scalability & High Availability',
    backend_s4_item1_title: 'Message Queue (RabbitMQ):',
    backend_s4_item1_desc: 'Đẩy tác vụ nặng vào queue — Worker xử lý riêng, giải phóng main server. Hạn chế mất dữ liệu khi server dừng đột ngột.',
    backend_s4_item2_title: 'ACID Transaction - Atomic-Guarantee + Retry:',
    backend_s4_item2_desc: 'Logic đặt/hủy hàng bọc trong MongoDB Transaction với <span class="bw-tag">withRetry</span> tự động retry khi WriteConflict. Tránh oversell, tự động rollback.',
    backend_s4_item3_title: 'Rate Limiter Redis:',
    backend_s4_item3_desc: 'Giới hạn request cho API thông thường và API nhạy cảm (Login, Register). Redis caching tối ưu đọc dữ liệu.',
    backend_s4_item4_title: 'Cron Job:',
    backend_s4_item4_desc: 'Mỗi 15 phút quét đơn hàng PayOS chưa thanh toán sau 30 phút → đẩy lệnh hủy vào RabbitMQ.',
    backend_s4_item5_title: 'Cache Stampede Prevention:',
    backend_s4_item5_desc: 'Cơ chế khóa tạm đảm bảo duy nhất 1 request truy vấn DB khi cache hết hạn — tránh hàng trăm request đồng thời đánh DB.',
    backend_s4_item6_title: 'TTL Auto-Cleanup:',
    backend_s4_item6_desc: 'Thông báo tự xóa sau 30 ngày bằng MongoDB TTL Index <span class="bw-tag">expireAfterSeconds</span> — không cần cron dọn dẹp.',

    backend_s5_title: 'Additional Features',
    backend_s5_item1_title: 'AI Chatbot (Gemini API):',
    backend_s5_item1_desc: 'Phân tích câu hỏi tự nhiên thành bộ filter MongoDB. Kết quả cache theo filter — nhiều user hỏi giống nhau share 1 cache.',
    backend_s5_item2_title: 'PayOS VietQR:',
    backend_s5_item2_desc: 'Tạo QR code thanh toán + xác thực webhook HMAC. Return URL không update DB (bảo mật), chỉ Webhook đã verify mới cập nhật.',
    backend_s5_item3_title: 'Firebase Push Notification:',
    backend_s5_item3_desc: 'FCM tokens request lên GCP, tùy chỉnh hình ảnh, nội dung, âm thanh. Broadcast chia chunk 400 token → RabbitMQ xử lý async.',
    backend_s5_item4_title: 'Cart Stock Validation:',
    backend_s5_item4_desc: 'Giỏ hàng tự kiểm tra tồn kho thật mỗi lần mở, tự điều chỉnh số lượng hoặc xóa sản phẩm đã gỡ.',
    backend_s5_item5_title: 'Cloudinary Auto-Resize:',
    backend_s5_item5_desc: 'Upload ảnh sản phẩm tự resize <span class="bw-tag">500×500</span>, ảnh review <span class="bw-tag">800×800</span> — giảm bandwidth cho mobile.',
    backend_s5_item6_title: 'Google Login OAuth:',
    backend_s5_item6_desc: 'Xác thực Google Auth token từ client gửi lên bằng <span class="bw-tag">google-auth-library</span>. Tự động cấp cặp JWT Access/Refresh Token nội bộ và quản lý phiên đăng nhập thống nhất.',

    // ─── MOBILE WIDGET ───────────────────────────────────────
    mobile_title: '📱 Mobile App UI Overview',
    mobile_subtitle: 'Flutter · Dart · Riverpod · 12 Services · 7 Models · 20+ Screens',

    mobile_s1_title: 'Product & Business Layer',
    mobile_s1_item1_title: 'Mục tiêu sản phẩm:',
    mobile_s1_item1_desc: 'Ứng dụng thương mại điện tử chuyên biệt ngành hàng thời trang, cung cấp trải nghiệm mua sắm mượt mà từ khâu tìm kiếm đến thanh toán.',
    mobile_s1_item2_title: 'Tính năng cốt lõi:',
    mobile_s1_item2_desc: 'Duyệt sản phẩm với biến thể (Màu sắc/Kích cỡ), quản lý giỏ hàng tự động đồng bộ, theo dõi trạng thái đơn hàng thời gian thực.',
    mobile_s1_item3_title: 'Điểm chạm thông minh:',
    mobile_s1_item3_desc: 'Tích hợp AI Chatbot (Gemini) hỗ trợ tư vấn sản phẩm, thanh toán không chạm (QR Code/Webview) và hệ thống thông báo đẩy (FCM) để giữ chân khách hàng.',

    mobile_s2_title: 'Architecture & State Management',
    mobile_s2_item1_title: 'Kiến trúc MVC (Model-View-Controller):',
    mobile_s2_item1_desc: 'Ứng dụng tổ chức mã nguồn theo mô hình MVC. <span class="bw-tag">Model</span> (thư mục models) xử lý cấu trúc dữ liệu, <span class="bw-tag">View</span> (screens/widgets) đảm nhận UI, và <span class="bw-tag">Controller</span> (providers/services) làm trung gian xử lý nghiệp vụ và quản lý trạng thái.',
    mobile_s2_item2_title: 'State Management (Riverpod):',
    mobile_s2_item2_desc: 'Dùng <span class="bw-tag">flutter_riverpod</span> làm nòng cốt để quản lý state phức tạp, tính đồng bộ cao (Giỏ hàng, Đơn hàng, Xác thực), tách biệt hoàn toàn Business Logic khỏi UI.',
    mobile_s2_item3_title: 'Smart Routing & Interceptors:',
    mobile_s2_item3_desc: 'Quản lý hơn 20 màn hình qua Named Route Generator. Kết hợp class <span class="bw-tag">AuthGuard</span> tự động chặn các thao tác cần quyền (mua hàng, đánh giá), bung popup Đăng nhập và tự động thực thi lại thao tác đang dang dở sau khi đăng nhập thành công.',

    mobile_s3_title: 'User Interface & User Experience',
    mobile_s3_item1_title: 'Tính nhất quán (Consistency):',
    mobile_s3_item1_desc: 'Bọc các màn hình bằng <span class="bw-tag">CustomAppBar</span> và <span class="bw-tag">BottomNavBar</span> đóng gói sẵn, chặn triệt để lỗi giật/xô lệch layout (layout shift) khi chuyển Tab.',
    mobile_s3_item2_title: 'Hệ thống Reusable Widgets:',
    mobile_s3_item2_desc: 'Đóng gói các UI độc lập như ProductCardWidget, ChatbotWidget, và các Bottom Sheet tùy chỉnh (AddToCartBottomSheet, SizeGuideSheet).',
    mobile_s3_item3_title: 'Trải nghiệm Tìm kiếm (Search UI):',
    mobile_s3_item3_desc: 'Tính năng Autocomplete gọi API qua cơ chế Debounce 300ms, kết hợp hiển thị lịch sử tìm kiếm tối ưu hóa luồng gõ phím.',

    mobile_s4_title: 'API & Network Integration',
    mobile_s4_item1_title: 'Auto-Refresh Token & Race Condition Lock:',
    mobile_s4_item1_desc: 'Tự động bắt lỗi HTTP 401. Dùng <span class="bw-tag">Completer&lt;bool&gt;</span> để khóa (lock) tiến trình Refresh Token — đảm bảo dù có 10 request cùng lỗi 401, API cấp lại token cũng chỉ gọi 1 lần duy nhất.',
    mobile_s4_item2_title: 'Cổng thanh toán & Background Polling:',
    mobile_s4_item2_desc: 'Tích hợp VNPay, ZaloPay (qua Webview) và PayOS VietQR (vẽ mã QR bằng <span class="bw-tag">qr_flutter</span>). Xây dựng luồng Polling API quét trạng thái đơn hàng mỗi 5 giây, kết hợp WidgetsBindingObserver để tự động kiểm tra ngay khi user chuyển từ App ngân hàng trở về App.',
    mobile_s4_item3_title: 'Centralized API Service:',
    mobile_s4_item3_desc: 'Quy tụ toàn bộ method GET/POST/PUT/DELETE vào <span class="bw-tag">ApiService</span> xử lý Header Authorization và JSON Deserialization tự động.',

    mobile_s5_title: 'Local Storage & Security',
    mobile_s5_item1_title: 'Bảo mật Token:',
    mobile_s5_item1_desc: 'Mã hóa accessToken và refreshToken thông qua <span class="bw-tag">flutter_secure_storage</span>.',
    mobile_s5_item2_title: 'Lưu trữ bộ đệm (Caching):',
    mobile_s5_item2_desc: 'Tận dụng <span class="bw-tag">shared_preferences</span> lưu dữ liệu ít nhạy cảm như Search History và dữ liệu giỏ hàng chưa đồng bộ.',
    mobile_s5_item3_title: 'Bảo mật Xác thực:',
    mobile_s5_item3_desc: 'Tích hợp Google Sign-In, kết nối luồng cấp phát JWT an toàn phía Backend.',

    mobile_s6_title: 'Performance Optimization',
    mobile_s6_item1_title: 'Optimistic Update & Debounce Sync (Cart):',
    mobile_s6_item1_desc: 'Giỏ hàng tách làm 2 lớp: UI và API. Tăng/giảm số lượng lập tức hiển thị trên UI. Đợi 5 giây không thao tác mới gộp (batching) các thay đổi gửi lên MongoDB, giảm 80% lưu lượng API dư thừa.',
    mobile_s6_item2_title: 'Lazy Loading (Infinite Scrolling):',
    mobile_s6_item2_desc: 'Quản lý list dài mượt mà bằng <span class="bw-tag">ScrollPaginationMixin</span>. Tự động gọi API tải thêm dữ liệu khi user cuộn chạm ngưỡng 90% màn hình.',
    mobile_s6_item3_title: 'Client-Side Stock Validation:',
    mobile_s6_item3_desc: 'Tải kèm biến thể (Variants) ngay trong Object Product. Bắt lỗi hết hàng ngay trên UI thiết bị thay vì chờ Server trả về lỗi.',
    mobile_s6_item4_title: 'Quản lý Hàng đợi Thông báo:',
    mobile_s6_item4_desc: 'Lưu trữ Firebase Message vào pending queue khi app ở trạng thái bị tắt hoàn toàn (Terminated state), nhấn vào tự điều hướng tới thông báo đó hoặc vào chi tiết đơn hàng tùy loại thông báo.',

    // ─── ADMIN WIDGET ─────────────────────────────────────────
    admin_title: '💻 Admin Dashboard UI Overview',
    admin_subtitle: 'Vue 3 · Vite · Axios · Composition API · 14 Views · Lazy Loading',

    admin_s1_title: 'Product & Business Layer',
    admin_s1_item1_title: 'Mục tiêu sản phẩm:',
    admin_s1_item1_desc: 'Hệ thống quản trị (CMS) chuyên dụng cho chủ cửa hàng, cho phép kiểm soát toàn diện luồng vận hành của ứng dụng E-commerce.',
    admin_s1_item2_title: 'Tính năng cốt lõi:',
    admin_s1_item2_desc: 'Quản lý CRUD Sản phẩm đa biến thể (Màu/Size), xử lý đơn hàng, quản lý mã giảm giá, và kiểm duyệt đánh giá từ người dùng.',
    admin_s1_item3_title: 'Điểm chạm thông minh:',
    admin_s1_item3_desc: 'Bảng điều khiển (Dashboard) trực quan với biểu đồ doanh thu theo thời gian thực (MongoDB Aggregation). Cập nhật trạng thái đơn hàng 1-click tự động đẩy thông báo FCM tới app khách hàng qua RabbitMQ.',

    admin_s2_item1_title: 'Kiến trúc Component-Based:',
    admin_s2_item1_desc: 'Sử dụng Vue 3 với <span class="bw-tag">Composition API</span> để tổ chức code module hóa, phân tách rõ ràng giữa Logic, Template và Style.',
    admin_s2_item2_title: 'State Management (Reactivity):',
    admin_s2_item2_desc: 'Sử dụng <span class="bw-tag">ref</span> và <span class="bw-tag">reactive</span> tích hợp sẵn của Vue 3 để quản lý trạng thái local cho các biểu mẫu (Forms) và danh sách dữ liệu động.',

    admin_s3_item1_title: 'Tính nhất quán (Consistency):',
    admin_s3_item1_desc: 'Layout quản trị tiêu chuẩn với Sidebar Navigation và Topbar, duy trì bộ khung vững chắc qua hệ thống <span class="bw-tag">Vue Router View</span>.',
    admin_s3_item2_title: 'Vanilla CSS:',
    admin_s3_item2_desc: 'Sử dụng CSS thuần với hệ thống CSS Variables chung (như var(--blue), var(--red)...) giúp tối ưu hóa kích thước thay vì lạm dụng thư viện UI cồng kềnh.',
    admin_s3_item3_title: 'Hệ thống Reusable Components:',
    admin_s3_item3_desc: 'Đóng gói các thành phần UI dùng chung như Bảng dữ liệu (Data Table), Biểu mẫu Modal, Nút xác nhận để dễ bảo trì.',

    admin_s4_item1_title: 'Auto-Refresh Token (Axios Interceptors):',
    admin_s4_item1_desc: 'Tự động bắt lỗi HTTP 401, gọi ngầm API /auth/refresh, cấp lại Token và tự động <span class="bw-tag">replay</span> request lỗi gốc.',
    admin_s4_item2_title: 'Failed Queue Pattern:',
    admin_s4_item2_desc: 'Xử lý Race Condition hiệu quả. Khi 1 request đang refresh, các request 401 đến sau sẽ được đẩy vào <span class="bw-tag">failedQueue</span>. Sau khi lấy token mới, resolve hàng loạt.',
    admin_s4_item3_title: 'Xử lý dữ liệu đa nền:',
    admin_s4_item3_desc: 'Giao tiếp qua giao thức FormData cho các API Upload nhiều ảnh sản phẩm lên Cloudinary.',

    admin_s5_item1_title: 'Quản lý Phiên (Session):',
    admin_s5_item1_desc: 'Lưu trữ an toàn <span class="bw-tag">accessToken</span> vào Local Storage để duy trì trạng thái đăng nhập trên trình duyệt.',
    admin_s5_item2_title: 'Route Guards (Điều hướng an toàn):',
    admin_s5_item2_desc: 'Bắt sự kiện <span class="bw-tag">router.beforeEach</span>, chặn mọi truy cập chưa xác thực vào Dashboard và tự động điều hướng về màn hình Login.',
    admin_s5_item3_title: 'Force Logout Cascade:',
    admin_s5_item3_desc: 'Nếu Refresh Token cũng hết hạn (hoặc user bị ban), hệ thống tự dọn dẹp LocalStorage và ép đăng xuất hoàn toàn (Force Logout) ngay lập tức.',

    admin_s6_item1_title: 'Vite Bundler:',
    admin_s6_item1_desc: 'Sử dụng bộ công cụ <span class="bw-tag">Vite</span> siêu tốc để HMR cực nhanh khi dev và tối ưu hóa dung lượng bundle tĩnh khi Build Production.',
    admin_s6_item2_title: 'Lazy Loading Routes:',
    admin_s6_item2_desc: 'Áp dụng kỹ thuật code-splitting thông qua hàm <span class="bw-tag">import()</span> ở cấp độ Router. Trình duyệt chỉ tải JS của màn hình quản lý nào đang được xem.',
    admin_s6_item3_title: 'Tối ưu hóa Băng thông (Images):',
    admin_s6_item3_desc: 'Thay vì tải ảnh lớn gốc, Admin nhận các thumbnail từ Cloudinary đã được resize sẵn (width/height), làm giảm hàng chục lần lưu lượng mạng.',
  },

  // ─────────────────────────────────────────────────────────── //
  // ENGLISH
  // ─────────────────────────────────────────────────────────── //
  en: {
    page_title: 'S-Shop | System Architecture — clothesstores.app',
    page_desc: 'Interactive architecture diagram of S-Shop E-Commerce Platform deployed on AWS EC2 with Docker, Nginx, and full microservices stack.',

    // ─── HEADER ──────────────────────────────────────────────
    badge: 'Production Architecture',
    header_title_plain: 'Architecture of ',
    header_title_gradient: 'S-Shop Platform',
    header_subtitle: 'Full system deployment diagram of the E-Commerce platform on AWS EC2 with Docker Compose — from domain <strong>clothesstores.app</strong> down to every internal container service.',
    hint_click: 'Click for 3D details',
    hint_drag: 'Drag to reposition modules',
    reset_btn: 'Reset positions',

    // ─── METRICS ─────────────────────────────────────────────
    metric_containers_label: 'Docker Containers',
    metric_schemas_label: 'Mongoose Schemas',
    metric_queues_label: 'RabbitMQ Queues',
    metric_services_label: 'Express Core MVC',
    metric_apps_label: 'Flutter & Vue 3',
    metric_domain_label: 'AWS EC2 · HSTS',

    // ─── FOOTER ──────────────────────────────────────────────
    footer_text: 'Built by <strong>Ngọc Sơn</strong> &nbsp;|&nbsp; Full-Stack E-Commerce Platform &nbsp;|&nbsp; 2024',

    // ─── LOADER ──────────────────────────────────────────────
    loader_hint: 'Loading architecture...',

    // ─── DEPLOY WIDGET ───────────────────────────────────────
    deploy_title: '🚀 Deployment & Infrastructure',
    deploy_subtitle: 'AWS EC2 · Docker Compose · Nginx SSL · Let\'s Encrypt · 6 Containers',

    deploy_s1_title: 'Mobile App Build (APK) & Keystore',
    deploy_s1_item1_title: 'Generate Keystore (Signing Key):',
    deploy_s1_item1_desc: 'Before building the Flutter app, a Keystore must be generated to serve as a signing key. This key verifies app authenticity and must be stored securely to authorize future app updates.',
    deploy_s1_item2_title: 'Build APK Release:',
    deploy_s1_item2_desc: 'Configure the build file to link with the Keystore, then run the build command to produce a size-optimized <span class="bw-tag">.apk</span> installation file for direct deployment on Android devices.',

    deploy_s2_title: 'AWS EC2, Docker & HTTPS SSL',
    deploy_s2_item1_title: 'AWS EC2 & Domain Setup:',
    deploy_s2_item1_desc: 'Provision an EC2 instance on AWS in the Singapore region (ap-southeast-1). Point the public IPv4 to Namecheap DNS for domain <span class="bw-tag">clothesstores.app</span>, then SSH into the VPS to Git clone the source code.',
    deploy_s2_item2_title: 'SSL Configuration (Let\'s Encrypt):',
    deploy_s2_item2_desc: 'SSH back into the VPS, install necessary tools to configure HTTPS and extract the SSL certificate. Two critical keys are obtained and linked into Nginx:<br><code style="font-size: 0.8em; color: var(--green); display: block; margin-top: 5px;">ssl_certificate /etc/letsencrypt/live/clothesstores.app/fullchain.pem;</code><code style="font-size: 0.8em; color: var(--green); display: block;">ssl_certificate_key /etc/letsencrypt/live/clothesstores.app/privkey.pem;</code>',
    deploy_s2_item3_title: 'Docker Compose (6 Containers):',
    deploy_s2_item3_desc: 'The system is split into 6 containers (Redis, RabbitMQ, Backend API, Background Worker, Cron Job, Admin Web). Locally the system runs HTTP on Port 80. On the VPS, Nginx is mounted with the SSL volume and exposes Port 443 (HTTPS) securely.',
    deploy_s2_item4_title: 'Nginx Configuration (Force HTTPS):',
    deploy_s2_item4_desc: '<code>nginx.conf</code> listens on both port 80 (HTTP) and 443 (HTTPS). If a user accesses via port 80, Nginx immediately forces a redirect to 443 (<code>return 301 https://$host$request_uri;</code>) to enforce security. All requests to <code>/api</code> are silently proxied to the internal backend container with the <code>X-Real-IP</code> header forwarded.',

    deploy_s3_title: 'MongoDB Atlas Cloud Database',
    deploy_s3_item1_title: 'MongoDB Atlas Deployment (Low Latency):',
    deploy_s3_item1_desc: 'Initialize a database Cluster on MongoDB Atlas. The key decision is selecting the <strong>same Singapore region</strong> as the AWS EC2 server. This global design thinking minimizes the physical distance between the API and Database to nearly zero, radically reducing network latency for internal service communication.',

    // ─── BACKEND WIDGET ──────────────────────────────────────
    backend_title: '⚙️ Backend Module Overview',
    backend_subtitle: 'Node.js · Express.js · MVC · 11 Services · 8 Schemas',

    backend_s1_title: 'Layered Architecture',
    backend_s2_title: 'Security',
    backend_s2_item1_title: 'Authentication & Authorization:',
    backend_s2_item1_desc: 'JWT Access Token, Refresh Token, Google OAuth, Role-Based Access Control.',
    backend_s2_item2_title: 'Validation:',
    backend_s2_item2_desc: 'Joi Validation integrated at the HTTP request layer to validate client payloads before processing — preventing malformed requests.',
    backend_s2_item3_title: 'Centralized Error Handler:',
    backend_s2_item3_desc: 'A centralized error handling system that auto-classifies errors and returns standardized JSON responses. Combined with <span class="bw-tag">asyncHandler</span> to eliminate repetitive try-catch blocks across all controllers.',

    backend_s3_title: 'Improving Performance',
    backend_s3_item1_title: 'Response Compression:',
    backend_s3_item1_desc: 'All responses are Gzip-compressed. Payload size reduced from <span class="bw-tag">23KB → 1.5KB</span> for 20 product objects per request.',
    backend_s3_item2_title: 'Redis Caching:',
    backend_s3_item2_desc: 'Frequently accessed data (product lists, filters) is cached. Response time reduced from <span class="bw-tag">130ms → 60ms</span> on cache hit.',
    backend_s3_item3_title: 'MongoDB Indexing:',
    backend_s3_item3_desc: 'Indexes created on frequently queried fields to improve query performance.',
    backend_s3_item4_title: 'Full-text Search & Autocomplete:',
    backend_s3_item4_desc: 'Atlas Search Index with AND logic + a dedicated Autocomplete Index for real-time typing suggestions.',
    backend_s3_item5_title: 'Keyset Pagination:',
    backend_s3_item5_desc: 'Cursor-based pagination using <span class="bw-tag">lastId</span> instead of skip/limit. Stable performance at large data scales.',

    backend_s4_title: 'Scalability & High Availability',
    backend_s4_item1_title: 'Message Queue (RabbitMQ):',
    backend_s4_item1_desc: 'Heavy tasks are offloaded to a queue — processed by a dedicated Worker, freeing the main server. Minimizes data loss on sudden server shutdown.',
    backend_s4_item2_title: 'ACID Transaction - Atomic-Guarantee + Retry:',
    backend_s4_item2_desc: 'Order placement/cancellation logic is wrapped in MongoDB Transactions with <span class="bw-tag">withRetry</span> for automatic retry on WriteConflict. Prevents overselling and auto-rollbacks on failure.',
    backend_s4_item3_title: 'Rate Limiter (Redis-backed):',
    backend_s4_item3_desc: 'Request rate limiting for standard APIs and sensitive endpoints (Login, Register). Redis-backed for optimal read performance.',
    backend_s4_item4_title: 'Cron Job:',
    backend_s4_item4_desc: 'Every 15 minutes, scans PayOS orders unpaid for over 30 minutes and pushes cancellation commands to RabbitMQ.',
    backend_s4_item5_title: 'Cache Stampede Prevention:',
    backend_s4_item5_desc: 'A temporary lock mechanism ensures only 1 request queries the DB when cache expires — preventing hundreds of simultaneous DB hits.',
    backend_s4_item6_title: 'TTL Auto-Cleanup:',
    backend_s4_item6_desc: 'Notifications auto-delete after 30 days using MongoDB TTL Index <span class="bw-tag">expireAfterSeconds</span> — no cron cleanup needed.',

    backend_s5_title: 'Additional Features',
    backend_s5_item1_title: 'AI Chatbot (Gemini API):',
    backend_s5_item1_desc: 'Parses natural language questions into MongoDB filter objects. Results are cached by filter hash — multiple users asking similar queries share the same cache entry.',
    backend_s5_item2_title: 'PayOS VietQR:',
    backend_s5_item2_desc: 'Generates payment QR codes + HMAC webhook signature verification. Return URL does not update the DB (security), only verified Webhooks trigger updates.',
    backend_s5_item3_title: 'Firebase Push Notification:',
    backend_s5_item3_desc: 'FCM tokens sent to GCP with customizable image, body, and sound. Broadcast splits into chunks of 400 tokens → processed async via RabbitMQ.',
    backend_s5_item4_title: 'Cart Stock Validation:',
    backend_s5_item4_desc: 'Cart validates real-time stock on every open, auto-adjusts quantities or removes delisted products.',
    backend_s5_item5_title: 'Cloudinary Auto-Resize:',
    backend_s5_item5_desc: 'Product images auto-resized to <span class="bw-tag">500×500</span>, review images to <span class="bw-tag">800×800</span> — reducing mobile bandwidth usage.',
    backend_s5_item6_title: 'Google Login OAuth:',
    backend_s5_item6_desc: 'Validates Google Auth tokens from client using <span class="bw-tag">google-auth-library</span>. Automatically issues internal JWT Access/Refresh Token pairs for unified session management.',

    // ─── MOBILE WIDGET ───────────────────────────────────────
    mobile_title: '📱 Mobile App UI Overview',
    mobile_subtitle: 'Flutter · Dart · Riverpod · 12 Services · 7 Models · 20+ Screens',

    mobile_s1_title: 'Product & Business Layer',
    mobile_s1_item1_title: 'Product Goal:',
    mobile_s1_item1_desc: 'A specialized e-commerce application for the fashion industry, delivering a seamless shopping experience from search to checkout.',
    mobile_s1_item2_title: 'Core Features:',
    mobile_s1_item2_desc: 'Browse products with variants (Color/Size), auto-synced cart management, real-time order status tracking.',
    mobile_s1_item3_title: 'Smart Touchpoints:',
    mobile_s1_item3_desc: 'Integrated AI Chatbot (Gemini) for product recommendations, contactless payment (QR Code/Webview), and push notifications (FCM) for customer retention.',

    mobile_s2_title: 'Architecture & State Management',
    mobile_s2_item1_title: 'MVC Architecture (Model-View-Controller):',
    mobile_s2_item1_desc: 'The app is organized following the MVC pattern. <span class="bw-tag">Model</span> (models directory) handles data structures, <span class="bw-tag">View</span> (screens/widgets) manages the UI, and <span class="bw-tag">Controller</span> (providers/services) mediates business logic and state management.',
    mobile_s2_item2_title: 'State Management (Riverpod):',
    mobile_s2_item2_desc: 'Uses <span class="bw-tag">flutter_riverpod</span> as the core state management solution for complex, highly-synchronized states (Cart, Orders, Auth) with complete separation of Business Logic from UI.',
    mobile_s2_item3_title: 'Smart Routing & Interceptors:',
    mobile_s2_item3_desc: 'Manages 20+ screens via Named Route Generator. Combined with the <span class="bw-tag">AuthGuard</span> class that auto-intercepts privileged actions (purchase, review), triggers a login popup, and automatically retries the pending action after successful login.',

    mobile_s3_title: 'User Interface & User Experience',
    mobile_s3_item1_title: 'Consistency:',
    mobile_s3_item1_desc: 'Screens are wrapped with pre-packaged <span class="bw-tag">CustomAppBar</span> and <span class="bw-tag">BottomNavBar</span> components, completely eliminating layout shift jitter when switching tabs.',
    mobile_s3_item2_title: 'Reusable Widget System:',
    mobile_s3_item2_desc: 'Independent UI components encapsulated as ProductCardWidget, ChatbotWidget, and custom Bottom Sheets (AddToCartBottomSheet, SizeGuideSheet).',
    mobile_s3_item3_title: 'Search Experience (Search UI):',
    mobile_s3_item3_desc: 'Autocomplete feature calls the API via a 300ms Debounce mechanism, combined with search history display for an optimized typing flow.',

    mobile_s4_title: 'API & Network Integration',
    mobile_s4_item1_title: 'Auto-Refresh Token & Race Condition Lock:',
    mobile_s4_item1_desc: 'Automatically catches HTTP 401 errors. Uses <span class="bw-tag">Completer&lt;bool&gt;</span> to lock the Refresh Token process — ensuring that even with 10 concurrent 401 errors, the token refresh API is called only once.',
    mobile_s4_item2_title: 'Payment Gateways & Background Polling:',
    mobile_s4_item2_desc: 'Integrates VNPay, ZaloPay (via Webview) and PayOS VietQR (renders QR code using <span class="bw-tag">qr_flutter</span>). Implements a background Polling loop checking order status every 5 seconds, combined with WidgetsBindingObserver to instantly verify when the user returns from the banking app.',
    mobile_s4_item3_title: 'Centralized API Service:',
    mobile_s4_item3_desc: 'All GET/POST/PUT/DELETE methods are centralized in <span class="bw-tag">ApiService</span>, handling Authorization headers and JSON Deserialization automatically.',

    mobile_s5_title: 'Local Storage & Security',
    mobile_s5_item1_title: 'Token Security:',
    mobile_s5_item1_desc: 'Encrypts accessToken and refreshToken using <span class="bw-tag">flutter_secure_storage</span>.',
    mobile_s5_item2_title: 'Local Caching:',
    mobile_s5_item2_desc: 'Uses <span class="bw-tag">shared_preferences</span> to persist non-sensitive data such as Search History and unsynced cart data.',
    mobile_s5_item3_title: 'Auth Security:',
    mobile_s5_item3_desc: 'Integrates Google Sign-In, connecting to the secure backend JWT issuance flow.',

    mobile_s6_title: 'Performance Optimization',
    mobile_s6_item1_title: 'Optimistic Update & Debounce Sync (Cart):',
    mobile_s6_item1_desc: 'Cart is split into two layers: UI and API. Quantity changes are reflected instantly on the UI. After 5 seconds of inactivity, changes are batched and sent to MongoDB — reducing redundant API traffic by 80%.',
    mobile_s6_item2_title: 'Lazy Loading (Infinite Scrolling):',
    mobile_s6_item2_desc: 'Smooth long-list management via <span class="bw-tag">ScrollPaginationMixin</span>. Automatically triggers an API call to load more data when the user scrolls past 90% of the screen.',
    mobile_s6_item3_title: 'Client-Side Stock Validation:',
    mobile_s6_item3_desc: 'Variant data is embedded directly in the Product object. Out-of-stock errors are caught on the client device UI rather than waiting for a server response.',
    mobile_s6_item4_title: 'Notification Queue Management:',
    mobile_s6_item4_desc: 'Firebase Messages are stored in a pending queue when the app is in a fully Terminated state. Tapping them auto-navigates to the relevant notification or order detail based on notification type.',

    // ─── ADMIN WIDGET ─────────────────────────────────────────
    admin_title: '💻 Admin Dashboard UI Overview',
    admin_subtitle: 'Vue 3 · Vite · Axios · Composition API · 14 Views · Lazy Loading',

    admin_s1_title: 'Product & Business Layer',
    admin_s1_item1_title: 'Product Goal:',
    admin_s1_item1_desc: 'A dedicated Content Management System (CMS) for store owners, enabling full operational control of the E-commerce application.',
    admin_s1_item2_title: 'Core Features:',
    admin_s1_item2_desc: 'Multi-variant Product CRUD (Color/Size), order processing, discount voucher management, and user review moderation.',
    admin_s1_item3_title: 'Smart Touchpoints:',
    admin_s1_item3_desc: 'An intuitive Dashboard with real-time revenue charts, low-stock alerts, and an FCM Broadcast notification campaign tool.',

    admin_s2_item1_title: 'Component-Based Architecture:',
    admin_s2_item1_desc: 'Uses Vue 3 with <span class="bw-tag">Composition API</span> to organize code in a modular way, clearly separating Logic, Template, and Style.',
    admin_s2_item2_title: 'State Management (Reactivity):',
    admin_s2_item2_desc: 'Uses Vue 3 built-in <span class="bw-tag">ref</span> and <span class="bw-tag">reactive</span> to manage local state for dynamic Forms and data lists.',

    admin_s3_item1_title: 'Consistency:',
    admin_s3_item1_desc: 'Standard admin layout with Sidebar Navigation and Topbar, maintaining a solid structural frame through the <span class="bw-tag">Vue Router View</span> system.',
    admin_s3_item2_title: 'Vanilla CSS:',
    admin_s3_item2_desc: 'Uses pure CSS with a shared CSS Variables system (e.g., var(--blue), var(--red)...) to optimize bundle size instead of heavy UI libraries.',
    admin_s3_item3_title: 'Reusable Component System:',
    admin_s3_item3_desc: 'Encapsulates shared UI components like Data Tables, Modal Forms, and Confirmation Buttons for easy maintainability.',

    admin_s4_item1_title: 'Auto-Refresh Token (Axios Interceptors):',
    admin_s4_item1_desc: 'Automatically catches HTTP 401, silently calls /auth/refresh, re-issues the token, and <span class="bw-tag">replays</span> the failed original request.',
    admin_s4_item2_title: 'Failed Queue Pattern:',
    admin_s4_item2_desc: 'Handles Race Conditions efficiently. While one request is refreshing, subsequent 401 requests are queued in <span class="bw-tag">failedQueue</span>. After a new token is obtained, all are resolved in bulk.',
    admin_s4_item3_title: 'Multi-platform Data Handling:',
    admin_s4_item3_desc: 'Communicates via FormData protocol for APIs that upload multiple product images to Cloudinary.',

    admin_s5_item1_title: 'Session Management:',
    admin_s5_item1_desc: 'Securely stores <span class="bw-tag">accessToken</span> in Local Storage to maintain login state across browser sessions.',
    admin_s5_item2_title: 'Route Guards (Safe Navigation):',
    admin_s5_item2_desc: 'Hooks into <span class="bw-tag">router.beforeEach</span> to block all unauthenticated access to the Dashboard and auto-redirects to the Login screen.',
    admin_s5_item3_title: 'Force Logout Cascade:',
    admin_s5_item3_desc: 'If the Refresh Token also expires (or a user is banned), the system automatically clears LocalStorage and forces an immediate complete logout.',

    admin_s6_item1_title: 'Vite Bundler:',
    admin_s6_item1_desc: 'Uses the ultra-fast <span class="bw-tag">Vite</span> toolchain for extremely fast HMR during development and optimized static bundle size for Production Builds.',
    admin_s6_item2_title: 'Lazy Loading Routes:',
    admin_s6_item2_desc: 'Applies code-splitting via the <span class="bw-tag">import()</span> function at the Router level. The browser only loads the JS for the admin view currently being accessed.',
    admin_s6_item3_title: 'Bandwidth Optimization (Images):',
    admin_s6_item3_desc: 'Instead of loading full-size originals, the Admin receives pre-resized thumbnails from Cloudinary (width/height), reducing network traffic by tens of times.',
  }
};

// ─── ACTIVE LANGUAGE STATE ───────────────────────────────────
let currentLang = localStorage.getItem('sshop_lang') || 'vi';

// ─── APPLY LANGUAGE TO PAGE ──────────────────────────────────
function applyLang(lang) {
  currentLang = lang;
  localStorage.setItem('sshop_lang', lang);
  const t = LANG[lang];

  // Page meta
  document.title = t.page_title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', t.page_desc);
  document.documentElement.lang = lang;

  // Header
  const badge = document.getElementById('lang-badge');
  if (badge) badge.textContent = t.badge;
  const h1Plain = document.getElementById('lang-h1-plain');
  if (h1Plain) h1Plain.textContent = t.header_title_plain;
  const h1Gradient = document.getElementById('lang-h1-gradient');
  if (h1Gradient) h1Gradient.textContent = t.header_title_gradient;
  const subtitle = document.getElementById('lang-subtitle');
  if (subtitle) subtitle.innerHTML = t.header_subtitle;
  const hintClick = document.getElementById('lang-hint-click');
  if (hintClick) hintClick.textContent = t.hint_click;
  const hintDrag = document.getElementById('lang-hint-drag');
  if (hintDrag) hintDrag.textContent = t.hint_drag;
  const resetBtn = document.getElementById('lang-reset-btn');
  if (resetBtn) resetBtn.innerHTML = '<i class="fas fa-undo"></i> ' + t.reset_btn;

  // Metrics labels
  const metricLabels = document.querySelectorAll('[data-metric-label]');
  metricLabels.forEach(el => {
    const key = el.getAttribute('data-metric-label');
    if (t[key]) el.textContent = t[key];
  });

  // Loader
  const loaderHint = document.getElementById('lang-loader-hint');
  if (loaderHint) loaderHint.textContent = t.loader_hint;

  // Footer
  const footer = document.getElementById('lang-footer');
  if (footer) footer.innerHTML = 'S-Shop &nbsp;— &nbsp;' + t.footer_text;

  // Widgets — use data-lang-key on elements
  document.querySelectorAll('[data-lang-key]').forEach(el => {
    const key = el.getAttribute('data-lang-key');
    if (t[key] !== undefined) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = t[key];
      } else {
        el.innerHTML = t[key];
      }
    }
  });

  // Widgets - complex items (title + desc)
  document.querySelectorAll('[data-lang-item]').forEach(el => {
    const key = el.getAttribute('data-lang-item');
    const title = t[key + '_title'];
    const desc = t[key + '_desc'];
    if (title !== undefined && desc !== undefined) {
      el.innerHTML = `<strong>${title}</strong> ${desc}`;
    }
  });

  // Update toggle button active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => applyLang(currentLang));
