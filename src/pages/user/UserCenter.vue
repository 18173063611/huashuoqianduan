<template>
  <section class="user-center app-card app-page-stack">
    <div class="user-main-tabs" role="tablist" aria-label="用户与资产">
      <button
        type="button"
        class="user-main-tab"
        role="tab"
        :aria-selected="mainTab === 'account'"
        :class="{ 'user-main-tab--active': mainTab === 'account' }"
        @click="mainTab = 'account'"
      >
        账户
      </button>
      <button
        type="button"
        class="user-main-tab"
        role="tab"
        :aria-selected="mainTab === 'assets'"
        :class="{ 'user-main-tab--active': mainTab === 'assets' }"
        @click="mainTab = 'assets'"
      >
        我的资产
      </button>
    </div>

    <div v-show="mainTab === 'account'" class="user-tab-panel">
      <div class="app-card-header">
        <div>
          <h2 class="app-card-title">账户</h2>
          <p class="app-muted">登录后可在「我的资产」中查看与管理私有内容。</p>
        </div>
        <button v-if="meInfo" class="app-secondary-button" type="button" :disabled="loading" @click="handleLogout">
          {{ loading ? '处理中...' : '退出登录' }}
        </button>
      </div>

      <p v-if="message" :class="messageType === 'error' ? 'app-error' : 'app-success'">{{ message }}</p>

      <div v-if="meInfo" class="app-file-list">
        <div class="app-file-item">
          <div style="flex: 1">
            <strong>当前用户</strong>
            <p class="app-muted" style="margin: 6px 0 0">用户名：{{ meInfo.username }} · 展示名：{{ meInfo.displayName }}</p>
          </div>
          <button class="app-secondary-button" type="button" :disabled="loading" @click="loadMe">
            {{ loading ? '加载中...' : '刷新' }}
          </button>
        </div>
      </div>

      <div v-else class="app-file-list">
        <div class="auth-mode-segment" role="tablist" aria-label="登录或注册">
          <button
            type="button"
            class="auth-mode-btn"
            role="tab"
            :aria-selected="authMode === 'login'"
            :class="{ 'auth-mode-btn--active': authMode === 'login' }"
            @click="authMode = 'login'"
          >
            登录
          </button>
          <button
            type="button"
            class="auth-mode-btn"
            role="tab"
            :aria-selected="authMode === 'register'"
            :class="{ 'auth-mode-btn--active': authMode === 'register' }"
            @click="authMode = 'register'"
          >
            注册
          </button>
        </div>

        <div class="app-file-item" style="flex-direction: column; align-items: stretch; gap: 10px">
          <p class="app-muted auth-hint">
            <template v-if="authMode === 'login'">已有账号直接登录（演示：demo / demo1234）。</template>
            <template v-else>首次使用可注册，密码至少 6 位，注册成功后将自动登录。</template>
          </p>
          <label class="app-field">
            <span>用户名</span>
            <input v-model="authForm.username" class="app-input" type="text" placeholder="请输入用户名" />
          </label>
          <label class="app-field">
            <span>密码</span>
            <input v-model="authForm.password" class="app-input" type="password" placeholder="请输入密码" />
          </label>
          <label v-if="authMode === 'register'" class="app-field">
            <span>展示名（可选）</span>
            <input v-model="authForm.displayName" class="app-input" type="text" placeholder="例如：张三" />
          </label>
          <button
            class="app-primary-button"
            type="button"
            :disabled="loading"
            @click="authMode === 'login' ? handleLogin() : handleRegister()"
          >
            {{ loading ? '处理中...' : authMode === 'login' ? '登录' : '注册并登录' }}
          </button>
        </div>
      </div>
    </div>

    <div v-show="mainTab === 'assets'" class="user-tab-panel user-tab-panel--assets">
      <AssetCenter :highlight-asset-id="highlightAssetId" @highlight-consumed="$emit('highlightConsumed')" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AssetCenter from '../asset/AssetCenter.vue'
import { applyLogin, clearLogin, login, logout, me, register } from '../../services/authApi'
import type { UserMe } from '../../types/userTypes'

const props = defineProps<{
  /** 从任务等入口跳转时，在「我的资产」中高亮对应行 */
  highlightAssetId?: number | null
}>()

defineEmits<{
  highlightConsumed: []
}>()

type MainTab = 'account' | 'assets'
type AuthMode = 'login' | 'register'

const mainTab = ref<MainTab>('account')
const authMode = ref<AuthMode>('login')
const meInfo = ref<UserMe | null>(null)
const loading = ref(false)
const message = ref('')
const messageType = ref<'error' | 'success'>('success')

const authForm = ref({ username: '', password: '', displayName: '' })

watch(
  () => props.highlightAssetId,
  (id) => {
    if (id != null && id > 0) {
      mainTab.value = 'assets'
    }
  },
  { immediate: true },
)

