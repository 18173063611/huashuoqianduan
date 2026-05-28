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
import { computed } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import TaskFloatingDock from '../TaskFloatingDock.vue'
import WorkbenchLayout from './WorkbenchLayout.vue'
import type { WorkbenchRouteName } from '../../router'

type MenuKey = WorkbenchRouteName

const route = useRoute()
const router = useRouter()

const assetHubActive = computed(() => route.name === 'AssetCenter')

const activeKey = computed<string>(() => {
  const menuKey = route.meta.menuKey
  if (isWorkbenchRouteMenuKey(menuKey)) {
    return menuKey
  }
  if (route.name === 'AssetCenter') {
    return 'AssetCenter'
  }
  return 'video-parse'
})

function isWorkbenchRouteMenuKey(value: unknown): value is MenuKey {
  return (
    value === 'video-parse' ||
    value === 'storyboard' ||
    value === 'voice' ||
    value === 'avatar' ||
    value === 'render' ||
    value === 'AssetCenter'
  )
}

function navigateToMenu(key: MenuKey) {
  if (route.name === key) {
    return
  }
  void router.push({ name: key })
}

function goAssetHub(assetId?: number) {
  const q: Record<string, string> = { tab: 'materials' }
  if (assetId != null && assetId > 0) {
    q.highlight = String(assetId)
  }
  void router.push({ name: 'AssetCenter', query: q })
}
</script>
