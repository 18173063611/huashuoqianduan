<template>
  <div class="script-workspace">
    <header class="tool-page-hero">
      <h1>爆款对标</h1>
      <p>解析对标视频，沉淀可复用口播脚本和爆款分析。</p>
    </header>

    <section class="app-card script-panel script-panel-side">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>输入对标视频链接</h2>
          <p class="app-muted">解析对标视频，生成可复用的销售口播文案和爆款分析。</p>
        </div>
      </div>

      <div class="script-input-row">
        <input v-model.trim="videoUrl" placeholder="https://www.douyin.com/video/..." />
        <button class="app-primary-button" type="button" :disabled="parsing || !videoUrl" @click="handleParseDouyin">
          {{ parsing ? '解析中...' : '解析' }}
        </button>
      </div>

      <article v-if="parseResult" class="script-video-card">
        <img v-if="parseResult.videoInfo.coverUrl" class="script-video-cover" :src="parseResult.videoInfo.coverUrl" alt="对标视频封面" />
        <div v-else class="script-video-cover script-video-cover-placeholder">AI</div>
        <div>
          <strong>{{ parseResult.videoInfo.title || '对标视频信息' }}</strong>
          <p>{{ parseResult.videoInfo.authorName || '对标账号' }}</p>
          <small>
            时长 {{ parseResult.videoInfo.durationText || '--' }}
            · 点赞 {{ parseResult.videoInfo.likeCountText || '--' }}
            · 评论 {{ parseResult.videoInfo.commentCountText || '--' }}
          </small>
        </div>
      </article>

      <div v-if="parseResult" class="script-analysis-list">
        <h3>爆款分析结果</h3>
        <div v-for="item in analysisItems" :key="item.label" class="script-analysis-item">
          <span>{{ item.index }}</span>
          <p><strong>{{ item.label }}</strong>{{ item.value }}</p>
        </div>
      </div>

      <p v-if="parseError" class="app-error">{{ parseError }}</p>
    </section>

    <section class="app-card script-panel script-panel-main">
      <div class="app-section-title">
        <span>2</span>
        <div>
          <h2>文案改写</h2>
          <p class="app-muted">确认或微调 AI 改写文案后，沉淀为后续声音、数字人和视频生成的脚本资产。</p>
        </div>
      </div>

      <div class="script-tabs">
        <button class="active" type="button">AI 智能改写</button>
        <button type="button">自定义文案</button>
        <span v-if="parseResult" class="script-style-pill">{{ parseResult.rewriteStyle }} · {{ parseResult.wordCount }} 字</span>
      </div>

      <form class="script-form" @submit.prevent="handleApplyScript">
        <label>
          原文案
          <textarea v-model.trim="sourceScript" readonly placeholder="解析后这里展示原文案脚本" />
        </label>

        <label>
          改写后文案
          <textarea v-model.trim="finalScript" required placeholder="解析后这里展示大模型改写后的文案，也可以手动调整" />
        </label>

        <div class="script-actions">
          <button
            v-if="currentScript?.scriptId"
            class="app-secondary-button"
            type="button"
            :disabled="saving || !finalScript"
            @click="handleUpdateScript"
          >
            {{ saving ? '保存中...' : '保存文案' }}
          </button>
          <button class="app-secondary-button" type="button" :disabled="!parseResult" @click="resetParsedContent">重新解析</button>
          <button class="app-primary-button" type="submit" :disabled="saving || !sourceScript || !finalScript">
            {{ saving ? '应用中...' : '应用文案并继续' }}
          </button>
        </div>
      </form>

      <div v-if="currentScript" class="script-current-card">
        <div>
          <strong>已应用文案 V{{ currentScript.versionNo }}</strong>
          <p>当前阶段：{{ currentScript.currentStep }} · 下一步：{{ currentScript.nextStep }}</p>
        </div>
        <button class="app-secondary-button" type="button" @click="restoreCurrentScript">回显已应用文案</button>
      </div>

      <p v-if="scriptError" class="app-error">{{ scriptError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { applyWriterScript, parseDouyinVideo, updateWriterScript } from '../../services/writerApi'
import type { DouyinParseResponse, WriterScriptItem } from '../../types/writerTypes'

const emit = defineEmits<{
  continue: []
}>()

const videoUrl = ref('')
const sourceScript = ref('')
const finalScript = ref('')
const parseResult = ref<DouyinParseResponse>()
const currentScript = ref<WriterScriptItem | null>(null)
const parsing = ref(false)
const saving = ref(false)
const parseError = ref('')
const scriptError = ref('')

const analysisItems = computed(() => {
  if (!parseResult.value) {
    return []
  }
  const analysis = parseResult.value.analysis
  return [
    { index: '1', label: '内容主题', value: analysis.theme },
    { index: '2', label: '目标受众', value: analysis.targetAudience },
    { index: '3', label: '核心卖点', value: analysis.coreSellingPoint },
    { index: '4', label: '脚本结构', value: analysis.scriptStructure },
    { index: '5', label: '标题特征', value: analysis.titleFeature },
    { index: '6', label: '爆款原因', value: analysis.hotReason },
  ].filter((item) => item.value)
})

onMounted(async () => {
  parseResult.value = undefined
  sourceScript.value = ''
  finalScript.value = ''
  currentScript.value = null
  parseError.value = ''
  scriptError.value = ''
})

async function handleParseDouyin() {
  if (!videoUrl.value) {
    return
  }
  parsing.value = true
  parseError.value = ''
  scriptError.value = ''
  try {
    const result = await parseDouyinVideo({
      videoUrl: videoUrl.value,
    })
    parseResult.value = result
    sourceScript.value = result.sourceScript
    finalScript.value = result.rewrittenScript
    if (!result.rewrittenScript) {
      scriptError.value = '暂未生成改写文案，请重新解析'
    }
  } catch (error) {
    parseError.value = error instanceof Error ? error.message : '解析失败'
  } finally {
    parsing.value = false
  }
}

async function handleApplyScript() {
  if (!sourceScript.value || !finalScript.value) {
    return
  }
  saving.value = true
  scriptError.value = ''
  try {
    currentScript.value = await applyWriterScript({
      parseId: parseResult.value?.parseId,
      sourceScript: sourceScript.value,
      finalScript: finalScript.value,
      rewriteStyle: parseResult.value?.rewriteStyle,
    })
    emit('continue')
  } catch (error) {
    scriptError.value = error instanceof Error ? error.message : '应用文案失败'
  } finally {
    saving.value = false
  }
}

async function handleUpdateScript() {
  if (!currentScript.value?.scriptId || !finalScript.value) {
    return
  }
  saving.value = true
  scriptError.value = ''
  try {
    currentScript.value = await updateWriterScript(currentScript.value.scriptId, {
      finalScript: finalScript.value,
    })
    restoreCurrentScript()
  } catch (error) {
    scriptError.value = error instanceof Error ? error.message : '保存文案失败'
  } finally {
    saving.value = false
  }
}

function restoreCurrentScript() {
  if (!currentScript.value) {
    return
  }
  sourceScript.value = currentScript.value.sourceScript || sourceScript.value
  finalScript.value = currentScript.value.finalScript || finalScript.value
}

function resetParsedContent() {
  parseResult.value = undefined
  sourceScript.value = currentScript.value?.sourceScript || ''
  finalScript.value = currentScript.value?.finalScript || ''
  parseError.value = ''
  scriptError.value = ''
}
</script>

<style scoped>
.script-workspace {
  display: grid;
  grid-template-columns: minmax(320px, 0.82fr) minmax(0, 1.18fr);
  gap: 16px;
  align-items: start;
}

.script-panel {
  display: grid;
  min-width: 0;
  gap: 16px;
}

.script-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.script-input-row .app-primary-button {
  min-height: 42px;
  align-self: center;
  padding: 0 16px;
}

.script-input-row input,
.script-form textarea {
  width: 100%;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  outline: none;
}

.script-input-row input {
  min-height: 42px;
  padding: 0 12px;
}

.script-video-card,
.script-analysis-item,
.script-current-card {
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
}

.script-video-card {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  padding: 12px;
}

.script-video-cover {
  width: 88px;
  height: 64px;
  object-fit: cover;
  border-radius: 8px;
  background: #dbeafe;
}

.script-video-cover-placeholder {
  display: grid;
  place-items: center;
  color: #155eef;
  font-weight: 900;
}

.script-analysis-list,
.script-form,
.script-current-card {
  display: grid;
  gap: 12px;
}

.script-analysis-list h3 {
  margin: 0;
  color: #101828;
  font-size: 15px;
  font-weight: 900;
}

.script-analysis-item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  padding: 10px;
}

.script-analysis-item span {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #eff6ff;
  color: #155eef;
  font-weight: 900;
}

.script-analysis-item p,
.script-video-card p,
.script-video-card small {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.55;
}

.script-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.script-tabs button,
.script-style-pill {
  min-height: 32px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 850;
}

.script-tabs button.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #155eef;
}

.script-form label {
  display: grid;
  gap: 8px;
  color: #344054;
  font-size: 13px;
  font-weight: 850;
}

.script-form textarea {
  min-height: 130px;
  padding: 12px;
  line-height: 1.7;
  resize: vertical;
}

.script-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.script-current-card {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  padding: 12px;
}

@media (max-width: 980px) {
  .script-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .script-input-row,
  .script-current-card {
    grid-template-columns: 1fr;
  }

  .script-video-card {
    grid-template-columns: 1fr;
  }
}
</style>
