<template>
  <Teleport to="body">
    <div class="task-dock" aria-label="任务提醒与快捷入口">
      <button
        type="button"
        class="task-dock-fab"
        :class="{ 'task-dock-fab--open': sheetOpen }"
        :aria-expanded="sheetOpen"
        @click="sheetOpen = !sheetOpen"
      >
        <span class="task-dock-fab-icon" aria-hidden="true">☷</span>
        <span class="task-dock-fab-label">任务</span>
        <span v-if="processingCount > 0" class="task-dock-badge">{{ processingCount > 99 ? '99+' : processingCount }}</span>
      </button>

      <div
        v-if="sheetOpen"
        class="task-dock-backdrop"
        role="presentation"
        @click.self="sheetOpen = false"
      />
      <aside
        v-if="sheetOpen"
        class="task-dock-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dock-sheet-title"
      >
        <div class="task-dock-sheet-head">
          <h2 id="task-dock-sheet-title" class="task-dock-sheet-title">进行中的任务</h2>
          <p class="task-dock-sheet-lead">
            已完成任务请在「资产中心」中查看产出，或通过消息通知跳转。
          </p>
          <button type="button" class="task-dock-close app-ghost-button" @click="sheetOpen = false">关闭</button>
        </div>
        <div class="task-dock-sheet-body">
          <TaskCenter
            :panel-active="sheetOpen"
            @open-asset="onOpenAsset"
          />
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import TaskCenter from '../pages/task/TaskCenter.vue'
import { getAuthToken } from '../services/request'
import { getTaskSummary } from '../services/taskApi'

const emit = defineEmits<{
  openAsset: [assetId: number]
}>()

const sheetOpen = ref(false)
const processingCount = ref(0)
let pollTimer: number | null = null
let badgeRefreshInFlight = false

function canPoll() {
  return !!getAuthToken()
}

async function refreshBadge() {
  if (badgeRefreshInFlight) {
    return
  }
  if (!canPoll()) {
    processingCount.value = 0
    return
  }
  badgeRefreshInFlight = true
  try {
    const sum = await getTaskSummary()
    processingCount.value = typeof sum.processingCount === 'number' ? sum.processingCount : 0
  } catch {
    /* 忽略轮询错误 */
  } finally {
    badgeRefreshInFlight = false
  }
}

function startPolling() {
  stopPolling()
  void refreshBadge()
  pollTimer = window.setInterval(() => void refreshBadge(), 5000)
}

function stopPolling() {
  if (pollTimer != null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => getAuthToken(),
  () => startPolling(),
  { immediate: true },
)

onBeforeUnmount(stopPolling)

function onOpenAsset(assetId: number) {
  sheetOpen.value = false
  emit('openAsset', assetId)
}
</script>

<style scoped>
.task-dock-fab {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 50;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 999px;
  border: 1px solid rgba(124, 108, 255, 0.35);
  background: linear-gradient(135deg, #6c5ce7, #8a7cff);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(124, 108, 255, 0.35);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.task-dock-fab:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 32px rgba(124, 108, 255, 0.42);
}

.task-dock-fab--open {
  opacity: 0.92;
}

.task-dock-fab-icon {
  font-size: 16px;
  line-height: 1;
}

.task-dock-fab-label {
  line-height: 1;
}

.task-dock-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.45);
}

.task-dock-backdrop {
  position: fixed;
  inset: 0;
  z-index: 48;
  background: rgba(15, 23, 42, 0.35);
}

.task-dock-sheet {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 49;
  width: min(520px, 100vw);
  height: 100vh;
  max-height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #f8f9fc;
  border-left: 1px solid #e5e7eb;
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.12);
}

.task-dock-sheet-head {
  flex-shrink: 0;
  padding: 20px 20px 12px;
  background: #ffffff;
  border-bottom: 1px solid #eef0f6;
  position: relative;
}

.task-dock-sheet-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.task-dock-sheet-lead {
  margin: 0 36px 0 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.task-dock-close {
  position: absolute;
  top: 16px;
  right: 16px;
}

.task-dock-sheet-body {
  flex: 1;
  overflow: auto;
  padding: 12px 12px 88px;
}
</style>
