<template>
  <div class="script-workspace">
    <header class="tool-page-hero">
      <h1>文案生成</h1>
      <p>解析或改写销售文案，沉淀可复用口播脚本。</p>
    </header>
    <section class="app-card copy-template-panel">
      <div class="copy-template-head">
        <div>
          <p>AI 匹配文案模板</p>
          <h2>选择文案模板</h2>
          <span>当前卖点：{{ selectedCopyTemplate?.sellingPoint || '家用空间' }}</span>
        </div>
        <div class="copy-template-tabs" role="tablist" aria-label="文案模板分类">
          <button
            v-for="item in copyTemplateCategories"
            :key="item.value"
            type="button"
            :class="{ active: selectedCopyTemplateCategory === item.value }"
            @click="selectCopyTemplateCategory(item.value)"
          >
            {{ item.label }}
          </button>
        </div>
      </div>

      <div class="copy-template-list">
        <article
          v-for="template in visibleCopyTemplates"
          :key="template.id"
          class="copy-template-option"
          :class="{ active: selectedCopyTemplateId === template.id }"
          @click="selectedCopyTemplateId = template.id"
        >
          <span class="copy-template-radio" aria-hidden="true"></span>
          <div>
            <strong>{{ template.title }}</strong>
            <p>{{ template.copy }}</p>
            <small>{{ template.scene }} · {{ template.tone }}</small>
          </div>
          <b>{{ selectedCopyTemplateId === template.id ? '已选' : '推荐' }}</b>
        </article>
      </div>

      <div class="copy-template-actions">
        <button type="button" class="app-secondary-button" @click="selectedCopyTemplateId = copyTemplateOptions[0]?.id || ''">
          取消
        </button>
        <button type="button" class="app-primary-button" :disabled="!selectedCopyTemplate" @click="applySelectedCopyTemplate">
          确认选择
        </button>
      </div>
    </section>

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

interface CopyTemplateOption {
  id: string
  category: string
  title: string
  sellingPoint: string
  scene: string
  tone: string
  copy: string
}

const emit = defineEmits<{
  continue: []
}>()

const copyTemplateCategories = [
  { value: 'all', label: '全部' },
  { value: 'family', label: '家用空间' },
  { value: 'smart', label: '智能座舱' },
  { value: 'exterior', label: '外观颜值' },
  { value: 'promo', label: '促销活动' },
]

const copyTemplateOptions: CopyTemplateOption[] = [
  {
    id: 'copy-family-01',
    category: 'family',
    title: '文案模板-01 家用空间文案',
    sellingPoint: '家用空间',
    scene: '家庭通勤',
    tone: '亲和转化',
    copy: '空间不够用？这台车把全家出行都安排得明明白白。后排宽敞，后备箱能装下露营装备和儿童用品，日常通勤舒适，周末出游也安心。现在到店试驾，享限时权益。',
  },
  {
    id: 'copy-family-02',
    category: 'family',
    title: '文案模板-02 舒适通勤文案',
    sellingPoint: '家用空间',
    scene: '城市代步',
    tone: '稳重清晰',
    copy: '每天上下班、接送家人、周末短途出行，一台车要舒适也要省心。宽敞座舱配合灵活储物，让一家人的行李和生活小物都有位置。',
  },
  {
    id: 'copy-smart-01',
    category: 'smart',
    title: '文案模板-03 智能座舱文案',
    sellingPoint: '智能座舱',
    scene: '年轻用户',
    tone: '科技感',
    copy: '上车一句话，导航、音乐和空调快速响应。智能座舱让通勤更轻松，大屏交互清晰，辅助驾驶配置也更适合城市路况。',
  },
  {
    id: 'copy-exterior-01',
    category: 'exterior',
    title: '文案模板-04 外观展示文案',
    sellingPoint: '外观颜值',
    scene: '门店实拍',
    tone: '质感表达',
    copy: '第一眼就有高级感。车身线条利落，灯组细节醒目，停在门店也能拍出大片质感，适合想要颜值和实用兼顾的用户。',
  },
  {
    id: 'copy-promo-01',
    category: 'promo',
    title: '文案模板-05 到店促销文案',
    sellingPoint: '到店促销',
    scene: '门店转化',
    tone: '行动号召',
    copy: '近期到店看车更划算，预约试驾可享专属权益。现车可看，金融方案灵活，想了解落地价和置换补贴，现在就联系门店顾问。',
  },
]

