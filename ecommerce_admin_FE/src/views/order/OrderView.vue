<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý đơn hàng</h2>
      <div class="text-sm text-gray-500">
        Tổng số:
        <span class="font-bold text-emerald-600">{{ allOrders.length }}</span>
        đơn hàng
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <div class="bg-white p-4 rounded-xl shadow-sm border text-center">
        <div class="text-2xl font-bold text-gray-800">
          {{ statistics.totalOrders }}
        </div>
        <div class="text-xs text-gray-500 mt-1">Tổng đơn</div>
      </div>
      <div
        class="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-200 text-center"
      >
        <div class="text-2xl font-bold text-yellow-600">
          {{ statistics.ordersByStatus?.pending || 0 }}
        </div>
        <div class="text-xs text-yellow-600 mt-1">Chờ xác nhận</div>
      </div>
      <div
        class="bg-blue-50 p-4 rounded-xl shadow-sm border border-blue-200 text-center"
      >
        <div class="text-2xl font-bold text-blue-600">
          {{ statistics.ordersByStatus?.confirmed || 0 }}
        </div>
        <div class="text-xs text-blue-600 mt-1">Đã xác nhận</div>
      </div>
      <div
        class="bg-purple-50 p-4 rounded-xl shadow-sm border border-purple-200 text-center"
      >
        <div class="text-2xl font-bold text-purple-600">
          {{ statistics.ordersByStatus?.shipping || 0 }}
        </div>
        <div class="text-xs text-purple-600 mt-1">Đang giao</div>
      </div>
      <div
        class="bg-indigo-50 p-4 rounded-xl shadow-sm border border-indigo-200 text-center"
      >
        <div class="text-2xl font-bold text-indigo-600">
          {{ statistics.ordersByStatus?.delivered || 0 }}
        </div>
        <div class="text-xs text-indigo-600 mt-1">Đã giao</div>
      </div>
      <div
        class="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200 text-center"
      >
        <div class="text-2xl font-bold text-emerald-600">
          {{ statistics.ordersByStatus?.completed || 0 }}
        </div>
        <div class="text-xs text-emerald-600 mt-1">Thành công</div>
      </div>
      <div
        class="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200 text-center"
      >
        <div class="text-2xl font-bold text-red-600">
          {{ statistics.ordersByStatus?.cancelled || 0 }}
        </div>
        <div class="text-xs text-red-600 mt-1">Đã hủy</div>
      </div>
    </div>

    <!-- Search & Filter -->
    <div
      class="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-4 items-end"
    >
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Tìm kiếm theo SĐT / Username
        </label>
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nhập SĐT hoặc tên khách hàng..."
            class="w-full border p-2.5 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition"
            @keyup.enter="handleSearch"
          />
          <span class="absolute left-3 top-3 text-gray-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
        </div>
      </div>

      <div class="w-48">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Trạng thái đơn hàng
        </label>
        <select
          v-model="filterStatus"
          class="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả</option>
          <option value="Chờ xác nhận">Chờ xác nhận</option>
          <option value="Đã xác nhận">Đã xác nhận</option>
          <option value="Đang giao">Đang giao</option>
          <option value="Đã giao">Đã giao</option>
          <option value="Thành công">Thành công</option>
          <option value="Đã hủy">Đã hủy</option>
        </select>
      </div>

      <div class="w-48">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Trạng thái thanh toán
        </label>
        <select
          v-model="filterPayment"
          class="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả</option>
          <option value="paid">Đã thanh toán</option>
          <option value="unpaid">Chưa thanh toán</option>
        </select>
      </div>

      <button
        @click="handleSearch"
        class="bg-gray-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
      >
        TÌM KIẾM
      </button>
    </div>

    <!-- Order Table -->
    <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider"
        >
          <tr>
            <th class="px-6 py-4">Mã đơn hàng</th>
            <th class="px-6 py-4">Khách hàng</th>
            <th class="px-6 py-4">Số điện thoại</th>
            <th class="px-6 py-4 text-right">Tổng tiền</th>
            <th class="px-6 py-4 text-center">Trạng thái đơn</th>
            <th class="px-6 py-4 text-center">Thanh toán</th>
            <th class="px-6 py-4">Ngày đặt</th>
            <th class="px-6 py-4 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="order in displayOrders"
            :key="order.id"
            class="hover:bg-gray-50 transition"
          >
            <!-- Order ID -->
            <td class="px-6 py-4 font-mono text-sm text-gray-600">
              #{{ order.id?.slice(-8).toUpperCase() }}
            </td>

            <!-- Username -->
            <td class="px-6 py-4 font-bold text-gray-800">
              {{ order.userInfo?.username || 'Không có tên' }}
            </td>

            <!-- Phone Number -->
            <td class="px-6 py-4 text-gray-600 text-sm">
              {{ order.userInfo?.phoneNumber || 'Chưa cập nhật' }}
            </td>

            <!-- Total Price -->
            <td class="px-6 py-4 text-right font-bold text-emerald-600">
              {{ formatCurrency(order.totalPrice) }}
            </td>

            <!-- Order Status -->
            <td class="px-6 py-4 text-center">
              <span
                :class="getStatusClass(order.status)"
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
              >
                {{ order.status }}
              </span>
            </td>

            <!-- Payment Status -->
            <td class="px-6 py-4 text-center">
              <span
                :class="
                  order.isPaid
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-orange-100 text-orange-600'
                "
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase"
              >
                {{ order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán' }}
              </span>
            </td>

            <!-- Created At -->
            <td class="px-6 py-4 text-gray-500 text-sm">
              {{ formatDate(order.createdAt) }}
            </td>

            <!-- Actions -->
            <td class="px-6 py-4 text-center">
              <router-link
                :to="{ name: 'order-detail', params: { id: order.id } }"
                class="inline-flex items-center gap-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                Chi tiết
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div
        v-if="displayOrders.length === 0 && !loading"
        class="p-20 text-center text-gray-400 italic"
      >
        Không tìm thấy đơn hàng nào phù hợp với bộ lọc...
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="p-20 text-center text-gray-400">
        <svg
          class="animate-spin h-8 w-8 mx-auto text-emerald-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p class="mt-2">Đang tải dữ liệu...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// State
const allOrders = ref([])
const displayOrders = ref([])
const statistics = ref({})
const loading = ref(true)

const searchQuery = ref('')
const filterStatus = ref('')
const filterPayment = ref('')

// Format currency
const formatCurrency = (value) => {
  if (!value) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'Chưa cập nhật'
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get status class
const getStatusClass = (status) => {
  const classes = {
    'Chờ xác nhận': 'bg-yellow-100 text-yellow-600',
    'Đã xác nhận': 'bg-blue-100 text-blue-600',
    'Đang giao': 'bg-purple-100 text-purple-600',
    'Đã giao': 'bg-indigo-100 text-indigo-600',
    'Thành công': 'bg-emerald-100 text-emerald-600',
    'Đã hủy': 'bg-red-100 text-red-600'
  }
  return classes[status] || 'bg-gray-100 text-gray-600'
}

// Fetch orders
const fetchOrders = async () => {
  try {
    loading.value = true
    const res = await axios.get('/api/admin/orders')
    allOrders.value = res.data.data
    displayOrders.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng:', error)
  } finally {
    loading.value = false
  }
}

// Fetch statistics
const fetchStatistics = async () => {
  try {
    const res = await axios.get('/api/admin/orders/statistics')
    statistics.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error)
  }
}

// Handle search
const handleSearch = () => {
  displayOrders.value = allOrders.value.filter((order) => {
    // Search by phone or username
    const searchLower = searchQuery.value.toLowerCase()
    const matchSearch =
      !searchQuery.value ||
      order.userInfo?.phoneNumber?.includes(searchQuery.value) ||
      order.userInfo?.username?.toLowerCase().includes(searchLower)

    // Filter by order status
    const matchStatus =
      !filterStatus.value || order.status === filterStatus.value

    // Filter by payment status
    let matchPayment = true
    if (filterPayment.value === 'paid') {
      matchPayment = order.isPaid === true
    } else if (filterPayment.value === 'unpaid') {
      matchPayment = order.isPaid === false
    }

    return matchSearch && matchStatus && matchPayment
  })
}

// Fetch data on mount
onMounted(() => {
  fetchOrders()
  fetchStatistics()
})
</script>
