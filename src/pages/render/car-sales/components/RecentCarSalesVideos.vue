<template>
  <section class="quick-recent-panel">
    <div class="quick-section-head">
      <div>
        <h2>我的最近生成</h2>
      </div>
      <div class="quick-recent-toolbar">
        <button
          class="app-secondary-button"
          type="button"
          :disabled="recentLoading"
          @click="$emit('refresh')"
        >
          {{ recentLoading ? '刷新中...' : '刷新' }}
        </button>
        <button class="app-secondary-button" type="button" @click="$emit('go-task-center')">全部作品</button>
      </div>
    </div>

    <p v-if="recentError" class="app-error">{{ recentError }}</p>
    <div v-if="recentLoading && recentTasks.length === 0" class="quick-recent-list quick-recent-list--placeholder">
      <RecentPlaceholderCard
        v-for="item in recentVisualPlaceholders"
        :key="item.id"
        :item="item"
        :car-placeholder-image="carPlaceholderImage"
        @go-task-center="$emit('go-task-center')"
      />
    </div>
    <div v-else-if="recentTasks.length === 0" class="quick-recent-list quick-recent-list--placeholder">
      <RecentPlaceholderCard
        v-for="item in recentVisualPlaceholders"
        :key="item.id"
        :item="item"
        :car-placeholder-image="carPlaceholderImage"
        @go-task-center="$emit('go-task-center')"
      />
    </div>
    <div v-else class="quick-recent-list">
      <article
        v-for="task in recentTasks"
        :key="task.taskId"
        class="quick-recent-item"
        :class="{ 'quick-recent-item--current': task.taskId === currentTaskId }"
      >
        <div class="quick-recent-thumb">
          <img :src="recentTaskCoverUrl(task)" alt="" />
          <span v-if="recentTaskVideoUrl(task)" class="quick-recent-play" aria-hidden="true">▶</span>
        </div>
        <div class="quick-recent-main">
          <strong>{{ recentTaskTitle(task) }}</strong>
          <p>
            {{ taskTypeLabel(task.taskType) }}
            <template v-if="task.createdAt"> · 创建 {{ formatRecentTaskTime(task.createdAt) }}</template>
            <template v-if="recentTaskCredit(task)"> · {{ recentTaskCredit(task) }}</template>
          </p>
          <div v-if="isActiveRecentTask(task)" class="quick-progress-row quick-recent-progress">
            <div class="quick-progress-track">
              <div class="quick-progress-fill" :style="{ width: `${recentTaskProgressPercent(task)}%` }" />
            </div>
            <span>{{ recentTaskProgressPercent(task) }}%</span>
          </div>
          <small v-if="task.errorMessage" class="quick-recent-error">
            {{ friendlyRecentTaskError(task.errorMessage) }}
          </small>
        </div>
        <div class="quick-recent-side">
          <span class="app-task-status" :class="recentTaskStatusClass(task.status)">
            {{ recentTaskStatusLabel(task.status) }}
          </span>
          <div class="quick-recent-buttons">
            <button class="app-secondary-button" type="button" @click="$emit('go-task-center', task.taskId)">
              {{ task.status === 'SUCCESS' ? '查看结果' : '查看进度' }}
            </button>
            <button
              v-if="recentTaskAssetId(task)"
              class="app-secondary-button"
              type="button"
              @click="$emit('go-asset-result', recentTaskAssetId(task) as number)"
            >
              查看资产
            </button>
            <a
              v-if="recentTaskVideoUrl(task)"
              class="app-secondary-button"
              :href="recentTaskVideoUrl(task)"
              target="_blank"
              rel="noreferrer"
            >
              打开视频
            </a>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { TaskItem } from '../../../../types/taskTypes'
import RecentPlaceholderCard from './RecentPlaceholderCard.vue'

export interface RecentVisualPlaceholder {
  id: string
  title: string
  meta: string
}

defineProps<{
  recentTasks: TaskItem[]
  recentVisualPlaceholders: RecentVisualPlaceholder[]
  recentLoading: boolean
  recentError: string
  currentTaskId: number | null
  carPlaceholderImage: string
  taskTypeLabel: (taskType: string) => string
  formatRecentTaskTime: (value: string) => string
  recentTaskCredit: (task: TaskItem) => string
  isActiveRecentTask: (task: TaskItem) => boolean
  recentTaskProgressPercent: (task: TaskItem) => number
  recentTaskStatusClass: (status: string) => string
  recentTaskStatusLabel: (status: string) => string
  recentTaskVideoUrl: (task: TaskItem) => string
  recentTaskCoverUrl: (task: TaskItem) => string
  recentTaskTitle: (task: TaskItem) => string
  recentTaskAssetId: (task: TaskItem) => number | null
  friendlyRecentTaskError: (message?: string | null) => string
}>()

defineEmits<{
  refresh: []
  'go-task-center': [taskId?: number]
  'go-asset-result': [assetId: number]
}>()
</script>
