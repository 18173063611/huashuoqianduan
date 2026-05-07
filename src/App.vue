<template>
  <WorkbenchLayout :active-key="activeKey" @change="activeKey = $event">
    <VideoParsePage
      v-show="activeKey === 'video-parse'"
      @continue="activeKey = 'voice'"
    />

    <StoryboardPage v-show="activeKey === 'storyboard'" />

    <VoiceTtsPage v-show="activeKey === 'voice'" />

    <AvatarGeneratePage v-show="activeKey === 'avatar'" />

    <RenderVideoPage v-show="activeKey === 'render'" />

    <UserCenter
      v-show="activeKey === 'user'"
      :highlight-asset-id="assetHighlightId"
      @highlight-consumed="assetHighlightId = null"
    />

    <TaskFloatingDock @open-asset="onOpenAssetFromTask" />
  </WorkbenchLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WorkbenchLayout from './components/layout/WorkbenchLayout.vue'
import AvatarGeneratePage from './pages/avatar/AvatarGeneratePage.vue'
import RenderVideoPage from './pages/render/RenderVideoPage.vue'
import StoryboardPage from './pages/script/StoryboardPage.vue'
import TaskFloatingDock from './components/TaskFloatingDock.vue'
import UserCenter from './pages/user/UserCenter.vue'
import VideoParsePage from './pages/video/VideoParsePage.vue'
import VoiceTtsPage from './pages/voice/VoiceTtsPage.vue'

type MenuKey =
  | 'video-parse'
  | 'storyboard'
  | 'voice'
  | 'avatar'
  | 'render'
  | 'user'

const activeKey = ref<MenuKey>('video-parse')
/** 从任务浮层「查看资产」跳转时在「我的资产」中高亮对应行 */
const assetHighlightId = ref<number | null>(null)

function onOpenAssetFromTask(assetId: number) {
  assetHighlightId.value = assetId
  activeKey.value = 'user'
}

</script>
