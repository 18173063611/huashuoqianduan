<template>
  <form class="app-card app-form" @submit.prevent="handleSubmit">
    <div>
      <h2 class="app-card-title">新建项目</h2>
      <p class="app-muted">为一条数字人视频制作建立独立工作区，素材与任务将归属该项目。</p>
    </div>

    <label>
      项目名称
      <input v-model.trim="form.projectName" required maxlength="80" placeholder="例如：春季新品口播" />
    </label>

    <label>
      项目描述
      <textarea v-model.trim="form.description" maxlength="500" placeholder="可选：补充主题、渠道或素材说明" />
    </label>

    <button class="app-primary-button" type="submit" :disabled="loading">
      {{ loading ? '创建中...' : '创建项目' }}
    </button>

    <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { createProject } from '../../services/projectApi'
import type { ProjectItem } from '../../types/projectTypes'

const emit = defineEmits<{
  created: [project: ProjectItem]
}>()

const form = reactive({
  projectName: '',
  description: '',
})
const loading = ref(false)
const errorMessage = ref('')

async function handleSubmit() {
  loading.value = true
  errorMessage.value = ''
  try {
    const project = await createProject({
      projectName: form.projectName,
      description: form.description,
    })
    form.projectName = ''
    form.description = ''
    emit('created', project)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '创建项目失败'
  } finally {
    loading.value = false
  }
}
</script>