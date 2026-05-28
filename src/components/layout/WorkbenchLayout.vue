<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand-mark" aria-hidden="true" v-html="brandIcon"></span>
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
          <span class="app-menu-icon" aria-hidden="true" v-html="item.icon"></span>
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

const brandIcon = `
  <svg viewBox="0 0 24 24" role="img" focusable="false" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="brand-ai-bg" x1="3" y1="22" x2="21" y2="2" gradientUnits="userSpaceOnUse">
        <stop stop-color="#7C3AED" />
        <stop offset=".55" stop-color="#6D5CFF" />
        <stop offset="1" stop-color="#3B82F6" />
      </linearGradient>
      <linearGradient id="brand-ai-core" x1="7" y1="17" x2="17" y2="7" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFFFFF" />
        <stop offset="1" stop-color="#DCEBFF" stop-opacity=".92" />
      </linearGradient>
      <filter id="brand-ai-glow" x="-45%" y="-45%" width="190%" height="190%">
        <feGaussianBlur stdDeviation="1.35" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="url(#brand-ai-bg)" />
    <rect x="2.25" y="2.25" width="19.5" height="19.5" rx="5.9" stroke="#fff" stroke-opacity=".18" />
    <g filter="url(#brand-ai-glow)">
      <path d="M12 5.8l6.2 6.2-6.2 6.2L5.8 12 12 5.8z" fill="url(#brand-ai-core)" />
      <path d="M12 8.5l3.5 3.5-3.5 3.5L8.5 12 12 8.5z" fill="#6D5CFF" opacity=".82" />
      <path d="M12 4.4v2.1M12 17.5v2.1M4.4 12h2.1M17.5 12h2.1" stroke="#EDE9FE" stroke-width="1.45" stroke-linecap="round" />
      <circle cx="12" cy="12" r="1.45" fill="#F8FAFC" />
      <circle cx="6.4" cy="6.4" r=".75" fill="#BFDBFE" opacity=".95" />
      <circle cx="17.6" cy="6.4" r=".75" fill="#E9D5FF" opacity=".95" />
      <circle cx="6.4" cy="17.6" r=".75" fill="#E9D5FF" opacity=".95" />
      <circle cx="17.6" cy="17.6" r=".75" fill="#BFDBFE" opacity=".95" />
    </g>
  </svg>
`

