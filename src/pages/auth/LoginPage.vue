<template>
  <main class="auth-page">
    <section class="auth-panel" aria-label="登录与注册">
      <div class="auth-tabs" role="tablist" aria-label="登录或注册">
        <button
          type="button"
          class="auth-tab"
          role="tab"
          :aria-selected="authMode === 'login'"
          :class="{ 'auth-tab--active': authMode === 'login' }"
          @click="switchMode('login')"
        >
          登录
        </button>
        <button
          type="button"
          class="auth-tab"
          role="tab"
          :aria-selected="authMode === 'register'"
          :class="{ 'auth-tab--active': authMode === 'register' }"
          @click="switchMode('register')"
        >
          注册
        </button>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <div>
          <h1>{{ authMode === 'login' ? '欢迎回来' : '创建账号' }}</h1>
          <p>{{ authMode === 'login' ? '登录以继续使用我们的服务' : '注册后即可进入智能内容生产工作台' }}</p>
        </div>

        <p v-if="message" :class="messageType === 'error' ? 'auth-message auth-message--error' : 'auth-message'">
          {{ message }}
        </p>

        <label class="auth-field">
          <span>账号</span>
          <span class="auth-input-wrap">
            <span class="auth-input-icon" aria-hidden="true">✉</span>
            <input
              v-model="authForm.username"
              type="text"
              autocomplete="username"
              maxlength="60"
              placeholder="请输入账号或邮箱地址"
            />
          </span>
        </label>

        <label class="auth-field">
          <span>密码</span>
          <span class="auth-input-wrap">
            <span class="auth-input-icon" aria-hidden="true">▢</span>
            <input
              v-model="authForm.password"
              :type="passwordVisible ? 'text' : 'password'"
              autocomplete="current-password"
              maxlength="60"
              placeholder="请输入密码"
            />
            <button
              type="button"
              class="auth-eye-button"
              :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
              @click="passwordVisible = !passwordVisible"
            >
              {{ passwordVisible ? '◉' : '◎' }}
            </button>
          </span>
        </label>

        <label v-if="authMode === 'register'" class="auth-field">
          <span>展示名</span>
          <span class="auth-input-wrap">
            <span class="auth-input-icon" aria-hidden="true">◇</span>
            <input
              v-model="authForm.displayName"
              type="text"
              autocomplete="nickname"
              maxlength="80"
              placeholder="请输入展示名（可选）"
            />
          </span>
        </label>

        <div v-if="authMode === 'login'" class="auth-row">
          <label class="auth-check">
            <input v-model="rememberMe" type="checkbox" />
            <span>记住我</span>
          </label>
          <button type="button" class="auth-link" @click="showInfo('请联系管理员重置密码')">忘记密码?</button>
        </div>

        <button class="auth-submit" type="submit" :disabled="loading">
          {{ loading ? '处理中...' : authMode === 'login' ? '登录' : '注册并登录' }}
        </button>

        <div class="auth-divider"><span>或</span></div>

        <button class="auth-outline" type="button" @click="showInfo('当前后端暂未开放验证码登录')">
          使用验证码登录（支持手机号）
        </button>

        <div class="auth-footer">
          <span>{{ authMode === 'login' ? '还没有账号?' : '已有账号?' }}</span>
          <button type="button" class="auth-link" @click="switchMode(authMode === 'login' ? 'register' : 'login')">
            {{ authMode === 'login' ? '立即注册' : '返回登录' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { applyLogin, login, register } from '../../services/authApi'
import type { UserMe } from '../../types/userTypes'

type AuthMode = 'login' | 'register'

const props = withDefaults(
  defineProps<{
    initialMode?: AuthMode
  }>(),
  {
    initialMode: 'login',
  },
)

const emit = defineEmits<{
  success: [user: UserMe]
}>()

const route = useRoute()
const router = useRouter()

const authMode = ref<AuthMode>(props.initialMode)
const authForm = ref({ username: '', password: '', displayName: '' })
const rememberMe = ref(true)
const passwordVisible = ref(false)
const loading = ref(false)
const message = ref('')
const messageType = ref<'error' | 'success'>('success')

watch(
  () => props.initialMode,
  (mode) => {
    authMode.value = mode
    message.value = ''
  },
)

function switchMode(mode: AuthMode) {
  authMode.value = mode
  message.value = ''
  if ((mode === 'login' && route.name !== 'login') || (mode === 'register' && route.name !== 'register')) {
    void router.push({
      name: mode,
      query: route.query.redirect ? { redirect: route.query.redirect } : undefined,
    })
  }
}

function showError(text: string) {
  message.value = text
  messageType.value = 'error'
}

function showInfo(text: string) {
  message.value = text
  messageType.value = 'success'
}

async function handleSubmit() {
  const username = authForm.value.username.trim()
  const password = authForm.value.password.trim()
  const displayName = authForm.value.displayName.trim()

  if (!username || !password) {
    showError('请输入账号和密码')
    return
  }
  if (username.length > 60 || password.length > 60) {
    showError('账号和密码不能超过 60 个字符')
    return
  }
  if (authMode.value === 'register' && password.length < 6) {
    showError('密码长度需为 6 到 60 个字符')
    return
  }
  if (authMode.value === 'register' && displayName.length > 80) {
    showError('展示名不能超过 80 个字符')
    return
  }

  loading.value = true
  message.value = ''
  try {
    const res =
      authMode.value === 'login'
        ? await login({ username, password })
        : await register({ username, password, displayName: displayName || undefined })
    applyLogin(res, rememberMe.value)
    emit('success', { userId: res.userId, username: res.username, displayName: res.displayName })
  } catch (e) {
    showError(e instanceof Error ? e.message : authMode.value === 'login' ? '登录失败' : '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  background:
    radial-gradient(circle at 20% 14%, rgba(159, 92, 255, 0.08), transparent 26%),
    linear-gradient(135deg, #f8f9fc 0%, #ffffff 45%, #f4f0ff 100%);
  padding: 24px;
}

.auth-panel {
  width: min(508px, 100%);
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 44px rgba(15, 23, 42, 0.1);
  backdrop-filter: blur(12px);
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #e5e7eb;
}

.auth-tab {
  position: relative;
  height: 80px;
  border: 0;
  background: transparent;
  color: #7b8190;
  font-size: 18px;
  font-weight: 700;
}

.auth-tab--active {
  color: #a340cf;
}

.auth-tab--active::after {
  position: absolute;
  right: 18px;
  bottom: 0;
  left: 18px;
  height: 3px;
  background: linear-gradient(90deg, #b545d6, #8f3ed6);
  content: "";
}

.auth-form {
  display: grid;
  gap: 20px;
  padding: 36px 38px 32px;
}

.auth-form h1 {
  margin: 0 0 10px;
  color: #1f2433;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0;
}

.auth-form p {
  margin: 0;
  color: #6b7280;
  font-size: 15px;
  line-height: 1.6;
}

.auth-message {
  border-radius: 8px;
  background: #f1fdf6;
  color: #15803d;
  padding: 10px 12px;
  font-size: 13px;
}

.auth-message--error {
  background: #fff5f5;
  color: #dc2626;
}

.auth-field {
  display: grid;
  gap: 10px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
}

.auth-input-wrap {
  position: relative;
  display: block;
}

.auth-input-wrap input {
  width: 100%;
  height: 52px;
  border: 1px solid #e0e2e7;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  outline: none;
  padding: 0 48px 0 52px;
}

.auth-input-wrap input::placeholder {
  color: #9ca3af;
}

.auth-input-wrap input:focus {
  border-color: #b04bd2;
  box-shadow: 0 0 0 3px rgba(176, 75, 210, 0.1);
}

.auth-input-icon {
  position: absolute;
  top: 50%;
  left: 17px;
  color: #ad62c2;
  font-size: 21px;
  transform: translateY(-50%);
}

.auth-eye-button {
  position: absolute;
  top: 50%;
  right: 12px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #a0a6b2;
  transform: translateY(-50%);
}

.auth-eye-button:hover {
  background: #f6f1fb;
  color: #9a42c8;
}

.auth-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.auth-check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
}

.auth-check input {
  width: 18px;
  height: 18px;
  accent-color: #a746d2;
}

.auth-link {
  border: 0;
  background: transparent;
  color: #a340cf;
  padding: 0;
  font-weight: 700;
}

.auth-submit,
.auth-outline {
  display: inline-flex;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 800;
}

.auth-submit {
  border: 0;
  background: linear-gradient(135deg, #bd43d8, #9d3ed7);
  box-shadow: 0 12px 22px rgba(161, 62, 209, 0.24);
  color: #fff;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 16px 26px rgba(161, 62, 209, 0.28);
}

.auth-submit:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 18px;
  color: #a0a6b2;
}

.auth-divider::before,
.auth-divider::after {
  height: 1px;
  flex: 1;
  background: #e5e7eb;
  content: "";
}

.auth-outline {
  border: 1px solid #c454db;
  background: #fff;
  color: #a340cf;
}

.auth-outline:hover {
  background: #fbf4ff;
}

.auth-footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  color: #9ca3af;
}

@media (max-width: 540px) {
  .auth-page {
    padding: 14px;
  }

  .auth-tab {
    height: 64px;
    font-size: 16px;
  }

  .auth-form {
    gap: 16px;
    padding: 28px 22px 26px;
  }

  .auth-form h1 {
    font-size: 24px;
  }
}
</style>
