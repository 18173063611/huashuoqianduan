<template>
  <WorkbenchLayout :active-key="activeKey" @change="navigateToMenu">
    <RouterView v-slot="{ Component }">
      <component
        :is="Component"
        v-if="activeKey === 'assets'"
        :highlight-asset-id="assetHighlightId"
        @highlight-consumed="handleHighlightConsumed"
      />
      <component :is="Component" v-else @continue="navigateToMenu('voice')" />
    </RouterView>

    <TaskFloatingDock @open-asset="onOpenAssetFromTask" />
  </WorkbenchLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import TaskFloatingDock from '../TaskFloatingDock.vue'
import WorkbenchLayout from './WorkbenchLayout.vue'
import type { WorkbenchRouteName } from '../../router'

type MenuKey = WorkbenchRouteName

const route = useRoute()
const router = useRouter()

const openedAssetHighlightId = ref<number | null>(null)

const activeKey = computed<MenuKey>(() => {
  const menuKey = route.meta.menuKey
  return isMenuKey(menuKey) ? menuKey : 'video-parse'
})

const queryAssetHighlightId = computed(() => {
  const raw = route.query.highlightAssetId
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  return Number.isFinite(id) && id > 0 ? id : null
})

const assetHighlightId = computed(() => queryAssetHighlightId.value ?? openedAssetHighlightId.value)

function isMenuKey(value: unknown): value is MenuKey {
  return (
    value === 'video-parse' ||
    value === 'storyboard' ||
    value === 'voice' ||
    value === 'avatar' ||
    value === 'render' ||
    value === 'assets'
  )
}

function navigateToMenu(key: MenuKey) {
  if (route.name === key) {
    return
  }
  void router.push({ name: key })
}

function onOpenAssetFromTask(assetId: number) {
  openedAssetHighlightId.value = assetId
  void router.push({
    name: 'assets',
    query: { ...route.query, highlightAssetId: String(assetId) },
  })
}

function handleHighlightConsumed() {
  openedAssetHighlightId.value = null
  if (queryAssetHighlightId.value == null) {
    return
  }

  const nextQuery = { ...route.query }
  delete nextQuery.highlightAssetId
  void router.replace({ name: 'assets', query: nextQuery })
}
</script>
