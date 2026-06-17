<template>
  <Teleport to="body">
    <div v-if="authModal.state.visible" class="login-required-backdrop" @click.self="close">
      <section class="login-required-modal" role="dialog" aria-modal="true" aria-labelledby="login-required-title">
        <button class="login-required-close" type="button" aria-label="关闭" @click="close">×</button>
        <div class="login-required-head">
          <h2 id="login-required-title">登录后继续使用</h2>
          <p>登录后可生成视频、管理资产、查看任务进度和保存作品。</p>
          <small v-if="authModal.state.actionName">{{ authModal.state.actionName }}</small>
        </div>
        <LoginPage
          embedded
          :redirect-on-success="false"
          :sync-route-on-mode-change="false"
          @success="handleLoginSuccess"
        />
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useAuthModalStore } from '../../stores/authModal'
import LoginPage from '../../pages/auth/LoginPage.vue'

const router = useRouter()
const route = useRoute()
const authModal = useAuthModalStore()

function close() {
  authModal.close()
}

function handleLoginSuccess() {
  const redirect = authModal.state.redirect || route.fullPath
  authModal.close()
  if (redirect && redirect !== route.fullPath) {
    void router.replace(redirect)
  }
}
</script>

<style scoped>
.login-required-backdrop {
  position: fixed;
  z-index: 4000;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 20px;
}

.login-required-modal {
  position: relative;
  width: min(460px, 100%);
  max-height: min(760px, calc(100vh - 40px));
  overflow: auto;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.2);
  padding: 0;
}

.login-required-close {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font-size: 24px;
  line-height: 1;
}

.login-required-close:hover {
  background: #f2f4f7;
  color: #111827;
}

.login-required-head {
  border-bottom: 1px solid #e5e7eb;
  padding: 28px 30px 18px;
  text-align: center;
}

.login-required-modal h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 20px;
  font-weight: 850;
}

.login-required-modal p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.login-required-modal small {
  display: block;
  margin-top: 10px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

@media (max-width: 480px) {
  .login-required-modal {
    max-height: calc(100vh - 24px);
  }

  .login-required-head {
    padding: 24px 20px 16px;
  }
}
</style>
