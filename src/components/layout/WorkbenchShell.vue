<template>
  <WorkbenchLayout
    :active-key="activeKey"
    :asset-hub-active="assetHubActive"
    @change="navigateToMenu"
    @open-assets="goAssetHub"
  >
    <RouterView v-slot="{ Component }">
      <component :is="Component" @continue="navigateToMenu('voice')" />
    </RouterView>

    <TaskFloatingDock @open-asset="(id) => goAssetHub(id)" />
  </WorkbenchLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import TaskFloatingDock from '../TaskFloatingDock.vue'
import WorkbenchLayout from './WorkbenchLayout.vue'
import { useAuthRequired } from '../../composables/useAuthRequired'
import { getAuthUser } from '../../services/authSession'
import { canAccessPetCreation, isPetCreationMenuKey, isPetOnlyWorkspaceUser, isPetWorkspaceMenuKey } from '../../config/petCreationAccess'

type MenuKey = string

const route = useRoute()
const router = useRouter()
const { requireAuth } = useAuthRequired()
const publicMenuKeys = new Set(['render', 'help-tutorials', 'help-faq', 'help-changelog', 'help-contact'])
const pendingActiveKey = ref<string | null>(null)

const assetHubActive = computed(() => route.name === 'AssetCenter' || route.name === 'pet-assets')

const activeKey = computed<string>(() => {
  if (pendingActiveKey.value) {
    return pendingActiveKey.value
  }
  if (route.name === 'render' && route.query.mode === 'manual') {
    return 'render-manual'
  }
  if (route.name === 'benchmark-create-page' || (route.name === 'video-parse' && route.query.entry === 'creation')) {
    return 'benchmark-create'
  }
  if (route.name === 'my-videos') {
    const status = firstQueryValue(route.query.status).toUpperCase()
    if (status === 'RUNNING') return 'my-videos-running'
    if (status === 'SUCCESS') return 'my-videos-success'
    if (status === 'FAILED') return 'my-videos-failed'
    return 'my-videos-all'
  }
  if (route.name === 'AssetCenter') {
    const view = firstQueryValue(route.query.assetView || route.query.view)
    const assetKey = assetViewToMenuKey[view]
    return assetKey || 'assets-images'
  }
  if (route.name === 'pet-assets') {
    return 'pet-assets'
  }
  const menuKey = route.meta.menuKey
  if (isWorkbenchRouteMenuKey(menuKey)) {
    return menuKey
  }
  return 'render'
})

const assetViewToMenuKey: Record<string, string> = {
  image: 'assets-images',
  video: 'assets-videos',
  copy: 'assets-copy',
  storyboard: 'assets-storyboard',
  audio: 'assets-audio',
  avatar: 'assets-avatar',
  template: 'assets-template',
}

const assetMenuQueries: Record<string, Record<string, string>> = {
  'assets-images': { tab: 'materials', assetView: 'image' },
  'assets-videos': { tab: 'materials', assetView: 'video' },
  'assets-copy': { tab: 'materials', assetView: 'copy' },
  'assets-storyboard': { tab: 'materials', assetView: 'storyboard' },
  'assets-audio': { tab: 'materials', assetView: 'audio' },
  'assets-avatar': { tab: 'materials', assetView: 'avatar' },
  'assets-template': { tab: 'materials', assetView: 'template' },
}

function firstQueryValue(value: unknown) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '')
}

function isWorkbenchRouteMenuKey(value: unknown): value is MenuKey {
  return typeof value === 'string' && value.length > 0
}

watch(
  () => route.fullPath,
  () => {
    pendingActiveKey.value = null
  },
)

function navigateToMenu(key: MenuKey) {
  if (isPetOnlyWorkspaceUser(getAuthUser()) && !isPetWorkspaceMenuKey(key) && !key.startsWith('my-videos') && !key.startsWith('system-')) {
    ElMessage.warning('当前账号仅开通宠物创作中心')
    return
  }
  if (isPetWorkspaceMenuKey(key)) {
    if (!requireAuth(isPetCreationMenuKey(key) ? '登录后可使用宠物创作中心' : '登录后可使用宠物 AI 资产生产工具')) return
    if (!canAccessPetCreation(getAuthUser())) {
      ElMessage.warning('当前账号暂未开通宠物创作中心')
      return
    }
  }
  if (!publicMenuKeys.has(key) && !requireAuth(authActionLabelForMenu(key))) {
    return
  }
  const pushWithPending = (target: Parameters<typeof router.push>[0]) => {
    pendingActiveKey.value = key
    void router.push(target).catch(() => {
      pendingActiveKey.value = null
    })
  }
  if (key === 'render') {
    if (route.name === 'render' && route.query.mode !== 'manual') {
      pendingActiveKey.value = null
      return
    }
    pushWithPending({ name: 'render' })
    return
  }
  if (key === 'render-manual') {
    if (route.name === 'render' && route.query.mode === 'manual') {
      pendingActiveKey.value = null
      return
    }
    pushWithPending({ name: 'render', query: { mode: 'manual' } })
    return
  }
  if (key === 'benchmark-create') {
    pushWithPending({ name: 'benchmark-create-page' })
    return
  }
  if (key === 'my-videos-all') {
    pushWithPending({ name: 'my-videos' })
    return
  }
  if (key === 'my-videos-running') {
    pushWithPending({ name: 'my-videos', query: { status: 'RUNNING' } })
    return
  }
  if (key === 'my-videos-success') {
    pushWithPending({ name: 'my-videos', query: { status: 'SUCCESS' } })
    return
  }
  if (key === 'my-videos-failed') {
    pushWithPending({ name: 'my-videos', query: { status: 'FAILED' } })
    return
  }
  const assetQuery = assetMenuQueries[key]
  if (assetQuery) {
    pushWithPending({ name: 'AssetCenter', query: assetQuery })
    return
  }
  if (route.name === key) {
    pendingActiveKey.value = null
    return
  }
  pushWithPending({ name: key })
}

function goAssetHub(assetId?: number) {
  if (!requireAuth('登录后可管理资产中心素材')) return
  const q: Record<string, string> = { tab: 'materials' }
  if (assetId != null && assetId > 0) {
    q.highlight = String(assetId)
  }
  void router.push({ name: isPetOnlyWorkspaceUser(getAuthUser()) ? 'pet-assets' : 'AssetCenter', query: q })
}

function authActionLabelForMenu(key: MenuKey) {
  if (isPetCreationMenuKey(key)) return '登录后可使用宠物创作中心'
  if (isPetWorkspaceMenuKey(key)) return '登录后可使用宠物 AI 资产生产工具'
  if (key.startsWith('my-videos')) return '登录后可查看我的视频'
  if (key.startsWith('assets-')) return '登录后可管理资产中心素材'
  if (key.startsWith('system-')) return '登录后可使用系统管理功能'
  if (key === 'render-manual') return '登录后可使用手动制作能力'
  if (key === 'asset-reuse') return '登录后可复用资产创作'
  if (key === 'benchmark-create') return '登录后可使用爆款对标创作'
  if (['video-parse', 'script-rewrite', 'storyboard', 'avatar', 'voice'].includes(key)) {
    return '登录后可使用 AI 资产生产工具'
  }
  return '登录后可继续使用'
}
</script>
