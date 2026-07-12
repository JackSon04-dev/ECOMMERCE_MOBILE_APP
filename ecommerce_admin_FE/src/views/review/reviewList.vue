<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý đánh giá</h2>
      <div class="text-sm text-gray-500">
        Tổng số:
        <span class="font-bold text-emerald-600">{{ allReviews.length }}</span>
        đánh giá
      </div>
    </div>

    <!-- Statistics Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <div class="bg-white p-4 rounded-xl shadow-sm border text-center">
        <div class="text-2xl font-bold text-gray-800">
          {{ statistics.totalReviews || 0 }}
        </div>
        <div class="text-xs text-gray-500 mt-1">Tổng đánh giá</div>
      </div>
      <div
        class="bg-yellow-50 p-4 rounded-xl shadow-sm border border-yellow-200 text-center"
      >
        <div
          class="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
          {{ statistics.averageRating || 0 }}
        </div>
        <div class="text-xs text-yellow-600 mt-1">Điểm trung bình</div>
      </div>
      <div
        class="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-200 text-center"
      >
        <div class="text-2xl font-bold text-emerald-600">
          {{ statistics.activeCount || 0 }}
        </div>
        <div class="text-xs text-emerald-600 mt-1">Đang hiển thị</div>
      </div>
      <div
        class="bg-red-50 p-4 rounded-xl shadow-sm border border-red-200 text-center"
      >
        <div class="text-2xl font-bold text-red-600">
          {{ statistics.inactiveCount || 0 }}
        </div>
        <div class="text-xs text-red-600 mt-1">Đã ẩn</div>
      </div>
    </div>

    <!-- Rating Distribution -->
    <div class="bg-white p-4 rounded-2xl shadow-sm border">
      <h3 class="text-sm font-bold text-gray-600 mb-4">Phân bố đánh giá</h3>
      <div class="space-y-3">
        <div
          v-for="star in [5, 4, 3, 2, 1]"
          :key="star"
          class="flex items-center gap-3"
        >
          <!-- Star label -->
          <div class="flex items-center gap-1 w-12">
            <span class="text-sm font-bold text-gray-700">{{ star }}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-yellow-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          </div>
          <!-- Progress bar -->
          <div class="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full bg-yellow-400 rounded-full transition-all duration-500"
              :style="{ width: getRatingBarWidth(star) + '%' }"
            ></div>
          </div>
          <!-- Count -->
          <div class="w-16 text-right">
            <span class="text-sm font-medium text-gray-600">{{
              getRatingCount(star)
            }}</span>
            <span class="text-xs text-gray-400 ml-1">đánh giá</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Search & Filter -->
    <div
      class="bg-white p-4 rounded-2xl shadow-sm border flex flex-wrap gap-4 items-end"
    >
      <div class="flex-1 min-w-[200px]">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Tìm kiếm theo sản phẩm / người dùng
        </label>
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nhập tên sản phẩm hoặc username..."
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

      <div class="w-40">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Số sao
        </label>
        <select
          v-model="filterRating"
          class="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả</option>
          <option value="5">5 sao</option>
          <option value="4">4 sao</option>
          <option value="3">3 sao</option>
          <option value="2">2 sao</option>
          <option value="1">1 sao</option>
        </select>
      </div>

      <div class="w-40">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Trạng thái
        </label>
        <select
          v-model="filterStatus"
          class="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả</option>
          <option value="active">Đang hiển thị</option>
          <option value="inactive">Đã ẩn</option>
        </select>
      </div>

      <button
        @click="handleSearch"
        class="bg-gray-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
      >
        TÌM KIẾM
      </button>
    </div>

    <!-- Review Table -->
    <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider"
        >
          <tr>
            <th class="px-6 py-4">Sản phẩm</th>
            <th class="px-6 py-4">Người đánh giá</th>
            <th class="px-6 py-4 text-center">Số sao</th>
            <th class="px-6 py-4">Nội dung</th>
            <th class="px-6 py-4 text-center">Trạng thái</th>
            <th class="px-6 py-4">Ngày tạo</th>
            <th class="px-6 py-4 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="review in displayReviews"
            :key="review.id"
            class="hover:bg-gray-50 transition"
          >
            <!-- Product -->
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <img
                  :src="review.product?.thumbnail || '/placeholder.png'"
                  :alt="review.product?.name"
                  class="w-10 h-10 rounded-lg object-cover bg-gray-100"
                />
                <span
                  class="font-medium text-gray-800 text-sm max-w-[150px] truncate"
                >
                  {{ review.product?.name || 'Sản phẩm không tồn tại' }}
                </span>
              </div>
            </td>

            <!-- User -->
            <td class="px-6 py-4">
              <div class="text-sm">
                <div class="font-bold text-gray-800">
                  {{ review.user?.username || 'Ẩn danh' }}
                </div>
                <div class="text-gray-500 text-xs">
                  {{ review.user?.email || '' }}
                </div>
              </div>
            </td>

            <!-- Rating -->
            <td class="px-6 py-4 text-center">
              <div class="flex items-center justify-center gap-0.5">
                <svg
                  v-for="star in 5"
                  :key="star"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-4 w-4"
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
            </td>

            <!-- Comment -->
            <td
              class="px-6 py-4 text-gray-600 text-sm max-w-[200px] truncate"
              :title="review.comment"
            >
              {{ review.comment || 'Không có nội dung' }}
            </td>

            <!-- Status -->
            <td class="px-6 py-4 text-center">
              <span
                @click="toggleReviewStatus(review)"
                :class="
                  review.isActive
                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                "
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition"
              >
                {{ review.isActive ? 'Hiển thị' : 'Đã ẩn' }}
              </span>
            </td>

            <!-- Created At -->
            <td class="px-6 py-4 text-gray-500 text-sm">
              {{ formatDate(review.createdAt) }}
            </td>

            <!-- Actions -->
            <td class="px-6 py-4 text-center">
              <router-link
                :to="{ name: 'review-detail', params: { id: review.id } }"
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
        v-if="displayReviews.length === 0 && !loading"
        class="p-20 text-center text-gray-400 italic"
      >
        Không tìm thấy đánh giá nào phù hợp với bộ lọc...
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
const allReviews = ref([])
const displayReviews = ref([])
const statistics = ref({})
const loading = ref(true)

