<template>
  <section class="app-card">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">全部项目</h2>
        <p class="app-muted">点击选择当前工作项目，其他模块将使用该选择。</p>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <div v-if="projects.length === 0" class="app-empty">暂无项目，请先创建项目。</div>
    <article
      v-for="project in projects"
      :key="project.projectId"
      :class="['app-project-row', { active: selectedProjectId === project.projectId }]"
      @click="$emit('select', project)"
    >
      <div class="app-project-row-main">
        <strong>{{ project.projectName }}</strong>
        <p>{{ project.description || '暂无描述' }}</p>
        <div class="app-project-meta">
          <span>当前阶段：对标分析</span>
          <span>最近更新：{{ formatUpdatedAt(project.updatedAt) }}</span>
        </div>
      </div>
      <div class="app-row-actions">
        <span class="app-status-badge">{{ project.status }}</span>
        <button class="app-secondary-button app-continue-button" type="button" @click.stop="$emit('select', project)">
          继续制作
        </button>
        <button class="app-link-button" type="button" @click.stop="$emit('delete', project)">删除</button>
      </div>
    </article>
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
  delete: [project: ProjectItem]
}>()

function formatUpdatedAt(updatedAt: string) {
  if (!updatedAt) {
    return '刚刚'
  }
  const date = new Date(updatedAt)
  if (Number.isNaN(date.getTime())) {
    return '刚刚'
  }
  return date.toLocaleDateString()
}
</script>