<template>
  <section class="voice-page">
    <header class="voice-hero app-card">
      <div class="voice-hero-copy">
        <p class="voice-hero-eyebrow">声音生成</p>
        <h2 class="voice-hero-title">选择豆包或预设 AI 音色，直接生成口播音频</h2>
        <p class="app-muted voice-hero-lead">选择音色并确认口播文案，一键生成可下载的解说音频。</p>
      </div>
      <div class="voice-hero-badge">
        <p class="voice-hero-badge-label">当前阶段</p>
        <p class="voice-hero-badge-value">声音生成</p>
      </div>
    </header>

    <div class="voice-content">
      <div class="voice-layout">
        <section class="app-card voice-panel">
          <h3 class="voice-panel-title">选择声音服务</h3>
          <button
            type="button"
            class="voice-service-card"
            :class="{ active: providerMode === 'DOUBAO' }"
            @click="providerMode = 'DOUBAO'"
          >
            <div>
              <strong>豆包 TTS</strong>
              <p class="app-muted">推荐：稳定、适合口播</p>
            </div>
            <span class="voice-service-pill">默认</span>
          </button>
          <button type="button" class="voice-service-card voice-service-card-muted" disabled>
            <div>
              <strong>预设 AI 音色</strong>
              <p class="app-muted">备用：平台内置音色池</p>
            </div>
          </button>

          <div class="voice-script-block">
            <h4>待生成内容</h4>
            <p class="app-muted voice-script-hint">
              无需先完成视频解析：可直接粘贴或编辑口播文案再生成。载入当前脚本会拉取「文案改写」里已点击「应用文案并继续」的<strong>改写后文案</strong>。
            </p>
            <p v-if="scriptLoadMessage" class="voice-script-load-msg app-muted">{{ scriptLoadMessage }}</p>
            <textarea v-model.trim="scriptText" class="voice-textarea" rows="8" placeholder="在此粘贴或编辑口播文案…" />
            <div class="voice-script-actions">
              <button class="app-secondary-button" type="button" :disabled="loadingScripts" @click="loadAppliedRewriteScript">
                {{ loadingScripts ? '载入中…' : '载入当前脚本' }}
              </button>
              <button
                class="app-primary-button"
                type="button"
                :disabled="submitting || !scriptText || !selectedVoiceId"
                @click="submitTts"
              >
                {{ submitting ? '提交中…' : '生成口播' }}
              </button>
            </div>
          </div>
        </section>

        <section class="app-card voice-panel voice-panel-wide">
          <h3 class="voice-panel-title">音色列表</h3>
          <p v-if="presetsError" class="app-error">{{ presetsError }}</p>
          <div v-if="presetsLoading" class="app-muted">加载音色中…</div>
          <div v-else class="voice-preset-list">
            <div
              v-for="v in presets"
              :key="v.voiceId"
              class="voice-preset-row"
              :class="{ selected: selectedVoiceId === v.voiceId }"
            >
              <button type="button" class="voice-play" :disabled="!v.sampleUrl" @click="playSample(v)">▶</button>
              <div class="voice-preset-meta">
                <strong>{{ v.voiceName }}</strong>
                <p class="app-muted">{{ v.scene || '通用场景' }}</p>
              </div>
              <button
                type="button"
                class="app-secondary-button voice-select-btn"
                @click="selectedVoiceId = v.voiceId"
              >
                {{ selectedVoiceId === v.voiceId ? '已选择' : '选择' }}
              </button>
            </div>
          </div>

          <div v-if="taskSectionVisible" class="voice-task-card">
            <div class="voice-task-head">
              <p class="voice-task-title">任务进度</p>
              <span v-if="taskStatus" class="voice-task-status">{{ taskStatus }}</span>
            </div>
            <div v-if="showTaskProgressBar" class="voice-progress-row">
              <div
                class="voice-progress-track"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="barProgressPercent"
              >
                <div class="voice-progress-fill" :style="{ width: `${barProgressPercent}%` }" />
              </div>
              <span class="voice-progress-pct">{{ barProgressPercent }}%</span>
            </div>
            <p v-if="taskError" class="app-error">{{ taskError }}</p>
            <audio v-if="audioAssetUrl" class="voice-audio" controls :src="audioAssetUrl" />
            <p v-if="taskStatus === 'SUCCESS'" class="app-muted voice-success-tip">
              生成完成后可在「资产中心 / 音频」查看该条口播音频。
            </p>
          </div>
        </section>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'
