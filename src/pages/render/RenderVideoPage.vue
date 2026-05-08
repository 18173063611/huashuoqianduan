<template>
  <div class="render-video-page app-page-stack">
    <header class="render-head">
      <h1>视频合成</h1>
      <p>
        基于火山方舟 Seedance 系列模型，通过文字或图片生成短视频。后端同步轮询任务，
        生成耗时通常 1~3 分钟，期间请保持页面打开。
      </p>
    </header>

    <section class="app-card render-input">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>选择生成模式</h2>
          <p class="app-muted">
            文生视频仅需文本提示词；图生视频支持首帧、首尾帧、参照图三种子模式。
          </p>
        </div>
      </div>

      <div class="render-tabs render-tabs-main" role="tablist">
        <button
          v-for="tab in mainTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :class="{ active: mainTab === tab.key }"
          :aria-selected="mainTab === tab.key"
          :disabled="busy"
          @click="mainTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="mainTab === 'image'" class="render-tabs render-tabs-sub" role="tablist">
        <button
          v-for="tab in imageSubTabs"
          :key="tab.key"
          type="button"
          role="tab"
          :class="{ active: imageSubTab === tab.key }"
          :aria-selected="imageSubTab === tab.key"
          :disabled="busy"
          @click="imageSubTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="render-form">
        <template v-if="mainTab === 'image' && imageSubTab === 'first'">
          <ImageInput
            label="首帧图片"
            :busy="busy"
            :value="firstFrame"
            @update="firstFrame = $event"
          />
        </template>

        <template v-else-if="mainTab === 'image' && imageSubTab === 'firstLast'">
          <div class="render-grid-two">
            <ImageInput
              label="首帧图片"
              :busy="busy"
              :value="firstFrame"
              @update="firstFrame = $event"
            />
            <ImageInput
              label="尾帧图片"
              :busy="busy"
              :value="lastFrame"
              @update="lastFrame = $event"
            />
          </div>
        </template>

        <template v-else-if="mainTab === 'image' && imageSubTab === 'reference'">
          <div class="render-form-field">
            <div class="render-field-head">
              <label>参照图（1 ~ 9 张，推荐 1 ~ 4 张）</label>
              <button
                type="button"
                class="app-secondary-button render-mini-btn"
                :disabled="busy || referenceImages.length >= MAX_REFERENCE"
                @click="addReferenceSlot"
              >
                + 添加一张
              </button>
            </div>
            <div class="render-ref-list">
              <div
                v-for="(item, idx) in referenceImages"
                :key="`ref-${idx}`"
                class="render-ref-item"
              >
                <div class="render-ref-index">[图{{ idx + 1 }}]</div>
                <ImageInput
                  :busy="busy"
                  :value="item"
                  compact
                  @update="updateReferenceImage(idx, $event)"
                />
                <button
                  type="button"
                  class="render-ref-remove"
                  :disabled="busy || referenceImages.length <= 1"
                  title="移除该参照图"
                  @click="removeReferenceSlot(idx)"
                >
                  ×
                </button>
              </div>
            </div>
            <p class="app-muted render-ref-tip">
              提示词中可使用 [图1]、[图2] 等标记指代具体参照图，模型对指令的遵循会更精准。
            </p>
          </div>
        </template>

        <div class="render-form-field">
          <label>
            提示词
            <span v-if="mainTab === 'text'" class="render-required">*</span>
            <span v-else class="render-optional">（选填）</span>
          </label>
          <textarea
            v-model="prompt"
            :placeholder="promptPlaceholder"
            rows="4"
            :disabled="busy"
            maxlength="500"
          />
          <div class="render-counter">{{ prompt.length }} / 500</div>
        </div>

        <div class="render-form-field render-form-field-inline">
          <label>视频时长（秒）</label>
          <select v-model.number="duration" :disabled="busy">
            <option v-for="d in durationOptions" :key="d.value" :value="d.value">
              {{ d.label }}
            </option>
          </select>
          <span class="app-muted render-duration-hint">{{ durationHint }}</span>
        </div>
      </div>

      <div class="render-actions">
        <button
          class="app-primary-button"
          type="button"
          :disabled="!canSubmit || busy"
          @click="handleGenerate"
        >
          {{ busy ? '生成中…' : '开始生成视频' }}
        </button>
        <button
          v-if="result || errorMessage"
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

    <section class="app-card render-result">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>生成结果</h2>
          <p class="app-muted">
            视频由火山方舟同步生成，请耐心等待 1~3 分钟。生成后可直接预览或下载。
          </p>
        </div>
      </div>

      <div v-if="busy" class="render-status">
        <span class="render-status-dot" />
        正在生成视频，预计 1~3 分钟，期间请勿关闭页面…
      </div>

      <div v-if="!busy && !result" class="app-empty render-empty">
        生成完成后，视频会自动展示在这里。
      </div>

      <div v-if="result" class="render-video">
        <video :src="result.videoUrl" controls preload="metadata" />
        <div class="render-video-meta">
          <div class="render-meta-row">
            <span class="render-meta-key">任务 ID</span>
            <span class="render-meta-value">{{ result.taskId }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">使用模型</span>
            <span class="render-meta-value">{{ result.model }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">消耗 tokens</span>
            <span class="render-meta-value">{{ result.completionTokens }}</span>
          </div>
          <div class="render-meta-row">
            <span class="render-meta-key">完成时间</span>
            <span class="render-meta-value">{{ formatTimestamp(result.updatedAt) }}</span>
          </div>
        </div>
        <div class="render-video-actions">
          <a class="app-primary-button" :href="result.videoUrl" target="_blank" rel="noreferrer" download>
            下载视频
          </a>
          <a class="app-secondary-button" :href="result.videoUrl" target="_blank" rel="noreferrer">
            在新窗口打开
          </a>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ImageInput from './ImageInput.vue'
import {
  generateFirstFrameVideo,
  generateFirstLastFrameVideo,
  generateReferenceVideo,
  generateTextToVideo,
} from '../../services/videoApi'
import type { VideoTaskVO } from '../../types/videoTypes'


type MainTab = 'text' | 'image'
type ImageSubTab = 'first' | 'firstLast' | 'reference'

const MAX_REFERENCE = 9

const mainTabs: Array<{ key: MainTab; label: string }> = [
  { key: 'text', label: '文生视频' },
  { key: 'image', label: '图生视频' },
]

const imageSubTabs: Array<{ key: ImageSubTab; label: string }> = [
  { key: 'first', label: '首帧生成' },
  { key: 'firstLast', label: '首尾帧生成' },
  { key: 'reference', label: '参照图生成' },
]

const mainTab = ref<MainTab>('text')
const imageSubTab = ref<ImageSubTab>('first')

const prompt = ref('')
const duration = ref<number>(5)
const firstFrame = ref('')
const lastFrame = ref('')
const referenceImages = ref<string[]>([''])

const busy = ref(false)
const errorMessage = ref('')
const result = ref<VideoTaskVO | null>(null)

// Seedance 1.5 pro 支持 [4, 12]，参照图（lite i2v）支持 [2, 12]
const durationOptions = computed(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'reference') {
    return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ value: v, label: `${v} 秒` }))
  }
  return [4, 5, 6, 7, 8, 9, 10, 11, 12].map((v) => ({ value: v, label: `${v} 秒` }))
})

