<template>
  <form class="app-card app-form" @submit.prevent="handleSubmit">
    <div>
      <p class="app-eyebrow">Project API</p>
      <h2>Create Video Project</h2>
    </div>

    <label>
      Project Name
      <input v-model.trim="form.projectName" required maxlength="80" placeholder="Example: AI presenter test" />
    </label>

    <label>
      Project Description
      <textarea v-model.trim="form.description" maxlength="500" placeholder="Describe goal, materials, or acceptance target" />
    </label>

    <button class="app-primary-button" type="submit" :disabled="loading">
      {{ loading ? 'Creating...' : 'Create Project' }}
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
    errorMessage.value = error instanceof Error ? error.message : 'Create project failed'
  } finally {
    loading.value = false
  }
}
</script>