<template>
  <div class="script-workspace">
    <section class="app-card script-panel script-panel-side">
      <div class="app-section-title">
        <span>1</span>
        <div>
          <h2>输入对标视频链接</h2>
          <p class="app-muted">解析抖音视频，返回原文案、爆款分析和 AI 改写文案。</p>
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
          <p class="app-muted">确认或微调 AI 改写文案后，保存为后续声音、形象和视频生成的正式脚本。</p>
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
