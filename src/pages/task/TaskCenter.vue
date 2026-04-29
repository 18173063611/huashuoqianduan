<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <p class="app-eyebrow">任务中心</p>
        <h2>项目任务列表</h2>
      </div>
      <button class="app-secondary-button" type="button" :disabled="loading || !project" @click="loadTasks">
        {{ loading ? '加载中...' : '刷新任务' }}
      </button>
    </div>

    <div v-if="!project" class="app-empty">请先在项目管理中选择项目，任务会按 projectId 汇总展示。</div>
    <template v-else>
      <div class="app-selected-project">当前项目：<strong>{{ project.projectName }}</strong></div>
      <p class="app-muted">后续视频解析、文案改写、TTS、视频合成都将先创建任务，再异步推进状态。</p>
      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="tasks.length === 0" class="app-empty">暂无任务。当前页面已预留任务状态、失败原因和 traceId 展示位。</div>
      <div v-else class="app-file-list">
        <div v-for="task in tasks" :key="task.taskId" class="app-file-item">
          <div>
            <strong>{{ task.taskType }}</strong>
            <p>状态：{{ task.status }}，重试次数：{{ task.retryCount }}，traceId：{{ task.traceId || '-' }}</p>
          </div>
          <span class="app-task-status">{{ task.status }}</span>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getProjectTasks } from '../../services/taskApi'
import type { ProjectItem } from '../../types/projectTypes'
import type { TaskItem } from '../../types/taskTypes'

const props = defineProps<{
  project?: ProjectItem
}>()

const tasks = ref<TaskItem[]>([])
const loading = ref(false)
const errorMessage = ref('')

watch(
  () => props.project?.projectId,
  async () => {
    tasks.value = []
    if (props.project) {
      await loadTasks()
    }
  },
  { immediate: true },
)

async function loadTasks() {
  if (!props.project) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    tasks.value = await getProjectTasks(props.project.projectId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载任务失败'
  } finally {
    loading.value = false
  }
}
</script>