const menuIcons = {
  trend: `
    <svg viewBox="0 0 24 24" role="img" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="menu-trend-gradient" x1="3.5" y1="20.5" x2="20.5" y2="3.5" gradientUnits="userSpaceOnUse">
          <stop stop-color="#A855F7" />
          <stop offset=".5" stop-color="#7C3AED" />
          <stop offset="1" stop-color="#3B82F6" />
        </linearGradient>
        <filter id="menu-trend-soft-glow" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="1.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#menu-trend-soft-glow)" stroke="url(#menu-trend-gradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="10.3" cy="13.7" r="6.2" />
        <circle cx="10.3" cy="13.7" r="2.8" opacity=".9" />
        <path d="M10.3 13.7l7.3-7.3" />
        <path d="M16.9 4.4v4.1H21" />
      </g>
      <circle cx="18.6" cy="5.8" r="1.1" fill="#BDE7FF" opacity=".95" />
    </svg>
  `,
  storyboard: `
    <svg viewBox="0 0 24 24" role="img" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="menu-board-gradient" x1="3" y1="20" x2="21" y2="4" gradientUnits="userSpaceOnUse">
          <stop stop-color="#C084FC" />
          <stop offset=".52" stop-color="#7C3AED" />
          <stop offset="1" stop-color="#3B82F6" />
        </linearGradient>
        <filter id="menu-board-soft-glow" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="1.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#menu-board-soft-glow)" stroke="url(#menu-board-gradient)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <rect x="4" y="6.5" width="16" height="11" rx="2.2" />
        <path d="M8 6.5v11M16 6.5v11M4 12h16" opacity=".88" />
        <path d="M6.5 4.8h3M14.5 4.8h3M6.5 19.2h3M14.5 19.2h3" opacity=".75" />
      </g>
      <path d="M10.8 9.6l3.7 2.4-3.7 2.4V9.6z" fill="url(#menu-board-gradient)" opacity=".92" />
    </svg>
  `,
  voice: `
    <svg viewBox="0 0 24 24" role="img" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="menu-voice-gradient" x1="4" y1="21" x2="20" y2="3" gradientUnits="userSpaceOnUse">
          <stop stop-color="#C084FC" />
          <stop offset=".5" stop-color="#7C3AED" />
          <stop offset="1" stop-color="#3B82F6" />
        </linearGradient>
        <filter id="menu-voice-soft-glow" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="1.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#menu-voice-soft-glow)" stroke="url(#menu-voice-gradient)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="4" width="6" height="10" rx="3" />
        <path d="M6.5 11.2a5.5 5.5 0 0 0 11 0" />
        <path d="M12 16.8V20" />
        <path d="M9.2 20h5.6" />
        <path d="M4.3 9.4v4.2M19.7 9.4v4.2" opacity=".7" />
      </g>
      <path d="M12 6.4v4.2" stroke="#F5F3FF" stroke-width="1.1" stroke-linecap="round" opacity=".82" />
    </svg>
  `,
  avatar: `
    <svg viewBox="0 0 24 24" role="img" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="menu-avatar-gradient" x1="4" y1="21" x2="20" y2="3" gradientUnits="userSpaceOnUse">
          <stop stop-color="#C084FC" />
          <stop offset=".5" stop-color="#7C3AED" />
          <stop offset="1" stop-color="#3B82F6" />
        </linearGradient>
        <radialGradient id="menu-avatar-fill" cx="50%" cy="40%" r="65%">
          <stop stop-color="#F5F3FF" />
          <stop offset=".38" stop-color="#A78BFA" />
          <stop offset="1" stop-color="#3B82F6" />
        </radialGradient>
        <filter id="menu-avatar-soft-glow" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="1.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#menu-avatar-soft-glow)">
        <path d="M7.1 19.3c.6-3.5 2.2-5.2 4.9-5.2s4.3 1.7 4.9 5.2" fill="url(#menu-avatar-fill)" opacity=".58" />
        <circle cx="12" cy="10" r="3.7" fill="url(#menu-avatar-fill)" opacity=".92" />
        <path d="M5.2 8.1V6.6c0-.8.6-1.4 1.4-1.4h1.6M18.8 8.1V6.6c0-.8-.6-1.4-1.4-1.4h-1.6M5.2 15.9v1.5c0 .8.6 1.4 1.4 1.4h1.6M18.8 15.9v1.5c0 .8-.6 1.4-1.4 1.4h-1.6" stroke="url(#menu-avatar-gradient)" stroke-width="1.8" stroke-linecap="round" />
      </g>
      <path d="M10.5 10.1h.1M13.4 10.1h.1" stroke="#F8FAFC" stroke-width="1.5" stroke-linecap="round" opacity=".86" />
    </svg>
  `,
  render: `
    <svg viewBox="0 0 24 24" role="img" focusable="false" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="menu-video-gradient" x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop stop-color="#C084FC" />
          <stop offset=".5" stop-color="#7C3AED" />
          <stop offset="1" stop-color="#3B82F6" />
        </linearGradient>
        <filter id="menu-video-soft-glow" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur stdDeviation="1.65" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#menu-video-soft-glow)" stroke="url(#menu-video-gradient)" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6.4 4.5h2.7M14.9 4.5h2.7M6.4 19.5h2.7M14.9 19.5h2.7M4.5 6.4v2.7M4.5 14.9v2.7M19.5 6.4v2.7M19.5 14.9v2.7" />
        <rect x="7.2" y="7.2" width="9.6" height="9.6" rx="2.4" />
      </g>
      <path d="M10.5 9.4l4.2 2.6-4.2 2.6V9.4z" fill="url(#menu-video-gradient)" />
    </svg>
  `,
} as const

const menuItems = [
  { key: 'video-parse', label: '爆款对标', icon: menuIcons.trend },
  { key: 'storyboard', label: '分镜生成', icon: menuIcons.storyboard },
  { key: 'voice', label: '声音生成', icon: menuIcons.voice },
  { key: 'avatar', label: '数字人形象', icon: menuIcons.avatar },
  { key: 'render', label: '视频制作', icon: menuIcons.render },
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
  { key: 'render', label: '视频制作' },
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
