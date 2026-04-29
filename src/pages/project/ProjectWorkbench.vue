<template>
  <section class="app-card app-project-toolbar">
    <div>
      <p class="app-eyebrow">分页与搜索</p>
      <h2>项目入口模块</h2>
    </div>
    <div class="app-toolbar-actions">
      <input v-model.trim="keyword" placeholder="按项目名称或描述搜索" @keyup.enter="loadProjects" />
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

  <section class="app-card app-demo-panel">
    <p class="app-eyebrow">本周交付效果</p>
    <h2>项目管理基础接口已接入</h2>
    <p>
      当前页面调用后端 `GET /api/v1/projects` 和 `POST /api/v1/projects`，
      用于演示项目创建、项目列表，以及选中项目后的素材上传流程。
    </p>
    <p v-if="selectedProject" class="app-selected-project">
      已选择项目：<strong>{{ selectedProject.projectName }}</strong>
    </p>
    <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
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

onMounted(loadProjects)

async function loadProjects() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await getProjectList(1, 20, keyword.value)
    projects.value = result.records
    // 初次进入页面时默认选中第一个项目，文件上传页可以直接复用当前项目。
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
  // 新建项目直接插到列表顶部，并同步为当前选中项目，减少演示时的额外点击。
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