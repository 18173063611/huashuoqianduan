<template>
  <div class="benchmark-page">
    <div class="benchmark-layout">
      <aside class="analysis-card">
        <section class="panel-block">
          <h2>1. 输入对标视频链接</h2>
          <div class="parse-row">
            <input v-model.trim="videoUrl" placeholder="https://v.douyin.com/xxxxxx/" />
            <button class="primary-button" type="button" :disabled="parsing || !videoUrl" @click="handleParseVideo">
              {{ parsing ? '解析中' : '解析' }}
            </button>
          </div>
          <p v-if="parseError && parseStage !== 'error'" class="error-text">{{ parseError }}</p>
        </section>

        <section class="panel-block">
          <h3>对标视频信息</h3>
          <article v-if="!douyinParse" class="video-placeholder">
            <p>解析后将展示封面、标题与作者信息。</p>
          </article>
          <article v-else class="video-detail">
            <div class="video-media">
              <img
                v-if="douyinParse.coverUrl"
                :src="douyinParse.coverUrl"
                :alt="douyinParse.title || '封面'"
                class="cover-img"
              />
            </div>
            <div class="video-meta-block">
              <div class="author-line">
                <img
                  v-if="douyinParse.author?.avatarUrl"
                  :src="douyinParse.author.avatarUrl"
                  alt=""
                  class="author-avatar"
                />
                <strong class="video-title">{{ douyinParse.title }}</strong>
              </div>
              <div class="meta-line">
                <span>时长：{{ durationText }}</span>
                <span v-if="douyinParse.author?.nickname">作者：{{ douyinParse.author.nickname }}</span>
              </div>
            </div>
          </article>
        </section>

        <section class="panel-block">
          <h3>爆款分析结果</h3>
          <div class="insight-list">
            <div v-for="item in insightItems" :key="item.label" class="insight-item">
              <span class="insight-icon" aria-hidden="true">{{ item.icon }}</span>
              <strong>{{ item.label }}</strong>
              <p>{{ item.value }}</p>
            </div>
          </div>
        </section>

        <button class="secondary-button refresh-button" type="button" :disabled="parsing" @click="handleParseVideo">
          <span aria-hidden="true">↻</span>
          重新解析
        </button>
      </aside>

      <main class="rewrite-card">
        <h2>2. 文案改写</h2>
        <section class="rewrite-box">
          <p v-if="transcriptLoading" class="transcript-status">正在转写视频文案，请稍候…</p>
          <p v-else-if="parseStage === 'error' && parseError" class="error-text transcript-banner">{{ parseError }}</p>

          <p class="rewrite-flow-hint">
            转写完成后可<strong>二次编辑原文</strong>，按需选择改写风格并填写补充说明；点击 <strong>开始改写</strong>
            返回新文案。
          </p>

          <div class="rewrite-fields">
            <label class="text-area-label">
              原文案 <span>（ASR 转写，可修改）</span>
              <textarea
                v-model="sourceText"
                class="source-text"
                :readonly="transcriptAreaReadonly"
                :placeholder="sourcePlaceholder"
              />
            </label>

            <section class="rewrite-confirm-panel" aria-label="AI 二次改写选项">
              <div class="rewrite-toolbar">
                <div class="tabs">
                  <button
                    type="button"
                    :class="{ active: rewriteTab === 'ai' }"
                    @click="rewriteTab = 'ai'"
                  >
                    <span aria-hidden="true">⌁</span>
                    AI 智能改写
                  </button>
                  <button
                    type="button"
                    :class="{ active: rewriteTab === 'custom' }"
                    @click="rewriteTab = 'custom'"
                  >
                    自定义改写
                  </button>
                </div>
              </div>

              <div v-show="rewriteTab === 'custom'" class="tab-panel custom-rewrite-shell">
                <p class="shell-placeholder">
                  自定义规则、字段与后端契约待定，此处仅预留入口；确认方案后可在此配置话术模板、禁用词等。
                </p>
              </div>

              <div v-show="rewriteTab === 'ai'" class="tab-panel ai-rewrite-shell">
                <div class="style-tools style-tools-row">
                  <label>
                    改写风格 <span class="tag-muted">（可选）</span>
                    <select
                      v-model="rewriteStyle"
                      class="rewrite-style-select"
                      :disabled="transcriptAreaReadonly"
                    >
                      <option value="">不指定</option>
                      <option value="口语化风格">口语化风格</option>
                      <option value="专业讲解风格">专业讲解风格</option>
                    </select>
                  </label>
                </div>

                <div class="extra-notes-block">
                  <button
                    type="button"
                    class="extra-notes-toggle"
                    :aria-expanded="extraNotesExpanded"
                    aria-controls="extra-notes-field"
                    id="extra-notes-toggle"
                    @click="extraNotesExpanded = !extraNotesExpanded"
                  >
                    <span
                      class="extra-notes-chevron"
                      :class="{ 'is-open': extraNotesExpanded }"
                      aria-hidden="true"
                    >›</span>
                    <span class="extra-notes-toggle-title">补充说明</span>
                    <span class="tag-muted">（点击展开）</span>
                  </button>
                  <div
                    v-show="extraNotesExpanded"
                    id="extra-notes-field"
                    class="extra-notes-collapse"
                    role="region"
                    aria-labelledby="extra-notes-toggle"
                  >
                    <textarea
                      v-model="rewriteIntroduce"
                      class="extra-notes-input"
                      rows="2"
                      :disabled="transcriptAreaReadonly"
                      placeholder="请描述你期望的改写效果，例如：偏种草、结尾引导关注等"
                    />
                  </div>
                </div>

                <p v-if="rewriteError" class="rewrite-error" role="alert">{{ rewriteError }}</p>

                <div class="confirm-actions">
                  <button
                    class="primary-button confirm-rewrite-btn"
                    type="button"
                    :disabled="rewriteLoading || transcriptAreaReadonly || !sourceText.trim()"
                    @click="handleDouyinRewrite"
                  >
                    {{ rewriteLoading ? '改写中…' : '开始改写' }}
                  </button>
                </div>
              </div>
            </section>

            <label class="text-area-label">
              改写后文案
              <textarea
                v-model="rewrittenText"
                class="result-text"
                :readonly="transcriptAreaReadonly"
                :placeholder="rewritePlaceholder"
              />
              <small>字数：{{ rewrittenLength }}</small>
            </label>
          </div>

          <div class="rewrite-actions">
            <button class="secondary-button" type="button" @click="copyRewrittenText">
              <span aria-hidden="true">▣</span>
              复制文案
            </button>
            <button class="primary-button continue-button" type="button" @click="applyScript">
              应用文案并继续
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </section>
      </main>
    </div>

    <footer class="bottom-action">
      <button class="primary-button continue-button" type="button" @click="applyScript">
        应用文案并继续
        <span aria-hidden="true">›</span>
      </button>
      <p>{{ applyMessage || '完成当前步骤后将自动进入下一步：音频生成' }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { rewriteDouyinCopywriting, startDouyinParseWithTranscript } from '../../services/writerDouyinApi'
import type { DouyinParseStage, DouyinVideoParseResponse } from '../../types/writerDouyinTypes'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'

const emit = defineEmits<{
  continue: []
}>()

const videoUrl = ref('')
const douyinParse = ref<DouyinVideoParseResponse | null>(null)
const parseStage = ref<DouyinParseStage | ''>('')
const parsing = ref(false)
const parseError = ref('')
const rewriteStyle = ref('')
const rewriteTab = ref<'ai' | 'custom'>('ai')
const rewriteIntroduce = ref('')
const extraNotesExpanded = ref(false)
const rewriteLoading = ref(false)
const rewriteError = ref('')
const sourceText = ref('')
const rewrittenText = ref('')
const applyMessage = ref('')
const parseAbort = ref<AbortController | null>(null)

const transcriptLoading = computed(
  () => parsing.value && (parseStage.value === 'parsed' || parseStage.value === 'transcribing'),
)

const transcriptAreaReadonly = computed(() => transcriptLoading.value)

const sourcePlaceholder = computed(() => {
  if (parseStage.value === 'error') {
    return '转写失败，请重试或更换链接'
  }
  if (transcriptLoading.value) {
    return '转写中…'
  }
  return '解析完成后展示 ASR 原文'
})

const rewritePlaceholder = computed(() => {
  if (parseStage.value === 'error') {
    return '转写失败'
  }
  if (transcriptLoading.value) {
    return '转写中…'
  }
  return '编辑原文后点击「开始改写」，展示返回的改写结果'
})

const durationText = computed(() => {
  const seconds = douyinParse.value?.durationSeconds ?? 0
  const minute = Math.floor(seconds / 60)
  const remain = String(seconds % 60).padStart(2, '0')
  return `${minute}:${remain}`
})

const rewrittenLength = computed(() => rewrittenText.value.replace(/\s/g, '').length)

const insightItems = computed(() => {
  const p = douyinParse.value
  let status = '提交抖音分享链接后开始解析'
  if (parseStage.value === 'completed') {
    status = '已完成转写，右侧已填入原文；改写稿请点击「开始改写」拉取'
  } else if (parseStage.value === 'parsed' || parseStage.value === 'transcribing') {
    status = '正在转写口播文案…'
  } else if (parseStage.value === 'error') {
    status = parseError.value || '转写失败'
  }

  const rows: { icon: string; label: string; value: string }[] = []
  if (p) {
    rows.push({ icon: '◉', label: '标题', value: p.title || '—' })
    rows.push({ icon: '◎', label: '作者', value: p.author?.nickname || '—' })
    rows.push({ icon: '◌', label: '时长', value: durationText.value })
    rows.push({ icon: '□', label: '视频 ID', value: p.videoId || '—' })
  }
  rows.push({ icon: '▣', label: '转写进度', value: status })
  rows.push({
    icon: '⌂',
    label: '说明',
    value: '解析成功后展示封面与元信息；文案随 SSE completed 事件刷新。',
  })
  return rows
})

async function handleParseVideo() {
  const url = videoUrl.value.trim()
  if (!url || parsing.value) {
    return
  }

  parseAbort.value?.abort()
  parseAbort.value = new AbortController()

  douyinParse.value = null
  sourceText.value = ''
  rewrittenText.value = ''
  rewriteIntroduce.value = ''
  extraNotesExpanded.value = false
  rewriteError.value = ''
  rewriteLoading.value = false
  parseError.value = ''
  parseStage.value = ''
  applyMessage.value = ''
  parsing.value = true

  try {
    await startDouyinParseWithTranscript({
      url,
      signal: parseAbort.value.signal,
      onParsed(payload) {
        parseStage.value = 'parsed'
        if (payload.data?.taskId) {
          rememberSessionTaskId(payload.data.taskId)
        }
        if (payload.data?.parseResult) {
          douyinParse.value = payload.data.parseResult
        }
      },
      onTranscribing() {
        parseStage.value = 'transcribing'
      },
      onCompleted(payload) {
        parseStage.value = 'completed'
        if (payload.data?.taskId) {
          rememberSessionTaskId(payload.data.taskId)
        }
        const transcript = payload.data?.transcriptResult
        if (transcript) {
          sourceText.value = transcript.originalText || ''
          rewrittenText.value = ''
        }
        if (payload.data?.parseResult) {
          douyinParse.value = payload.data.parseResult
        }
      },
      onErrorEvent(payload) {
        parseStage.value = 'error'
        if (payload.data?.taskId) {
          rememberSessionTaskId(payload.data.taskId)
        }
        parseError.value = `${payload.message || '解析或转写失败'}${payload.traceId ? `（traceId：${payload.traceId}）` : ''}`
        if (payload.data?.parseResult) {
          douyinParse.value = payload.data.parseResult
        }
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    if (!parseStage.value) {
      parseStage.value = 'error'
    }
    parseError.value = error instanceof Error ? error.message : '请求失败'
  } finally {
    parsing.value = false
  }
}

async function handleDouyinRewrite() {
  const originalText = sourceText.value.trim()
  if (!originalText) {
    rewriteError.value = '原文不能为空'
    return
  }
  if (transcriptAreaReadonly.value) {
    return
  }

  rewriteLoading.value = true
  rewriteError.value = ''
  rewrittenText.value = ''

  try {
    const data = await rewriteDouyinCopywriting({
      originalText,
      style: rewriteStyle.value.trim() || undefined,
      introduce: rewriteIntroduce.value.trim() || undefined,
    })
    rewrittenText.value = data.translatedText ?? ''
  } catch (e) {
    rewriteError.value = e instanceof Error ? e.message : '请求失败'
  } finally {
    rewriteLoading.value = false
  }
}

async function copyRewrittenText() {
  if (!rewrittenText.value) {
    return
  }
  await navigator.clipboard?.writeText(rewrittenText.value)
  applyMessage.value = '文案已复制'
}

function applyScript() {
  applyMessage.value = '文案已应用，下一步可进入音频生成'
  emit('continue')
}
</script>

<style scoped>
.benchmark-page {
  width: min(var(--app-content-width), calc(100% - 76px));
  margin: 24px auto 30px;
}

.benchmark-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;
}

.benchmark-head h1 {
  margin: 0 0 10px;
  color: #151a2d;
  font-size: 24px;
  font-weight: 850;
  letter-spacing: 0;
}

.benchmark-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.6;
}

.secondary-button,
.primary-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  padding: 0 17px;
  font-weight: 800;
}

.secondary-button {
  border: 1px solid #e5e7f0;
  background: #fff;
  color: #394053;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.secondary-button:hover:not(:disabled) {
  border-color: #c9c2ff;
  color: #5148e5;
}

.primary-button {
  border: 0;
  background: #563bf0;
  box-shadow: 0 10px 18px rgba(86, 59, 240, 0.24);
  color: #fff;
}

.primary-button:hover:not(:disabled) {
  background: #4630d1;
  transform: translateY(-1px);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tips-bar {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 8px;
  border: 1px solid #e3dcff;
  border-radius: 8px;
  background: rgba(247, 245, 255, 0.78);
  color: #657084;
  margin-bottom: 24px;
  padding: 0 16px;
  font-weight: 700;
}

.tips-bar span {
  color: #8b7cf6;
  font-size: 18px;
}

.tips-bar strong {
  color: #5c6477;
}

.benchmark-layout {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 34px;
  align-items: stretch;
}

.analysis-card,
.rewrite-card {
  border: 1px solid #e8ebf3;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  min-height: 0;
}

.analysis-card {
  display: flex;
  flex-direction: column;
  padding: 20px 18px 28px;
}

.rewrite-card {
  display: flex;
  flex-direction: column;
  padding: 20px 20px 28px;
}

.panel-block + .panel-block {
  border-top: 1px solid #edf0f6;
  margin-top: 16px;
  padding-top: 18px;
}

.panel-block h2,
.rewrite-card h2 {
  flex-shrink: 0;
  margin: 0 0 20px;
  color: #1f2437;
  font-size: 18px;
  font-weight: 850;
}

.panel-block h3 {
  margin: 0 0 12px;
  color: #2a3042;
  font-size: 14px;
  font-weight: 850;
}

.parse-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px;
  gap: 10px;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select,
.text-area-label textarea {
  width: 100%;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  outline: none;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select {
  height: 42px;
  padding: 0 12px;
}

.parse-row input::placeholder {
  color: #99a3b5;
}

.parse-row input:focus,
.rewrite-toolbar select:focus,
.rewrite-style-select:focus,
.text-area-label textarea:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.error-text {
  margin: 10px 0 0;
  color: #d64c4c;
  font-size: 13px;
}

.transcript-status {
  flex-shrink: 0;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e3dcff;
  background: rgba(247, 245, 255, 0.78);
  color: #5c6477;
  font-size: 13px;
  font-weight: 750;
}

.transcript-banner {
  flex-shrink: 0;
  margin: 0 0 14px;
}

.video-placeholder {
  margin: 0;
  border: 1px dashed #e1e6ef;
  border-radius: 8px;
  padding: 18px 14px;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.6;
}

.video-placeholder p {
  margin: 0;
}

.video-detail {
  display: grid;
  gap: 14px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  padding: 12px;
}

.video-media {
  display: grid;
  gap: 10px;
}

.cover-img {
  width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #edf0f6;
}

.video-meta-block {
  min-width: 0;
}

.author-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #edf0f6;
}

.video-title {
  margin: 0;
  color: #2d3446;
  font-size: 15px;
  line-height: 1.45;
  font-weight: 800;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #7b8495;
  font-size: 13px;
  line-height: 1.7;
}

.video-meta-block > .meta-line {
  margin-top: 10px;
}

.insight-list {
  display: grid;
  gap: 12px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  padding: 14px 12px;
}

.insight-item {
  display: grid;
  grid-template-columns: 24px 82px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 28px;
}

.insight-icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: #7567f6;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.insight-item strong {
  color: #566074;
  font-size: 13px;
}

.insight-item p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.refresh-button {
  min-width: 122px;
  margin-top: auto;
  margin-right: auto;
  margin-bottom: 0;
  margin-left: auto;
  padding-top: 18px;
}

.rewrite-box {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #e8ebf3;
  border-radius: 8px;
  padding: 10px 12px 18px;
}

.rewrite-flow-hint {
  flex-shrink: 0;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed #d8d2ff;
  background: rgba(250, 249, 255, 0.65);
  color: #5c6477;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.rewrite-flow-hint strong {
  color: #4630c9;
  font-weight: 850;
}

.rewrite-api-tag {
  margin: 0 2px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(86, 59, 240, 0.08);
  color: #5148e5;
  font-size: 12px;
  font-weight: 800;
}

.rewrite-confirm-panel {
  flex-shrink: 0;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fcfcff;
  padding: 12px 12px 14px;
}

.rewrite-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 0;
}

