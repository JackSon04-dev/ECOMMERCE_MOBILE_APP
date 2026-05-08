// ============================================================================
// FILE: router/index.js
// MỤC ĐÍCH: Cấu hình Vue Router - Quản lý điều hướng và bảo vệ các trang
// ============================================================================

// -----------------------------------------------------------------------------
// 1. IMPORT CÁC HÀM TỪ THƯ VIỆN VUE-ROUTER
// -----------------------------------------------------------------------------
// createRouter: Hàm tạo instance router cho ứng dụng
// createWebHistory: Sử dụng History API của trình duyệt (URL sạch, không có #)
//   - Ví dụ: /dashboard thay vì /#/dashboard
import { createRouter, createWebHistory } from 'vue-router'

// -----------------------------------------------------------------------------
// 2. IMPORT COMPOSABLE useAuth TỪ FILE useAuth.js
// -----------------------------------------------------------------------------
// useAuth() trả về:
//   - isAuthenticated: computed(() => !!token.value) → true nếu có token
//   - currentUser: thông tin user đang đăng nhập
//   - login(), logout(): hàm đăng nhập/đăng xuất
// DÙNG ĐỂ: Kiểm tra trạng thái đăng nhập trong Navigation Guard
import { useAuth } from '../composables/useAuth'

// -----------------------------------------------------------------------------
// 3. LAZY LOAD COMPONENTS - TẢI COMPONENT KHI CẦN (TỐI ƯU HIỆU NĂNG)
// -----------------------------------------------------------------------------
// Thay vì: import LoginView from '../views/LoginView.vue' (tải ngay lập tức)
// Dùng: () => import(...) (chỉ tải khi user truy cập route đó)
// LỢI ÍCH: Giảm kích thước bundle ban đầu, tăng tốc độ tải trang

const LoginView = () => import('../views/LoginView.vue')
// → Trang đăng nhập (full screen, không có sidebar)

const MainLayout = () => import('../layouts/MainLayout.vue')
// → Layout chính chứa Sidebar + Header + <router-view/> cho các trang con

const DashboardView = () => import('../views/DashboardView.vue')
// → Trang tổng quan (báo cáo, thống kê)

const ProductView = () => import('../views/product/ProductView.vue')
// → Trang danh sách sản phẩm

const AddProductView = () => import('../views/product/AddProductView.vue')
// → Trang thêm sản phẩm mới

const ProductDetailView = () => import('../views/product/ProductDetailView.vue')
// → Trang chi tiết/chỉnh sửa sản phẩm (nhận id từ URL)

const UserView = () => import('../views/user/UserView.vue')
// → Trang quản lý người dùng

const VoucherView = () => import('../views/voucher/VoucherView.vue')
// → Trang danh sách voucher

const AddVoucherView = () => import('../views/voucher/AddVoucherView.vue')
// → Trang thêm voucher mới

const VoucherDetailView = () => import('../views/voucher/VoucherDetailView.vue')
// → Trang chi tiết/chỉnh sửa voucher

const OrderView = () => import('../views/order/OrderView.vue')
// → Trang danh sách đơn hàng

const OrderDetailView = () => import('../views/order/OrderDetailView.vue')
// → Trang chi tiết đơn hàng

const ReviewListView = () => import('../views/review/reviewList.vue')
// → Trang danh sách đánh giá

const ReviewDetailView = () => import('../views/review/reviewDetail.vue')
// → Trang chi tiết đánh giá

const NotificationView = () => import('../views/notification/NotificationView.vue')
// → Trang quản lý thông báo

