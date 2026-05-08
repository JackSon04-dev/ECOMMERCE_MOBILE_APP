<template>
  <!-- Sidebar container: chiều rộng cố định, nền xám đen, chiều cao toàn màn hình, có bóng đổ -->
  <aside
    class="w-84 bg-red-950 text-white h-screen shadow-xl flex-shrink-0 flex flex-col"
  >
    <!-- Header: tiêu đề Sidebar với border dưới, chữ màu xanh lá -->
    <div
      class="p-6 text-2xl font-bold border-b border-slate-700 text-emerald-400"
    >
      S-SHOP MENU
    </div>

    <!-- Navigation menu: lặp qua mảng menu, dùng router-link để điều hướng -->
    <nav class="mt-6 flex-1">
      <!-- Menu item: hiển thị icon + tên, hover có màu xám, active (trang hiện tại) có màu xanh -->
      <router-link
        v-for="item in menu"
        :key="item.name"
        :to="item.path"
        class="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-700 transition-colors"
        active-class="bg-emerald-600"
      >
        <!-- Icon menu: hiển thị emoji hoặc biểu tượng -->
        <span class="mr-3">{{ item.icon }}</span>
        <!-- Tên menu item -->
        {{ item.name }}
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
// Data: mảng menu chứa các mục điều hướng
// Mỗi item có cấu trúc:
//   - path (String): đường dẫn route của Vue Router
//   - name (String): tên hiển thị trên UI
//   - icon (String): emoji hoặc ký tự biểu tượng
const menu = [
  { path: '/dashboard', name: 'Dashboard', icon: '📊' },
  { path: '/products', name: 'Sản phẩm', icon: '📦' },
  { path: '/orders', name: 'Đơn hàng', icon: '🛒' },
  { path: '/vouchers', name: 'Voucher', icon: '🎟️' },
  { path: '/reviews', name: 'Đánh giá', icon: '⭐' },
  { path: '/notifications', name: 'Thông báo', icon: '🔔' },
  { path: '/users', name: 'Người dùng', icon: '👥' }
]
</script>
