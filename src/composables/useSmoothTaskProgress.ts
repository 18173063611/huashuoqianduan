import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

const DEFAULT_SMOOTH_PROGRESS_CEIL = 92
const DEFAULT_SMOOTH_TICK_MS = 280
const DEFAULT_MIN_STEP = 0.22
const DEFAULT_ROOM_RATE = 0.038
const COMPLETION_FLASH_MS = 650

export interface SmoothTaskProgressOptions {
  ceiling?: number
  tickMs?: number
  minStep?: number
  roomRate?: number
}

/**
 * 任务进度展示：服务端进度为下限，前台在 RUNNING/QUEUED 时平滑爬升；SUCCESS 时拉满并短暂闪动。
 */
export function useSmoothTaskProgress(
  taskStatus: Ref<string>,
  serverProgress: Ref<number | null>,
  options?: SmoothTaskProgressOptions,
) {
  const smoothProgress = ref(0)
  const showCompletionFlash = ref(false)
  const ceiling = options?.ceiling ?? DEFAULT_SMOOTH_PROGRESS_CEIL
  const tickMs = options?.tickMs ?? DEFAULT_SMOOTH_TICK_MS
  const minStep = options?.minStep ?? DEFAULT_MIN_STEP
  const roomRate = options?.roomRate ?? DEFAULT_ROOM_RATE

  let smoothTickTimer: number | null = null
  let completionHoldTimer: number | null = null
  let prevStatus = ''

  const showTaskProgressBar = computed(
    () =>
      taskStatus.value === 'RUNNING' ||
      taskStatus.value === 'QUEUED' ||
      (showCompletionFlash.value && taskStatus.value === 'SUCCESS'),
  )

  const barProgressPercent = computed(() =>
    Math.min(100, Math.max(0, Math.round(smoothProgress.value))),
  )

  function stopSmoothTick() {
    if (smoothTickTimer != null) {
      window.clearInterval(smoothTickTimer)
      smoothTickTimer = null
    }
  }

  function stopCompletionFlashTimer() {
    if (completionHoldTimer != null) {
      window.clearTimeout(completionHoldTimer)
      completionHoldTimer = null
    }
  }

  function tick() {
    if (taskStatus.value !== 'RUNNING' && taskStatus.value !== 'QUEUED') {
      return
    }
    const server = serverProgress.value ?? 0
    let v = Math.max(smoothProgress.value, server)
    if (v < ceiling) {
      const room = ceiling - v
      v += Math.max(minStep, room * roomRate)
    }
    smoothProgress.value = Math.min(ceiling, Math.round(v * 100) / 100)
  }

  function startSmoothTick() {
    if (smoothTickTimer != null) {
      return
    }
    smoothTickTimer = window.setInterval(tick, tickMs)
  }

  function flashCompletionBar() {
    showCompletionFlash.value = true
    stopCompletionFlashTimer()
    completionHoldTimer = window.setTimeout(() => {
      showCompletionFlash.value = false
      completionHoldTimer = null
    }, COMPLETION_FLASH_MS)
  }

  watch(
    [taskStatus, serverProgress],
    () => {
      const st = taskStatus.value
      const pr = serverProgress.value

      if (st === 'RUNNING' || st === 'QUEUED') {
        smoothProgress.value = Math.max(smoothProgress.value, pr ?? 0)
        startSmoothTick()
      } else {
        stopSmoothTick()
      }

      if (st === 'SUCCESS' && (prevStatus === 'RUNNING' || prevStatus === 'QUEUED')) {
        smoothProgress.value = 100
        flashCompletionBar()
      }

      if (['FAILED', 'RETRYABLE', 'CANCELED'].includes(st)) {
        showCompletionFlash.value = false
      }

      prevStatus = st
    },
    { flush: 'post' },
  )

  function reset() {
    smoothProgress.value = 0
    showCompletionFlash.value = false
    prevStatus = ''
    stopSmoothTick()
    stopCompletionFlashTimer()
  }

  onBeforeUnmount(() => {
    stopSmoothTick()
    stopCompletionFlashTimer()
  })

  return {
    showTaskProgressBar,
    barProgressPercent,
    reset,
  }
}
