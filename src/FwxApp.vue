<template>
  <FwxWorkbenchLayout :active-key="activeKey" @change="activeKey = $event">
    <FwxProjectWorkbench v-show="activeKey === 'projects'" v-model:selected-project="selectedProject" />

    <FwxFileUploadPanel v-show="activeKey === 'upload'" :project="selectedProject" />

    <section v-show="activeKey === 'flow'" class="fwx-card fwx-flow">
      <p class="fwx-eyebrow">基础页面框架</p>
      <h2>AI 数字人视频制作流程</h2>
      <div class="fwx-flow-steps">
        <div v-for="step in flowSteps" :key="step.title" class="fwx-flow-step">
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </section>

    <section v-show="activeKey === 'acceptance'" class="fwx-card fwx-acceptance">
      <p class="fwx-eyebrow">验收说明</p>
      <h2>本周可演示内容</h2>
      <ul>
        <li>前端工作台已包含左侧菜单、顶部状态和主要操作区。</li>
        <li>项目管理页面可创建项目、刷新列表并选择当前项目。</li>
        <li>文件上传页面可绑定项目上传素材，并展示预览地址。</li>
        <li>后端提供 H2 演示库和 MySQL 迁移 SQL，便于后续切换真实数据库。</li>
      </ul>
    </section>
  </FwxWorkbenchLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import FwxWorkbenchLayout from './components/layout/FwxWorkbenchLayout.vue'
import FwxFileUploadPanel from './components/business/FwxFileUploadPanel.vue'
import FwxProjectWorkbench from './pages/project/FwxProjectWorkbench.vue'
import type { FwxProjectItem } from './types/fwxProjectTypes'

type FwxMenuKey = 'projects' | 'upload' | 'flow' | 'acceptance'

const activeKey = ref<FwxMenuKey>('projects')
const selectedProject = ref<FwxProjectItem>()

const flowSteps = [
  { index: '01', title: '项目创建', description: '创建一个视频制作项目，后续资产和任务都绑定项目。' },
  { index: '02', title: '素材上传', description: '上传形象照、参考图、脚本文档或视频素材。' },
  { index: '03', title: 'AI 生成', description: '后续接入文案改写、TTS、形象生成和标题封面生成。' },
  { index: '04', title: '视频合成', description: '后续由任务中心跟踪视频合成进度和失败重试。' },
]
</script>
