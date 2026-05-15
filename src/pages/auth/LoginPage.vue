<template>
  <main class="auth-page">
    <section class="auth-shell" aria-label="登录与注册">
      <div class="auth-visual">
        <img class="auth-visual-image"  alt="登录欢迎插画" />
      </div>

      <section class="auth-panel" aria-label="登录表单">
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
              <span class="auth-input-icon" aria-hidden="true">
                <img :src="passwordIcon" alt="" class="auth-input-icon-image" />
              </span>
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

          <label v-if="authMode === 'register'" class="auth-field">
            <span>激活码</span>
            <span class="auth-input-wrap">
              <span class="auth-input-icon" aria-hidden="true">◈</span>
              <input
                v-model="authForm.key"
                type="text"
                autocomplete="off"
                maxlength="64"
                placeholder="请输入激活码"
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
    </section>
  </main>
</template>

<script setup lang="ts">
import passwordIcon from '../../assets/image.png'
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
const authForm = ref({ username: '', password: '', displayName: '', key: '' })
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
  const key = authForm.value.key.trim()

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
        : await register({
            username,
            password,
            displayName: displayName || undefined,
            key: key || undefined,
          })
    applyLogin(res, rememberMe.value)
    emit('success', { userId: res.userId, username: res.username, displayName: res.displayName })
  } catch (e) {
    console.log(e)
    if (authMode.value === 'login') {
      showError('账号或密码错误，请重新输入')
    } else {
      showError(extractErrorMessage(e) || '注册失败')
    }
  } finally {
    loading.value = false
  }
}

function extractErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const jsonStart = raw.indexOf('{')
  if (jsonStart >= 0) {
    try {
      const body = JSON.parse(raw.slice(jsonStart)) as { message?: string }
      if (body?.message) return body.message
    } catch {
      // ignore parse errors and fall through
    }
  }
  return raw
}
</script>

<style scoped>
.auth-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  background: #f8f7ff url("../../assets/background.png") center / cover no-repeat;
  overflow: hidden;
  padding: 48px 24px;
}

.auth-page::before,
.auth-page::after {
  display: none;
}

.auth-page::before {
  top: -150px;
  right: -90px;
  width: 440px;
  height: 440px;
  border: 72px solid rgba(158, 119, 255, 0.1);
  border-radius: 50%;
}

.auth-page::after {
  right: -120px;
  bottom: -170px;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: rgba(160, 129, 255, 0.1);
}

.auth-shell {
  position: relative;
  z-index: 1;
  display: grid;
  width: min(1110px, 100%);
  align-items: center;
  justify-content: center;
  grid-template-columns: minmax(550px, 550px);
  justify-content: center;

}

.auth-visual {
  height: 666px;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 24px 54px rgba(126, 92, 210, 0.16);
  transform: translateX(90px);
}

.auth-visual-image {
  display: block;
  width: 80%;
  height: 100%;
  object-fit: fill;
}

.auth-panel {
  position: relative;
  z-index: 2;
  width: 100%;
  min-height: 620px;
  margin-left: -44px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.82);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 58px rgba(32, 25, 80, 0.13);
  backdrop-filter: blur(16px);
}

.auth-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid #e5e7eb;
}

.auth-tab {
  position: relative;
  height: 86px;
  border: 0;
  background: transparent;
  color: #7d8493;
  font-size: 19px;
  font-weight: 700;
}

.auth-tab--active {
  color: #9655f6;
}

.auth-tab--active::after {
  position: absolute;
  right: 48px;
  bottom: 0;
  left: 48px;
  height: 3px;
  background: linear-gradient(90deg, #b663ff, #7e4bf4);
  content: "";
}

.auth-form {
  display: grid;
  gap: 22px;
  padding: 46px 46px 34px;
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
  padding: 11px 13px;
  font-size: 13px;
}

.auth-message--error {
  background: #fff5f5;
  color: #dc2626;
}

.auth-field {
  display: grid;
  gap: 12px;
  color: #151927;
  font-size: 14px;
  font-weight: 700;
}

.auth-input-wrap {
  position: relative;
  display: block;
}

.auth-input-wrap input {
  width: 100%;
  height: 56px;
  border: 1px solid #e0e2e7;
  border-radius: 6px;
  background: #fff;
  color: #111827;
  outline: none;
  padding: 0 48px 0 54px;
  font-size: 15px;
  font-weight: 600;
}

.auth-input-wrap input::placeholder {
  color: #9aa3b2;
}

.auth-input-wrap input:focus {
  border-color: #a864ff;
  box-shadow: 0 0 0 3px rgba(168, 100, 255, 0.11);
}

.auth-input-icon {
  position: absolute;
  top: 50%;
  left: 18px;
  color: #9b62f6;
  font-size: 20px;
  line-height: 1;
  transform: translateY(-50%);
}

.auth-eye-button {
  position: absolute;
  top: 50%;
  right: 13px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #9aa3b2;
  transform: translateY(-50%);
}

.auth-eye-button:hover {
  background: #f6f2ff;
  color: #8854ee;
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
  color: #747b8b;
  font-weight: 500;
}

.auth-check input {
  width: 18px;
  height: 18px;
  accent-color: #995af7;
}

.auth-link {
  border: 0;
  background: transparent;
  color: #8f56f2;
  padding: 0;
  font-weight: 700;
}

.auth-submit,
.auth-outline {
  display: inline-flex;
  min-height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 800;
}

.auth-submit {
  border: 0;
  background: linear-gradient(135deg, #b758ff, #794df4);
  box-shadow: 0 14px 24px rgba(126, 77, 244, 0.26);
  color: #fff;
}

.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 28px rgba(126, 77, 244, 0.3);
}

.auth-submit:disabled {
  cursor: not-allowed;
  opacity: 0.64;
}

.auth-divider {
  display: flex;
  align-items: center;
  gap: 18px;
  color: #a6adba;
  font-size: 14px;
}

.auth-divider::before,
.auth-divider::after {
  height: 1px;
  flex: 1;
  background: #e5e7eb;
  content: "";
}

.auth-outline {
  border: 1px solid #b36eff;
  background: #fff;
  color: #8d55f2;
}

.auth-outline:hover {
  background: #fbf8ff;
}

.auth-footer {
  display: flex;
  justify-content: center;
  gap: 8px;
  color: #a3aab8;
}

@media (max-width: 960px) {
  .auth-page {
    padding: 28px 18px;
  }

  .auth-shell {
    gap: 20px;
    grid-template-columns: minmax(0, 560px);
  }

  .auth-visual {
    height: 300px;
  }

  .auth-panel {
    min-height: 0;
    margin-left: 0;
  }
}

@media (max-width: 540px) {
  .auth-page {
    padding: 14px;
  }

  .auth-visual {
    height: 230px;
  }

  .auth-tab {
    height: 64px;
    font-size: 16px;
  }

  .auth-tab--active::after {
    right: 26px;
    left: 26px;
  }

  .auth-form {
    gap: 16px;
    padding: 28px 22px 26px;
  }

  .auth-row,
  .auth-footer {
    align-items: center;
    flex-wrap: wrap;
  }
}
.login-illustration,
.welcome-illustration,
.illustration-panel,
.login-aside,
.auth-aside,
.auth-visual,
.login-visual,
.welcome-panel {
  display: none;
}

.auth-panel {
  margin: auto;
}

.auth-input-icon-image {
  display: block;
  width: 1em;
  height: 1em;
  object-fit: contain;
}

</style>
