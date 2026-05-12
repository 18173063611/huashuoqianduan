<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand-mark">◇</span>
        <div>
          <strong>AI爆款视频改造</strong>
          <small>智能内容生产工作台</small>
        </div>
      </div>
      <nav class="app-menu">
        <button
          v-for="item in menuItems"
          :key="item.key"
          :class="['app-menu-item', { active: item.key === activeKey }]"
          type="button"
          @click="$emit('change', item.key)"
        >
          <span class="app-menu-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div class="app-stepper" aria-label="制作流程">
          <div
            v-for="(step, index) in flowSteps"
            :key="step.key"
            :class="['app-step', { active: index === activeStepIndex, done: index < activeStepIndex }]"
          >
            <span>{{ index + 1 }}</span>
            <strong>{{ step.label }}</strong>
          </div>
        </div>
        <div class="app-topbar-actions">
          <div v-if="authed && currentUser" class="app-user-summary" title="当前账号积分余额">
            <span>{{ currentUser.displayName || currentUser.username }}</span>
            <strong>积分 {{ currentUser.creditBalance ?? 0 }}</strong>
          </div>
          <button class="app-ghost-button" type="button" @click="$emit('openAssets')">资产中心</button>
          <button
            v-if="!authed"
            class="app-ghost-button"
            type="button"
            @click="jumpToLogin"
          >
            登录
          </button>
          <button
            v-else
            class="app-ghost-button"
            type="button"
            @click="handleLogout"
          >
            退出登录
          </button>
        </div>
      </header>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logout, clearLogin, me, setAuthUser } from '../../services/authApi'
import { getAuthUser } from '../../services/authSession'
import { getAuthToken } from '../../services/request'
import type { UserMe } from '../../types/userTypes'

const menuItems = [
  { key: 'video-parse', label: '爆款对标', icon: '◉' },
  { key: 'storyboard', label: '分镜生成', icon: '▤' },
  { key: 'voice', label: '声音生成', icon: '♬' },
  { key: 'avatar', label: '数字人形象', icon: '◎' },
  { key: 'render', label: '视频制作', icon: '▻' },
] as const

type MenuKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  activeKey: MenuKey
}>()

defineEmits<{
  change: [key: MenuKey]
  openAssets: []
}>()

const flowSteps = [
  { key: 'video-parse', label: '对标分析' },
  { key: 'storyboard', label: '脚本生成' },
  { key: 'voice', label: '声音合成' },
  { key: 'avatar', label: '数字人形象生成' },
  { key: 'render', label: '视频制作生成' },
] as const

const router = useRouter()
const route = useRoute()
const currentUser = ref<UserMe | null>(getAuthUser())

const authed = computed(() => !!getAuthToken())

async function refreshCurrentUser() {
  if (!getAuthToken()) {
    currentUser.value = null
    return
  }
  try {
    const user = await me()
    setAuthUser(user)
    currentUser.value = user
  } catch {
    currentUser.value = getAuthUser()
  }
}

function jumpToLogin() {
  void router.push({ path: '/login', query: { redirect: router.currentRoute.value.fullPath } })
}

async function handleLogout() {
  try {
    await logout()
  } catch {
    // ignore: 即使后端 session 已失效，也应清理本地登录态
  } finally {
    clearLogin()
    void router.push({ path: '/login' })
  }
}

const stepIndexMap: Record<MenuKey, number> = {
  'video-parse': 0,
  storyboard: 1,
  voice: 2,
  avatar: 3,
  render: 4,
}

const activeStepIndex = computed(() => stepIndexMap[props.activeKey] ?? 0)

onMounted(() => {
  void refreshCurrentUser()
})

watch(
  () => route.fullPath,
  () => {
    void refreshCurrentUser()
  },
)
</script>

<style scoped>
.app-user-summary {
  display: inline-flex;
  min-height: 34px;
  max-width: 220px;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  border: 1px solid #e6e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  padding: 0 12px;
  font-size: 13px;
}

.app-user-summary span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-user-summary strong {
  flex: 0 0 auto;
  color: #111827;
  font-size: 12px;
}

@media (max-width: 860px) {
  .app-user-summary {
    display: none;
  }
}
</style>
