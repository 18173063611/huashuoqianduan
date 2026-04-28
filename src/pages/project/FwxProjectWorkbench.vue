<template>
  <div class="fwx-grid">
    <FwxProjectCreateForm @created="handleProjectCreated" />
    <FwxProjectList
      :projects="projects"
      :selected-project-id="selectedProject?.projectId"
      :loading="loading"
      @refresh="loadProjects"
      @select="selectedProject = $event"
    />
  </div>

  <section class="fwx-card fwx-demo-panel">
    <p class="fwx-eyebrow">本周交付效果</p>
    <h2>项目管理基础接口已接入</h2>
    <p>
      当前页面调用后端 `GET /api/v1/projects` 和 `POST /api/v1/projects`，
      可以用于演示项目创建、项目列表和选中项目后的素材上传流程。
    </p>
    <p v-if="selectedProject" class="fwx-selected-project">
      已选择项目：<strong>{{ selectedProject.projectName }}</strong>
    </p>
    <p v-if="errorMessage" class="fwx-error">{{ errorMessage }}</p>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import FwxProjectCreateForm from '../../components/business/FwxProjectCreateForm.vue'
import FwxProjectList from '../../components/business/FwxProjectList.vue'
import { fwxGetProjectList } from '../../services/fwxProjectApi'
import type { FwxProjectItem } from '../../types/fwxProjectTypes'

const projects = ref<FwxProjectItem[]>([])
const selectedProject = defineModel<FwxProjectItem | undefined>('selectedProject')
const loading = ref(false)
const errorMessage = ref('')

onMounted(loadProjects)

async function loadProjects() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await fwxGetProjectList()
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

function handleProjectCreated(project: FwxProjectItem) {
  projects.value = [project, ...projects.value]
  selectedProject.value = project
}
</script>
