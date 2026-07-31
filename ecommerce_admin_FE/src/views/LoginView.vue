<template>
  <div
    class="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center px-4"
  >
    <div class="max-w-md w-full">
      <!-- Logo/Title -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p class="text-emerald-100">Đăng nhập để tiếp tục</p>
      </div>

      <!-- Login Form Card -->
      <div class="bg-white rounded-lg shadow-2xl p-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Đăng nhập</h2>

        <!-- Error Message -->
        <div
          v-if="errorMessage"
          class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"
        >
          {{ errorMessage }}
        </div>

        <form @submit.prevent="handleLogin">
          <!-- Email Field -->
          <div class="mb-4">
            <label
              for="email"
              class="block text-gray-700 text-sm font-medium mb-2"
            >
              Email
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="admin@example.com"
            />
          </div>

          <!-- Password Field -->
          <div class="mb-6">
            <label
              for="password"
              class="block text-gray-700 text-sm font-medium mb-2"
            >
              Mật khẩu
            </label>
            <input
              id="password"
              v-model="password"
              type="password"
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <!-- Remember Me -->
          <div class="flex items-center justify-between mb-6">
            <label class="flex items-center">
              <input
                v-model="rememberMe"
                type="checkbox"
                class="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
              />
              <span class="ml-2 text-sm text-gray-600">Ghi nhớ đăng nhập</span>
            </label>
          </div>

          <!-- Submit Button -->
          <button
            type="submit"
            :disabled="isLoading"
            class="w-full bg-emerald-600 text-white py-2 px-4 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Đang đăng nhập...</span>
            <span v-else>Đăng nhập</span>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center text-emerald-100 text-sm mt-6">
        © 2026 Admin Dashboard. All rights reserved.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import axios from 'axios'

const router = useRouter()
const { login } = useAuth()

const email = ref('')
const password = ref('')
const rememberMe = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  // Reset error message
  errorMessage.value = ''
  isLoading.value = true

  try {
    console.log('🔐 Đang gửi request login...', {
      email: email.value,
      deviceName: 'Admin Dashboard Web'
    })

    // Call login API from server
    const response = await axios.post('/api/auth/login', {
      email: email.value,
      password: password.value,
      deviceName: 'Admin Dashboard Web'
    })

    console.log('✅ Response từ server:', response.data)

    // Extract accessToken, refreshToken and user data from response
    const { accessToken, refreshToken, user } = response.data

    // Check returned data
    if (!accessToken || !user) {
      console.error('❌ Thiếu dữ liệu:', { accessToken, refreshToken, user })
      errorMessage.value = 'Lỗi: Server không trả về đầy đủ thông tin đăng nhập'
      return
    }

    // Check admin permission
    if (user.role !== 'admin') {
      console.error('❌ User không phải admin:', user.role)
      errorMessage.value = 'Tài khoản không có quyền truy cập'
      return
    }

    console.log('✅ Login thành công, lưu token và user info')

    // Save to auth store
    login(accessToken, refreshToken, user)

    // Redirect to dashboard
    console.log('➡️ Chuyển hướng về dashboard...')
    router.push({ name: 'dashboard' })
  } catch (error) {
    console.error('❌ Lỗi đăng nhập:', error)

    // Handle login error with detailed info
    if (error.response) {
      // Server responded with error status code (4xx, 5xx)
      const status = error.response.status
      const errorData = error.response.data

      console.error('📡 Response lỗi từ server:', {
        status: status,
        data: errorData
      })

      // Handle specific error types
      switch (status) {
        case 400:
          errorMessage.value = errorData.msg || 'Email hoặc mật khẩu không đúng'
          break
        case 401:
          errorMessage.value = 'Email hoặc mật khẩu không chính xác'
          break
        case 403:
          errorMessage.value =
            'Tài khoản không có quyền truy cập Admin Dashboard'
          break
        case 404:
          errorMessage.value = 'Không tìm thấy API endpoint'
          break
        case 500:
          errorMessage.value =
            'Lỗi server: ' +
            (errorData.msg || errorData.error || 'Internal server error')
          break
        default:
          errorMessage.value =
            errorData.msg ||
            errorData.message ||
            `Lỗi ${status}: Đăng nhập thất bại`
      }
    } else if (error.request) {
      // Request was sent but no response received
      console.error('📡 Không nhận được response từ server:', error.request)
      errorMessage.value =
        '⚠️ Không thể kết nối đến server (http://localhost:5000). Please check:\n' +
        '1. Server backend có đang chạy không?\n' +
        '2. Port 5000 có bị chặn không?\n' +
        '3. Kết nối mạng có ổn định không?'
    } else {
      // Other errors (setup request, timeout, etc.)
      console.error('⚠️ Lỗi không xác định:', error.message)
      errorMessage.value = 'Lỗi: ' + error.message
    }
  } finally {
    isLoading.value = false
    console.log('🏁 Login process hoàn tất')
  }
}
</script>
