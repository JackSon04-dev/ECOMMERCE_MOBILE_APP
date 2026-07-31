// ============================================================================
// FILE: router/index.js
// PURPOSE: Configure Vue Router - Manage navigation and protect pages
// ============================================================================

// -----------------------------------------------------------------------------
// 1. IMPORT FUNCTIONS FROM VUE-ROUTER LIBRARY
// -----------------------------------------------------------------------------
// createRouter: Function creating router instance for the app
// createWebHistory: Uses browser's History API (clean URL, no #)
//   - Example: /dashboard instead of /#/dashboard
import { createRouter, createWebHistory } from 'vue-router'

// -----------------------------------------------------------------------------
// 2. IMPORT useAuth COMPOSABLE FROM useAuth.js
// -----------------------------------------------------------------------------
// useAuth() returns:
//   - isAuthenticated: computed(() => !!token.value) -> true if token exists
//   - currentUser: current logged in user info
//   - login(), logout(): login/logout functions
// USED TO: Check login status in Navigation Guard
import { useAuth } from '../composables/useAuth'

// -----------------------------------------------------------------------------
// 3. LAZY LOAD COMPONENTS - LOAD COMPONENT WHEN NEEDED (PERFORMANCE OPTIMIZATION)
// -----------------------------------------------------------------------------
// Instead of: import LoginView from '../views/LoginView.vue' (immediate load)
// Use: () => import(...) (only load when user accesses that route)
// BENEFIT: Reduce initial bundle size, improve page load speed

const LoginView = () => import('../views/LoginView.vue')
// -> Login page (full screen, no sidebar)

const MainLayout = () => import('../layouts/MainLayout.vue')
// -> Main layout contains Sidebar + Header + <router-view/> for sub pages

const DashboardView = () => import('../views/DashboardView.vue')
// -> Overview page (reports, statistics)

const ProductView = () => import('../views/product/ProductView.vue')
// -> Product list page

const AddProductView = () => import('../views/product/AddProductView.vue')
// -> Add new product page

const ProductDetailView = () => import('../views/product/ProductDetailView.vue')
// -> Product details/edit page (receives id from URL)

const UserView = () => import('../views/user/UserView.vue')
// -> User management page

const VoucherView = () => import('../views/voucher/VoucherView.vue')
// -> Voucher list page

const AddVoucherView = () => import('../views/voucher/AddVoucherView.vue')
// -> Add new voucher page

const VoucherDetailView = () => import('../views/voucher/VoucherDetailView.vue')
// -> Voucher details/edit page

const OrderView = () => import('../views/order/OrderView.vue')
// -> Order list page

const OrderDetailView = () => import('../views/order/OrderDetailView.vue')
// -> Order details page

const ReviewListView = () => import('../views/review/reviewList.vue')
// -> Review list page

const ReviewDetailView = () => import('../views/review/reviewDetail.vue')
// -> Review details page

const NotificationView = () => import('../views/notification/NotificationView.vue')
// -> Notification management page

