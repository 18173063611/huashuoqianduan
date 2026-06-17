<template>
  <el-container class="admin-shell">
    <el-aside class="admin-aside" width="240px">
      <div class="admin-brand">
        <strong>华烁后台</strong>
        <span>运营管理</span>
      </div>

      <el-menu class="admin-menu" :default-active="activePath" router>
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataLine /></el-icon>
          <span>概览</span>
        </el-menu-item>
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/models">
          <el-icon><Setting /></el-icon>
          <span>模型配置</span>
        </el-menu-item>
        <el-menu-item index="/admin/billing-config">
          <el-icon><PriceTag /></el-icon>
          <span>AI 计费配置</span>
        </el-menu-item>
        <el-menu-item index="/admin/tasks">
          <el-icon><Tickets /></el-icon>
          <span>任务管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/selling-point-templates">
          <el-icon><Memo /></el-icon>
          <span>卖点模板</span>
        </el-menu-item>
        <el-menu-item index="/admin/provider-ops">
          <el-icon><Warning /></el-icon>
          <span>运维工单</span>
        </el-menu-item>
        <el-menu-item index="/admin/feedback">
          <el-icon><Service /></el-icon>
          <span>客服工单</span>
        </el-menu-item>
        <el-menu-item index="/admin/assets">
          <el-icon><FolderOpened /></el-icon>
          <span>资产管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/credit-logs">
          <el-icon><Coin /></el-icon>
          <span>积分流水</span>
        </el-menu-item>
        <el-menu-item index="/admin/activation-codes">
          <el-icon><Key /></el-icon>
          <span>内测码</span>
        </el-menu-item>
        <el-menu-item index="/admin/operation-logs">
          <el-icon><Memo /></el-icon>
          <span>操作日志</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="admin-header">
        <div>
          <h1>{{ pageTitle }}</h1>
          <p>面向运营人员的账号、积分、任务和模型管理后台</p>
        </div>
        <div class="admin-header-actions">
          <span class="admin-user-name">{{ currentUser?.displayName || currentUser?.username || '管理员' }}</span>
          <el-tag type="success" effect="plain">系统管理员</el-tag>
          <el-button :icon="SwitchButton" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>

      <el-main class="admin-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { Coin, DataLine, FolderOpened, Key, Memo, PriceTag, Service, Setting, SwitchButton, Tickets, User, Warning } from '@element-plus/icons-vue'
import { clearLogin, getAuthUser, logout } from '../../services/authApi'

const route = useRoute()
const router = useRouter()
const currentUser = computed(() => getAuthUser('ADMIN_WEB'))

const titleMap: Record<string, string> = {
  '/admin/dashboard': '运营概览',
  '/admin/users': '用户管理',
  '/admin/models': '模型配置',
  '/admin/billing-config': 'AI 计费配置',
  '/admin/tasks': '任务管理',
  '/admin/selling-point-templates': '卖点模板管理',
  '/admin/provider-ops': '运维工单',
  '/admin/feedback': '客服工单',
  '/admin/assets': '资产管理',
  '/admin/credit-logs': '积分流水',
  '/admin/activation-codes': '内测码',
  '/admin/operation-logs': '操作日志',
}

const activePath = computed(() => (route.path.startsWith('/admin/users/') ? '/admin/users' : route.path))
const pageTitle = computed(() => String(route.meta.title || titleMap[activePath.value] || '后台管理'))

async function handleLogout() {
  try {
    await logout('ADMIN_WEB')
  } catch {
    // ignore
  } finally {
    clearLogin('ADMIN_WEB')
    void router.replace('/admin/login')
  }
}
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: #f5f7fb;
}

.admin-aside {
  border-right: 1px solid #e5e7eb;
  background: #ffffff;
}

.admin-brand {
  display: grid;
  gap: 4px;
  padding: 24px 22px 18px;
  border-bottom: 1px solid #eef0f4;
}

.admin-brand strong {
  color: #1f2937;
  font-size: 20px;
}

.admin-brand span,
.admin-header p {
  color: #8a94a6;
  font-size: 13px;
}

.admin-menu {
  border-right: 0;
}

.admin-header {
  display: flex;
  height: 76px;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.admin-header h1 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.admin-header p {
  margin: 6px 0 0;
}

.admin-header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.admin-user-name {
  color: #374151;
  font-weight: 600;
}

.admin-main {
  padding: 22px;
}

/* P1 visual refresh: align admin shell with workspace system */
.admin-shell {
  background: var(--hs-bg, #f3f6fb);
}

.admin-aside {
  border-right: 0;
  background: #101828;
}

.admin-brand {
  border-bottom-color: rgba(255, 255, 255, 0.1);
  padding: 22px 20px 16px;
}

.admin-brand strong {
  color: #ffffff;
  font-size: 18px;
}

.admin-brand span {
  color: rgba(255, 255, 255, 0.62);
}

.admin-menu {
  background: transparent;
}

.admin-aside :deep(.el-menu) {
  border-right: 0;
  background: transparent;
}

.admin-aside :deep(.el-menu-item) {
  height: 42px;
  margin: 4px 10px;
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.72);
}

.admin-aside :deep(.el-menu-item:hover) {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.admin-aside :deep(.el-menu-item.is-active) {
  background: rgba(37, 99, 235, 0.2);
  color: #ffffff;
}

.admin-aside :deep(.el-menu-item.is-active)::before {
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: 0;
  width: 3px;
  border-radius: 999px;
  background: var(--hs-primary, #2563eb);
  content: "";
}

.admin-header {
  height: 68px;
  border-bottom-color: var(--hs-border, #d9e1ec);
  background: #ffffff;
  padding: 0 22px;
}

.admin-header h1 {
  color: var(--hs-text, #172033);
  font-size: 18px;
}

.admin-header p {
  color: var(--hs-muted, #667085);
}

.admin-main {
  padding: 20px;
}

.admin-user-name {
  color: var(--hs-text, #172033);
}

@media (max-width: 900px) {
  .admin-shell {
    display: block;
  }

  .admin-aside {
    width: 100% !important;
  }

  .admin-menu {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding-bottom: 10px;
  }

  .admin-header {
    height: auto;
    min-height: 68px;
    flex-wrap: wrap;
    gap: 12px;
    padding: 14px 18px;
  }

  .admin-header-actions {
    flex-wrap: wrap;
  }
}
</style>
