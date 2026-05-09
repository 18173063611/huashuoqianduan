<template>
  <div class="storyboard-page app-page-stack">
    <section class="app-card storyboard-input">
        <div class="app-section-title">
          <span>1</span>
          <div>
            <h2>选择视频来源</h2>
            <p class="app-muted">
              支持两种方式：直接粘贴公网视频链接 / 选择本地文件先上传再解析。建议视频不超过 50MB，否则模型可能解析失败。
            </p>
          </div>
        </div>

        <div class="storyboard-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            :class="{ active: sourceMode === 'url' }"
            :aria-selected="sourceMode === 'url'"
            @click="sourceMode = 'url'"
          >
            视频链接
          </button>
          <button
            type="button"
            role="tab"
            :class="{ active: sourceMode === 'file' }"
            :aria-selected="sourceMode === 'file'"
            @click="sourceMode = 'file'"
          >
            上传本地文件
          </button>
        </div>

        <div v-if="sourceMode === 'url'" class="storyboard-source storyboard-source-url">
          <input
            v-model.trim="videoUrl"
            type="url"
            placeholder="https://example.com/your-video.mp4"
            :disabled="busy"
          />
        </div>

        <div v-else class="storyboard-source storyboard-source-file">
          <label class="storyboard-file-picker" :class="{ 'is-disabled': busy }">
            <input type="file" accept="video/*" :disabled="busy" @change="handleFileChange" />
            <span class="storyboard-file-cta">选择视频文件</span>
            <span class="storyboard-file-meta">
              {{ selectedFile ? `${selectedFile.name}（${formatFileSize(selectedFile.size)}）` : '尚未选择文件' }}
            </span>
          </label>
        </div>

        <div class="storyboard-actions">
          <button
            class="app-primary-button"
            type="button"
            :disabled="!canSubmit || busy"
            @click="handleAnalyze"
          >
            {{ busyLabel }}
          </button>
          <button
            v-if="shots.length || errorMessage"
            class="app-secondary-button"
            type="button"
            :disabled="busy"
            @click="resetResult"
          >
            重新开始
          </button>
        </div>

        <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
      </section>

      <section class="app-card storyboard-result">
        <div class="app-section-title">
          <span>2</span>
          <div>
            <h2>分镜解析结果</h2>
            <p class="app-muted">按时间顺序列出每个分镜的画面、台词与拍摄技巧，可直接复制台词进入下一步音频生成。</p>
          </div>
        </div>

        <div v-if="busy && stage" class="storyboard-status">
          <span class="storyboard-status-dot" />
          {{ stage }}
        </div>

        <div v-if="!shots.length && !busy" class="storyboard-empty">
          <div class="storyboard-empty-panel">
            <span class="storyboard-empty-icon">▤</span>
            <strong>等待解析结果</strong>
            <p>解析后将在这里呈现镜头画面、台词与拍摄技巧。</p>
            <div class="storyboard-empty-lines" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>

        <div v-else-if="shots.length" class="storyboard-table-wrap">
          <table class="storyboard-table">
            <thead>
              <tr>
                <th class="col-order">场景序号</th>
                <th class="col-example">示例</th>
                <th class="col-summary">场景概述</th>
                <th class="col-dialogue">
                  <div class="storyboard-th-with-help">
                    <span>台词</span>
                    <span class="storyboard-help" title="模型推断的口播 / 旁白 / 字幕，可直接复制">?</span>
                  </div>
                </th>
                <th class="col-tips">拍摄技巧</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shot in shots" :key="shot.order">
                <td class="col-order">场景{{ orderLabel(shot.order) }}</td>
                <td class="col-example">
                  <div class="storyboard-thumb">
                    <video
                      v-if="analyzedVideoUrl"
                      :src="thumbVideoSrc(shot)"
                      preload="metadata"
                      muted
                      playsinline
                    />
                    <span v-else class="storyboard-thumb-placeholder" aria-hidden="true">▶</span>
                    <span class="storyboard-thumb-time">{{ formatTime(shot.time) }}</span>
                  </div>
                </td>
                <td class="col-summary">
                  <textarea
                    v-model="shot.page"
                    class="storyboard-edit storyboard-edit-summary"
                    rows="3"
                    placeholder="场景概述"
                  />
                  <p v-if="shot.backgroundMusic && shot.backgroundMusic !== '无'" class="storyboard-bgm">
                    <span aria-hidden="true">♪</span>
                    {{ shot.backgroundMusic }}
                  </p>
                </td>
                <td class="col-dialogue">
                  <textarea
                    v-model="shot.content"
                    class="storyboard-edit storyboard-edit-dialogue"
                    :class="{ 'is-empty': !hasContent(shot) }"
                    rows="4"
                    :placeholder="hasContent(shot) ? '台词' : '当前场景暂无台词'"
                  />
                </td>
                <td class="col-tips">
                  <textarea
                    v-model="shot.highlight"
                    class="storyboard-edit storyboard-edit-tips"
                    rows="3"
                    placeholder="拍摄技巧"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { uploadFile } from '../../services/uploadApi'
