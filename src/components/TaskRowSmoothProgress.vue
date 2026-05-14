<template>
  <div v-if="visible" class="task-row-smooth-progress">
    <div
      class="task-progress-wrap"
      :class="{ 'task-progress-wrap--active': status === 'RUNNING', 'task-progress-wrap--smooth': true }"
      :title="`${pct}%`"
    >
      <div class="task-progress-bar task-progress-bar--smooth" :style="{ width: pct + '%' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 任务列表行内进度：与形象/语音生成页相同的平滑逻辑；仅当 QUEUED/RUNNING 或成功收尾闪动时显示。
 * 虚拟进度持久化到 localStorage，关闭任务中心后面板后按时间补算，再打开不回到 0。
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  SMOOTH_PROGRESS_CEIL,
  SMOOTH_TICK_MS,
  catchUpSmoothProgress,
  loadTaskSmoothProgressRecord,
  removeTaskSmoothProgressRecord,
  saveTaskSmoothProgressRecord,
} from '../utils/taskSmoothProgressPersistence'

const props = defineProps<{
  taskId: number
  taskUpdatedAt?: string
  status: string
  progress?: number | null
}>()

const CEIL = SMOOTH_PROGRESS_CEIL
const TICK_MS = SMOOTH_TICK_MS
const FLASH_MS = 650

const smooth = ref(0)
const flash = ref(false)
let tickId: number | null = null
let flashTimer: number | null = null
let prevStatus = ''
/** 同一 taskId 只做一次从 localStorage 的补算，避免轮询反复覆盖 */
const hydratedForTaskId = ref<number | null>(null)

const visible = computed(
  () =>
    props.status === 'RUNNING' ||
    props.status === 'QUEUED' ||
    (flash.value && props.status === 'SUCCESS'),
)

const pct = computed(() => Math.min(100, Math.max(0, Math.round(smooth.value))))

function stopTick() {
  if (tickId != null) {
    window.clearInterval(tickId)
    tickId = null
  }
}

function tick() {
  if (props.status !== 'RUNNING' && props.status !== 'QUEUED') {
    return
  }
  const server = typeof props.progress === 'number' ? props.progress : 0
  let v = Math.max(smooth.value, server)
  if (v < CEIL) {
    const room = CEIL - v
    v += Math.max(0.22, room * 0.038)
  }
  smooth.value = Math.min(CEIL, Math.round(v * 100) / 100)
}

function startTick() {
  if (tickId != null) {
    return
  }
  tickId = window.setInterval(tick, TICK_MS)
}

function armFlash() {
  flash.value = true
  if (flashTimer != null) {
    window.clearTimeout(flashTimer)
  }
  flashTimer = window.setTimeout(() => {
    flash.value = false
    flashTimer = null
  }, FLASH_MS)
}

watch(
  () => [props.taskId, props.status, props.progress] as const,
  (val, oldVal) => {
    const [tid, st, pr] = val
    const server = typeof pr === 'number' ? pr : 0
    const tidChanged = oldVal == null || oldVal[0] !== tid

    if (tidChanged) {
      smooth.value = 0
      hydratedForTaskId.value = null
    }

    if (st === 'RUNNING' || st === 'QUEUED') {
      if (hydratedForTaskId.value !== tid) {
        hydratedForTaskId.value = tid
        const row = loadTaskSmoothProgressRecord(tid)
        if (row && (row.status === 'RUNNING' || row.status === 'QUEUED')) {
          smooth.value = Math.max(server, catchUpSmoothProgress(row.progress, row.lastTickAt, server))
        } else {
          smooth.value = Math.max(smooth.value, server)
        }
      } else {
        smooth.value = Math.max(smooth.value, server)
      }
      startTick()
    } else {
      stopTick()
    }

    if (st === 'SUCCESS' && (prevStatus === 'RUNNING' || prevStatus === 'QUEUED')) {
      smooth.value = 100
      armFlash()
    }

    if (['FAILED', 'RETRYABLE', 'CANCELED'].includes(st)) {
      flash.value = false
    }

    prevStatus = st
  },
  { flush: 'post', immediate: true },
)

onBeforeUnmount(() => {
  stopTick()
  if (flashTimer != null) {
    window.clearTimeout(flashTimer)
    flashTimer = null
  }

  const st = props.status
  const tid = props.taskId
  const ua = props.taskUpdatedAt ?? ''

  if (st === 'RUNNING' || st === 'QUEUED') {
    saveTaskSmoothProgressRecord({
      taskId: tid,
      progress: smooth.value,
      status: st,
      updatedAt: ua,
      lastTickAt: Date.now(),
    })
  } else if (st === 'SUCCESS') {
    removeTaskSmoothProgressRecord(tid)
  } else if (['FAILED', 'RETRYABLE', 'CANCELED'].includes(st)) {
    saveTaskSmoothProgressRecord({
      taskId: tid,
      progress: smooth.value,
      status: st,
      updatedAt: ua,
      lastTickAt: Date.now(),
    })
  }
})
</script>

<style scoped>
.task-row-smooth-progress {
  margin-top: 8px;
}

.task-progress-wrap--smooth {
  height: 8px;
  border-radius: 999px;
  background: #e8ecf4;
  overflow: hidden;
}

.task-progress-bar--smooth {
  height: 100%;
  border-radius: 999px;
  min-width: 0;
  background: linear-gradient(90deg, var(--app-primary, #4f46e5) 0%, #6366f1 100%);
  transition: width 0.35s ease;
}

.task-progress-wrap--active.task-progress-wrap--smooth .task-progress-bar--smooth {
  animation: task-row-progress-flow 2.2s ease infinite;
}

@keyframes task-row-progress-flow {
  0% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.08);
  }
  100% {
    filter: brightness(1);
  }
}
</style>
