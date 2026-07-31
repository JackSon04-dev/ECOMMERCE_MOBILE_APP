import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import axios from 'axios'

// Configure API baseURL (from .env or default /api)
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';

// Configure axios to auto send token in headers
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

// Handle Race condition when multiple requests call refresh simultaneously
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Handle response errors (401 Unauthorized -> Auto request new Token)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip if this error comes from refresh token API itself to avoid infinite loop
    if (originalRequest.url === '/api/auth/refresh') {
      return Promise.reject(error);
    }

    // Catch 401 (Access Token expired) and ensure this request hasn't been retried
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue it if a refresh token process is currently running
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axios(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Call API to request new Access Token
          const res = await axios.post('/api/auth/refresh', { token: refreshToken });
          const newAccessToken = res.data.accessToken;
          
          // Update new Token to Local Storage
          localStorage.setItem('authToken', newAccessToken);
          
          // Attach new Token to Header of the originally failed Request
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Notify queued requests to continue
          processQueue(null, newAccessToken);
          
          // Recall that API
          return axios(originalRequest);
        } catch (refreshError) {
          processQueue(refreshError, null);
          // If Refresh Token also expired or errored -> Force total logout
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('currentUser');
          router.push({ name: 'login' });
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // If no Refresh Token from the start -> Force logout
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('currentUser');
        router.push({ name: 'login' });
      }
    }

    return Promise.reject(error);
  }
)

createApp(App).use(router).mount('#app')