const durationHint = computed(() => {
  if (mainTab.value === 'image' && imageSubTab.value === 'reference') {
    return 'lite i2v 模型支持 2 ~ 12 秒'
  }
  return 'Seedance 1.5 pro 支持 4 ~ 12 秒'
})

const promptPlaceholder = computed(() => {
  if (mainTab.value === 'text') {
    return '描述你想要的画面，例如：小猫对着镜头打哈欠，慵懒的午后阳光，景深浅'
  }
  if (imageSubTab.value === 'reference') {
    return '可使用 [图1]xxx，[图2]xxx 形式指代参照图，例如：[图1]戴眼镜穿蓝色T恤的男生在[图2]的篮球场上'
  }
  return '可选，描述视频中的运动 / 风格 / 镜头，例如：360 度环绕运镜，电影感'
})

// 切换模式时重置错误与结果，避免误展示其它模式产物
watch([mainTab, imageSubTab], () => {
  errorMessage.value = ''
  // 调整时长到当前模式允许的最小值（5 秒兼容两种模式）
  const allowed = durationOptions.value.map((o) => o.value)
  if (!allowed.includes(duration.value)) {
    duration.value = allowed[0]
  }
})

const canSubmit = computed(() => {
  if (mainTab.value === 'text') {
    return prompt.value.trim().length > 0
  }
  if (imageSubTab.value === 'first') {
    return firstFrame.value.trim().length > 0
  }
  if (imageSubTab.value === 'firstLast') {
    return firstFrame.value.trim().length > 0 && lastFrame.value.trim().length > 0
  }
  // reference
  return referenceImages.value.some((url) => url.trim().length > 0)
})

function addReferenceSlot() {
  if (referenceImages.value.length >= MAX_REFERENCE) {
    return
  }
  referenceImages.value.push('')
}

function removeReferenceSlot(idx: number) {
  if (referenceImages.value.length <= 1) {
    return
  }
  referenceImages.value.splice(idx, 1)
}

