<template>
  <section class="app-card app-project-toolbar">
    <div>
      <h2 class="app-page-title">项目</h2>
      <p class="app-muted app-page-subtitle">搜索、创建并选择用于后续制作的视频项目。</p>
    </div>
    <div class="app-toolbar-actions">
      <input v-model.trim="keyword" placeholder="按名称或描述搜索" @keyup.enter="loadProjects" />
      <button class="app-secondary-button" type="button" :disabled="loading" @click="loadProjects">搜索</button>
    </div>
  </section>

  <div class="app-grid">
    <ProjectCreateForm @created="handleProjectCreated" />
    <ProjectList
      :projects="projects"
      :selected-project-id="selectedProject?.projectId"
      :loading="loading"
      @refresh="loadProjects"
      @select="selectedProject = $event"
      @delete="handleDeleteProject"
    />
  </div>

  <section v-if="selectedProject" class="app-selected-project app-project-current">
    <div>
      <span>当前工作项目</span>
      <strong>{{ selectedProject.projectName }}</strong>
      <small>当前阶段：对标分析 · 下一步：进入爆款对标</small>
    </div>
    <button class="app-primary-button" type="button" @click="$emit('continue')">继续制作</button>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ProjectCreateForm from '../../components/business/ProjectCreateForm.vue'
import ProjectList from '../../components/business/ProjectList.vue'
import { deleteProject, getProjectList } from '../../services/projectApi'
import type { ProjectItem } from '../../types/projectTypes'

const projects = ref<ProjectItem[]>([])
const selectedProject = defineModel<ProjectItem | undefined>('selectedProject')
const loading = ref(false)
const errorMessage = ref('')
const keyword = ref('')

defineEmits<{
  continue: []
}>()

onMounted(loadProjects)

async function loadProjects() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getProjectList(1, 20, keyword.value)
    projects.value = result.records
    if (!selectedProject.value && result.records.length > 0) {
      selectedProject.value = result.records[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载项目失败'
  } finally {
    loading.value = false
  }
}

function handleProjectCreated(project: ProjectItem) {
  projects.value = [project, ...projects.value]
  selectedProject.value = project
}

async function handleDeleteProject(project: ProjectItem) {
  loading.value = true
  errorMessage.value = ''
  try {
    await deleteProject(project.projectId)
    projects.value = projects.value.filter((item) => item.projectId !== project.projectId)
    if (selectedProject.value?.projectId === project.projectId) {
      selectedProject.value = projects.value[0]
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '删除项目失败'
  } finally {
    loading.value = false
  }
}
</script>
