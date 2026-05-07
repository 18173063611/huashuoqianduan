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
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{
  status: string
  progress?: number | null
}>()

const CEIL = 92
const TICK_MS = 280
const FLASH_MS = 650

const smooth = ref(0)
const flash = ref(false)
let tickId: number | null = null
let flashTimer: number | null = null
let prevStatus = ''

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
  () => [props.status, props.progress] as const,
  () => {
    const st = props.status
    const pr = typeof props.progress === 'number' ? props.progress : 0

    if (st === 'RUNNING' || st === 'QUEUED') {
      smooth.value = Math.max(smooth.value, pr)
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
