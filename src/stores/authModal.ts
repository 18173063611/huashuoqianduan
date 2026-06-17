import { readonly, reactive } from 'vue'

interface AuthModalState {
  visible: boolean
  actionName: string
  redirect: string
}

const state = reactive<AuthModalState>({
  visible: false,
  actionName: '登录后可继续使用',
  redirect: '',
})

export function useAuthModalStore() {
  function open(actionName = '登录后可继续使用', redirect = '') {
    state.actionName = actionName
    state.redirect = redirect
    state.visible = true
  }

  function close() {
    state.visible = false
  }

  return {
    state: readonly(state),
    open,
    close,
  }
}