.rewrite-fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.rewrite-fields .text-area-label {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.rewrite-fields .text-area-label textarea {
  flex: 1;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 7px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 18px;
  font-weight: 800;
}

.tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.tab-panel {
  margin-top: 12px;
}

.custom-rewrite-shell {
  border-radius: 8px;
  border: 1px dashed #e1e6ef;
  background: #fff;
  padding: 14px 12px;
}

.shell-placeholder {
  margin: 0;
  color: #8b94a8;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.ai-rewrite-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.style-tools {
  display: flex;
  align-items: center;
  gap: 14px;
}

.style-tools-row {
  flex-wrap: wrap;
}

.style-tools-row label {
  flex-wrap: wrap;
  white-space: normal;
}

.style-tools label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #4c566a;
  font-weight: 750;
  white-space: nowrap;
}

.rewrite-toolbar select,
.rewrite-style-select {
  min-width: 146px;
}

/* 避免继承 label 上的高字重；与 body 使用同一套无衬线，与输入框视觉一致 */
.rewrite-style-select {
  box-sizing: border-box;
  max-width: 100%;
  padding-right: 32px;
  border: 1px solid #e3e7ef;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1.4 0 6 4.6 10.6 0 12 1.4l-6 6-6-6Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-color: #fff;
}

.rewrite-style-select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tag-muted {
  color: #98a2b3;
  font-weight: 700;
}

