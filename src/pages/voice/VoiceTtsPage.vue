<template>
  <section class="voice-page app-page-stack">
    <div class="voice-content">
      <div class="voice-layout">
        <section class="app-card voice-panel">
          <h3 class="voice-panel-title">口播文案</h3>
          <div class="voice-script-block">
            <h4>待生成内容</h4>
            <p class="app-muted voice-script-hint">
              粘贴或编辑文案，选择右侧火山音色后生成音频。
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
          <div class="voice-library-head">
            <div>
              <h3 class="voice-panel-title">火山音色库</h3>
              <p class="app-muted voice-library-subtitle">将控制台里的 voice_type 保存到这里后即可选择使用。</p>
            </div>
            <button type="button" class="app-secondary-button" @click="addingVoice = !addingVoice">
              {{ addingVoice ? '收起' : '新增音色' }}
            </button>
          </div>

          <form v-if="addingVoice" class="voice-add-form" @submit.prevent="submitVoicePreset">
            <input v-model.trim="voiceForm.providerVoiceId" placeholder="voice_type，例如 zh_female_xxx_bigtts" />
            <input v-model.trim="voiceForm.voiceName" placeholder="音色名称" />
            <select v-model="voiceForm.gender">
              <option value="未知">未知</option>
              <option value="女声">女声</option>
              <option value="男声">男声</option>
              <option value="童声">童声</option>
            </select>
            <input v-model.trim="voiceForm.scene" placeholder="适用场景" />
            <input v-model.trim="voiceForm.sampleUrl" class="voice-add-form-wide" placeholder="试听地址，可不填" />
            <button class="app-primary-button" type="submit" :disabled="savingVoice">
              {{ savingVoice ? '保存中…' : '保存音色' }}
            </button>
          </form>

          <div class="voice-filter-row">
            <input v-model.trim="voiceKeyword" placeholder="搜索音色名称或 voice_type" />
            <select v-model="voiceGenderFilter">
              <option value="">全部性别</option>
              <option value="女声">女声</option>
              <option value="男声">男声</option>
              <option value="童声">童声</option>
              <option value="未知">未知</option>
            </select>
          </div>

          <p v-if="presetsError" class="app-error">{{ presetsError }}</p>
          <div v-if="presetsLoading" class="app-muted">加载音色中…</div>
          <div v-else class="voice-preset-list">
            <div
              v-for="v in filteredPresets"
              :key="v.voiceId"
              class="voice-preset-row"
              :class="{ selected: selectedVoiceId === v.voiceId }"
            >
              <button type="button" class="voice-play" :disabled="!v.sampleUrl" @click="playSample(v)">▶</button>
              <div class="voice-preset-meta">
                <strong>{{ v.voiceName }}</strong>
                <p class="app-muted">{{ v.providerVoiceId }}</p>
                <span>{{ v.gender || '未知' }} · {{ v.scene || '通用口播' }}</span>
              </div>
              <button
                type="button"
                class="app-secondary-button voice-select-btn"
                @click="selectedVoiceId = v.voiceId"
              >
                {{ selectedVoiceId === v.voiceId ? '已选择' : '选择' }}
              </button>
            </div>
            <div v-if="!filteredPresets.length" class="app-empty-block">暂无匹配音色</div>
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
            <div v-if="taskStatus === 'SUCCESS' && audioAssetId" class="voice-save-row">
              <span class="voice-saved-badge">已自动保存到资产中心</span>
            </div>
            <p v-if="taskStatus === 'SUCCESS'" class="app-muted voice-success-tip">
              生成完成后可直接试听，也可在「资产中心 / 私有素材 / 音频」中查看。
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
import { createVoicePreset, generateTts, getTtsTask, getVoicePresets } from '../../services/voiceApi'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import type { TtsGenerateRequest, VoicePresetCreateRequest, VoicePresetItem } from '../../types/voiceTypes'

const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/v1\/?$/, '')