import { generateTts, getTtsTask, getVoicePresets } from '../../services/voiceApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import type { TtsGenerateRequest, VoicePresetItem } from '../../types/voiceTypes'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '')

const providerMode = ref<'DOUBAO' | 'PRESET'>('DOUBAO')
const presets = ref<VoicePresetItem[]>([])
const presetsLoading = ref(false)
const presetsError = ref('')
const selectedVoiceId = ref<number | null>(null)

const scriptText = ref('')
/** 仅当文案来自 `script_version` 表时传给后端 scriptId；writer 已应用文案只用 text，避免 ID 混用 */
const loadedScriptVersionId = ref<number | null>(null)
const loadingScripts = ref(false)
const scriptLoadMessage = ref('')

const submitting = ref(false)
const activeTaskId = ref<number | null>(null)
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const taskError = ref('')
const pollTimer = ref<number | null>(null)

const { showTaskProgressBar, barProgressPercent, reset: resetSmoothProgress } = useSmoothTaskProgress(
  taskStatus,
  taskProgress,
)

const taskSectionVisible = computed(() => activeTaskId.value != null)

const audioAssetUrl = ref('')

onMounted(async () => {
  resetTask()
  await loadPresets()
})

onBeforeUnmount(() => {
  stopPoll()
})

async function loadPresets() {
  presetsLoading.value = true
  presetsError.value = ''
  try {
    const res = await getVoicePresets()
    presets.value = res.records || []
    if (presets.value.length > 0 && selectedVoiceId.value == null) {
      selectedVoiceId.value = presets.value[0].voiceId
    }
  } catch (e) {
    presetsError.value = e instanceof Error ? e.message : '加载音色失败'
  } finally {
    presetsLoading.value = false
  }
}

async function loadAppliedRewriteScript() {
  loadingScripts.value = true
  scriptLoadMessage.value = ''
  try {
    loadedScriptVersionId.value = null
    scriptLoadMessage.value = '当前已改为无项目模式，请直接粘贴或编辑口播文案后生成。'
  } catch (e) {
    scriptLoadMessage.value = e instanceof Error ? e.message : '载入脚本失败'
  } finally {
    loadingScripts.value = false
  }
}

function playSample(v: VoicePresetItem) {
  if (!v.sampleUrl) {
    return
  }
  const url = v.sampleUrl.startsWith('http') ? v.sampleUrl : `${API_ORIGIN}${v.sampleUrl}`
  const a = new Audio(url)
  void a.play().catch(() => {})
}

function resetTask() {
  stopPoll()
  resetSmoothProgress()
  activeTaskId.value = null
  taskStatus.value = ''
  taskProgress.value = null
  taskError.value = ''
  audioAssetUrl.value = ''
}

function stopPoll() {
  if (pollTimer.value != null) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

async function submitTts() {
  if (!selectedVoiceId.value || !scriptText.value) {
    return
  }
  submitting.value = true
  taskError.value = ''
  try {
    const body: TtsGenerateRequest = {
      voiceId: selectedVoiceId.value,
      text: scriptText.value,
      provider: 'DOUBAO',
      speed: 1,
      pitch: 0,
      volume: 1,
    }
    if (loadedScriptVersionId.value != null) {
      body.scriptId = loadedScriptVersionId.value
    }
    const res = await generateTts(body)
    rememberSessionTaskId(res.taskId)
    resetSmoothProgress()
    activeTaskId.value = res.taskId
    taskStatus.value = res.status
    taskProgress.value = 0
    startPoll(res.taskId)
  } catch (e) {
    taskError.value = e instanceof Error ? e.message : '提交失败'
    activeTaskId.value = null
  } finally {
    submitting.value = false
  }
}

function startPoll(taskId: number) {
  stopPoll()
  void pollOnce(taskId)
  pollTimer.value = window.setInterval(() => {
    void pollOnce(taskId)
  }, 2000)
}

async function pollOnce(taskId: number) {
  try {
    const detail = await getTtsTask(taskId)
    taskStatus.value = detail.status
    taskProgress.value = detail.progress
    taskError.value = detail.errorMessage || ''
    if (detail.audioAsset?.fileUrl) {
      const u = detail.audioAsset.fileUrl
      audioAssetUrl.value = u.startsWith('http') ? u : `${API_ORIGIN}${u}`
    }
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopPoll()
      if (detail.status === 'SUCCESS') {
        taskProgress.value = detail.progress ?? 100
      }
    }
  } catch (e) {
    taskError.value = e instanceof Error ? e.message : '查询任务失败'
  }
}
</script>

