<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold text-gray-800">Quản lý người dùng</h2>
      <div class="text-sm text-gray-500">
        Tổng số:
        <span class="font-bold text-emerald-600">{{ allUsers.length }}</span>
        người dùng
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="bg-white p-4 rounded-2xl shadow-sm border flex gap-4 items-end">
      <div class="flex-1">
        <label class="block text-xs font-bold text-gray-400 uppercase mb-2">
          Tìm kiếm theo Email
        </label>
        <div class="relative">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Nhập email cần tìm..."
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
          <option value="active">Hoạt động</option>
          <option value="locked">Đã khóa</option>
        </select>
      </div>

      <button
        @click="handleSearch"
        class="bg-gray-800 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition flex items-center gap-2"
      >
        TÌM KIẾM
      </button>
    </div>

    <!-- User Table -->
    <div class="bg-white rounded-2xl shadow-sm border overflow-hidden">
      <table class="w-full text-left">
        <thead
          class="bg-gray-50 text-gray-500 text-[10px] uppercase tracking-wider"
        >
          <tr>
            <th class="px-6 py-4">Username</th>
            <th class="px-6 py-4">Email</th>
            <th class="px-6 py-4">Địa chỉ</th>
            <th class="px-6 py-4">Số điện thoại</th>
            <th class="px-6 py-4">Ngày tạo</th>
            <th class="px-6 py-4 text-center">Trạng thái</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr
            v-for="user in displayUsers"
            :key="user.id"
            class="hover:bg-gray-50 transition"
          >
            <!-- Username -->
            <td class="px-6 py-4 font-bold text-gray-800">
              {{ user.username || 'User chưa cập nhật' }}
            </td>

            <!-- Email -->
            <td class="px-6 py-4 text-gray-600 text-sm">
              {{ user.email || 'User chưa cập nhật' }}
            </td>

            <!-- Address -->
            <td
              class="px-6 py-4 text-gray-600 text-sm max-w-[200px] truncate"
              :title="user.address"
            >
              {{ user.address || 'User chưa cập nhật' }}
            </td>

            <!-- Phone Number -->
            <td class="px-6 py-4 text-gray-600 text-sm">
              {{ user.phoneNumber || 'User chưa cập nhật' }}
            </td>

            <!-- Created At -->
            <td class="px-6 py-4 text-gray-500 text-sm">
              {{ formatDate(user.createdAt) }}
            </td>

            <!-- Status (Clickable) -->
            <td class="px-6 py-4 text-center">
              <span
                @click="toggleUserStatus(user)"
                :class="
                  user.isActive
                    ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                "
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase cursor-pointer transition"
              >
                {{ user.isActive ? 'Hoạt động' : 'Đã bị khóa' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Empty State -->
      <div
        v-if="displayUsers.length === 0"
        class="p-20 text-center text-gray-400 italic"
      >
        Không tìm thấy người dùng nào phù hợp với bộ lọc...
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// State
const allUsers = ref([]) // Contains original data from API
const displayUsers = ref([]) // Contains data after filtering

const searchQuery = ref('')
const filterStatus = ref('')

// Format date
const formatDate = (dateString) => {
  if (!dateString) return 'User chưa cập nhật'
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

// 1. Get initial data from API
const fetchUsers = async () => {
  try {
    const res = await axios.get('/api/admin/users')
    allUsers.value = res.data.data
    displayUsers.value = res.data.data // Display all by default
  } catch (error) {
    console.error('Lỗi lấy dữ liệu:', error)
  }
}

// 2. Search handling function (Only executed on button click)
const handleSearch = () => {
  displayUsers.value = allUsers.value.filter((user) => {
    // Check email (case insensitive)
    const matchEmail = user.email
      ?.toLowerCase()
      .includes(searchQuery.value.toLowerCase())

    // Check status (If none selected, default is true)
    let matchStatus = true
    if (filterStatus.value === 'active') {
      matchStatus = user.isActive === true
    } else if (filterStatus.value === 'locked') {
      matchStatus = user.isActive === false
    }

    return matchEmail && matchStatus
  })
}

// 3. Toggle user status (Lock/Unlock)
const toggleUserStatus = async (user) => {
  const newStatus = !user.isActive
  const action = newStatus ? 'mở khóa' : 'khóa'

  if (!confirm(`Bạn có chắc muốn ${action} tài khoản "${user.username}"?`)) {
    return
  }

  try {
    await axios.patch(`/api/admin/users/${user.id}/status`, {
      isActive: newStatus
    })

    // Update local state
    user.isActive = newStatus
    alert(`Đã ${action} tài khoản "${user.username}" thành công!`)
  } catch (error) {
    console.error('Error toggling user status:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  }
}

// Fetch users on mount
onMounted(fetchUsers)
</script>
