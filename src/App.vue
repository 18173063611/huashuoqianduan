<template>
  <WorkbenchLayout :active-key="activeKey" @change="activeKey = $event">
    <ProjectWorkbench v-show="activeKey === 'projects'" v-model:selected-project="selectedProject" />

    <FileUploadPanel v-show="activeKey === 'upload'" :project="selectedProject" />

    <section v-show="activeKey === 'flow'" class="app-card app-flow">
      <p class="app-eyebrow">基础页面框架</p>
      <h2>AI 数字人视频制作流程</h2>
      <div class="app-flow-steps">
        <div v-for="step in flowSteps" :key="step.title" class="app-flow-step">
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </section>

    <section v-show="activeKey === 'acceptance'" class="app-card app-acceptance">
      <p class="app-eyebrow">验收说明</p>
      <h2>本周可演示内容</h2>
      <ul>
        <li>工作台包含左侧菜单、顶部状态和主操作区。</li>
        <li>项目管理页面支持创建、列表、刷新和选择当前项目。</li>
        <li>文件上传页面支持按项目上传素材并展示预览链接。</li>
        <li>后端提供 H2 演示库与 MySQL 兼容的 `schema.sql`。</li>
      </ul>
    </section>
  </WorkbenchLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import WorkbenchLayout from './components/layout/WorkbenchLayout.vue'
import FileUploadPanel from './components/business/FileUploadPanel.vue'
import ProjectWorkbench from './pages/project/ProjectWorkbench.vue'
import type { ProjectItem } from './types/projectTypes'

type MenuKey = 'projects' | 'upload' | 'flow' | 'acceptance'

const activeKey = ref<MenuKey>('projects')
const selectedProject = ref<ProjectItem>()

const flowSteps = [
  { index: '01', title: '项目创建', description: '创建一个视频制作项目，后续资产和任务都绑定到该项目。' },
  { index: '02', title: '素材上传', description: '上传形象照、参考图、脚本文档或源视频素材。' },
  { index: '03', title: 'AI 生成', description: '后续接入文案改写、TTS、形象生成与标题封面生成。' },
  { index: '04', title: '视频合成', description: '后续通过任务中心跟踪视频合成进度与失败重试。' },
]
</script>