import { analyzeVideoScript } from '../../services/videoApi'
import type { VideoScriptShotItem } from '../../types/videoTypes'

type SourceMode = 'url' | 'file'

const sourceMode = ref<SourceMode>('url')
const videoUrl = ref('')
const selectedFile = ref<File | null>(null)
const uploadedPreviewUrl = ref('')
const analyzedVideoUrl = ref('')

const shots = ref<VideoScriptShotItem[]>([])
const errorMessage = ref('')
const stage = ref('')
const busy = ref(false)

const busyLabel = computed(() => {
  if (!busy.value) {
    return '开始解析'
  }
  return stage.value || '处理中…'
})

const canSubmit = computed(() => {
  if (sourceMode.value === 'url') {
    return Boolean(videoUrl.value)
  }
  return Boolean(selectedFile.value)
})

const ORDER_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

function orderLabel(order: number) {
  if (order >= 1 && order <= ORDER_CN.length) {
    return ORDER_CN[order - 1]
  }
  return String(order)
}

function hasContent(shot: VideoScriptShotItem) {
  const text = (shot.content || '').trim()
  return text.length > 0 && text !== '无'
}

function formatTime(time: string) {
  if (!time) {
    return ''
  }
  // 后端返回类似 "00:00:03-00:00:08"，截掉小时段后更紧凑
  const [start] = time.split('-')
  const parts = start.split(':')
  if (parts.length === 3 && parts[0] === '00') {
    return `${parts[1]}:${parts[2]}`
  }
  return start
}

function thumbVideoSrc(shot: VideoScriptShotItem) {
  if (!analyzedVideoUrl.value) {
    return ''
  }
  const seconds = parseStartSeconds(shot.time)
  // 用媒体片段语法定位到分镜起始秒，浏览器会取该帧作为预览
  return seconds > 0 ? `${analyzedVideoUrl.value}#t=${seconds}` : analyzedVideoUrl.value
}

function parseStartSeconds(time: string) {
  if (!time) {
    return 0
  }
  const [start] = time.split('-')
  const parts = start.split(':').map((part) => Number(part) || 0)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return parts[0] || 0
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  selectedFile.value = input.files?.[0] ?? null
  uploadedPreviewUrl.value = ''
  errorMessage.value = ''
}

function resetResult() {
  shots.value = []
  errorMessage.value = ''
  stage.value = ''
  analyzedVideoUrl.value = ''
}

async function handleAnalyze() {
  if (!canSubmit.value || busy.value) {
    return
  }

  busy.value = true
  errorMessage.value = ''
  shots.value = []
  analyzedVideoUrl.value = ''

  try {
    let targetUrl = ''
    if (sourceMode.value === 'url') {
      targetUrl = videoUrl.value
    } else if (selectedFile.value) {
      // 已经上传过同一个文件就直接复用 previewUrl，避免重复占用对象存储空间
      if (!uploadedPreviewUrl.value) {
        stage.value = '上传视频中…'
        const uploaded = await uploadFile(selectedFile.value)
        // 上传接口只返回对象存储里的相对路径，需要拼接桶域名才是公网可访问地址
        uploadedPreviewUrl.value = `${uploaded.previewUrl}`
      }
      targetUrl = uploadedPreviewUrl.value
    }

    if (!targetUrl) {
      throw new Error('请提供视频链接或选择本地文件')
    }

    stage.value = '解析分镜中…'
    const list = await analyzeVideoScript(targetUrl)
    shots.value = [...list].sort((a, b) => a.order - b.order)
    analyzedVideoUrl.value = targetUrl
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '解析失败'
  } finally {
    busy.value = false
    stage.value = ''
  }
}
</script>

<style scoped>
.storyboard-page {
  display: grid;
  grid-template-columns: minmax(360px, 420px) minmax(620px, 1fr);
  align-items: start;
  gap: 24px;
}

.storyboard-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 800;
}

.storyboard-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.storyboard-input,
.storyboard-result {
  display: grid;
  gap: 16px;
}

.storyboard-input {
  position: sticky;
  top: 92px;
}

.storyboard-result {
  min-height: 520px;
}

.storyboard-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.storyboard-tabs button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.storyboard-tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.storyboard-source {
  display: grid;
  gap: 8px;
}

.storyboard-source-url input {
  width: 100%;
  height: 46px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 12px;
  outline: none;
}

.storyboard-source-url input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.storyboard-file-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border: 1px dashed #d8d2ff;
  border-radius: 8px;
  background: #fbfaff;
  cursor: pointer;
  width: 100%;
}

