<template>
  <Teleport to="body">
    <div class="task-dock" aria-label="任务与客服快捷入口">
      <div class="task-dock-fab-stack">
        <button
          type="button"
          class="task-dock-fab"
          :class="{ 'task-dock-fab--open': activePanel === 'feedback' }"
          :aria-expanded="activePanel === 'feedback'"
          title="提交反馈"
          @click="togglePanel('feedback')"
        >
          <el-icon><ChatDotRound /></el-icon>
          <span class="task-dock-sr-only">提交反馈</span>
        </button>
        <button
          v-if="!petOnlyWorkspace"
          type="button"
          class="task-dock-fab"
          :class="{ 'task-dock-fab--open': activePanel === 'task' }"
          :aria-expanded="activePanel === 'task'"
          title="任务中心"
          @click="togglePanel('task')"
        >
          <el-icon><Tickets /></el-icon>
          <span class="task-dock-sr-only">任务中心</span>
          <span v-if="processingCount > 0" class="task-dock-badge">{{ processingCount > 99 ? '99+' : processingCount }}</span>
        </button>
      </div>

      <div
        v-if="activePanel"
        class="task-dock-backdrop"
        role="presentation"
        @click.self="activePanel = null"
      />
      <aside
        v-if="activePanel"
        class="task-dock-sheet"
        :class="{ 'task-dock-sheet--feedback': activePanel === 'feedback' }"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-dock-sheet-title"
      >
        <div class="task-dock-sheet-head">
          <h2 id="task-dock-sheet-title" class="task-dock-sheet-title">{{ sheetTitle }}</h2>
          <p class="task-dock-sheet-lead">
            {{ sheetLead }}
          </p>
          <button type="button" class="task-dock-close" title="关闭" @click="activePanel = null">
            <el-icon><Close /></el-icon>
          </button>
        </div>
        <div class="task-dock-sheet-body">
          <TaskCenter
            v-if="activePanel === 'task'"
            :panel-active="activePanel === 'task'"
            @open-asset="onOpenAsset"
            @close-panel="activePanel = null"
          />
          <CustomerFeedbackPanel
            v-else
            :panel-active="activePanel === 'feedback'"
          />
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChatDotRound, Close, Tickets } from '@element-plus/icons-vue'
import CustomerFeedbackPanel from './CustomerFeedbackPanel.vue'
import TaskCenter from '../pages/task/TaskCenter.vue'
import { getAuthToken } from '../services/request'
import { getAuthUser } from '../services/authSession'
import { getTaskSummary } from '../services/taskApi'
import { subscribeAuthRefresh } from '../services/authRefreshHub'
import { isPetOnlyWorkspaceUser } from '../config/petCreationAccess'
import { useAuthRequired } from '../composables/useAuthRequired'

const emit = defineEmits<{
  openAsset: [assetId: number]
}>()
const { requireAuth } = useAuthRequired()

type ActivePanel = 'task' | 'feedback' | null

const activePanel = ref<ActivePanel>(null)
const processingCount = ref(0)
const currentUser = ref(getAuthUser())
const petOnlyWorkspace = computed(() => isPetOnlyWorkspaceUser(currentUser.value))
let pollTimer: number | null = null
let unsubscribeAuthRefresh: (() => void) | null = null
let badgeRefreshInFlight = false

const sheetTitle = computed(() => (activePanel.value === 'feedback' ? '客服反馈' : '进行中的任务'))
const sheetLead = computed(() =>
  activePanel.value === 'feedback'
    ? '提交问题、建议、任务异常或投诉，支持图片、视频、音频和文档附件。'
    : '已完成任务请在「资产中心」中查看产出，或通过消息通知跳转。',
)

function canPoll() {
  return !!getAuthToken() && !petOnlyWorkspace.value
}

async function refreshBadge() {
  if (badgeRefreshInFlight) {
    return
  }
  if (!canPoll()) {
    processingCount.value = 0
    if (activePanel.value === 'task') activePanel.value = null
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

function syncAuthUser() {
  currentUser.value = getAuthUser()
  if (petOnlyWorkspace.value) {
    processingCount.value = 0
    if (activePanel.value === 'task') activePanel.value = null
  }
}

onMounted(() => {
  unsubscribeAuthRefresh = subscribeAuthRefresh(() => {
    syncAuthUser()
    startPolling()
  })
})

onBeforeUnmount(() => {
  stopPolling()
  unsubscribeAuthRefresh?.()
  unsubscribeAuthRefresh = null
})

function onOpenAsset(assetId: number) {
  activePanel.value = null
  emit('openAsset', assetId)
}

function togglePanel(panel: Exclude<ActivePanel, null>) {
  if (panel === 'task' && petOnlyWorkspace.value) return
  if (panel === 'task' && !requireAuth('登录后可查看任务中心')) return
  activePanel.value = activePanel.value === panel ? null : panel
}
</script>

<style scoped>
.task-dock-fab-stack {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 50;
  display: grid;
  gap: 10px;
}

.task-dock-fab {
  display: inline-flex;
  width: 56px;
  height: 56px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid var(--hs-primary);
  background: var(--hs-primary);
  color: #ffffff;
  font-size: 22px;
  cursor: pointer;
  box-shadow: var(--hs-shadow-floating);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    opacity 0.15s ease;
}

.task-dock-fab:hover {
  transform: translateY(-1px);
  box-shadow: var(--hs-shadow-floating);
}

.task-dock-fab--open {
  opacity: 0;
  pointer-events: none;
}

.task-dock-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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

.task-dock-sheet--feedback {
  width: min(600px, 100vw);
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
  display: inline-grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: #667085;
}

.task-dock-close:hover {
  border-color: #dbe3ef;
  background: #f3f6fb;
  color: #172033;
}

.task-dock-sheet-body {
  flex: 1;
  overflow: auto;
  padding: 12px 12px 88px;
}

@media (max-width: 1024px) {
  .task-dock-fab-stack {
    right: 14px;
    bottom: 14px;
  }

  .task-dock-fab {
    width: 48px;
    height: 48px;
    font-size: 19px;
  }
}

@media (max-width: 720px) {
  .task-dock-fab-stack {
    display: none;
  }

  .task-dock-sheet,
  .task-dock-sheet--feedback {
    width: 100dvw;
    max-width: 100dvw;
  }
}
</style>
