<template>
  <WorkbenchLayout :active-key="activeKey" @change="activeKey = $event">
    <ProjectWorkbench v-show="activeKey === 'projects'" v-model:selected-project="selectedProject" />

    <FileUploadPanel v-show="activeKey === 'upload'" :project="selectedProject" />

    <section v-show="activeKey === 'flow'" class="app-card app-flow">
      <p class="app-eyebrow">Base Page Framework</p>
      <h2>AI Digital Human Video Flow</h2>
      <div class="app-flow-steps">
        <div v-for="step in flowSteps" :key="step.title" class="app-flow-step">
          <span>{{ step.index }}</span>
          <strong>{{ step.title }}</strong>
          <p>{{ step.description }}</p>
        </div>
      </div>
    </section>

    <section v-show="activeKey === 'acceptance'" class="app-card app-acceptance">
      <p class="app-eyebrow">Acceptance</p>
      <h2>This Week Demo</h2>
      <ul>
        <li>The workbench has a sidebar, top status area, and main content area.</li>
        <li>The project page can create, list, refresh, and select projects.</li>
        <li>The upload page can upload files under the selected project and show preview links.</li>
        <li>The backend provides an H2 demo database and MySQL-compatible schema.sql.</li>
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
  { index: '01', title: 'Create Project', description: 'Create a video project and bind future assets and tasks to it.' },
  { index: '02', title: 'Upload Materials', description: 'Upload avatar photos, reference images, scripts, or source videos.' },
  { index: '03', title: 'AI Generation', description: 'Later connect script rewrite, TTS, avatar generation, and cover generation.' },
  { index: '04', title: 'Video Rendering', description: 'Later track rendering progress and retries through the task center.' },
]
</script>