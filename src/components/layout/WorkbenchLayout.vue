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
          <div v-if="authed && currentUser" class="app-credit-pill" title="当前账号积分">
            <span class="app-credit-pill-label">积分</span>
            <strong class="app-credit-pill-value">{{ currentUser.creditBalance ?? 0 }}</strong>
            <span v-if="(currentUser.creditFrozenBalance ?? 0) > 0" class="app-credit-pill-frozen">
              冻结 {{ currentUser.creditFrozenBalance }}
            </span>
          </div>
          <button
            type="button"
            class="app-assets-nav-btn"
            :class="{ 'app-assets-nav-btn--active': assetHubActive }"
            @click="$emit('openAssets')"
          >
            资产中心
          </button>
          <button
            v-if="!authed"
            class="app-ghost-button app-topbar-ghost"
            type="button"
            @click="jumpToLogin"
          >
            登录
          </button>
          <button v-else class="app-ghost-button app-topbar-ghost" type="button" @click="handleLogout">
            退出登录
          </button>
        </div>
      </header>

      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logout, clearLogin, me, setAuthUser } from '../../services/authApi'
import { subscribeAuthRefresh } from '../../services/authRefreshHub'
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

type MenuItemKey = (typeof menuItems)[number]['key']

const props = defineProps<{
  /** 左侧高亮：与路由 menuKey 或流程页对应 */
  activeKey: string
  /** 当前在资产中心全页时为 true，用于顶部「资产中心」按钮高亮 */
  assetHubActive: boolean
}>()

defineEmits<{
  change: [key: MenuItemKey]
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

const stepIndexMap: Record<string, number> = {
  'video-parse': 0,
  storyboard: 1,
  voice: 2,
  avatar: 3,
  render: 4,
  AssetCenter: -1,
}

const activeStepIndex = computed(() => stepIndexMap[props.activeKey] ?? -1)

let unsubscribeAuthRefresh: (() => void) | null = null

onMounted(() => {
  void refreshCurrentUser()
  unsubscribeAuthRefresh = subscribeAuthRefresh(() => {
    void refreshCurrentUser()
  })
})

onUnmounted(() => {
  unsubscribeAuthRefresh?.()
  unsubscribeAuthRefresh = null
})

watch(
  () => route.fullPath,
  () => {
    void refreshCurrentUser()
  },
)
</script>

<style scoped>
.app-credit-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  color: #334155;
  font-size: 13px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.app-credit-pill-label {
  color: #64748b;
  font-weight: 600;
  font-size: 12px;
}

.app-credit-pill-value {
  color: #0f172a;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.app-credit-pill-frozen {
  font-size: 11px;
  color: #94a3b8;
  margin-left: 4px;
}

.app-assets-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid rgba(79, 70, 229, 0.45);
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(79, 70, 229, 0.28);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.app-assets-nav-btn:hover {
  filter: brightness(1.06);
  box-shadow: 0 8px 22px rgba(79, 70, 229, 0.38);
  transform: translateY(-1px);
}

.app-assets-nav-btn--active {
  box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(99, 102, 241, 0.55), 0 8px 24px rgba(79, 70, 229, 0.42);
}

.app-topbar-ghost {
  border-radius: 10px;
}

@media (max-width: 860px) {
  .app-credit-pill {
    display: none;
  }
}
</style>
