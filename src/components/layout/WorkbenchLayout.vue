<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="app-brand">
        <span class="app-brand-mark" aria-hidden="true">
          <el-icon :size="18"><VideoCamera /></el-icon>
        </span>
        <div>
          <strong>华烁 AI 视频</strong>
          <small>让每一条视频都能带来转化</small>
        </div>
      </div>

      <nav class="app-menu" aria-label="主功能导航">
        <section v-for="section in menuSections" :key="section.key" class="app-menu-section">
          <button
            type="button"
            :class="[
              'app-menu-section-button',
              {
                active: section.key === activeSectionKey,
                open: section.key === expandedSectionKey,
              },
            ]"
            @click="toggleMenuSection(section.key)"
          >
            <span class="app-menu-icon" aria-hidden="true">
              <el-icon :size="18"><component :is="section.icon" /></el-icon>
            </span>
            <span>{{ section.label }}</span>
            <el-icon class="app-menu-section-arrow" :size="14"><ArrowDown /></el-icon>
          </button>
          <div v-show="section.key === expandedSectionKey" class="app-menu-children">
            <button
              v-for="item in section.items"
              :key="item.key"
              :class="['app-menu-item', { active: item.key === activeKey }]"
              type="button"
              @click="$emit('change', item.key)"
            >
              <span>{{ item.label }}</span>
            </button>
          </div>
        </section>
      </nav>

      <div class="app-sidebar-user-wrap">
        <button class="app-sidebar-user" type="button" @click="openUserMenu">
          <span class="app-user-avatar">{{ userInitial }}</span>
          <span>
            <strong>{{ userDisplayName }}</strong>
            <small>{{ userSubtitle }}</small>
          </span>
          <span class="app-user-caret">⌄</span>
        </button>
        <div v-if="userMenuPlacement === 'sidebar' && authed" class="app-user-popover app-user-popover--sidebar">
          <button type="button" @click="goUserProfile">个人中心</button>
          <button type="button" @click="openCreditCenter">积分记录</button>
          <button type="button" @click="goPreferences">偏好设置</button>
          <button type="button" class="danger" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </aside>

    <main class="app-main">
      <header class="app-topbar">
        <div v-if="showPageHeading" class="app-page-heading">
          <h1>{{ pageTitle }}</h1>
          <p>{{ pageSubtitle }}</p>
        </div>
        <div class="app-topbar-actions">
          <button type="button" class="app-ghost-button app-task-entry" aria-label="任务队列" @click="openTaskCenter">
            <el-icon :size="16"><Tickets /></el-icon>
            <span>任务中心</span>
          </button>
          <button type="button" class="app-credit-pill" title="当前账号积分" @click="openCreditCenter">
            <el-icon :size="16"><Wallet /></el-icon>
            <span class="app-credit-pill-label">积分</span>
            <strong v-if="authed && currentUser" class="app-credit-pill-value">{{ currentUser.creditBalance ?? 0 }}</strong>
            <span v-if="(currentUser?.creditFrozenBalance ?? 0) > 0" class="app-credit-pill-frozen">
              冻结 {{ currentUser?.creditFrozenBalance }}
            </span>
          </button>
          <button
            type="button"
            class="app-assets-nav-btn"
            :class="{ 'app-assets-nav-btn--active': assetHubActive }"
            @click="openAssetCenter"
          >
            <el-icon :size="16"><FolderOpened /></el-icon>
            <span>资产中心</span>
          </button>
          <button type="button" class="app-icon-button" aria-label="通知" @click="openNotifications">
            <el-icon :size="16"><Bell /></el-icon>
          </button>
          <button
            v-if="!authed"
            class="app-ghost-button app-topbar-ghost"
            type="button"
            @click="promptLogin()"
          >
            <el-icon :size="16"><User /></el-icon>
            <span>登录</span>
          </button>
          <button
            v-else
            class="app-user-menu-button"
            type="button"
            title="用户菜单"
            @click="toggleTopUserMenu"
          >
            <span class="app-user-avatar app-user-avatar--top">{{ userInitial }}</span>
            <span class="app-user-menu-name">{{ currentUser?.displayName || currentUser?.username }}</span>
            <span class="app-user-caret">⌄</span>
          </button>
          <div v-if="userMenuPlacement === 'top' && authed" class="app-user-popover app-user-popover--top">
            <button type="button" @click="goUserProfile">个人中心</button>
            <button type="button" @click="openCreditCenter">积分记录</button>
            <button type="button" @click="goPreferences">偏好设置</button>
            <button type="button" class="danger" @click="handleLogout">退出登录</button>
          </div>
        </div>
      </header>

      <slot />
    </main>
    <LoginRequiredModal />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowDown,
  DataAnalysis,
  Document,
  FolderOpened,
  MagicStick,
  Microphone,
  PictureRounded,
  Bell,
  Tickets,
  User,
  VideoCamera,
  Wallet,
} from '@element-plus/icons-vue'
import { logout, clearLogin, me, setAuthUser } from '../../services/authApi'
import { subscribeAuthRefresh } from '../../services/authRefreshHub'
import { getAuthUser } from '../../services/authSession'
import { getAuthToken } from '../../services/request'
import type { UserMe } from '../../types/userTypes'
import { useAuthRequired } from '../../composables/useAuthRequired'
import LoginRequiredModal from './LoginRequiredModal.vue'

