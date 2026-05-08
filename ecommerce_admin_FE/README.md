# 📊 Admin Dashboard - Hệ thống Quản lý Ecommerce

## 📋 Mục lục

1. [Giới thiệu dự án](#1-giới-thiệu-dự-án)
2. [Công nghệ sử dụng](#2-công-nghệ-sử-dụng)
3. [Cấu trúc thư mục](#3-cấu-trúc-thư-mục)
4. [Cài đặt và Chạy dự án](#4-cài-đặt-và-chạy-dự-án)
5. [Kiến trúc ứng dụng](#5-kiến-trúc-ứng-dụng)
6. [Chi tiết các chức năng](#6-chi-tiết-các-chức-năng)
7. [Luồng dữ liệu](#7-luồng-dữ-liệu)
8. [API Endpoints](#8-api-endpoints)

---

## 1. Giới thiệu dự án

### 1.1. Tổng quan

**Admin Dashboard** là ứng dụng web quản trị dành cho hệ thống Ecommerce, được xây dựng bằng **Vue.js 3** với kiến trúc **Single Page Application (SPA)**. Ứng dụng cho phép quản trị viên:

- 🔐 Đăng nhập/Đăng xuất với xác thực JWT
- 📊 Xem báo cáo tổng quan (Dashboard)
- 📦 Quản lý sản phẩm (CRUD operations)
- 🎨 Quản lý biến thể sản phẩm (màu sắc, size, tồn kho)

### 1.2. Yêu cầu hệ thống

| Thành phần     | Phiên bản          |
| -------------- | ------------------ |
| Node.js        | >= 18.x            |
| npm            | >= 9.x             |
| Backend Server | Chạy tại port 5000 |

---

## 2. Công nghệ sử dụng

### 2.1. Dependencies chính

| Thư viện       | Phiên bản | Vai trò                                               |
| -------------- | --------- | ----------------------------------------------------- |
| **Vue**        | ^3.5.24   | Framework JavaScript để xây dựng giao diện người dùng |
| **Vue Router** | ^4.6.4    | Quản lý điều hướng và bảo vệ route                    |
| **Axios**      | ^1.13.3   | HTTP Client để gọi API Backend                        |

### 2.2. DevDependencies

| Thư viện               | Phiên bản        | Vai trò                          |
| ---------------------- | ---------------- | -------------------------------- |
| **Vite**               | 7.2.5 (rolldown) | Build tool và Development server |
| **@vitejs/plugin-vue** | ^6.0.1           | Plugin Vite hỗ trợ Vue SFC       |

### 2.3. Chi tiết từng thư viện

#### 🟢 Vue 3 (Core Framework)

```javascript
// Sử dụng Composition API với <script setup>
import { ref, computed, onMounted } from 'vue'

// ref(): Tạo reactive state
const count = ref(0)

// computed(): Tạo giá trị tính toán tự động
const doubled = computed(() => count.value * 2)

// onMounted(): Lifecycle hook chạy khi component mount
onMounted(() => {
  console.log('Component đã được render')
})
```

#### 🟢 Vue Router (Điều hướng)

```javascript
// Định nghĩa routes
const routes = [
  { path: '/login', component: LoginView },
  { path: '/dashboard', component: DashboardView }
]

// Navigation Guard - Bảo vệ route
router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else {
    next()
  }
})

// Điều hướng programmatic
router.push({ name: 'dashboard' })
```

#### 🟢 Axios (HTTP Client)

```javascript
// GET request
const response = await axios.get('/api/products')

// POST request với FormData
const formData = new FormData()
formData.append('name', 'Sản phẩm mới')
await axios.post('/api/products/add', formData)

// Interceptors - Tự động gắn token
axios.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${token}`
  return config
})
```

---

## 3. Cấu trúc thư mục

```
admin-dashboard/
├── index.html              # Entry HTML (nơi mount Vue App)
├── package.json            # Dependencies và scripts
├── vite.config.js          # Cấu hình Vite (proxy, port)
├── public/                 # Static assets
└── src/
    ├── main.js             # Entry point - Khởi tạo Vue App
    ├── App.vue             # Root component
    ├── style.css           # CSS toàn cục
    │
    ├── router/
    │   └── index.js        # Cấu hình Vue Router + Navigation Guard
    │
    ├── composables/
    │   └── useAuth.js      # Composable quản lý xác thực
    │
    ├── layouts/
    │   └── MainLayout.vue  # Layout chính (Sidebar + Header)
    │
    ├── components/
    │   ├── Header.vue      # Component header (User info + Logout)
    │   └── Sidebar.vue     # Component sidebar (Navigation menu)
    │
    └── views/
        ├── LoginView.vue       # Trang đăng nhập
        ├── DashboardView.vue   # Trang tổng quan
        └── product/
            ├── ProductView.vue       # Danh sách sản phẩm
            ├── AddProductView.vue    # Thêm sản phẩm mới
            └── ProductDetailView.vue # Chi tiết/Sửa sản phẩm
```

### 3.1. Giải thích vai trò từng file

| File              | Mô tả                                                         |
| ----------------- | ------------------------------------------------------------- |
| `main.js`         | Khởi tạo Vue App, đăng ký Router, cấu hình Axios Interceptors |
| `App.vue`         | Component gốc, chứa `<router-view />` để render các trang     |
| `router/index.js` | Định nghĩa routes, lazy load components, Navigation Guard     |
| `useAuth.js`      | Composable quản lý token, user, login/logout functions        |
| `MainLayout.vue`  | Layout wrapper cho các trang cần Sidebar và Header            |
| `Header.vue`      | Hiển thị thông tin user và nút Logout                         |
| `Sidebar.vue`     | Menu điều hướng giữa các trang                                |

---

## 4. Cài đặt và Chạy dự án

### 4.1. Cài đặt dependencies

```bash
# Clone repository
git clone <repository-url>
cd admin-dashboard

# Cài đặt packages
npm install
```

### 4.2. Chạy Development Server

```bash
npm run dev
```

Ứng dụng sẽ chạy tại: `http://localhost:3000`

### 4.3. Build Production

```bash
npm run build
```

### 4.4. Cấu hình Vite

```javascript
// vite.config.js
export default defineConfig({
  server: {
    port: 3000, // Port của Frontend
    open: true, // Tự động mở trình duyệt
    proxy: {
      '/api': 'http://localhost:5000' // Proxy API đến Backend
    }
  }
})
```

---

## 5. Kiến trúc ứng dụng

### 5.1. Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRÌNH DUYỆT                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         index.html                                  │   │
│   │                    <div id="app"></div>                             │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          main.js                                    │   │
│   │  • createApp(App)                                                   │   │
│   │  • .use(router)                                                     │   │
│   │  • Axios Interceptors                                               │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          App.vue                                    │   │
│   │                      <router-view />                                │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┴───────────────┐                        │
│                    ▼                               ▼                        │
│   ┌───────────────────────────┐   ┌───────────────────────────────────┐    │
│   │      LoginView.vue        │   │        MainLayout.vue             │    │
│   │    (Không có layout)      │   │  ┌─────────┬─────────────────┐    │    │
│   │                           │   │  │ Sidebar │ Header          │    │    │
│   │                           │   │  │         │─────────────────│    │    │
│   │                           │   │  │         │ <router-view /> │    │    │
│   │                           │   │  │         │ (Trang con)     │    │    │
│   │                           │   │  └─────────┴─────────────────┘    │    │
│   └───────────────────────────┘   └───────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Sơ đồ Routing

```
routes/
├── /login                    ← LoginView.vue (Public)
│
└── / (MainLayout)            ← Requires Authentication
    ├── /dashboard            ← DashboardView.vue
    ├── /products             ← ProductView.vue
    ├── /products/add         ← AddProductView.vue
    └── /products/:id         ← ProductDetailView.vue
```

### 5.3. Navigation Guard Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    User truy cập URL bất kỳ                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ router.beforeEach() được gọi │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │ to.meta.requiresAuth = true?  │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                   YES                              NO
                    │                               │
                    ▼                               ▼
        ┌───────────────────────┐       ┌───────────────────────┐
        │ isAuthenticated.value │       │ to.name === 'login'?  │
        │ = true?               │       └───────────┬───────────┘
        └───────────┬───────────┘                   │
                    │                   ┌───────────┴───────────┐
            ┌───────┴───────┐          YES                      NO
           YES             NO           │                        │
            │               │           ▼                        ▼
            ▼               ▼     ┌───────────────┐     ┌───────────────┐
       ┌────────┐   ┌────────────┐│ Đã login?     │     │    next()     │
       │ next() │   │next('login')│ → dashboard   │     │  Cho phép     │
       │Cho phép│   │Về login    ││               │     └───────────────┘
       └────────┘   └────────────┘└───────────────┘
```

---

## 6. Chi tiết các chức năng

### 6.1. Chức năng Đăng nhập (Authentication)

#### 6.1.1. Mô tả

Cho phép Admin đăng nhập vào hệ thống bằng email và mật khẩu. Sau khi đăng nhập thành công, server trả về JWT token được lưu vào localStorage.

#### 6.1.2. File liên quan

| File                     | Vai trò                         |
| ------------------------ | ------------------------------- |
| `views/LoginView.vue`    | Giao diện form đăng nhập        |
| `composables/useAuth.js` | Quản lý state token và user     |
| `router/index.js`        | Navigation Guard kiểm tra quyền |
| `main.js`                | Axios Interceptors gắn token    |

#### 6.1.3. Luồng hoạt động

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LUỒNG ĐĂNG NHẬP                                     │
└─────────────────────────────────────────────────────────────────────────────┘

[User]                [LoginView.vue]           [Server :5000]         [useAuth.js]
  │                        │                          │                      │
  │ 1. Nhập email/password │                          │                      │
  │───────────────────────>│                          │                      │
  │                        │                          │                      │
  │                        │ 2. POST /api/auth/login  │                      │
  │                        │─────────────────────────>│                      │
  │                        │                          │                      │
  │                        │ 3. Response: 200 OK      │                      │
  │                        │<─────────────────────────│                      │
  │                        │   {accessToken, user}    │                      │
  │                        │                          │                      │
  │                        │ 4. Gọi login()           │                      │
  │                        │─────────────────────────────────────────────────>│
  │                        │                          │                      │
  │                        │                          │    5. Lưu vào        │
  │                        │                          │    localStorage      │
  │                        │                          │                      │
  │                        │ 6. router.push('/dashboard')                    │
  │                        │─────────────────────────────────────────────────>│
  │                        │                          │                      │
  │ 7. Hiển thị Dashboard  │                          │                      │
  │<───────────────────────│                          │                      │
```

#### 6.1.4. Code chi tiết

**LoginView.vue - Xử lý đăng nhập:**

```javascript
const handleLogin = async () => {
  try {
    // 1. Gọi API đăng nhập
    const response = await axios.post('/api/auth/login', {
      email: email.value,
      password: password.value
    })

    // 2. Lấy dữ liệu từ response
    const { accessToken, refreshToken, user } = response.data

    // 3. Lưu vào auth store (gọi useAuth.js)
    login(accessToken, refreshToken, user)

    // 4. Chuyển hướng đến dashboard
    router.push({ name: 'dashboard' })
  } catch (error) {
    // Xử lý lỗi theo status code
    if (error.response?.status === 401) {
      errorMessage.value = 'Email hoặc mật khẩu không chính xác'
    }
  }
}
```

**useAuth.js - Lưu trạng thái:**

```javascript
// State được khởi tạo từ localStorage
const token = ref(localStorage.getItem('authToken') || null)
const currentUser = ref(
  JSON.parse(localStorage.getItem('currentUser') || 'null')
)

// Computed kiểm tra đã đăng nhập chưa
const isAuthenticated = computed(() => !!token.value)

// Hàm login - được gọi từ LoginView.vue
const login = (authToken, refresh, userData) => {
  token.value = authToken
  currentUser.value = userData
  localStorage.setItem('authToken', authToken)
  localStorage.setItem('currentUser', JSON.stringify(userData))
}
```

---

### 6.2. Chức năng Dashboard (Tổng quan)

#### 6.2.1. Mô tả

Hiển thị các thống kê tổng quan về hệ thống: Doanh thu, Số khách hàng, Số sản phẩm, Số đơn hàng và biểu đồ doanh thu tuần.

#### 6.2.2. File liên quan

| File                      | Vai trò            |
| ------------------------- | ------------------ |
| `views/DashboardView.vue` | Giao diện và logic |
| `layouts/MainLayout.vue`  | Layout wrapper     |

#### 6.2.3. Giao diện

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  📊 Báo cáo Tổng quan                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Doanh thu  │ │ Khách hàng  │ │  Sản phẩm   │ │  Đơn hàng   │           │
│  │  150.2Mđ    │ │   1,250     │ │    458      │ │     89      │           │
│  │  ↑ 12%      │ │   ↑ 8%      │ │   ↑ 5%      │ │   ↑ 15%     │           │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Biểu đồ Doanh thu tuần                                             │   │
│  │                                                                     │   │
│  │     █                                                               │   │
│  │     █    █         █                                                │   │
│  │  █  █    █    █    █    █                                           │   │
│  │  █  █    █    █    █    █    █                                      │   │
│  │  T2 T3   T4   T5   T6   T7   CN                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 6.3. Chức năng Quản lý Sản phẩm

#### 6.3.1. Danh sách sản phẩm (ProductView.vue)

**Mô tả:** Hiển thị danh sách tất cả sản phẩm với các chức năng tìm kiếm, lọc, xem chi tiết và xóa.

**Các tính năng:**

| Tính năng          | Mô tả                                    |
| ------------------ | ---------------------------------------- |
| Hiển thị danh sách | Lấy dữ liệu từ API `/api/admin/products` |
| Tìm kiếm theo tên  | Filter client-side theo `searchQuery`    |
| Lọc theo Tag       | Filter theo dropdown `selectedTag`       |
| Xem chi tiết       | Navigate đến `/products/:id`             |
| Xóa sản phẩm       | Gọi API DELETE với confirm dialog        |

**Luồng hoạt động:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG HIỂN THỊ DANH SÁCH SẢN PHẨM                        │
└─────────────────────────────────────────────────────────────────────────────┘

[ProductView.vue]                                            [Server :5000]
       │                                                           │
       │ 1. onMounted() → fetchProducts()                          │
       │                                                           │
       │ 2. GET /api/admin/products                                │
       │──────────────────────────────────────────────────────────>│
       │                                                           │
       │ 3. Response: { data: [...products] }                      │
       │<──────────────────────────────────────────────────────────│
       │                                                           │
       │ 4. allProducts.value = response.data.data                 │
       │    displayProducts.value = response.data.data             │
       │                                                           │
       │ 5. v-for="product in displayProducts" → Render table      │
       │                                                           │
```

**Code tìm kiếm và lọc:**

```javascript
// Dữ liệu
const allProducts = ref([]) // Dữ liệu gốc từ API
const displayProducts = ref([]) // Dữ liệu sau khi filter
const searchQuery = ref('') // Từ khóa tìm kiếm
const selectedTag = ref('') // Tag được chọn

// Hàm tìm kiếm (chạy khi nhấn nút)
const handleSearch = () => {
  displayProducts.value = allProducts.value.filter((p) => {
    // Kiểm tra tên (không phân biệt hoa thường)
    const matchName = p.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase())

    // Kiểm tra tag
    const matchTag =
      selectedTag.value === '' ||
      p.tags?.some((t) => t.toLowerCase() === selectedTag.value.toLowerCase())

    return matchName && matchTag
  })
}
```

---

#### 6.3.2. Thêm sản phẩm mới (AddProductView.vue)

**Mô tả:** Form thêm sản phẩm mới với đầy đủ thông tin: tên, mô tả, giá, giảm giá, tags, ảnh đại diện và biến thể (màu sắc, size, tồn kho).

**Cấu trúc dữ liệu biến thể:**

```javascript
const colorVariants = ref([
  {
    color: 'Xanh Navy', // Tên màu
    images: ['url-to-image'], // Ảnh của màu này
    sizes: [
      { size: 'M', stock: 50 },
      { size: 'L', stock: 30 },
      { size: 'XL', stock: 20 }
    ]
  }
])
```

**Luồng thêm sản phẩm:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LUỒNG THÊM SẢN PHẨM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

[AddProductView.vue]                                         [Server :5000]
       │                                                           │
       │ 1. User điền form + upload ảnh biến thể                   │
       │                                                           │
       │ 2. handleVariantImageUpload() - Upload ảnh biến thể       │
       │    POST /api/admin/products/upload-single                 │
       │──────────────────────────────────────────────────────────>│
       │                                                           │
       │ 3. Response: { data: { url: 'cloudinary-url' } }          │
       │<──────────────────────────────────────────────────────────│
       │                                                           │
       │ 4. User nhấn "Lưu sản phẩm" → submitForm()                │
       │                                                           │
       │ 5. Validation các trường bắt buộc                         │
       │                                                           │
       │ 6. Tạo FormData và gửi                                    │
       │    POST /api/admin/products/add                           │
       │──────────────────────────────────────────────────────────>│
       │                                                           │
       │ 7. Response: { success: true }                            │
       │<──────────────────────────────────────────────────────────│
       │                                                           │
       │ 8. resetForm() - Xóa sạch form                            │
       │                                                           │
```

**Validation:**

```javascript
const submitForm = async () => {
  // 1. Kiểm tra tên sản phẩm
  if (!name.value || name.value.trim() === '') {
    return alert('Tên sản phẩm không được để trống!')
  }

  // 2. Kiểm tra giá gốc
  if (price.value <= 0) {
    return alert('Giá gốc phải lớn hơn 0!')
  }

  // 3. Kiểm tra giảm giá (0-50%)
  if (discount.value < 0 || discount.value > 50) {
    return alert('Giảm giá không được vượt quá 50%!')
  }

  // 4. Kiểm tra biến thể
  const isVariantsValid = colorVariants.value.every((c) => {
    return (
      c.color.trim() !== '' &&
      c.sizes.every((s) => s.size.trim() !== '' && s.stock >= 0)
    )
  })

  if (!isVariantsValid) {
    return alert('Vui lòng nhập đủ thông tin biến thể!')
  }

  // 5. Gửi FormData
  const formData = new FormData()
  formData.append('name', name.value)
  formData.append('colorVariants', JSON.stringify(colorVariants.value))
  formData.append('thumbnail', thumbnailFile.value)

  await axios.post('/api/admin/products/add', formData)
}
```

---

#### 6.3.3. Chi tiết/Sửa sản phẩm (ProductDetailView.vue)

**Mô tả:** Hiển thị và cho phép chỉnh sửa thông tin sản phẩm. Nhận `id` từ URL params để lấy dữ liệu.

**Route động:**

```javascript
// router/index.js
{
  path: 'products/:id',           // :id là tham số động
  name: 'product-detail',
  component: ProductDetailView,
  props: true                     // Truyền :id thành props
}

// ProductDetailView.vue
const props = defineProps(['id'])
const productId = computed(() => props.id || route.params.id)
```

**Luồng hoạt động:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG XEM/SỬA CHI TIẾT SẢN PHẨM                          │
└─────────────────────────────────────────────────────────────────────────────┘

[ProductDetailView.vue]                                      [Server :5000]
       │                                                           │
       │ 1. onMounted() → fetchProductDetail()                     │
       │                                                           │
       │ 2. GET /api/admin/products/:id                            │
       │──────────────────────────────────────────────────────────>│
       │                                                           │
       │ 3. Response: { data: { name, price, colorVariants... } }  │
       │<──────────────────────────────────────────────────────────│
       │                                                           │
       │ 4. product.value = response.data.data                     │
       │    Render form với dữ liệu                                │
       │                                                           │
       │ 5. User chỉnh sửa thông tin                               │
       │                                                           │
       │ 6. handleUpdate() - Validation + Gửi FormData             │
       │    PUT /api/admin/products/update/:id                     │
       │──────────────────────────────────────────────────────────>│
       │                                                           │
       │ 7. Response: { success: true }                            │
       │<──────────────────────────────────────────────────────────│
       │                                                           │
       │ 8. fetchProductDetail() - Tải lại dữ liệu mới             │
       │                                                           │
```

---

### 6.4. Chức năng Đăng xuất (Logout)

#### 6.4.1. Mô tả

Xóa token và thông tin user khỏi localStorage, chuyển hướng về trang đăng nhập.

#### 6.4.2. File liên quan

| File                     | Vai trò                     |
| ------------------------ | --------------------------- |
| `components/Header.vue`  | Nút Logout và xử lý sự kiện |
| `composables/useAuth.js` | Hàm logout() xóa dữ liệu    |

#### 6.4.3. Code

```javascript
// Header.vue
const handleLogout = () => {
  logout() // Gọi hàm từ useAuth.js
  router.push({ name: 'login' }) // Chuyển về trang login
}

// useAuth.js
const logout = () => {
  token.value = null
  currentUser.value = null
  localStorage.removeItem('authToken')
  localStorage.removeItem('currentUser')
}
```

---

## 7. Luồng dữ liệu

### 7.1. Sơ đồ tổng quan luồng dữ liệu

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LUỒNG DỮ LIỆU TỔNG QUAN                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   Component   │       │    Axios      │       │    Server     │
│   (Views)     │       │ Interceptors  │       │  (Port 5000)  │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        │ 1. axios.get/post()   │                       │
        │──────────────────────>│                       │
        │                       │                       │
        │                       │ 2. Thêm Authorization │
        │                       │    Bearer {token}     │
        │                       │──────────────────────>│
        │                       │                       │
        │                       │ 3. Response           │
        │                       │<──────────────────────│
        │                       │                       │
        │                       │ 4. Check status 401?  │
        │                       │    → Redirect login   │
        │                       │                       │
        │ 5. Return response    │                       │
        │<──────────────────────│                       │
        │                       │                       │
        │ 6. Update reactive    │                       │
        │    state (ref)        │                       │
        │                       │                       │
        │ 7. Vue auto re-render │                       │
        │                       │                       │


┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│   useAuth.js  │       │ localStorage  │       │   Router      │
│  (Composable) │       │               │       │   Guard       │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        │ login(token, user)    │                       │
        │──────────────────────>│ setItem()             │
        │                       │                       │
        │                       │                       │
        │ isAuthenticated       │                       │
        │<─────────────────────────────────────────────>│ beforeEach()
        │ computed(() => !!token)                       │ Check quyền
        │                       │                       │
```

### 7.2. Request Interceptor

```javascript
// main.js - Tự động gắn token vào mọi request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### 7.3. Response Interceptor

```javascript
// main.js - Xử lý token hết hạn
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn → Đăng xuất tự động
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      router.push({ name: 'login' })
    }
    return Promise.reject(error)
  }
)
```

---

## 8. API Endpoints

### 8.1. Authentication

| Method | Endpoint          | Mô tả     | Body                  |
| ------ | ----------------- | --------- | --------------------- |
| POST   | `/api/auth/login` | Đăng nhập | `{ email, password }` |

### 8.2. Products

| Method | Endpoint                            | Mô tả                  | Body     |
| ------ | ----------------------------------- | ---------------------- | -------- |
| GET    | `/api/admin/products`               | Lấy danh sách sản phẩm | -        |
| GET    | `/api/admin/products/:id`           | Lấy chi tiết sản phẩm  | -        |
| POST   | `/api/admin/products/add`           | Thêm sản phẩm mới      | FormData |
| PUT    | `/api/admin/products/update/:id`    | Cập nhật sản phẩm      | FormData |
| DELETE | `/api/admin/products/delete/:id`    | Xóa sản phẩm           | -        |
| POST   | `/api/admin/products/upload-single` | Upload ảnh             | FormData |

### 8.3. Response Format

```json
// Thành công
{
  "success": true,
  "data": { ... }
}

// Lỗi
{
  "success": false,
  "msg": "Error message"
}
```

---

## 📝 Ghi chú

- Dự án sử dụng **Tailwind CSS** (inline classes) cho styling
- Tất cả API requests đều được proxy qua Vite đến `http://localhost:5000`
- Token được lưu trong `localStorage` để persist khi refresh trang
- Sử dụng **Lazy Loading** cho các components để tối ưu hiệu năng

---

## 👥 Tác giả

- **Sinh viên:** [Tên sinh viên]
- **MSSV:** [Mã số sinh viên]
- **Lớp:** [Tên lớp]
- **Môn học:** [Tên môn học]
- **Giảng viên:** [Tên giảng viên]

---

© 2026 Admin Dashboard - Hệ thống Quản lý Ecommerce