const videoUrl = ref('')
const sourceScript = ref('')
const finalScript = ref('')
const parseResult = ref<DouyinParseResponse>()
const currentScript = ref<WriterScriptItem | null>(null)
const parsing = ref(false)
const saving = ref(false)
const parseError = ref('')
const scriptError = ref('')
const selectedCopyTemplateCategory = ref('all')
const selectedCopyTemplateId = ref(copyTemplateOptions[0].id)

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
const visibleCopyTemplates = computed(() =>
  selectedCopyTemplateCategory.value === 'all'
    ? copyTemplateOptions
    : copyTemplateOptions.filter((item) => item.category === selectedCopyTemplateCategory.value),
)
const selectedCopyTemplate = computed(() =>
  copyTemplateOptions.find((item) => item.id === selectedCopyTemplateId.value) || null,
)

onMounted(async () => {
  parseResult.value = undefined
  sourceScript.value = ''
  finalScript.value = ''
  currentScript.value = null
  parseError.value = ''
  scriptError.value = ''
})

function applySelectedCopyTemplate() {
  if (!selectedCopyTemplate.value) {
    return
  }
  finalScript.value = selectedCopyTemplate.value.copy
  if (!sourceScript.value) {
    sourceScript.value = selectedCopyTemplate.value.copy
  }
  scriptError.value = ''
}

function selectCopyTemplateCategory(category: string) {
  selectedCopyTemplateCategory.value = category
  selectedCopyTemplateId.value =
    (category === 'all' ? copyTemplateOptions[0] : copyTemplateOptions.find((item) => item.category === category))?.id || ''
}

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

.copy-template-panel {
  display: grid;
  grid-column: 1 / -1;
  gap: 16px;
  border-radius: 8px;
}

.copy-template-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.copy-template-head p,
.copy-template-head h2,
.copy-template-head span {
  margin: 0;
}

.copy-template-head p {
  color: #155eef;
  font-size: 12px;
  font-weight: 900;
}

.copy-template-head h2 {
  margin-top: 4px;
  color: #101828;
  font-size: 20px;
  font-weight: 900;
}

.copy-template-head span {
  display: block;
  margin-top: 6px;
  color: #667085;
  font-size: 13px;
}

.copy-template-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.copy-template-tabs button {
  min-height: 32px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  padding: 0 12px;
}

.copy-template-tabs button.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #155eef;
}

.copy-template-list {
  display: grid;
  gap: 10px;
}

.copy-template-option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  padding: 12px 14px;
}

.copy-template-option.active {
  border-color: #155eef;
  background: #f8fbff;
  box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.08);
}

.copy-template-radio {
  display: block;
  width: 14px;
  height: 14px;
  margin-top: 4px;
  border: 1px solid #cbd5e1;
  border-radius: 50%;
  background: #fff;
}

.copy-template-option.active .copy-template-radio {
  border: 4px solid #155eef;
}

.copy-template-option strong,
.copy-template-option p,
.copy-template-option small {
  display: block;
  margin: 0;
}

.copy-template-option strong {
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.copy-template-option p {
  margin-top: 8px;
  color: #344054;
  font-size: 13px;
  line-height: 1.7;
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.copy-template-option small {
  margin-top: 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.copy-template-option b {
  align-self: start;
  border-radius: 999px;
  background: #eff6ff;
  color: #155eef;
  font-size: 12px;
  padding: 4px 9px;
}

.copy-template-actions {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) minmax(160px, 1fr);
  gap: 12px;
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
  .copy-template-head,
  .script-input-row,
  .script-current-card {
    grid-template-columns: 1fr;
  }

  .copy-template-head {
    display: grid;
  }

  .copy-template-tabs {
    justify-content: flex-start;
  }

  .copy-template-option,
  .script-video-card {
    grid-template-columns: 1fr;
  }

  .copy-template-actions {
    grid-template-columns: 1fr;
  }
}
</style>
