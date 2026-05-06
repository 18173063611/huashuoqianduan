<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">任务中心</h2>
        <p class="app-muted">查看任务状态与结果。</p>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading" @click="loadTasks">
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <template>
      <div class="app-selected-project">全局任务 · <strong>所有模块生成记录</strong></div>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="tasks.length === 0" class="app-empty">暂无任务。</div>
      <div v-else class="app-file-list">
        <div v-for="task in tasks" :key="task.taskId" class="app-file-item task-row">
          <div class="task-row-main">
            <strong>{{ taskLabel(task.taskType) }}</strong>
            <p class="task-row-meta">
              状态 {{ task.status }} · 已重试 {{ task.retryCount }} 次
              <template v-if="task.taskType === 'TTS_GENERATE' && task.status === 'SUCCESS' && resultAssetId(task)">
                · 已生成音频资产
              </template>
            </p>
          </div>
          <div class="task-row-actions">
            <span class="app-task-status">{{ task.status }}</span>
            <button
              v-if="task.status === 'SUCCESS' && resultAssetId(task)"
              type="button"
              class="app-secondary-button task-open-asset"
              @click="emit('openAsset', resultAssetId(task)!)"
            >
              查看资产
            </button>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getTasks } from '../../services/taskApi'
import type { TaskItem } from '../../types/taskTypes'

const emit = defineEmits<{
  openAsset: [assetId: number]
}>()

const tasks = ref<TaskItem[]>([])
const loading = ref(false)
const errorMessage = ref('')

watch(
  () => true,
  async () => {
    tasks.value = []
    await loadTasks()
  },
  { immediate: true },
)

async function loadTasks() {
  loading.value = true
  errorMessage.value = ''
  try {
    tasks.value = await getTasks()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载任务失败'
  } finally {
    loading.value = false
  }
}

function taskLabel(taskType: string) {
  if (taskType === 'TTS_GENERATE') {
    return '文案转音频'
  }
  return taskType
}

function resultAssetId(task: TaskItem): number | null {
  if (!task.outputJson) {
    return null
  }
  try {
    const o = JSON.parse(task.outputJson) as { resultAssetId?: number }
    const id = o.resultAssetId
    return typeof id === 'number' && id > 0 ? id : null
  } catch {
    return null
  }
}
</script>

<style scoped>
.task-row {
  align-items: flex-start;
}

.task-row-main {
  flex: 1;
  min-width: 0;
}

.task-row-meta {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--app-text-secondary);
}

.task-row-actions {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.task-open-asset {
  white-space: nowrap;
}
</style>
