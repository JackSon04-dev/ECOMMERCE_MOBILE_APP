<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div>
        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span class="p-2 bg-emerald-100 text-emerald-600 rounded-xl">🔔</span>
          Quản lý Thông báo
        </h2>
        <p class="text-gray-500 mt-1">Gửi thông báo chương trình khuyến mãi và hệ thống cho người dùng</p>
      </div>
      <button 
        @click="showCreateModal = true"
        class="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-200"
      >
        <span>➕</span> Tạo thông báo mới
      </button>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <p class="text-gray-500 text-sm">Tổng thông báo</p>
        <p class="text-2xl font-bold text-gray-800">{{ notifications.length }}</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <p class="text-gray-500 text-sm">Khuyến mãi</p>
        <p class="text-2xl font-bold text-orange-500">{{ stats.promo }}</p>
      </div>
      <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <p class="text-gray-500 text-sm">Hệ thống</p>
        <p class="text-2xl font-bold text-blue-500">{{ stats.system }}</p>
      </div>
    </div>

    <!-- Main List -->
    <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div class="p-6 border-b border-slate-100 bg-slate-50/50">
        <h3 class="font-bold text-gray-800">Danh sách thông báo đã gửi</h3>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead class="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th class="px-6 py-4 whitespace-nowrap">Ngày tạo</th>
              <th class="px-6 py-4 whitespace-nowrap">Loại</th>
              <th class="px-6 py-4">Tiêu đề</th>
              <th class="px-6 py-4">Nội dung</th>
              <th class="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-10 text-center text-gray-400">Đang tải danh sách...</td>
            </tr>
            <tr v-else-if="notifications.length === 0" class="hover:bg-slate-50/50 transition">
              <td colspan="5" class="px-6 py-10 text-center text-gray-400 font-medium">Chưa có thông báo nào được gửi</td>
            </tr>
            <tr v-for="noti in notifications" :key="noti._id" class="hover:bg-slate-50/50 transition group">
              <td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                {{ formatDate(noti.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span 
                  :class="noti.type === 'promo' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'"
                  class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-tighter"
                >
                  {{ noti.type === 'promo' ? 'Khuyến mãi' : 'Hệ thống' }}
                </span>
              </td>
              <td class="px-6 py-4 font-bold text-gray-800">{{ noti.title }}</td>
              <td class="px-6 py-4 text-sm text-gray-600 whitespace-pre-wrap">{{ noti.message }}</td>
              <td class="px-6 py-4 text-right">
                <button 
                  @click="handleDelete(noti)"
                  class="p-2 text-red-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Xóa thông báo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-600 text-white">
          <h3 class="text-xl font-bold">✨ Tạo thông báo mới</h3>
          <button @click="showCreateModal = false" class="hover:rotate-90 transition duration-300 text-2xl">&times;</button>
        </div>
        
        <form @submit.prevent="handleCreate" class="p-6 space-y-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1.5">Loại thông báo</label>
            <div class="grid grid-cols-2 gap-3">
              <button 
                type="button"
                @click="newNoti.type = 'promo'"
                :class="newNoti.type === 'promo' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                class="flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold transition"
              >
                <span>🎁</span> Khuyến mãi
              </button>
              <button 
                type="button"
                @click="newNoti.type = 'system'"
                :class="newNoti.type === 'system' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                class="flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-bold transition"
              >
                <span>⚙️</span> Hệ thống
              </button>
            </div>
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1.5">Tiêu đề</label>
            <input 
              v-model="newNoti.title"
              type="text"
              placeholder="VD: Flash Sale tháng 12..."
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1.5">Nội dung tin nhắn</label>
            <textarea 
              v-model="newNoti.message"
              rows="4"
              placeholder="Nhập nội dung thông báo gửi đến khách hàng..."
              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 outline-none transition resize-none"
              required
            ></textarea>
          </div>

          <div class="flex gap-3 pt-2">
            <button 
              type="button"
              @click="showCreateModal = false"
              class="flex-1 px-4 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit"
              :disabled="submitting"
              class="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50 shadow-lg shadow-emerald-100"
            >
              {{ submitting ? 'Đang gửi...' : 'Gửi thông báo' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'

const notifications = ref([])
const loading = ref(true)
const submitting = ref(false)
const showCreateModal = ref(false)

const newNoti = ref({
  title: '',
  message: '',
  type: 'promo'
})

// Stats
const stats = computed(() => {
  return {
    promo: notifications.value.filter(n => n.type === 'promo').length,
    system: notifications.value.filter(n => n.type === 'system').length
  }
})

// Fetch all notifications
const fetchNotifications = async () => {
  try {
    loading.value = true
    const res = await axios.get('/api/admin/notifications')
    if (res.data.success) {
      notifications.value = res.data.notifications
    }
  } catch (error) {
    console.error('Fetch notifications error:', error)
    alert('Lỗi: Không thể lấy danh sách thông báo')
  } finally {
    loading.value = false
  }
}

// Create notification
const handleCreate = async () => {
  try {
    submitting.value = true
    const res = await axios.post('/api/admin/notifications', newNoti.value)
    if (res.data.success) {
      alert('Thành công! Thông báo đã được gửi đến mọi người dùng.')
      showCreateModal.value = false
      newNoti.value = { title: '', message: '', type: 'promo' }
      fetchNotifications()
    }
  } catch (error) {
    console.error('Create notification error:', error)
    alert('Thất bại: Lỗi khi gửi thông báo')
  } finally {
    submitting.value = false
  }
}

// Delete notification
const handleDelete = async (noti) => {
  if (confirm(`Bạn chắc chắn muốn xóa thông báo "${noti.title}"?`)) {
    try {
      const res = await axios.delete(`/api/admin/notifications/${noti._id}`)
      if (res.data.success) {
        alert('Đã xóa thông báo thành công.')
        fetchNotifications()
      }
    } catch (error) {
      alert('Lỗi: Không thể xóa thông báo này.')
    }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

onMounted(fetchNotifications)
</script>

<style scoped>
.animate-in {
  animation: animate-in 0.3s ease-out;
}

@keyframes animate-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
