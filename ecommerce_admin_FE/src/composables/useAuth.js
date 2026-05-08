import { ref, computed } from 'vue'

const token = ref(localStorage.getItem('authToken') || null)
const refreshToken = ref(localStorage.getItem('refreshToken') || null)
const currentUser = ref(
  JSON.parse(localStorage.getItem('currentUser') || 'null')
)

export function useAuth() {
  const isAuthenticated = computed(() => !!token.value)

  const login = (authToken, refresh, userData) => {
    token.value = authToken
    refreshToken.value = refresh
    currentUser.value = userData
    localStorage.setItem('authToken', authToken)
    localStorage.setItem('refreshToken', refresh)
    localStorage.setItem('currentUser', JSON.stringify(userData))
  }

  const logout = () => {
    token.value = null
    refreshToken.value = null
    currentUser.value = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('currentUser')
  }

  const getToken = () => token.value
  const getRefreshToken = () => refreshToken.value

  return {
    token: computed(() => token.value),
    refreshToken: computed(() => refreshToken.value),
    currentUser: computed(() => currentUser.value),
    isAuthenticated,
    login,
    logout,
    getToken,
    getRefreshToken
  }
}
