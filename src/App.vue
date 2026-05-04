<template>
  <WorkbenchLayout :active-key="activeKey" :project="selectedProject" @change="activeKey = $event">
    <ProjectWorkbench
      v-if="activeKey === 'projects'"
      v-model:selected-project="selectedProject"
      @continue="activeKey = 'video-parse'"
    />

    <UploadCenter v-show="activeKey === 'upload'" :project="selectedProject" />

    <VideoParsePage
      v-show="activeKey === 'video-parse'"
      :project="selectedProject"
      @continue="activeKey = 'voice'"
    />

    <ScriptRewritePage v-show="activeKey === 'script-rewrite'" :project="selectedProject" />

    <StoryboardPage v-show="activeKey === 'storyboard'" :project="selectedProject" />

    <VoiceTtsPage v-show="activeKey === 'voice'" :project="selectedProject" />

    <AvatarGeneratePage v-show="activeKey === 'avatar'" :project="selectedProject" />

    <RenderVideoPage v-show="activeKey === 'render'" :project="selectedProject" />

    <PublishPackPage v-show="activeKey === 'publish'" :project="selectedProject" />

    <AssetCenter v-show="activeKey === 'assets'" :project="selectedProject" />

    <TaskCenter v-show="activeKey === 'tasks'" :project="selectedProject" />

    <section v-show="activeKey === 'flow'" class="app-card app-flow">
      <h2 class="module-flow-title">制作流程</h2>
      <p class="app-muted module-flow-lead">按流程完成项目、脚本、音色、形象与成片。</p>
      <div class="app-flow-steps">
        <div v-for="step in flowSteps" :key="step.title" class="app-flow-step">
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </section>
  </WorkbenchLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WorkbenchLayout from './components/layout/WorkbenchLayout.vue'
import AvatarGeneratePage from './pages/avatar/AvatarGeneratePage.vue'
import AssetCenter from './pages/asset/AssetCenter.vue'
import PublishPackPage from './pages/publish/PublishPackPage.vue'
import ProjectWorkbench from './pages/project/ProjectWorkbench.vue'
import RenderVideoPage from './pages/render/RenderVideoPage.vue'
import ScriptRewritePage from './pages/script/ScriptRewritePage.vue'
import StoryboardPage from './pages/script/StoryboardPage.vue'
import TaskCenter from './pages/task/TaskCenter.vue'
import UploadCenter from './pages/upload/UploadCenter.vue'
import VideoParsePage from './pages/video/VideoParsePage.vue'
import VoiceTtsPage from './pages/voice/VoiceTtsPage.vue'
import type { ProjectItem } from './types/projectTypes'

type MenuKey =
  | 'projects'
  | 'upload'
  | 'video-parse'
  | 'script-rewrite'
  | 'storyboard'
  | 'voice'
  | 'avatar'
  | 'render'
  | 'publish'
  | 'assets'
  | 'tasks'
  | 'flow'

const activeKey = ref<MenuKey>('projects')
const selectedProject = ref<ProjectItem>()

const flowSteps = [
  { index: '01', title: '项目与素材', description: '选择项目并上传素材。' },
  { index: '02', title: '解析与脚本', description: '生成可执行脚本。' },
  { index: '03', title: '声音与形象', description: '选择音色与数字人形象。' },
  { index: '04', title: '合成与发布', description: '输出视频与发布素材。' },
]

</script>
