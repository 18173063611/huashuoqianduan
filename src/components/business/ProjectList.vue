<template>
  <section class="app-card">
    <div class="app-card-header">
      <div>
        <p class="app-eyebrow">项目列表</p>
        <h2>当前演示项目</h2>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <div v-if="projects.length === 0" class="app-empty">暂无项目，请先创建一个演示项目。</div>
    <button
      v-for="project in projects"
      :key="project.projectId"
      :class="['app-project-row', { active: selectedProjectId === project.projectId }]"
      type="button"
      @click="$emit('select', project)"
    >
      <div>
        <strong>{{ project.projectName }}</strong>
        <p>{{ project.description || '暂无描述' }}</p>
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