<template>
  <WorkbenchLayout :active-key="activeKey" @change="navigateToMenu" @open-assets="openAssetCenter()">
    <RouterView v-slot="{ Component }">
      <component :is="Component" @continue="navigateToMenu('voice')" />
    </RouterView>

    <TaskFloatingDock @open-asset="onOpenAssetFromTask" />

    <Teleport to="body">
      <div v-if="assetCenterOpen" class="asset-center-backdrop" @click.self="closeAssetCenter">
        <section
          class="asset-center-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="asset-center-modal-title"
        >
          <header class="asset-center-modal-head">
            <div>
              <h2 id="asset-center-modal-title">资产中心</h2>
              <p>查看、筛选和管理素材资产。</p>
            </div>
            <button class="app-ghost-button" type="button" @click="closeAssetCenter">关闭</button>
          </header>
          <div class="asset-center-modal-body">
            <AssetCenter
              :highlight-asset-id="assetHighlightId"
              @highlight-consumed="handleHighlightConsumed"
              @voice-selected="closeAssetCenter"
            />
          </div>
        </section>
      </div>
    </Teleport>
  </WorkbenchLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import TaskFloatingDock from '../TaskFloatingDock.vue'
import WorkbenchLayout from './WorkbenchLayout.vue'
import AssetCenter from '../../pages/asset/AssetCenter.vue'
import type { WorkbenchRouteName } from '../../router'

type MenuKey = WorkbenchRouteName

const route = useRoute()
const router = useRouter()

const openedAssetHighlightId = ref<number | null>(null)
const assetCenterOpen = ref(false)

const activeKey = computed<MenuKey>(() => {
  const menuKey = route.meta.menuKey
  return isMenuKey(menuKey) ? menuKey : 'video-parse'
})

const assetHighlightId = computed(() => openedAssetHighlightId.value)

function isMenuKey(value: unknown): value is MenuKey {
  return (
    value === 'video-parse' ||
    value === 'storyboard' ||
    value === 'voice' ||
    value === 'avatar' ||
    value === 'render'
  )
}

function navigateToMenu(key: MenuKey) {
  if (route.name === key) {
    return
  }
  void router.push({ name: key })
}

function onOpenAssetFromTask(assetId: number) {
  openAssetCenter(assetId)
}

function handleHighlightConsumed() {
  openedAssetHighlightId.value = null
}

function openAssetCenter(assetId?: number) {
  openedAssetHighlightId.value = assetId ?? null
  assetCenterOpen.value = true
}

function closeAssetCenter() {
  assetCenterOpen.value = false
  openedAssetHighlightId.value = null
}
</script>

<style scoped>
.asset-center-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.42);
  padding: 24px;
}

.asset-center-modal {
  display: flex;
  width: min(1120px, 100%);
  max-height: min(86vh, 780px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.24);
}

.asset-center-modal-head {
  display: flex;
  flex: 0 0 auto;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #eef0f6;
  padding: 18px 20px;
}

.asset-center-modal-head h2 {
  margin: 0 0 4px;
  color: #151a2d;
  font-size: 18px;
  font-weight: 850;
}

.asset-center-modal-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.asset-center-modal-body {
  min-height: 0;
  overflow: auto;
  padding: 18px 20px 22px;
  background: #f8f9fc;
}

@media (max-width: 720px) {
  .asset-center-backdrop {
    align-items: stretch;
    padding: 12px;
  }

  .asset-center-modal {
    max-height: none;
  }

  .asset-center-modal-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