onMounted(() => {
  void loadMe()
})

async function loadMe() {
  loading.value = true
  message.value = ''
  try {
    meInfo.value = await me()
  } catch {
    meInfo.value = null
  } finally {
    loading.value = false
  }
}

function showError(text: string) {
  message.value = text
  messageType.value = 'error'
}

function showSuccess(text: string) {
  message.value = text
  messageType.value = 'success'
}

async function handleLogin() {
  const { username, password } = authForm.value
  if (!username.trim() || !password.trim()) {
    showError('请输入用户名和密码')
    return
  }
  loading.value = true
  message.value = ''
  try {
    const res = await login({ username: username.trim(), password: password.trim() })
    applyLogin(res)
    meInfo.value = { userId: res.userId, username: res.username, displayName: res.displayName }
    showSuccess('登录成功')
  } catch (e) {
    showError(e instanceof Error ? e.message : '登录失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const { username, password, displayName } = authForm.value
  if (!username.trim() || !password.trim()) {
    showError('请输入用户名和密码')
    return
  }
  loading.value = true
  message.value = ''
  try {
    const res = await register({
      username: username.trim(),
      password: password.trim(),
      displayName: displayName.trim() || undefined,
    })
    applyLogin(res)
    meInfo.value = { userId: res.userId, username: res.username, displayName: res.displayName }
    showSuccess('注册成功，已自动登录')
  } catch (e) {
    showError(e instanceof Error ? e.message : '注册失败')
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  loading.value = true
  message.value = ''
  try {
    await logout()
  } catch {
    // ignore
  } finally {
    clearLogin()
    meInfo.value = null
    loading.value = false
    showSuccess('已退出登录')
  }
}
</script>

<style scoped>
.user-center.app-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.user-main-tabs {
  display: inline-flex;
  margin-bottom: 20px;
  padding: 3px;
  border-radius: 10px;
  background: #eef0f6;
  border: 1px solid #e5e7eb;
  gap: 2px;
}

.user-main-tab {
  border: none;
  border-radius: 8px;
  padding: 8px 18px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease,
    box-shadow 120ms ease;
}

.user-main-tab:hover {
  color: #111827;
  background: rgba(255, 255, 255, 0.65);
}

.user-main-tab--active {
  color: #111827;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.user-tab-panel--assets {
  margin-top: 0;
}

.app-card-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
}

.app-muted {
  font-size: 13px;
  color: #6b7280;
}

.auth-mode-segment {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  gap: 2px;
  margin-bottom: 4px;
}

.auth-mode-btn {
  border: none;
  border-radius: 8px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.auth-mode-btn:hover {
  color: #111827;
  background: rgba(255, 255, 255, 0.7);
}

.auth-mode-btn--active {
  color: #111827;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.auth-hint {
  margin: 0 0 4px;
  line-height: 1.5;
}

.app-file-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.app-file-item {
  padding: 16px;
  border-radius: 10px;
  background: #fafafb;
  border: 1px solid #f0f1f3;
}

.app-file-item strong {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
}

.app-field {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: var(--app-text-secondary, #6b7280);
}

.app-input {
  width: 100%;
  height: 40px;
  background: #f5f6f8;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0 12px 0 36px;
  font-size: 14px;
  color: #111827;
  outline: none;
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    background 120ms ease;
}

.app-input::placeholder {
  color: #9ca3af;
}

.app-input:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.1);
  background: #ffffff;
}

.app-input[type='password'] {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M17 11V8a5 5 0 10-10 0v3' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M7 11h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z' stroke='%239CA3AF' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 50%;
}

.app-input[type='text'] {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M20 21a8 8 0 10-16 0' stroke='%239CA3AF' stroke-width='2' stroke-linecap='round'/%3E%3Cpath d='M12 13a5 5 0 100-10 5 5 0 000 10z' stroke='%239CA3AF' stroke-width='2'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: 12px 50%;
}

.app-primary-button {
  height: 42px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6c5ce7, #8a7cff);
  font-size: 14px;
  font-weight: 500;
  color: #ffffff;
  border: none;
  cursor: pointer;
  transition:
    opacity 120ms ease,
    transform 120ms ease,
    box-shadow 120ms ease;
}

.app-primary-button:hover:not(:disabled) {
  opacity: 0.92;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(124, 108, 255, 0.22);
}

.app-primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.app-secondary-button {
  height: 42px;
  border-radius: 8px;
  border: 1px solid #7c6cff;
  color: #6c5ce7;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 120ms ease,
    transform 120ms ease,
    opacity 120ms ease;
}

.app-secondary-button:hover:not(:disabled) {
  background: rgba(124, 108, 255, 0.08);
  transform: translateY(-1px);
}

.app-secondary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.app-error {
  color: #ef4444;
  font-size: 12px;
}

.app-success {
  color: #34d399;
  font-size: 12px;
}
</style>