interface MenuItem {
  key: string
  label: string
  icon: Component
  title: string
  subtitle: string
}

interface MenuSection {
  key: MenuSectionKey
  label: string
  icon: Component
  items: MenuItem[]
}

type MenuSectionKey = 'creation' | 'ai-tools'

const menuSections: MenuSection[] = [
  {
    key: 'creation',
    label: '创作中心',
    icon: MagicStick,
    items: [
      {
        key: 'render',
        label: 'AI智能创作',
        icon: MagicStick,
        title: 'AI智能创作',
        subtitle: '上传车辆图片、选择卖点，进入方案确认和视频生成链路。',
      },
      {
        key: 'benchmark-create',
        label: '爆款对标创作',
        icon: DataAnalysis,
        title: '爆款对标创作',
        subtitle: '从优秀案例中提炼卖点、文案和成片结构。',
      },
      {
        key: 'asset-reuse',
        label: '资产复用创作',
        icon: FolderOpened,
        title: '资产复用创作',
        subtitle: '从已有文案、分镜、数字人和素材中组合生成新视频。',
      },
    ],
  },
  {
    key: 'ai-tools',
    label: 'AI资产生产工具',
    icon: DataAnalysis,
    items: [
      {
        key: 'video-parse',
        label: '爆款对标',
        icon: DataAnalysis,
        title: '爆款对标',
        subtitle: '解析参考视频，沉淀口播文案、对标分析和可复用素材。',
      },
      {
        key: 'script-rewrite',
        label: '文案生成',
        icon: Document,
        title: '文案生成',
        subtitle: '解析或改写销售文案，沉淀可复用口播脚本。',
      },
      {
        key: 'storyboard',
        label: '分镜生成',
        icon: Tickets,
        title: '分镜生成',
        subtitle: '把文案拆成镜头结构，作为可复用分镜资产。',
      },
      {
        key: 'avatar',
        label: '数字人形象',
        icon: PictureRounded,
        title: '数字人形象',
        subtitle: '生成主播形象和数字人口播素材。',
      },
      {
        key: 'voice',
        label: '声音生成',
        icon: Microphone,
        title: '声音生成',
        subtitle: '生成口播音频，管理可复用音色。',
      },
    ],
  },
]

const menuItems = menuSections.flatMap((section) => section.items)

type MenuItemKey = MenuItem['key']

const props = defineProps<{
  /** 左侧高亮：与路由 menuKey 或流程页对应 */
  activeKey: string
  /** 当前在资产中心全页时为 true，用于顶部「资产中心」按钮高亮 */
  assetHubActive: boolean
}>()

const emit = defineEmits<{
  change: [key: MenuItemKey]
  openAssets: []
}>()

const router = useRouter()
const route = useRoute()
const { openAuthModal, requireAuth } = useAuthRequired()
const currentUser = ref<UserMe | null>(getAuthUser())
const expandedSectionKey = ref<MenuSectionKey | ''>('creation')
const userMenuPlacement = ref<'sidebar' | 'top' | null>(null)
const authRefreshTick = ref(0)

