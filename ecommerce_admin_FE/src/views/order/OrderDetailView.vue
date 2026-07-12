<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-4">
        <router-link
          :to="{ name: 'orders' }"
          class="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </router-link>
        <div>
          <h2 class="text-2xl font-bold text-gray-800">Chi tiết đơn hàng</h2>
          <p class="text-sm text-gray-500">
            Mã đơn: #{{ order.id?.slice(-8).toUpperCase() }}
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <span
          :class="getStatusClass(order.status)"
          class="px-4 py-2 rounded-full text-sm font-bold uppercase"
        >
          {{ order.status }}
        </span>
        <span
          :class="
            order.isPaid
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-orange-100 text-orange-600'
          "
          class="px-4 py-2 rounded-full text-sm font-bold uppercase"
        >
          {{ order.isPaid ? 'Đã thanh toán' : 'Chưa thanh toán' }}
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="bg-white rounded-2xl shadow-sm border p-20 text-center"
    >
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
      <p class="mt-2 text-gray-400">Đang tải dữ liệu...</p>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Customer Info -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3
              class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Thông tin khách hàng
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-400 uppercase mb-1">Họ tên</p>
                <p class="font-bold text-gray-800">
                  {{ order.userInfo?.username || 'Chưa cập nhật' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase mb-1">
                  Số điện thoại
                </p>
                <p class="font-bold text-gray-800">
                  {{ order.userInfo?.phoneNumber || 'Chưa cập nhật' }}
                </p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-gray-400 uppercase mb-1">
                  Địa chỉ giao hàng
                </p>
                <p class="font-bold text-gray-800">
                  {{ order.userInfo?.address || 'Chưa cập nhật' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase mb-1">
                  Phương thức thanh toán
                </p>
                <p class="font-bold text-gray-800">
                  {{ order.paymentMethod || 'COD' }}
                </p>
              </div>
              <div>
                <p class="text-xs text-gray-400 uppercase mb-1">
                  Ngày đặt hàng
                </p>
                <p class="font-bold text-gray-800">
                  {{ formatDate(order.createdAt) }}
                </p>
              </div>
            </div>
          </div>

          <!-- Order Items -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3
              class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
              Sản phẩm đặt hàng ({{ order.orderItems?.length || 0 }} sản phẩm)
            </h3>
            <div class="divide-y divide-gray-100">
              <div
                v-for="(item, index) in order.orderItems"
                :key="index"
                class="py-4 flex gap-4"
              >
                <!-- Product Image -->
                <div
                  class="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0"
                >
                  <img
                    :src="item.variant?.colorImage || '/placeholder.png'"
                    :alt="item.productName"
                    class="w-full h-full object-cover"
                    @error="$event.target.src = '/placeholder.png'"
                  />
                </div>

                <!-- Product Info -->
                <div class="flex-1">
                  <h4 class="font-bold text-gray-800">
                    {{ item.productName }}
                  </h4>

                  <!-- Variant Info -->
                  <div v-if="item.variant" class="mt-1 text-sm text-gray-500">
                    <span
                      v-if="item.variant.color"
                      class="inline-flex items-center gap-1 mr-3"
                    >
                      <span
                        class="w-4 h-4 rounded-full border"
                        :style="{
                          backgroundColor: getColorCode(item.variant.color)
                        }"
                      ></span>
                      {{ item.variant.color }}
                    </span>
                    <span v-if="item.variant.size" class="mr-3">
                      Size: <strong>{{ item.variant.size }}</strong>
                    </span>
                    <span v-if="item.variant.quantity" class="mr-3">
                      SL: <strong>{{ item.variant.quantity }}</strong>
                    </span>
                  </div>

                  <!-- Price & Quantity -->
                  <div class="mt-2 flex items-center justify-between">
                    <div class="text-sm text-gray-500">
                      {{ formatCurrency(item.finalPrice) }} x
                      {{ item.variant?.quantity || 1 }}
                    </div>
                    <div class="font-bold text-emerald-600">
                      {{ formatCurrency(item.itemTotal) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Order Summary -->
            <div class="mt-4 pt-4 border-t border-gray-200 space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Tạm tính</span>
                <span class="text-gray-800">{{
                  formatCurrency(order.itemsPrice || calculateSubtotal())
                }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-500">Phí vận chuyển</span>
                <span class="text-gray-800">{{
                  formatCurrency(order.shippingPrice || 0)
                }}</span>
              </div>
              <div
                v-if="order.voucher?.discountAmount"
                class="flex justify-between text-sm"
              >
                <span class="text-gray-500">
                  Giảm giá
                  <span class="text-emerald-600 font-medium"
                    >({{ order.voucher.voucherCode }})</span
                  >
                </span>
                <span class="text-red-500"
                  >-{{ formatCurrency(order.voucher.discountAmount) }}</span
                >
              </div>
              <div class="flex justify-between text-lg font-bold pt-2 border-t">
                <span class="text-gray-800">Tổng cộng</span>
                <span class="text-emerald-600">{{
                  formatCurrency(order.totalPrice)
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column - Actions -->
        <div class="space-y-6">
          <!-- Update Order Status -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3
              class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Cập nhật trạng thái đơn hàng
            </h3>

            <!-- Status Timeline -->
            <div class="mb-4">
              <div
                class="flex items-center justify-between text-xs text-gray-400 mb-2"
              >
                <span>Tiến độ đơn hàng</span>
                <span>{{ getStatusProgress() }}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div
                  class="h-2 rounded-full transition-all duration-500"
                  :class="
                    order.status === 'Đã hủy' ? 'bg-red-500' : 'bg-emerald-500'
                  "
                  :style="{ width: getStatusProgress() }"
                ></div>
              </div>
            </div>

            <div class="space-y-2">
              <button
                v-for="status in orderStatuses"
                :key="status"
                @click="updateOrderStatus(status)"
                :disabled="!canChangeToStatus(status) || updatingStatus"
                :class="[
                  'w-full py-2.5 px-4 rounded-xl font-bold text-sm transition flex items-center justify-between',
                  order.status === status
                    ? 'bg-emerald-500 text-white'
                    : canChangeToStatus(status)
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                ]"
              >
                <span>{{ status }}</span>
                <svg
                  v-if="order.status === status"
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
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </button>
            </div>

            <!-- Last Updated Time -->
            <div
              class="mt-4 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-gray-400"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                >Cập nhật lúc:
                <strong class="text-gray-500">{{
                  formatDate(order.updatedAt)
                }}</strong></span
              >
            </div>

            <!-- Cancel Button -->
            <button
              v-if="canCancelOrder()"
              @click="updateOrderStatus('Đã hủy')"
              :disabled="updatingStatus"
              class="w-full mt-4 py-2.5 px-4 rounded-xl font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition flex items-center justify-center gap-2"
            >
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Hủy đơn hàng
            </button>
          </div>

          <!-- Update Payment Status -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3
              class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-5 w-5 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Trạng thái thanh toán
            </h3>

            <div class="flex gap-2">
              <button
                @click="updatePaymentStatus(true)"
                :disabled="updatingPayment"
                :class="[
                  'flex-1 py-3 px-4 rounded-xl font-bold text-sm transition',
                  order.isPaid
                    ? 'bg-emerald-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-600'
                ]"
              >
                ✓ Đã thanh toán
              </button>
              <button
                @click="updatePaymentStatus(false)"
                :disabled="updatingPayment"
                :class="[
                  'flex-1 py-3 px-4 rounded-xl font-bold text-sm transition',
                  !order.isPaid
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-orange-100 hover:text-orange-600'
                ]"
              >
                ✗ Chưa thanh toán
              </button>
            </div>

            <!-- Paid At Time -->
            <div
              v-if="order.isPaid && order.paidAt"
              class="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1.5 text-xs text-emerald-600"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                >Thanh toán lúc:
                <strong>{{ formatDate(order.paidAt) }}</strong></span
              >
            </div>
          </div>

          <!-- Order Notes -->
          <div
            v-if="order.note"
            class="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-6"
          >
            <h3
              class="text-lg font-bold text-yellow-800 mb-2 flex items-center gap-2"
            >
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
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Ghi chú đơn hàng
            </h3>
            <p class="text-yellow-700">{{ order.note }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

// Props
const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

// State
const order = ref({})
const loading = ref(true)
const updatingStatus = ref(false)
const updatingPayment = ref(false)

// Order statuses (excluding 'Đã hủy' - handled separately)
const orderStatuses = [
  'Chờ xác nhận',
  'Đã xác nhận',
  'Đang giao',
  'Đã giao',
  'Thành công'
]

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

// Get color code from color name
const getColorCode = (colorName) => {
  const colorMap = {
    Đen: '#000000',
    Trắng: '#FFFFFF',
    Đỏ: '#EF4444',
    Xanh: '#3B82F6',
    'Xanh dương': '#3B82F6',
    'Xanh lá': '#22C55E',
    Vàng: '#EAB308',
    Cam: '#F97316',
    Hồng: '#EC4899',
    Tím: '#A855F7',
    Nâu: '#92400E',
    Xám: '#6B7280',
    Be: '#D4C4A8',
    Kem: '#FFFDD0'
  }
  return colorMap[colorName] || '#6B7280'
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

// Get status progress
const getStatusProgress = () => {
  if (order.value.status === 'Đã hủy') return '100%'
  const index = orderStatuses.indexOf(order.value.status)
  if (index === -1) return '0%'
  return `${((index + 1) / orderStatuses.length) * 100}%`
}

// Check if can change to status
const canChangeToStatus = (status) => {
  const currentStatus = order.value.status

  // Cannot change if already cancelled or completed
  if (currentStatus === 'Đã hủy' || currentStatus === 'Thành công') {
    return false
  }

  const currentIndex = orderStatuses.indexOf(currentStatus)
  const targetIndex = orderStatuses.indexOf(status)

  // Can only move to next status or current status
  return targetIndex === currentIndex + 1 || targetIndex === currentIndex
}

// Check if can cancel order
const canCancelOrder = () => {
  return order.value.status !== 'Đã hủy' && order.value.status !== 'Thành công'
}

// Calculate subtotal
const calculateSubtotal = () => {
  if (!order.value.orderItems) return 0
  return order.value.orderItems.reduce(
    (sum, item) =>
      sum + (item.itemTotal || item.finalPrice * (item.variant?.quantity || 1)),
    0
  )
}

// Fetch order detail
const fetchOrder = async () => {
  try {
    loading.value = true
    const res = await axios.get(`/api/admin/orders/${props.id}`)
    order.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng:', error)
    alert('Không thể tải thông tin đơn hàng!')
    router.push({ name: 'orders' })
  } finally {
    loading.value = false
  }
}

// Update order status
const updateOrderStatus = async (status) => {
  if (
    !confirm(`Bạn có chắc muốn chuyển trạng thái đơn hàng sang "${status}"?`)
  ) {
    return
  }

  try {
    updatingStatus.value = true
    const res = await axios.put(`/api/admin/orders/${props.id}/status`, {
      status
    })
    order.value = res.data.data
    alert(`Đã cập nhật trạng thái đơn hàng thành "${status}"`)
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  } finally {
    updatingStatus.value = false
  }
}

// Update payment status
const updatePaymentStatus = async (isPaid) => {
  const action = isPaid ? 'đã thanh toán' : 'chưa thanh toán'

  if (!confirm(`Bạn có chắc muốn đánh dấu đơn hàng "${action}"?`)) {
    return
  }

  try {
    updatingPayment.value = true
    const res = await axios.put(`/api/admin/orders/${props.id}/payment`, {
      isPaid
    })
    order.value = res.data.data
    alert(`Đã đánh dấu đơn hàng "${action}"`)
  } catch (error) {
    console.error('Lỗi cập nhật thanh toán:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  } finally {
    updatingPayment.value = false
  }
}

// Fetch on mount
onMounted(fetchOrder)
</script>
