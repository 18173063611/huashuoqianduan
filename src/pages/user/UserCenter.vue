<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">用户中心</h2>
        <p class="app-muted">注册、登录与查看当前登录用户。</p>
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
      <div class="app-file-item">
        <div style="flex: 1">
          <strong>登录</strong>
          <p class="app-muted" style="margin: 6px 0 0">已有账号可直接登录（演示账号：demo / demo1234）。</p>
        </div>
      </div>

      <div class="app-file-item" style="flex-direction: column; align-items: stretch; gap: 10px">
        <label class="app-field">
          <span>用户名</span>
          <input v-model="loginForm.username" class="app-input" type="text" placeholder="请输入用户名" />
        </label>
        <label class="app-field">
          <span>密码</span>
          <input v-model="loginForm.password" class="app-input" type="password" placeholder="请输入密码" />
        </label>
        <button class="app-primary-button" type="button" :disabled="loading" @click="handleLogin">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>

      <div class="app-file-item">
        <div style="flex: 1">
          <strong>注册</strong>
          <p class="app-muted" style="margin: 6px 0 0">首次使用可注册账号（密码至少 6 位）。</p>
        </div>
      </div>

      <div class="app-file-item" style="flex-direction: column; align-items: stretch; gap: 10px">
        <label class="app-field">
          <span>用户名</span>
          <input v-model="registerForm.username" class="app-input" type="text" placeholder="请输入用户名" />
        </label>
        <label class="app-field">
          <span>密码</span>
          <input v-model="registerForm.password" class="app-input" type="password" placeholder="至少 6 位" />
        </label>
        <label class="app-field">
          <span>展示名（可选）</span>
          <input v-model="registerForm.displayName" class="app-input" type="text" placeholder="例如：张三" />
        </label>
        <button class="app-secondary-button" type="button" :disabled="loading" @click="handleRegister">
          {{ loading ? '注册中...' : '注册并登录' }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { applyLogin, clearLogin, login, logout, me, register } from '../../services/authApi'
import type { UserMe } from '../../types/userTypes'

const meInfo = ref<UserMe | null>(null)
const loading = ref(false)
const message = ref('')
const messageType = ref<'error' | 'success'>('success')

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', password: '', displayName: '' })

watch(
  () => true,
  async () => {
    await loadMe()
  },
  { immediate: true },
)

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
  if (!loginForm.username.trim() || !loginForm.password.trim()) {
    showError('请输入用户名和密码')
    return
  }
  loading.value = true
  message.value = ''
  try {
    const res = await login({ username: loginForm.username.trim(), password: loginForm.password.trim() })
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
  if (!registerForm.username.trim() || !registerForm.password.trim()) {
    showError('请输入用户名和密码')
    return
  }
  loading.value = true
  message.value = ''
  try {
    const res = await register({
      username: registerForm.username.trim(),
      password: registerForm.password.trim(),
      displayName: registerForm.displayName.trim() || undefined,
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
section.app-card {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 24px;
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
  color: var(--app-text-secondary);
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

