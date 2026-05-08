import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

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

// Xử lý response errors (401 Unauthorized -> redirect to login)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ
      localStorage.removeItem('authToken')
      localStorage.removeItem('currentUser')
      router.push({ name: 'login' })
    }
    return Promise.reject(error)
  }
)

createApp(App).use(router).mount('#app')
