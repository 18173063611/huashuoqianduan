<template>
  <WorkbenchLayout :active-key="activeKey" @change="activeKey = $event">
    <ProjectWorkbench v-show="activeKey === 'projects'" v-model:selected-project="selectedProject" />

    <FileUploadPanel v-show="activeKey === 'upload'" :project="selectedProject" />

    <WorkbenchPlaceholder
      v-for="page in placeholderPages"
      v-show="activeKey === page.key"
      :key="page.key"
      :eyebrow="page.eyebrow"
      :title="page.title"
      :empty-text="page.emptyText"
      :mock-items="page.mockItems"
    />

    <AssetCenter v-show="activeKey === 'assets'" :project="selectedProject" />

    <TaskCenter v-show="activeKey === 'tasks'" :project="selectedProject" />

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
import WorkbenchPlaceholder from './components/business/WorkbenchPlaceholder.vue'
import AssetCenter from './pages/asset/AssetCenter.vue'
import ProjectWorkbench from './pages/project/ProjectWorkbench.vue'
import TaskCenter from './pages/task/TaskCenter.vue'
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
  | 'assets'
  | 'tasks'
  | 'flow'
  | 'acceptance'

const activeKey = ref<MenuKey>('projects')
const selectedProject = ref<ProjectItem>()

const flowSteps = [
  { index: '01', title: '项目创建', description: '创建一个视频制作项目，后续资产和任务都绑定到该项目。' },
  { index: '02', title: '素材上传', description: '上传形象照、参考图、脚本文档或源视频素材。' },
  { index: '03', title: 'AI 生成', description: '后续接入文案改写、TTS、形象生成与标题封面生成。' },
  { index: '04', title: '视频合成', description: '后续通过任务中心跟踪视频合成进度与失败重试。' },
]

const placeholderPages = [
  {
    key: 'video-parse',
    eyebrow: '视频解析',
    title: '短视频链接解析',
    emptyText: '暂无解析结果。后续在这里输入短视频链接并生成原文案、标题和基础数据。',
    mockItems: [
      { label: '输入区', value: '短视频链接 / 上传视频文件' },
      { label: '输出区', value: '原文案、平台、标题、时长' },
      { label: '任务类型', value: 'VIDEO_PARSE' },
    ],
  },
  {
    key: 'script-rewrite',
    eyebrow: '文案改写',
    title: 'AI 文案改写工作区',
    emptyText: '暂无改写版本。后续会展示字数、风格、Prompt 模板和版本保存入口。',
    mockItems: [
      { label: '输入', value: '原文案 + 风格要求' },
      { label: '输出', value: 'script_version 版本记录' },
      { label: '任务类型', value: 'SCRIPT_REWRITE' },
    ],
  },
  {
    key: 'storyboard',
    eyebrow: '分镜脚本',
    title: '分镜脚本结构化结果',
    emptyText: '暂无分镜。后续会展示镜头序号、画面、字幕、音频和时长建议。',
    mockItems: [
      { label: '镜头 1', value: '开场吸引注意，展示人物形象' },
      { label: '镜头 2', value: '介绍产品卖点，保留字幕位' },
      { label: '资产归档', value: 'JSON / TEXT' },
    ],
  },
  {
    key: 'voice',
    eyebrow: '声音选择',
    title: '声音与 TTS 预留页面',
    emptyText: '暂无声音配置。后续会支持试听、选择声音并提交 TTS 任务。',
    mockItems: [
      { label: '声音库', value: '男声 / 女声 / 品牌音色' },
      { label: '输出资产', value: 'AUDIO' },
      { label: '任务类型', value: 'TTS_GENERATE' },
    ],
  },
  {
    key: 'avatar',
    eyebrow: '形象生成',
    title: '数字人形象生成',
    emptyText: '暂无形象。后续会支持上传形象照或通过提示词生成参考图。',
    mockItems: [
      { label: '输入', value: '形象照 / 参考图 / 提示词' },
      { label: '输出资产', value: 'IMAGE' },
      { label: '任务类型', value: 'AVATAR_GENERATE' },
    ],
  },
  {
    key: 'render',
    eyebrow: '视频合成',
    title: '数字人视频合成',
    emptyText: '暂无合成任务。后续会绑定形象、音频、字幕和背景音乐提交异步任务。',
    mockItems: [
      { label: '输入', value: '形象资产 + 音频资产 + render_config' },
      { label: '输出资产', value: 'VIDEO' },
      { label: '任务类型', value: 'RENDER_VIDEO' },
    ],
  },
] as const
</script>