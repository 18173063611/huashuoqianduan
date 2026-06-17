import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getAuthToken } from '../services/request'
import { useAuthModalStore } from '../stores/authModal'

export function useAuthRequired() {
  const route = useRoute()
  const authModalStore = useAuthModalStore()
  const isLoggedIn = computed(() => {
    void route.fullPath
    return Boolean(getAuthToken('USER_WEB'))
  })

  function openAuthModal(actionName = '登录后可继续使用', redirect = route.fullPath) {
    authModalStore.open(actionName, redirect)
  }

  function requireAuth(actionName = '登录后可继续使用', redirect = route.fullPath) {
    if (getAuthToken('USER_WEB')) {
      return true
    }
    openAuthModal(actionName, redirect)
    return false
  }

  return {
    isLoggedIn,
    openAuthModal,
    requireAuth,
  }
}