.rewrite-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #f5c4c4;
  background: #fff8f8;
  color: #c24141;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

.extra-notes-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.extra-notes-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px dashed #e1e6ef;
  border-radius: 8px;
  background: #fff;
  color: #374055;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  outline: none;
}

.extra-notes-toggle:hover {
  border-color: #c9c2ff;
  background: rgba(250, 249, 255, 0.85);
}

.extra-notes-toggle:focus-visible {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.extra-notes-toggle-title {
  flex-shrink: 0;
}

.extra-notes-chevron {
  display: inline-flex;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 900;
  color: #8b7cf6;
  line-height: 1;
  transform: rotate(0deg);
  transition: transform 0.18s ease;
}

.extra-notes-chevron.is-open {
  transform: rotate(90deg);
}

.extra-notes-collapse {
  margin-top: 8px;
}

.extra-notes-input {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #4e596d;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.extra-notes-input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
  outline: none;
}

.extra-notes-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.confirm-rewrite-btn {
  min-width: 96px;
}

.text-area-label {
  position: relative;
  display: block;
  color: #374055;
  font-weight: 850;
}

.text-area-label + .text-area-label {
  margin-top: 18px;
}

.rewrite-fields .text-area-label + .text-area-label {
  margin-top: 0;
}

.text-area-label span {
  color: #7b8496;
  font-weight: 700;
}

.text-area-label textarea {
  display: block;
  margin-top: 10px;
  padding: 13px 14px;
  color: #4e596d;
  line-height: 1.8;
  resize: vertical;
}

.source-text {
  min-height: 164px;
  background: #f8f9fc !important;
}

.result-text {
  min-height: 230px;
}

.text-area-label small {
  position: absolute;
  right: 14px;
  bottom: 10px;
  color: #7d8797;
  font-size: 12px;
  font-weight: 800;
}

.rewrite-actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}

.continue-button {
  min-width: 160px;
}

.bottom-action {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-top: 32px;
}

.bottom-action p {
  margin: 0;
  color: #98a2b3;
  font-weight: 700;
}

@media (max-width: 1024px) {
  .benchmark-page {
    width: calc(100% - 48px);
  }

  .benchmark-layout {
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 18px;
  }

  .rewrite-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 900px) {
  .benchmark-page {
    width: calc(100% - 32px);
  }

  .benchmark-head,
  .style-tools,
  .confirm-actions,
  .rewrite-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .benchmark-layout {
    grid-template-columns: 1fr;
  }

  .tabs,
  .style-tools label {
    width: 100%;
  }

  .tabs button,
  .style-tools select,
  .rewrite-style-select,
  .style-tools .secondary-button,
  .confirm-actions .primary-button,
  .rewrite-actions button {
    width: 100%;
  }
}
</style>
