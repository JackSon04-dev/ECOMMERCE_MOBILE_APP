<template>
  <header class="bg-blue-700 shadow-sm">
    <div class="flex items-center justify-between px-8 py-4">
      <div class="text-black-600 font-bold uppercase tracking-wider text-sm">
        Hệ thống quản lý Ecommerce
      </div>

      <div class="flex items-center space-x-4">
        <!-- User Info -->
        <div
          v-if="currentUser"
          class="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg"
        >
          <div
            class="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
          >
            <span class="text-white text-sm font-semibold">{{
              currentUser.name?.charAt(0) || 'A'
            }}</span>
          </div>
          <div class="text-sm">
            <p class="font-medium text-gray-700">
              {{ currentUser.name || currentUser.email }}
            </p>
            <p class="text-xs text-gray-500">{{ currentUser.role }}</p>
          </div>
        </div>

        <!-- Logout Button -->
        <button
          @click="handleLogout"
          class="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-lg transition"
          title="Logout"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span class="font-medium">Logout</span>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuth } from '../composables/useAuth'
import { useRouter } from 'vue-router'

const { currentUser, logout } = useAuth()
const router = useRouter()

const handleLogout = () => {
  logout()
  router.push({ name: 'login' })
}
</script>