// -----------------------------------------------------------------------------
// 4. DEFINE ROUTES - URL <-> COMPONENT MAPPING TABLE
// -----------------------------------------------------------------------------
const routes = [
  // -------------------------------------------------------------------------
  // ROUTE 1: Login page (NO login required to access)
  // -------------------------------------------------------------------------
  {
    path: '/login', // URL in browser
    name: 'login', // Route name (used for router.push({ name: 'login' }))
    component: LoginView, // Rendered component
    meta: { requiresAuth: false } // Metadata: NO login required
  },

  // -------------------------------------------------------------------------
  // ROUTE 2: Main layout (LOGIN REQUIRED to access)
  // -------------------------------------------------------------------------
  {
    path: '/', // Root route
    component: MainLayout, // Render MainLayout (Sidebar + Header)
    meta: { requiresAuth: true }, // Metadata: LOGIN REQUIRED
    // -----------------------------------------------------------------------
    // CHILDREN: Child routes rendered into <router-view/> of MainLayout
    // -----------------------------------------------------------------------
    children: [
      {
        path: '', // URL: / (empty)
        redirect: '/dashboard' // Automatically redirect to /dashboard
      },
      {
        path: 'dashboard', // URL: /dashboard
        name: 'dashboard',
        component: DashboardView // Render into <router-view/> of MainLayout
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
        path: 'products/:id', // Dynamic URL: /products/123, /products/abc
        name: 'product-detail',
        component: ProductDetailView,
        props: true // Pass :id as props to component
        // → Trong ProductDetailView: const props = defineProps(['id'])
        // -> props.id = "123" when URL is /products/123
      },
      {
        path: 'users', // URL: /users
        name: 'users',
        component: UserView
        // -> User list management page
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
        path: 'vouchers/:id', // Dynamic URL: /vouchers/123
        name: 'voucher-detail',
        component: VoucherDetailView,
        props: true
      },
      {
        path: 'orders', // URL: /orders
        name: 'orders',
        component: OrderView
        // -> Order list management page
      },
      {
        path: 'orders/:id', // Dynamic URL: /orders/123
        name: 'order-detail',
        component: OrderDetailView,
        props: true
        // -> Order details page
      },
      {
        path: 'reviews', // URL: /reviews
        name: 'reviews',
        component: ReviewListView
        // -> Review list management page
      },
      {
        path: 'reviews/:id', // Dynamic URL: /reviews/123
        name: 'review-detail',
        component: ReviewDetailView,
        props: true
        // -> Review details page
      },
      {
        path: 'notifications', // URL: /notifications
        name: 'notifications',
        component: NotificationView
        // -> Notification management page
      }
    ]
  }
]

// -----------------------------------------------------------------------------
// 5. CREATE ROUTER INSTANCE
// -----------------------------------------------------------------------------
const router = createRouter({
  // createWebHistory(): Use History API (clean URL)
  // - /dashboard (with history)
  // - If using createWebHashHistory(): /#/dashboard (with hash)
  history: createWebHistory(),

  // Array of defined routes above
  routes
})

// -----------------------------------------------------------------------------
// 6. NAVIGATION GUARD - PROTECT ROUTES BEFORE ACCESS
// -----------------------------------------------------------------------------
// beforeEach() is called BEFORE EVERY page navigation
// Parameters:
//   - to: Target route (where user wants to go)
//   - from: Current route (where user is)
//   - next: Control function (allow/block/redirect)
router.beforeEach((to, from, next) => {
  // Call useAuth() from composables/useAuth.js file
  // Get isAuthenticated: computed returns true if token exists in localStorage
  const { isAuthenticated } = useAuth()

  // -------------------------------------------------------------------------
  // CASE 1: Page REQUIRES login + User is NOT logged in
  // -------------------------------------------------------------------------
  // Example: User types /dashboard but not logged in
  // → to.meta.requiresAuth = true
  // → isAuthenticated.value = false
  // -> Redirect to login page
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next({ name: 'login' }) // Call next() with object -> Redirect
  }

  // -------------------------------------------------------------------------
  // CASE 2: User ALREADY logged in + Trying to access login page
  // -------------------------------------------------------------------------
  // Example: User already logged in, types /login
  // -> No need to login again, redirect straight to dashboard
  else if (to.name === 'login' && isAuthenticated.value) {
    next({ name: 'dashboard' }) // Redirect to dashboard
  }

  // -------------------------------------------------------------------------
  // CASE 3: Other cases -> Allow normal access
  // -------------------------------------------------------------------------
  else {
    next() // Call next() without parameters -> Allow proceeding
  }
})

// -----------------------------------------------------------------------------
// 7. EXPORT ROUTER FOR USE IN main.js
// -----------------------------------------------------------------------------
// Trong main.js: createApp(App).use(router).mount('#app')
// -> Register router into Vue app
export default router