const presets = ref<VoicePresetItem[]>([])
const presetsLoading = ref(false)
const presetsError = ref('')
const selectedVoiceId = ref<number | null>(null)
const voiceKeyword = ref('')
const voiceGenderFilter = ref('')
const addingVoice = ref(false)
const savingVoice = ref(false)
const voiceForm = ref<VoicePresetCreateRequest>({
  providerVoiceId: '',
  voiceName: '',
  gender: '未知',
  scene: '通用口播',
  sampleUrl: '',
})

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
const filteredPresets = computed(() => {
  const keyword = voiceKeyword.value.toLowerCase()
  return presets.value.filter((item) => {
    const matchesKeyword =
      !keyword ||
      item.voiceName.toLowerCase().includes(keyword) ||
      item.providerVoiceId.toLowerCase().includes(keyword) ||
      (item.scene || '').toLowerCase().includes(keyword)
    const matchesGender = !voiceGenderFilter.value || item.gender === voiceGenderFilter.value
    return matchesKeyword && matchesGender
  })
})

const audioAssetUrl = ref('')
const audioAssetId = ref<number | null>(null)

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

async function submitVoicePreset() {
  if (!voiceForm.value.providerVoiceId || !voiceForm.value.voiceName) {
    presetsError.value = '请填写 voice_type 和音色名称'
    return
  }
  savingVoice.value = true
  presetsError.value = ''
  try {
    const item = await createVoicePreset({
      providerVoiceId: voiceForm.value.providerVoiceId,
      voiceName: voiceForm.value.voiceName,
      gender: voiceForm.value.gender || '未知',
      scene: voiceForm.value.scene || '通用口播',
      sampleUrl: voiceForm.value.sampleUrl || undefined,
    })
    await loadPresets()
    selectedVoiceId.value = item.voiceId
    addingVoice.value = false
    voiceForm.value = {
      providerVoiceId: '',
      voiceName: '',
      gender: '未知',
      scene: '通用口播',
      sampleUrl: '',
    }
  } catch (e) {
    presetsError.value = e instanceof Error ? e.message : '保存音色失败'
  } finally {
    savingVoice.value = false
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
  audioAssetId.value = null
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
      audioAssetId.value = detail.audioAsset.assetId
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
  flex-direction: column;
  gap: 20px;
  padding: 8px 0 32px;
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

.voice-script-block {
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

.voice-library-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.voice-library-head .voice-panel-title {
  margin-bottom: 6px;
}

.voice-library-subtitle {
  margin: 0;
  font-size: 13px;
}

.voice-add-form,
.voice-filter-row {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.voice-add-form {
  grid-template-columns: minmax(220px, 1.6fr) minmax(160px, 1fr) 120px minmax(140px, 1fr) auto;
  padding: 14px;
  border: 1px solid #e3dcff;
  border-radius: var(--app-radius-md);
  background: #fbfaff;
}

.voice-filter-row {
  grid-template-columns: minmax(260px, 1fr) 160px;
}

.voice-add-form input,
.voice-add-form select,
.voice-filter-row input,
.voice-filter-row select {
  width: 100%;
  height: 40px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: #fff;
  padding: 0 12px;
  color: var(--app-text);
  outline: none;
}

.voice-add-form input:focus,
.voice-add-form select:focus,
.voice-filter-row input:focus,
.voice-filter-row select:focus {
  border-color: var(--app-primary);
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
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

.voice-preset-meta span {
  display: inline-flex;
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
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

.voice-save-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.voice-saved-badge {
  display: inline-flex;
  height: 34px;
  align-items: center;
  border: 1px solid #bbf7d0;
  border-radius: var(--app-radius-sm);
  background: rgba(255, 255, 255, 0.72);
  color: #166534;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 800;
}

.voice-success-tip {
  margin: 8px 0 0;
  font-size: 12px;
}

.app-empty-block {
  padding: 24px;
}

@media (max-width: 1240px) {
  .voice-add-form {
    grid-template-columns: 1fr 1fr;
  }

  .voice-add-form-wide {
    grid-column: span 2;
  }
}

@media (max-width: 720px) {
  .voice-library-head,
  .voice-filter-row {
    grid-template-columns: 1fr;
  }

  .voice-library-head {
    display: grid;
  }

  .voice-add-form {
    grid-template-columns: 1fr;
  }

  .voice-add-form-wide {
    grid-column: auto;
  }
}
</style>
