<template>
  <!-- Sidebar container: fixed width, dark gray background, full screen height, with shadow -->
  <aside
    class="w-84 bg-red-950 text-white h-screen shadow-xl flex-shrink-0 flex flex-col"
  >
    <!-- Header: Sidebar title with bottom border, green text -->
    <div
      class="p-6 text-2xl font-bold border-b border-slate-700 text-emerald-400"
    >
      S-SHOP MENU
    </div>

    <!-- Navigation menu: iterate through menu array, use router-link to navigate -->
    <nav class="mt-6 flex-1">
      <!-- Menu item: shows icon + name, gray on hover, green on active (current page) -->
      <router-link
        v-for="item in menu"
        :key="item.name"
        :to="item.path"
        class="flex items-center px-6 py-4 cursor-pointer hover:bg-slate-700 transition-colors"
        active-class="bg-emerald-600"
      >
        <!-- Menu icon: shows emoji or symbol -->
        <span class="mr-3">{{ item.icon }}</span>
        <!-- Menu item name -->
        {{ item.name }}
      </router-link>
    </nav>
  </aside>
</template>

<script setup>
// Data: menu array containing navigation items
// Each item has structure:
//   - path (String): route path of Vue Router
//   - name (String): display name on UI
//   - icon (String): emoji or symbol character
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