function updateReferenceImage(idx: number, value: string) {
  referenceImages.value[idx] = value
}

function resetResult() {
  result.value = null
  errorMessage.value = ''
}

function formatTimestamp(seconds: number) {
  if (!seconds) {
    return '-'
  }
  const d = new Date(seconds * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

async function handleGenerate() {
  if (!canSubmit.value || busy.value) {
    return
  }

  busy.value = true
  errorMessage.value = ''
  result.value = null

  try {
    let task: VideoTaskVO
    if (mainTab.value === 'text') {
      task = await generateTextToVideo({
        prompt: prompt.value.trim(),
        duration: duration.value,
      })
    } else if (imageSubTab.value === 'first') {
      task = await generateFirstFrameVideo({
        imageUrl: firstFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
      })
    } else if (imageSubTab.value === 'firstLast') {
      task = await generateFirstLastFrameVideo({
        firstFrameUrl: firstFrame.value.trim(),
        lastFrameUrl: lastFrame.value.trim(),
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
      })
    } else {
      const urls = referenceImages.value.map((u) => u.trim()).filter((u) => u.length > 0)
      task = await generateReferenceVideo({
        imageUrls: urls,
        prompt: prompt.value.trim() || undefined,
        duration: duration.value,
      })
    }
    result.value = task
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '视频生成失败'
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.render-video-page {
  display: grid;
  gap: 16px;
}

.render-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 800;
}

.render-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.render-project-hint {
  margin-top: 8px !important;
}

.render-input,
.render-result {
  display: grid;
  gap: 16px;
}

.render-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 8px;
}

.render-tabs button {
  display: inline-flex;
  height: 36px;
  align-items: center;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.render-tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.render-tabs button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.render-tabs-sub button {
  height: 32px;
  padding: 0 12px;
  background: #f7f8fc;
  font-weight: 750;
}

.render-tabs-sub button.active {
  background: #fff;
  border-color: #c8bfff;
}

.render-form {
  display: grid;
  gap: 16px;
}

.render-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

@media (max-width: 720px) {
  .render-grid-two {
    grid-template-columns: 1fr;
  }
}

.render-form-field {
  display: grid;
  gap: 8px;
}

.render-form-field label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 800;
}

.render-required {
  margin-left: 4px;
  color: #e5484d;
}

.render-optional {
  margin-left: 4px;
  color: #98a2b3;
  font-weight: 700;
}

.render-form-field textarea {
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 10px 12px;
  font-family: inherit;
  font-size: 13.5px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.render-form-field textarea:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-counter {
  align-self: flex-end;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.render-form-field-inline {
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 12px;
}

.render-form-field-inline select {
  height: 36px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 700;
  background: #fff;
  color: #232838;
  outline: none;
}

.render-form-field-inline select:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.render-duration-hint {
  font-size: 12.5px;
}

.render-field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.render-mini-btn {
  height: 30px;
  padding: 0 12px;
  font-size: 12.5px;
}

.render-ref-list {
  display: grid;
  gap: 12px;
}

.render-ref-item {
  display: grid;
  grid-template-columns: 60px 1fr 36px;
  gap: 12px;
  align-items: start;
  padding: 12px;
  border: 1px dashed #e3dcff;
  border-radius: 10px;
  background: #fbfaff;
}

.render-ref-index {
  padding-top: 8px;
  color: #5e50df;
  font-weight: 800;
  font-size: 13px;
}

.render-ref-remove {
  height: 36px;
  width: 36px;
  border-radius: 8px;
  border: 1px solid #f4cccc;
  background: #fff5f5;
  color: #e5484d;
  font-size: 18px;
  font-weight: 800;
  cursor: pointer;
}

.render-ref-remove:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.render-ref-tip {
  margin: 4px 0 0;
  font-size: 12.5px;
}

.render-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.render-status {
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

.render-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #8b7cf6;
  animation: render-pulse 1.2s ease-in-out infinite;
}

@keyframes render-pulse {
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

.render-empty {
  margin: 0;
}

.render-video {
  display: grid;
  gap: 16px;
}

.render-video video {
  width: 100%;
  max-height: 480px;
  border-radius: 12px;
  background: #1f2230;
  outline: none;
}

.render-video-meta {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fafbff;
}

.render-meta-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.render-meta-key {
  flex: 0 0 88px;
  color: #98a2b3;
  font-weight: 700;
}

.render-meta-value {
  color: #2d3446;
  font-weight: 700;
  word-break: break-all;
}

.render-video-actions {
  display: flex;
  gap: 12px;
}

.render-video-actions a {
  text-decoration: none;
}
</style>