<style scoped>
.voice-page {
  display: flex;
  max-width: var(--app-content-width);
  flex-direction: column;
  gap: 20px;
  margin: 0 auto;
  padding: 8px 8px 32px;
}

.voice-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: var(--app-radius-lg);
  background: linear-gradient(180deg, #fbfaff 0%, #f5f3ff 100%);
  border: 1px solid #ebe8ff;
  box-shadow: var(--app-shadow);
}

.voice-hero-eyebrow {
  margin: 0 0 8px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.voice-hero-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 800;
}

.voice-hero-lead {
  margin: 0;
  max-width: 720px;
  line-height: 1.5;
}

.voice-hero-badge {
  min-width: 200px;
  padding: 14px 18px;
  border-radius: var(--app-radius-md);
  border: 1px solid #e5e1ff;
  background: rgba(255, 255, 255, 0.72);
}

.voice-hero-badge-label {
  margin: 0 0 4px;
  color: var(--app-text-secondary);
  font-size: 12px;
}

.voice-hero-badge-value {
  margin: 0;
  font-size: 15px;
  font-weight: 800;
}

.voice-content {
  display: grid;
  gap: 20px;
}

.voice-layout {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(320px, 430px) 1fr;
}

@media (max-width: 1024px) {
  .voice-layout {
    grid-template-columns: 1fr;
  }

  .voice-hero {
    flex-direction: column;
  }
}

.voice-panel {
  padding: 22px 24px;
  border-radius: var(--app-radius-lg);
}

.voice-panel-wide {
  min-width: 0;
}

.voice-panel-title {
  margin: 0 0 18px;
  font-size: 18px;
  font-weight: 850;
}

.voice-service-card {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 16px 18px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
  text-align: left;
}

.voice-service-card.active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
}

.voice-service-card-muted {
  opacity: 0.65;
}

.voice-service-pill {
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--app-primary);
  color: #fff;
  font-size: 12px;
  font-weight: 800;
}

.voice-script-block {
  margin-top: 20px;
  padding: 16px;
  border-radius: var(--app-radius-md);
  border: 1px solid var(--app-border);
  background: var(--app-surface-soft);
}

.voice-script-block h4 {
  margin: 0 0 8px;
  font-size: 15px;
}

.voice-script-hint {
  margin: 0 0 12px;
  font-size: 13px;
}

.voice-script-load-msg {
  margin: 0 0 10px;
  font-size: 13px;
}

.voice-textarea {
  width: 100%;
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--app-border-strong);
  border-radius: var(--app-radius-sm);
  background: #fff;
  resize: vertical;
}

.voice-script-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.voice-preset-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.voice-preset-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
}

.voice-preset-row.selected {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
}

.voice-play {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: none;
  border-radius: 999px;
  background: #eef1f7;
  color: var(--app-text-tertiary);
  font-size: 12px;
}

.voice-preset-row.selected .voice-play {
  background: var(--app-primary);
  color: #fff;
}

.voice-preset-meta {
  flex: 1;
  min-width: 0;
}

.voice-preset-meta strong {
  display: block;
  margin-bottom: 4px;
}

.voice-select-btn {
  flex: 0 0 auto;
}

.voice-task-card {
  margin-top: 20px;
  padding: 16px;
  border-radius: var(--app-radius-md);
  border: 1px solid #bbf7d0;
  background: #dcfce7;
}

.voice-task-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.voice-task-status {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 800;
  color: #166534;
}

.voice-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.voice-progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.65);
}

.voice-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
  transition: width 0.35s ease;
}

.voice-progress-pct {
  flex-shrink: 0;
  min-width: 2.75rem;
  font-size: 12px;
  font-weight: 800;
  color: #166534;
  text-align: right;
}

.voice-task-title {
  margin: 0;
  font-weight: 800;
  color: #166534;
}

.voice-audio {
  width: 100%;
  margin-top: 12px;
}

.voice-success-tip {
  margin: 8px 0 0;
  font-size: 12px;
}

.app-empty-block {
  padding: 24px;
}
</style>
