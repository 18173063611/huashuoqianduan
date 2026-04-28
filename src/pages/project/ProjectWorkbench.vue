<template>
  <div class="app-grid">
    <ProjectCreateForm @created="handleProjectCreated" />
    <ProjectList
      :projects="projects"
      :selected-project-id="selectedProject?.projectId"
      :loading="loading"
      @refresh="loadProjects"
      @select="selectedProject = $event"
    />
  </div>

  <section class="app-card app-demo-panel">
    <p class="app-eyebrow">Week 1 Delivery</p>
    <h2>Project API Connected</h2>
    <p>
      This page calls backend GET /api/v1/projects and POST /api/v1/projects.
      It demonstrates project creation, project listing, and material upload after project selection.
    </p>
    <p v-if="selectedProject" class="app-selected-project">
      Selected project: <strong>{{ selectedProject.projectName }}</strong>
    </p>
    <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ProjectCreateForm from '../../components/business/ProjectCreateForm.vue'
import ProjectList from '../../components/business/ProjectList.vue'
import { getProjectList } from '../../services/projectApi'
import type { ProjectItem } from '../../types/projectTypes'

const projects = ref<ProjectItem[]>([])
const selectedProject = defineModel<ProjectItem | undefined>('selectedProject')
const loading = ref(false)
const errorMessage = ref('')

onMounted(loadProjects)

async function loadProjects() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getProjectList()
    projects.value = result.records
    // 初次进入页面时默认选中第一个项目，文件上传页可以直接复用当前项目。
    if (!selectedProject.value && result.records.length > 0) {
      selectedProject.value = result.records[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Load projects failed'
  } finally {
    loading.value = false
  }
}

function handleProjectCreated(project: ProjectItem) {
  // 新建项目直接插到列表顶部，并同步为当前选中项目，减少演示时的额外点击。
  projects.value = [project, ...projects.value]
  selectedProject.value = project
}
</script>