// -----------------------------------------------------------------------------
// 4. ĐỊNH NGHĨA CÁC ROUTES - BẢNG ÁNH XẠ URL ↔ COMPONENT
// -----------------------------------------------------------------------------
const routes = [
  // -------------------------------------------------------------------------
  // ROUTE 1: Trang đăng nhập (KHÔNG cần đăng nhập để truy cập)
  // -------------------------------------------------------------------------
  {
    path: '/login', // URL trong trình duyệt
    name: 'login', // Tên route (dùng cho router.push({ name: 'login' }))
    component: LoginView, // Component được render
    meta: { requiresAuth: false } // Metadata: KHÔNG yêu cầu đăng nhập
  },

  // -------------------------------------------------------------------------
  // ROUTE 2: Layout chính (CẦN đăng nhập để truy cập)
  // -------------------------------------------------------------------------
  {
    path: '/', // Route gốc
    component: MainLayout, // Render MainLayout (Sidebar + Header)
    meta: { requiresAuth: true }, // Metadata: YÊU CẦU đăng nhập
    // -----------------------------------------------------------------------
    // CHILDREN: Các route con được render vào <router-view/> của MainLayout
    // -----------------------------------------------------------------------
    children: [
      {
        path: '', // URL: / (trống)
        redirect: '/dashboard' // Tự động chuyển hướng đến /dashboard
      },
      {
        path: 'dashboard', // URL: /dashboard
        name: 'dashboard',
        component: DashboardView // Render vào <router-view/> của MainLayout
      },
      {
        path: 'products', // URL: /products
        name: 'products',
        component: ProductView
      },
      {
        path: 'products/add', // URL: /products/add
        name: 'add-product',
        component: AddProductView
      },
      {
        path: 'products/:id', // URL động: /products/123, /products/abc
        name: 'product-detail',
        component: ProductDetailView,
        props: true // Truyền :id thành props cho component
        // → Trong ProductDetailView: const props = defineProps(['id'])
        // → props.id = "123" khi URL là /products/123
      },
      {
        path: 'users', // URL: /users
        name: 'users',
        component: UserView
        // → Trang quản lý danh sách người dùng
      },
      {
        path: 'vouchers', // URL: /vouchers
        name: 'vouchers',
        component: VoucherView
      },
      {
        path: 'vouchers/add', // URL: /vouchers/add
        name: 'add-voucher',
        component: AddVoucherView
      },
      {
        path: 'vouchers/:id', // URL động: /vouchers/123
        name: 'voucher-detail',
        component: VoucherDetailView,
        props: true
      },
      {
        path: 'orders', // URL: /orders
        name: 'orders',
        component: OrderView
        // → Trang quản lý danh sách đơn hàng
      },
      {
        path: 'orders/:id', // URL động: /orders/123
        name: 'order-detail',
        component: OrderDetailView,
        props: true
        // → Trang chi tiết đơn hàng
      },
      {
        path: 'reviews', // URL: /reviews
        name: 'reviews',
        component: ReviewListView
        // → Trang quản lý danh sách đánh giá
      },
      {
        path: 'reviews/:id', // URL động: /reviews/123
        name: 'review-detail',
        component: ReviewDetailView,
        props: true
        // → Trang chi tiết đánh giá
      },
      {
        path: 'notifications', // URL: /notifications
        name: 'notifications',
        component: NotificationView
        // → Trang quản lý thông báo
      }
    ]
  }
]

// -----------------------------------------------------------------------------
// 5. TẠO INSTANCE ROUTER
// -----------------------------------------------------------------------------
const router = createRouter({
  // createWebHistory(): Sử dụng History API (URL sạch)
  // - /dashboard (có history)
  // - Nếu dùng createWebHashHistory(): /#/dashboard (có hash)
  history: createWebHistory(),

  // Mảng routes đã định nghĩa ở trên
  routes
})

// -----------------------------------------------------------------------------
// 6. NAVIGATION GUARD - BẢO VỆ ROUTE TRƯỚC KHI TRUY CẬP
// -----------------------------------------------------------------------------
// beforeEach() được gọi TRƯỚC MỖI LẦN chuyển trang
// Tham số:
//   - to: Route đích (user muốn đến)
//   - from: Route hiện tại (user đang ở)
//   - next: Hàm điều khiển (cho phép/chặn/chuyển hướng)
router.beforeEach((to, from, next) => {
  // Gọi useAuth() từ file composables/useAuth.js
  // Lấy isAuthenticated: computed trả về true nếu có token trong localStorage
  const { isAuthenticated } = useAuth()

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 1: Trang YÊU CẦU đăng nhập + User CHƯA đăng nhập
  // -------------------------------------------------------------------------
  // Ví dụ: User gõ /dashboard nhưng chưa login
  // → to.meta.requiresAuth = true
  // → isAuthenticated.value = false
  // → Chuyển hướng về trang login
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'login' }) // Gọi next() với object → Chuyển hướng
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 2: User ĐÃ đăng nhập + Đang cố vào trang login
  // -------------------------------------------------------------------------
  // Ví dụ: User đã login, gõ /login
  // → Không cần vào login nữa, chuyển thẳng về dashboard
  else if (to.name === 'login' && isAuthenticated.value) {
    next({ name: 'dashboard' }) // Chuyển hướng về dashboard
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 3: Các trường hợp khác → Cho phép truy cập bình thường
  // -------------------------------------------------------------------------
  else {
    next() // Gọi next() không tham số → Cho phép đi tiếp
  }
})

// -----------------------------------------------------------------------------
// 7. EXPORT ROUTER ĐỂ SỬ DỤNG TRONG main.js
// -----------------------------------------------------------------------------
// Trong main.js: createApp(App).use(router).mount('#app')
// → Đăng ký router vào ứng dụng Vue
export default router
