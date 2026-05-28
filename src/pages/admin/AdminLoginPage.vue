<template>
  <main class="admin-login-page">
    <section class="admin-login-panel">
      <div class="admin-login-title">
        <h1>华烁后台</h1>
        <p>管理员账号登录</p>
      </div>

      <el-alert
        v-if="message"
        class="admin-login-alert"
        :title="message"
        type="error"
        show-icon
        :closable="false"
      />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="账号" prop="username">
          <el-input v-model="form.username" autocomplete="username" maxlength="60" placeholder="请输入管理员账号" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            autocomplete="current-password"
            maxlength="60"
            placeholder="请输入密码"
            show-password
            type="password"
          />
        </el-form-item>

        <el-button class="admin-login-submit" type="primary" native-type="submit" :loading="loading">
          登录后台
        </el-button>
      </el-form>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { applyLogin, clearLogin, login } from '../../services/authApi'

const route = useRoute()
const router = useRouter()

const formRef = ref<FormInstance>()
const form = reactive({
  username: '',
  password: '',
})
const loading = ref(false)
const message = ref('')

const rules: FormRules<typeof form> = {
  username: [{ required: true, message: '请输入管理员账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  message.value = ''
  try {
    const res = await login({
      username: form.username.trim(),
      password: form.password.trim(),
    }, 'ADMIN_WEB')
    // 管理后台只接受 ADMIN 角色；后端仍需要二次鉴权，前端校验只负责体验闭环。
    if (res.role !== 'ADMIN') {
      clearLogin('ADMIN_WEB')
      message.value = '当前账号没有管理员权限'
      return
    }
    applyLogin(res, 'ADMIN_WEB')
    const redirect = Array.isArray(route.query.redirect) ? route.query.redirect[0] : route.query.redirect
    const target = redirect && redirect.startsWith('/admin') ? redirect : '/admin/dashboard'
    void router.replace(target)
  } catch {
    message.value = '管理员账号或密码错误'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 32px;
  background: #eef2f8;
}

.admin-login-panel {
  width: min(420px, 100%);
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.admin-login-title {
  margin-bottom: 24px;
}

.admin-login-title h1 {
  margin: 0;
  font-size: 26px;
  color: #111827;
}

.admin-login-title p {
  margin: 8px 0 0;
  color: #6b7280;
}

.admin-login-alert {
  margin-bottom: 18px;
}

.admin-login-submit {
  width: 100%;
  margin-top: 4px;
}
</style>