const authed = computed(() => {
  void authRefreshTick.value
  return Boolean(getAuthToken())
})
const currentMenuItem = computed(() => menuItems.find((item) => item.key === props.activeKey))
const activeSectionKey = computed<MenuSectionKey | ''>(() => {
  if (props.activeKey === 'render-manual') return 'creation'
  return menuSections.find((section) => section.items.some((item) => item.key === props.activeKey))?.key || ''
})
const showPageHeading = computed(() => {
  if (route.name === 'render') return false
  if (route.name === 'asset-reuse') return false
  if (route.name === 'video-parse') return false
  return true
})
const pageTitle = computed(() => {
  if (props.assetHubActive) return '资产中心'
  const metaTitle = route.meta.title
  return typeof metaTitle === 'string' && metaTitle ? metaTitle : currentMenuItem.value?.title || '工作台'
})
const pageSubtitle = computed(() => {
  if (props.assetHubActive) return '搜索、筛选和验收生成资产。'
  return currentMenuItem.value?.subtitle || '围绕 AI 视频创作组织素材、任务和结果。'
})
const userInitial = computed(() => {
  const name = authed.value ? currentUser.value?.displayName || currentUser.value?.username || 'U' : '登'
  return name.trim().slice(0, 1).toUpperCase()
})
const userDisplayName = computed(() =>
  authed.value ? currentUser.value?.displayName || currentUser.value?.username || '用户中心' : '登录后使用',
)
const userSubtitle = computed(() => {
  if (!authed.value) return '生成、资产和任务同步'
  return currentUser.value?.role === 'ADMIN' ? '管理员' : '门店账号'
})

function toggleMenuSection(key: MenuSectionKey) {
  expandedSectionKey.value = expandedSectionKey.value === key ? '' : key
}

function syncCurrentUserFromCache() {
  authRefreshTick.value += 1
  currentUser.value = getAuthToken() ? getAuthUser() : null
}

