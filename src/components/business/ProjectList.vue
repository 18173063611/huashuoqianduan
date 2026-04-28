<template>
  <section class="app-card">
    <div class="app-card-header">
      <div>
        <p class="app-eyebrow">Project List</p>
        <h2>Demo Projects</h2>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? 'Loading...' : 'Refresh' }}
      </button>
    </div>

    <div v-if="projects.length === 0" class="app-empty">No projects yet. Create one first.</div>
    <button
      v-for="project in projects"
      :key="project.projectId"
      :class="['app-project-row', { active: selectedProjectId === project.projectId }]"
      type="button"
      @click="$emit('select', project)"
    >
      <div>
        <strong>{{ project.projectName }}</strong>
        <p>{{ project.description || 'No description' }}</p>
      </div>
      <span>{{ project.status }}</span>
    </button>
  </section>
</template>

<script setup lang="ts">
import type { ProjectItem } from '../../types/projectTypes'

defineProps<{
  projects: ProjectItem[]
  selectedProjectId?: number
  loading: boolean
}>()

defineEmits<{
  refresh: []
  select: [project: ProjectItem]
}>()
</script>