.storyboard-file-picker.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.storyboard-file-picker input[type='file'] {
  display: none;
}

.storyboard-file-cta {
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  background: #563bf0;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
}

.storyboard-file-meta {
  min-width: 0;
  color: #5c6477;
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.storyboard-hint {
  margin: 0;
  color: #98a2b3;
  font-size: 12.5px;
  line-height: 1.6;
}

.storyboard-hint a {
  color: #563bf0;
  font-weight: 800;
  word-break: break-all;
}

.storyboard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.storyboard-actions .app-primary-button,
.storyboard-actions .app-secondary-button {
  min-width: 128px;
}

.storyboard-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  border: 1px solid #e3dcff;
  background: rgba(247, 245, 255, 0.8);
  color: #5e50df;
  font-size: 13px;
  font-weight: 750;
}

.storyboard-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #8b7cf6;
  animation: storyboard-pulse 1.2s ease-in-out infinite;
}

@keyframes storyboard-pulse {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
}

.storyboard-empty {
  display: grid;
  min-height: 330px;
  place-items: center;
  border: 1px dashed #d8dce8;
  border-radius: 12px;
  background: #fbfcff;
  color: #667085;
}

.storyboard-empty-panel {
  display: grid;
  width: min(420px, 100%);
  justify-items: center;
  gap: 10px;
  text-align: center;
}

.storyboard-empty-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 999px;
  background: #f1efff;
  color: #5e50df;
  font-size: 20px;
  font-weight: 850;
}

.storyboard-empty-panel strong {
  color: #2d3446;
  font-size: 15px;
}

.storyboard-empty-panel p {
  margin: 0;
  font-size: 13px;
}

.storyboard-empty-lines {
  display: grid;
  width: 100%;
  gap: 8px;
  margin-top: 8px;
}

.storyboard-empty-lines span {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: #eef1f7;
}

.storyboard-empty-lines span:nth-child(2) {
  width: 76%;
  justify-self: center;
}

.storyboard-empty-lines span:nth-child(3) {
  width: 58%;
  justify-self: center;
}

.storyboard-table-wrap {
  overflow-x: auto;
  border: 1px solid #edf0f6;
  border-radius: 12px;
  background: #fff;
}

.storyboard-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13.5px;
  color: #2d3446;
}

.storyboard-table thead th {
  padding: 14px 16px;
  background: #f5f6fa;
  color: #5c6477;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  border-bottom: 1px solid #edf0f6;
}

.storyboard-table tbody td {
  padding: 18px 16px;
  border-bottom: 1px solid #edf0f6;
  vertical-align: top;
  line-height: 1.7;
}

.storyboard-table tbody tr:last-child td {
  border-bottom: 0;
}

.col-order {
  width: 110px;
  color: #2d3446;
  font-weight: 800;
}

.col-example {
  width: 168px;
}

.col-summary {
  width: 220px;
}

.col-dialogue {
  width: 260px;
}

.col-tips {
  width: auto;
}

.storyboard-th-with-help {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.storyboard-help {
  display: inline-grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 999px;
  background: #e7eaf2;
  color: #98a2b3;
  font-size: 11px;
  font-weight: 800;
  cursor: help;
}

.storyboard-thumb {
  position: relative;
  width: 132px;
  height: 96px;
  border-radius: 10px;
  background: #1f2230;
  overflow: hidden;
}

.storyboard-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.storyboard-thumb-placeholder {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 28px;
}

.storyboard-thumb-time {
  position: absolute;
  left: 8px;
  bottom: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.storyboard-edit {
  width: 100%;
  margin: 0;
  padding: 8px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #2d3446;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.storyboard-edit:hover {
  border-color: #e3e7ef;
  background: #fafbff;
}

.storyboard-edit:focus {
  border-color: #8f81ff;
  background: #fff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.storyboard-edit-summary {
  color: #2d3446;
  font-weight: 700;
}

.storyboard-edit-dialogue {
  color: #394053;
}

.storyboard-edit-dialogue.is-empty {
  color: #b6bdcc;
  font-style: italic;
}

.storyboard-edit-tips {
  color: #4c566a;
}

.storyboard-bgm {
  margin: 8px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #f1efff;
  color: #5e50df;
  font-size: 12px;
  font-weight: 750;
}

@media (max-width: 900px) {
  .storyboard-page {
    grid-template-columns: 1fr;
  }

  .storyboard-input {
    position: static;
  }

  .storyboard-table {
    table-layout: auto;
  }

  .col-order,
  .col-example,
  .col-summary,
  .col-dialogue,
  .col-tips {
    width: auto;
  }

  .storyboard-thumb {
    width: 110px;
    height: 80px;
  }
}
</style>