const searchQuery = ref('')
const filterRating = ref('')
const filterStatus = ref('')

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

// Get rating count from statistics
const getRatingCount = (star) => {
  const found = statistics.value.ratingStats?.find((r) => r._id === star)
  return found?.count || 0
}

// Get rating bar width for horizontal chart (percentage)
const getRatingBarWidth = (star) => {
  const count = getRatingCount(star)
  const total = statistics.value.totalReviews || 0
  if (total === 0) return 0
  return (count / total) * 100
}

// Fetch reviews
const fetchReviews = async () => {
  try {
    loading.value = true
    const res = await axios.get('/api/admin/reviews')
    allReviews.value = res.data.data
    displayReviews.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy danh sách đánh giá:', error)
  } finally {
    loading.value = false
  }
}

// Fetch statistics
const fetchStatistics = async () => {
  try {
    const res = await axios.get('/api/admin/reviews/stats/overview')
    statistics.value = res.data.data
  } catch (error) {
    console.error('Lỗi lấy thống kê:', error)
  }
}

// Handle search
const handleSearch = () => {
  displayReviews.value = allReviews.value.filter((review) => {
    // Search by product name or username
    const searchLower = searchQuery.value.toLowerCase()
    const matchSearch =
      !searchQuery.value ||
      review.product?.name?.toLowerCase().includes(searchLower) ||
      review.user?.username?.toLowerCase().includes(searchLower) ||
      review.user?.email?.toLowerCase().includes(searchLower)

    // Filter by rating
    const matchRating =
      !filterRating.value || review.rating === parseInt(filterRating.value)

    // Filter by status
    let matchStatus = true
    if (filterStatus.value === 'active') {
      matchStatus = review.isActive === true
    } else if (filterStatus.value === 'inactive') {
      matchStatus = review.isActive === false
    }

    return matchSearch && matchRating && matchStatus
  })
}

// Toggle review status
const toggleReviewStatus = async (review) => {
  const newStatus = !review.isActive
  const action = newStatus ? 'hiển thị' : 'ẩn'

  if (!confirm(`Bạn có chắc muốn ${action} đánh giá này?`)) {
    return
  }

  try {
    await axios.put(`/api/admin/reviews/status/${review.id}`, {
      isActive: newStatus
    })

    // Update local state
    review.isActive = newStatus

    // Refresh statistics
    fetchStatistics()

    alert(`Đã ${action} đánh giá thành công!`)
  } catch (error) {
    console.error('Error toggling review status:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  }
}

// Fetch data on mount
onMounted(() => {
  fetchReviews()
  fetchStatistics()
})
</script>
