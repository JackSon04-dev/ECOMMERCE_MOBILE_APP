<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý Voucher</h2>
      <button
        @click="router.push({ name: 'add-voucher' })"
        class="bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-emerald-600 shadow-lg transition"
      >
        + Thêm voucher mới
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="bg-white p-4 rounded-2xl shadow-sm border flex gap-4 items-end">
      <div class="flex-1">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Tìm kiếm theo tên hoặc mã voucher
        </label>
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nhập tên hoặc mã voucher..."
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
          Trạng thái
        </label>
        <select
          v-model="filterStatus"
          class="w-full border p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Tất cả</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã tắt</option>
        </select>
      </div>

      <button
        @click="handleSearch"
        class="bg-gray-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
      >
        TÌM KIẾM
      </button>
    </div>

    <!-- Voucher Table -->
    <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider"
        >
          <tr>
            <th class="px-6 py-4">Tên Voucher</th>
            <th class="px-6 py-4">Mã Code</th>
            <th class="px-6 py-4">Đơn tối thiểu</th>
            <th class="px-6 py-4">Giảm giá</th>
            <th class="px-6 py-4">Lượt dùng</th>
            <th class="px-6 py-4">Ngày tạo</th>
            <th class="px-6 py-4 text-center">Trạng thái</th>
            <th class="px-6 py-4 text-center">Thao tác</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="voucher in displayVouchers"
            :key="voucher.id"
            class="hover:bg-gray-50 transition"
          >
            <td class="px-6 py-4 font-bold text-gray-800">
              {{ voucher.voucherName }}
            </td>
            <td class="px-6 py-4">
              <span
                class="bg-blue-100 text-blue-600 px-3 py-1 rounded-lg font-mono font-bold text-sm"
              >
                {{ voucher.voucherCode }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ voucher.minOrderAmount?.toLocaleString() }}đ
            </td>
            <td class="px-6 py-4 font-bold text-red-500">
              -{{ voucher.discountAmount?.toLocaleString() }}đ
            </td>
            <td class="px-6 py-4 text-gray-600">
              {{ voucher.usageLimit }} lượt
            </td>
            <td class="px-6 py-4 text-gray-500 text-sm">
              {{ formatDate(voucher.createdAt) }}
            </td>
            <td class="px-6 py-4 text-center">
              <span
                @click="toggleVoucherStatus(voucher)"
                :class="
                  voucher.isActive
                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                "
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition"
              >
                {{ voucher.isActive ? 'Hoạt động' : 'Đã tắt' }}
              </span>
            </td>
            <td class="px-6 py-4 text-center">
              <button
                @click="
                  router.push({
                    name: 'voucher-detail',
                    params: { id: voucher.id }
                  })
                "
                class="text-emerald-600 hover:text-emerald-800 transition text-xs font-bold uppercase"
              >
                Chi tiết
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        v-if="displayVouchers.length === 0"
        class="p-20 text-center text-gray-400 italic"
      >
        Không tìm thấy voucher nào phù hợp với bộ lọc...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const allVouchers = ref([]) // Contains original data from API
const displayVouchers = ref([]) // Contains data after filtering

const searchQuery = ref('')
const filterStatus = ref('')

// Format date
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// 1. Get initial data from API
const fetchVouchers = async () => {
  try {
    const res = await axios.get('/api/admin/vouchers')
    allVouchers.value = res.data.data
    displayVouchers.value = res.data.data // Display all by default
  } catch (error) {
    console.error('Lỗi lấy dữ liệu:', error)
  }
}

// 2. Search handling function (Only executed on button click)
const handleSearch = () => {
  displayVouchers.value = allVouchers.value.filter((v) => {
    // Check voucher name or code
    const query = searchQuery.value.toLowerCase()
    const matchSearch =
      v.voucherName?.toLowerCase().includes(query) ||
      v.voucherCode?.toLowerCase().includes(query)

    // Check status
    let matchStatus = true
    if (filterStatus.value === 'active') {
      matchStatus = v.isActive === true
    } else if (filterStatus.value === 'inactive') {
      matchStatus = v.isActive === false
    }

    return matchSearch && matchStatus
  })
}

// 3. Toggle voucher status
const toggleVoucherStatus = async (voucher) => {
  const newStatus = !voucher.isActive
  const action = newStatus ? 'kích hoạt' : 'tắt'

  if (
    !confirm(`Bạn có chắc muốn ${action} voucher "${voucher.voucherName}"?`)
  ) {
    return
  }

  try {
    await axios.put(`/api/admin/vouchers/${voucher.id}`, {
      isActive: newStatus
    })

    // Update local state
    voucher.isActive = newStatus
    alert(`Đã ${action} voucher "${voucher.voucherName}" thành công!`)
  } catch (error) {
    console.error('Error toggling voucher status:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  }
}

// Fetch vouchers on mount
onMounted(fetchVouchers)
</script>
