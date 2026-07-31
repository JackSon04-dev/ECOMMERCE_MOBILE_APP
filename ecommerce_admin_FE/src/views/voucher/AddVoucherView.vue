<template>
  <div class="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg border">
    <div class="flex items-center gap-4 mb-8 border-b pb-4">
      <button
        @click="router.push({ name: 'vouchers' })"
        class="text-gray-400 hover:text-gray-600 font-bold transition"
      >
        ← QUAY LẠI
      </button>
      <h2 class="text-2xl font-bold text-gray-800">Thêm Voucher Mới</h2>
    </div>

    <div class="space-y-6">
      <!-- Voucher Name -->
      <div>
        <label class="block text-sm font-bold mb-2">Tên Voucher *</label>
        <input
          v-model="voucherName"
          type="text"
          placeholder="VD: Giảm 50K cho đơn từ 200K"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <!-- Voucher Code -->
      <div>
        <label class="block text-sm font-bold mb-2"
          >Mã Voucher (6 ký tự) *</label
        >
        <input
          v-model="voucherCode"
          type="text"
          maxlength="6"
          placeholder="VD: SALE50"
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
            v-model.number="minOrderAmount"
            type="number"
            min="0"
            placeholder="VD: 200000"
            class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <!-- Discount Amount -->
        <div>
          <label class="block text-sm font-bold mb-2">Số tiền giảm (đ) *</label>
          <input
            v-model.number="discountAmount"
            type="number"
            min="0"
            placeholder="VD: 50000"
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
          v-model.number="usageLimit"
          type="number"
          min="1"
          placeholder="VD: 100"
          class="w-full border p-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <!-- Preview -->
      <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
        <h4 class="font-bold text-emerald-800 mb-2">Xem trước:</h4>
        <p class="text-sm text-gray-600">
          Voucher
          <span class="font-bold text-blue-600">{{
            voucherCode || '??????'
          }}</span>
          giảm
          <span class="font-bold text-red-500"
            >{{ (discountAmount || 0).toLocaleString() }}đ</span
          >
          cho đơn hàng từ
          <span class="font-bold"
            >{{ (minOrderAmount || 0).toLocaleString() }}đ</span
          >, tối đa <span class="font-bold">{{ usageLimit || 0 }}</span> lượt sử
          dụng.
        </p>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-4 pt-8 border-t mt-8">
      <button
        @click="router.push({ name: 'vouchers' })"
        class="px-8 py-3 border-2 rounded-xl font-bold text-gray-400 hover:bg-gray-50 transition"
      >
        Hủy
      </button>
      <button
        @click="submitForm"
        class="px-12 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-700 transform hover:-translate-y-0.5 transition uppercase"
      >
        Tạo Voucher
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

// Form fields
const voucherName = ref('')
const voucherCode = ref('')
const minOrderAmount = ref(0)
const discountAmount = ref(0)
const usageLimit = ref(1)

// Submit form
const submitForm = async () => {
  // 1. VALIDATION

  // 1.1. Check voucher name
  if (!voucherName.value || voucherName.value.trim() === '') {
    return alert('Tên voucher không được để trống!')
  }

  // 1.2. Check voucher code (must be exactly 6 characters)
  if (!voucherCode.value || voucherCode.value.trim().length !== 6) {
    return alert('Mã voucher phải có đúng 6 ký tự!')
  }

  // 1.3. Check minimum order
  if (minOrderAmount.value === null || minOrderAmount.value < 0) {
    return alert('Số tiền đơn hàng tối thiểu không hợp lệ!')
  }

  // 1.4. Check discount amount
  if (discountAmount.value === null || discountAmount.value <= 0) {
    return alert('Số tiền giảm phải lớn hơn 0!')
  }

  // 1.5. Check discount not exceeding 50% of minimum order
  if (discountAmount.value > minOrderAmount.value * 0.5) {
    return alert('Số tiền giảm không được vượt quá 50% đơn tối thiểu!')
  }

  // 1.6. Check number of uses
  if (usageLimit.value === null || usageLimit.value < 1) {
    return alert('Số lượt dùng tối đa phải ít nhất là 1!')
  }

  // 2. SEND API
  try {
    const res = await axios.post('/api/admin/vouchers', {
      voucherName: voucherName.value.trim(),
      voucherCode: voucherCode.value.trim().toUpperCase(),
      minOrderAmount: minOrderAmount.value,
      discountAmount: discountAmount.value,
      usageLimit: usageLimit.value
    })

    if (res.data.success) {
      alert('Tạo voucher thành công!')
      router.push({ name: 'vouchers' })
    }
  } catch (error) {
    console.error('Lỗi tạo voucher:', error)
    alert('Lỗi: ' + (error.response?.data?.message || error.message))
  }
}
</script>
