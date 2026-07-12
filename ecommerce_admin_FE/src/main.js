import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// Cấu hình baseURL cho API (Lấy từ .env hoặc mặc định là /api)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// Cấu hình axios để tự động gửi token trong headers
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Xử lý response errors (401 Unauthorized -> Tự động xin cấp lại Token)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Bắt lỗi 401 (Access Token hết hạn) và đảm bảo request này chưa được retry
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true // Đánh dấu đã thử retry để tránh lặp vô hạn
      
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          // Gọi API xin cấp mới Access Token
          const res = await axios.post('/api/auth/refresh', { token: refreshToken })
          const newAccessToken = res.data.accessToken
          
          // Cập nhật Token mới vào Local Storage
          localStorage.setItem('authToken', newAccessToken)
          
          // Gắn Token mới vào Header của Request bị lỗi ban đầu và gọi lại API đó
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return axios(originalRequest)
        } catch (refreshError) {
          // Nếu Refresh Token cũng hết hạn hoặc bị lỗi -> Buộc đăng xuất triệt để
          localStorage.removeItem('authToken')
          localStorage.removeItem('refreshToken')
          localStorage.removeItem('currentUser')
          router.push({ name: 'login' })
          return Promise.reject(refreshError)
        }
      } else {
        // Nếu ngay từ đầu đã không có Refresh Token -> Buộc đăng xuất
        localStorage.removeItem('authToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('currentUser')
        router.push({ name: 'login' })
      }
    }

    return Promise.reject(error)
  }
)

createApp(App).use(router).mount('#app')
