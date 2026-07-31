<template>
  <div
    v-if="voucher"
    class="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border"
  >
    <div class="flex items-center justify-between mb-8 border-b pb-4">
      <div class="flex items-center gap-4">
        <button
          @click="router.push({ name: 'vouchers' })"
          class="text-gray-400 hover:text-gray-600 font-bold transition"
        >
          ← QUAY LẠI
        </button>
        <h2 class="text-2xl font-bold text-gray-800">
          Cập nhật: {{ voucher.voucherName }}
        </h2>
      </div>
      <button
        @click="handleUpdate"
        class="bg-emerald-600 text-white px-8 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-lg transition uppercase"
      >
        Lưu thay đổi
      </button>
    </div>

    <div class="space-y-6">
      <!-- Voucher Name -->
      <div>
        <label class="block text-sm font-bold mb-2">Tên Voucher *</label>
        <input
          v-model="voucher.voucherName"
          type="text"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <!-- Voucher Code -->
      <div>
        <label class="block text-sm font-bold mb-2"
          >Mã Voucher (6 ký tự) *</label
        >
        <input
          v-model="voucher.voucherCode"
          type="text"
          maxlength="6"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono"
        />
        <p class="text-xs text-gray-400 mt-1">
          Mã sẽ tự động chuyển thành chữ in hoa
        </p>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <!-- Minimum Order -->
        <div>
          <label class="block text-sm font-bold mb-2"
            >Đơn tối thiểu (đ) *</label
          >
          <input
            v-model.number="voucher.minOrderAmount"
            type="number"
            min="0"
            class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <!-- Discount Amount -->
        <div>
          <label class="block text-sm font-bold mb-2">Số tiền giảm (đ) *</label>
          <input
            v-model.number="voucher.discountAmount"
            type="number"
            min="0"
            class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <!-- Maximum Uses -->
      <div>
        <label class="block text-sm font-bold mb-2"
          >Số lượt dùng tối đa *</label
        >
        <input
          v-model.number="voucher.usageLimit"
          type="number"
          min="1"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <!-- Status -->
      <div class="bg-gray-50 p-4 rounded-xl border">
        <h4 class="font-bold text-gray-700 mb-3">Trạng thái Voucher</h4>
        <div
          class="flex items-center justify-between p-3 rounded-xl border"
          :class="
            voucher.isActive
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-red-50 border-red-100'
          "
        >
          <span
            class="font-bold text-sm"
            :class="voucher.isActive ? 'text-emerald-700' : 'text-red-700'"
          >
            {{ voucher.isActive ? 'ĐANG HOẠT ĐỘNG' : 'ĐÃ TẮT' }}
          </span>

          <label class="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              v-model="voucher.isActive"
              class="sr-only peer"
            />
            <div
              class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"
            ></div>
          </label>
        </div>
      </div>

      <!-- Preview -->
      <div class="bg-blue-50 p-4 rounded-xl border border-blue-200">
        <h4 class="font-bold text-blue-800 mb-2">Xem trước:</h4>
        <p class="text-sm text-gray-600">
          Voucher
          <span class="font-bold text-blue-600">{{
            voucher.voucherCode || '??????'
          }}</span>
          giảm
          <span class="font-bold text-red-500"
            >{{ (voucher.discountAmount || 0).toLocaleString() }}đ</span
          >
          cho đơn hàng từ
          <span class="font-bold"
            >{{ (voucher.minOrderAmount || 0).toLocaleString() }}đ</span
          >, tối đa
          <span class="font-bold">{{ voucher.usageLimit || 0 }}</span> lượt sử
          dụng.
        </p>
      </div>

      <!-- Info -->
      <div class="text-xs text-gray-400 pt-4 border-t">
        <p>Ngày tạo: {{ formatDate(voucher.createdAt) }}</p>
      </div>
    </div>
  </div>

  <!-- Loading -->
  <div v-else class="text-center py-20">
    <div
      class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"
    ></div>
    <p class="mt-4 text-gray-400">Đang tải dữ liệu...</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// Get voucherId from route params
const props = defineProps(['id'])
const voucherId = computed(() => props.id || route.params.id)

// State
const voucher = ref(null)

// Format date
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Get voucher details from API
const fetchVoucherDetail = async () => {
  try {
    // Get all vouchers and find by ID (because API has no get by ID endpoint)
    const res = await axios.get('/api/admin/vouchers')
    const found = res.data.data.find((v) => v._id === voucherId.value)
    if (found) {
      voucher.value = found
    } else {
      alert('Không tìm thấy voucher!')
      router.push({ name: 'vouchers' })
    }
  } catch (err) {
    console.error('Lỗi:', err)
    alert('Lỗi khi tải dữ liệu voucher!')
  }
}

// Update voucher
const handleUpdate = async () => {
  if (!voucher.value) return

  // 1. VALIDATION

  // 1.1. Check voucher name
  if (!voucher.value.voucherName || voucher.value.voucherName.trim() === '') {
    return alert('Tên voucher không được để trống!')
  }

  // 1.2. Check voucher code (must be exactly 6 characters)
  if (
    !voucher.value.voucherCode ||
    voucher.value.voucherCode.trim().length !== 6
  ) {
    return alert('Mã voucher phải có đúng 6 ký tự!')
  }

  // 1.3. Check minimum order
  if (
    voucher.value.minOrderAmount === null ||
    voucher.value.minOrderAmount < 0
  ) {
    return alert('Số tiền đơn hàng tối thiểu không hợp lệ!')
  }

  // 1.4. Check discount amount
  if (
    voucher.value.discountAmount === null ||
    voucher.value.discountAmount <= 0
  ) {
    return alert('Số tiền giảm phải lớn hơn 0!')
  }

  // 1.5. Check discount not exceeding 50% of minimum order
  if (voucher.value.discountAmount > voucher.value.minOrderAmount * 0.5) {
    return alert('Số tiền giảm không được vượt quá 50% đơn tối thiểu!')
  }

  // 1.6. Check number of uses
  if (voucher.value.usageLimit === null || voucher.value.usageLimit < 1) {
    return alert('Số lượt dùng tối đa phải ít nhất là 1!')
  }

  // 2. SEND API
  try {
    const res = await axios.put(`/api/admin/vouchers/${voucher.value.id}`, {
      voucherName: voucher.value.voucherName.trim(),
      voucherCode: voucher.value.voucherCode.trim().toUpperCase(),
      minOrderAmount: voucher.value.minOrderAmount,
      discountAmount: voucher.value.discountAmount,
      usageLimit: voucher.value.usageLimit,
      isActive: voucher.value.isActive
    })

    if (res.data.success) {
      alert('Cập nhật voucher thành công!')
      fetchVoucherDetail() // Reload latest data
    }
  } catch (error) {
    console.error('Lỗi cập nhật voucher:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  }
}

// Fetch on mount
onMounted(fetchVoucherDetail)
</script>