async function refreshCurrentUser() {
  syncCurrentUserFromCache()
  if (!getAuthToken()) {
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

function promptLogin(actionName = '登录后可继续使用') {
  openAuthModal(actionName, route.fullPath)
}

function openTaskCenter() {
  if (!requireAuth('登录后可查看任务进度和生成结果')) return
  userMenuPlacement.value = null
  void router.push({ name: 'my-videos' })
}

function openCreditCenter() {
  if (!requireAuth('登录后可查看积分记录')) return
  userMenuPlacement.value = null
  void router.push({ name: 'system-credits' })
}

function openAssetCenter() {
  if (!requireAuth('登录后可管理资产中心素材')) return
  userMenuPlacement.value = null
  emit('openAssets')
}

function openNotifications() {
  void requireAuth('登录后可查看通知消息')
}

function openUserMenu() {
  if (!requireAuth('登录后可进入个人中心和账号菜单')) return
  userMenuPlacement.value = userMenuPlacement.value === 'sidebar' ? null : 'sidebar'
}

function toggleTopUserMenu() {
  userMenuPlacement.value = userMenuPlacement.value === 'top' ? null : 'top'
}

function goUserProfile() {
  userMenuPlacement.value = null
  void router.push({ name: 'system-preferences' })
}

function goPreferences() {
  userMenuPlacement.value = null
  void router.push({ name: 'system-preferences' })
}

async function handleLogout() {
  try {
    await logout()
  } catch {
    // ignore: 即使后端 session 已失效，也应清理本地登录态
  } finally {
    clearLogin()
    authRefreshTick.value += 1
    currentUser.value = null
    userMenuPlacement.value = null
    void router.push({ name: 'render' })
  }
}

let unsubscribeAuthRefresh: (() => void) | null = null

onMounted(() => {
  syncCurrentUserFromCache()
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
    userMenuPlacement.value = null
    syncCurrentUserFromCache()
  },
)

watch(
  activeSectionKey,
  (key) => {
    expandedSectionKey.value = key
  },
  { immediate: true },
)

function firstQueryText(value: unknown) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

watch(
  () => [route.query.login, route.query.redirect, authed.value] as const,
  () => {
    if (authed.value || firstQueryText(route.query.login) !== 'required') return
    openAuthModal('登录后可继续使用', firstQueryText(route.query.redirect) || route.fullPath)
  },
  { immediate: true },
)
</script>

<style scoped>
.app-credit-pill,
.app-assets-nav-btn,
.app-task-entry,
.app-topbar-ghost,
.app-user-menu-button {
  gap: 7px;
}

.app-menu-section-title {
  margin: 14px 10px 4px;
  color: #7f8aaa;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.app-menu-section-title:first-child {
  margin-top: 0;
}

.app-menu-section {
  display: grid;
  gap: 4px;
}

.app-menu-section + .app-menu-section {
  margin-top: 4px;
}

.app-menu-section-button {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #1f2a44;
  padding: 0 11px 0 12px;
  text-align: left;
  font-size: 14px;
  font-weight: 800;
}

.app-menu-section-button:hover,
.app-menu-section-button.open {
  background: #f4f7ff;
  color: #101828;
}

.app-menu-section-button.active {
  color: #101828;
}

.app-menu-section-button .app-menu-icon {
  color: #2563eb;
}

.app-menu-section-arrow {
  margin-left: auto;
  color: #6b7280;
  transition: transform 0.16s ease;
}

.app-menu-section-button.open .app-menu-section-arrow {
  transform: rotate(180deg);
}

.app-menu-children {
  display: grid;
  gap: 3px;
  padding-left: 30px;
}

.app-menu-children .app-menu-item {
  min-height: 34px;
  gap: 0;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
}

.app-menu-children .app-menu-item.active::before {
  top: 7px;
  height: 20px;
}

.app-topbar-actions {
  position: relative;
}

.app-credit-pill {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #ffffff;
  color: var(--hs-text-muted);
  padding: 0 12px;
  font-size: 13px;
}

.app-icon-button {
  display: inline-grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid var(--hs-border);
  border-radius: 10px;
  background: #fff;
  color: #1f2a44;
}

.app-icon-button:hover {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.app-user-menu-button,
.app-sidebar-user {
  display: inline-flex;
  align-items: center;
  border: 0;
  background: transparent;
  color: #1f2a44;
}

.app-user-menu-button {
  min-height: 34px;
  gap: 8px;
  border: 1px solid var(--hs-border);
  border-radius: 10px;
  background: #fff;
  padding: 0 10px;
}

.app-user-avatar {
  display: inline-grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(135deg, #2563eb 0%, #8b5cf6 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
}

.app-user-avatar--top {
  width: 26px;
  height: 26px;
  font-size: 12px;
}

.app-user-menu-name {
  max-width: 88px;
  overflow: hidden;
  color: #101828;
  font-size: 13px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-user-caret {
  color: #667085;
  font-size: 12px;
  font-weight: 900;
}

.app-credit-pill-label {
  color: var(--hs-text-muted);
  font-size: 12px;
  font-weight: 600;
}

.app-credit-pill-value {
  color: var(--hs-text);
  font-size: 14px;
  font-weight: 700;
}

.app-credit-pill-frozen {
  color: var(--hs-text-soft);
  font-size: 11px;
}

.app-assets-nav-btn {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--hs-border);
  border-radius: 6px;
  background: #ffffff;
  color: var(--hs-text-muted);
  padding: 0 13px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}

.app-assets-nav-btn:hover,
.app-assets-nav-btn--active {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.app-topbar-ghost {
  border-radius: 6px;
}

.app-sidebar-user {
  width: 100%;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 4px;
  text-align: left;
}

.app-sidebar-user-wrap {
  position: relative;
}

.app-sidebar-user > span:nth-child(2) {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.app-sidebar-user strong,
.app-sidebar-user small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-sidebar-user strong {
  color: #101828;
  font-size: 13px;
  font-weight: 850;
}

.app-sidebar-user small {
  color: #667085;
  font-size: 12px;
}

.app-user-popover {
  position: absolute;
  z-index: 20;
  display: grid;
  min-width: 150px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #fff;
  box-shadow: var(--hs-shadow-floating);
  padding: 6px;
}

.app-user-popover--sidebar {
  right: 0;
  bottom: 58px;
}

.app-user-popover--top {
  top: 42px;
  right: 0;
}

.app-user-popover button {
  min-height: 34px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #1f2a44;
  padding: 0 10px;
  text-align: left;
  font-size: 13px;
  font-weight: 700;
}

.app-user-popover button:hover {
  background: #f2f4f7;
}

.app-user-popover button.danger {
  color: #dc2626;
}

@media (max-width: 860px) {
  .app-credit-pill,
  .app-page-heading p {
    display: none;
  }
}

@media (max-width: 640px) {
  .app-topbar-actions {
    gap: 8px;
    margin-left: 12px;
  }

  .app-assets-nav-btn span,
  .app-task-entry span,
  .app-topbar-ghost span {
    display: none;
  }
}
</style>
