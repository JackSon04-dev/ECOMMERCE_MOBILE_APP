<template>
  <div class="space-y-6">
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

    <template v-else-if="review">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <router-link
            :to="{ name: 'reviews' }"
            class="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-700 font-medium"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Quay về
          </router-link>
          <h2 class="text-2xl font-bold text-gray-800">Chi tiết đánh giá</h2>
        </div>
        <span
          :class="
            review.isActive
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-red-100 text-red-600'
          "
          class="px-4 py-2 rounded-full text-sm font-bold uppercase"
        >
          {{ review.isActive ? 'Đang hiển thị' : 'Đã ẩn' }}
        </span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Review Content -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Rating & Comment -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">
              Nội dung đánh giá
            </h3>

            <!-- Rating Stars -->
            <div class="flex items-center gap-3 mb-4">
              <div class="flex items-center gap-1">
                <svg
                  v-for="star in 5"
                  :key="star"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-8 w-8"
                  :class="
                    star <= review.rating ? 'text-yellow-400' : 'text-gray-300'
                  "
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              </div>
              <span class="text-2xl font-bold text-gray-800"
                >{{ review.rating }}/5</span
              >
            </div>

            <!-- Comment -->
            <div class="bg-gray-50 rounded-xl p-4">
              <p class="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {{
                  review.comment || 'Người dùng không để lại nội dung đánh giá.'
                }}
              </p>
            </div>

            <!-- Review Images (if any) -->
            <div v-if="review.images && review.images.length > 0" class="mt-4">
              <h4 class="text-sm font-bold text-gray-500 mb-2">
                Hình ảnh đính kèm
              </h4>
              <div class="flex gap-2 flex-wrap">
                <img
                  v-for="(img, index) in review.images"
                  :key="index"
                  :src="img"
                  class="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition"
                  @click="openImage(img)"
                />
              </div>
            </div>

            <!-- Meta Info -->
            <div class="mt-6 pt-4 border-t flex flex-wrap gap-4">
              <div class="text-sm text-gray-500">
                Đánh giá lúc:
                <span class="font-medium">{{
                  formatDate(review.createdAt)
                }}</span>
              </div>
              <div
                v-if="review.updatedAt !== review.createdAt"
                class="text-sm text-gray-500"
              >
                Cập nhật:
                <span class="font-medium">{{
                  formatDate(review.updatedAt)
                }}</span>
              </div>
            </div>
          </div>

          <!-- Product Info -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">
              Sản phẩm được đánh giá
            </h3>
            <div class="flex items-center gap-4">
              <img
                :src="review.product?.thumbnail || '/placeholder.png'"
                :alt="review.product?.name"
                class="w-20 h-20 rounded-xl object-cover bg-gray-100 border"
              />
              <div>
                <h4 class="font-bold text-gray-800 text-lg">
                  {{ review.product?.name || 'Sản phẩm không tồn tại' }}
                </h4>
                <p class="text-emerald-600 font-bold mt-1">
                  {{ formatCurrency(review.product?.price) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- User Info -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">
              Thông tin người đánh giá
            </h3>
            <div class="space-y-3">
              <div class="flex items-center gap-3">
                <div
                  class="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center"
                >
                  <span class="text-emerald-600 font-bold text-lg">
                    {{ review.user?.username?.charAt(0)?.toUpperCase() || '?' }}
                  </span>
                </div>
                <div>
                  <div class="font-bold text-gray-800">
                    {{ review.user?.username || 'Ẩn danh' }}
                  </div>
                  <div class="text-sm text-gray-500">
                    {{ review.user?.email || 'Không có email' }}
                  </div>
                </div>
              </div>
              <div
                v-if="review.user?.phoneNumber"
                class="flex items-center gap-2 text-sm text-gray-600"
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
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
                {{ review.user.phoneNumber }}
              </div>
            </div>
          </div>

          <!-- Status Management -->
          <div class="bg-white rounded-2xl shadow-sm border p-6">
            <h3 class="text-sm font-bold text-gray-400 uppercase mb-4">
              Quản lý trạng thái
            </h3>
            <p class="text-sm text-gray-600 mb-4">
              {{
                review.isActive
                  ? 'Đánh giá này đang được hiển thị công khai trên trang sản phẩm.'
                  : 'Đánh giá này đã bị ẩn và không hiển thị trên trang sản phẩm.'
              }}
            </p>
            <button
              @click="toggleReviewStatus"
              :disabled="updating"
              :class="
                review.isActive
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              "
              class="w-full text-white px-4 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <svg
                v-if="updating"
                class="animate-spin h-5 w-5"
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
              <template v-else>
                <svg
                  v-if="review.isActive"
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
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
                <svg
                  v-else
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                {{ review.isActive ? 'Ẩn đánh giá' : 'Hiển thị đánh giá' }}
              </template>
            </button>
          </div>

          <!-- Review ID -->
          <div class="bg-gray-50 rounded-2xl p-4 text-center">
            <div class="text-xs text-gray-400 uppercase">Mã đánh giá</div>
            <div class="font-mono text-sm text-gray-600 mt-1">
              #{{ review._id?.slice(-8).toUpperCase() }}
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Not Found State -->
    <div v-else-if="!loading" class="p-20 text-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-16 w-16 mx-auto text-gray-300 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <h3 class="text-lg font-bold text-gray-600">Không tìm thấy đánh giá</h3>
      <p class="text-gray-400 mt-2">
        Đánh giá này có thể đã bị xóa hoặc không tồn tại.
      </p>
      <router-link
        :to="{ name: 'reviews' }"
        class="inline-block mt-4 bg-emerald-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-emerald-600 transition"
      >
        Quay lại danh sách
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

// State
const review = ref(null)
const loading = ref(true)
const updating = ref(false)

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

// Format currency
const formatCurrency = (value) => {
  if (!value) return '0 ₫'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(value)
}

// Fetch review detail
const fetchReview = async () => {
  try {
    loading.value = true
    const res = await axios.get(`/api/admin/reviews/${route.params.id}`)
    review.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy chi tiết đánh giá:', error)
    review.value = null
  } finally {
    loading.value = false
  }
}

// Toggle review status
const toggleReviewStatus = async () => {
  const newStatus = !review.value.isActive
  const action = newStatus ? 'hiển thị' : 'ẩn'

  if (!confirm(`Bạn có chắc muốn ${action} đánh giá này?`)) {
    return
  }

  try {
    updating.value = true
    await axios.put(`/api/admin/reviews/status/${review.value._id}`, {
      isActive: newStatus
    })

    // Update local state
    review.value.isActive = newStatus
    alert(`Đã ${action} đánh giá thành công!`)
  } catch (error) {
    console.error('Error toggling review status:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  } finally {
    updating.value = false
  }
}

// Open image in new tab
const openImage = (url) => {
  window.open(url, '_blank')
}

// Fetch data on mount
onMounted(() => {
  fetchReview()
})
</script>
