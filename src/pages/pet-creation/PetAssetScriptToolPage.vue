<template>
  <section class="pet-script-tool app-page-stack">
    <header class="tool-page-hero">
      <h1>{{ copy.title }}</h1>
      <p>{{ copy.description }}</p>
    </header>

    <div class="pet-script-layout">
      <section class="app-card pet-script-panel">
        <section v-if="isBenchmarkMode" class="pet-script-link-panel">
          <div class="pet-script-link-head">
            <div>
              <strong>对标视频链接</strong>
              <span>粘贴爆款视频链接，解析后直接生成宠物爆款脚本和分镜。</span>
            </div>
            <em v-if="parsedBenchmarkShotCount > 0">已解析 {{ parsedBenchmarkShotCount }} 镜</em>
          </div>
          <VideoPlatformTabs
            v-model="selectedBenchmarkPlatform"
            :options="petBenchmarkPlatformOptions"
            :disabled="linkParsing || busy"
          />
          <div class="pet-script-link-row">
            <input
              v-model.trim="benchmarkUrl"
              type="url"
              :placeholder="benchmarkVideoPlaceholder"
              :disabled="linkParsing || busy"
            />
            <button
              type="button"
              class="app-primary-button"
              :disabled="!canParseBenchmarkUrl || linkParsing || busy"
              :title="selectedBenchmarkLimitReason"
              @click="handleParseBenchmarkUrl"
            >
              {{ linkParsing ? (linkStage || '分析并整理中...') : '分析并一键导入' }}
            </button>
            <button
              v-if="linkParsing || linkCanceling"
              type="button"
              class="app-secondary-button"
              :disabled="linkCanceling"
              @click="cancelBenchmarkParse"
            >
              {{ linkCanceling ? '取消中...' : '取消' }}
            </button>
          </div>
          <p v-if="selectedBenchmarkLimitReason" class="pet-script-link-notice warn">{{ selectedBenchmarkLimitReason }}</p>
          <p v-else-if="benchmarkAutoHint" class="pet-script-link-notice">{{ benchmarkAutoHint }}</p>
        </section>
        <label>
          创作主题
          <textarea v-model.trim="prompt" rows="7" :placeholder="copy.placeholder" />
        </label>
        <div class="pet-script-field-grid">
          <label>
            视频类型
            <select v-model="videoType">
              <option value="dialogue">宠物对话</option>
              <option value="short_drama">萌宠剧情</option>
              <option value="monologue">宠物独白</option>
              <option value="talking">宠物口播</option>
              <option value="image_to_video">图生视频</option>
            </select>
          </label>
          <label>
            风格
            <select v-model="style">
              <option value="cute">可爱治愈</option>
              <option value="funny">反差搞笑</option>
              <option value="realistic">真实写实</option>
              <option value="anthropomorphic">拟人表达</option>
              <option value="healing">温暖陪伴</option>
            </select>
          </label>
          <label>
            时长
            <input
              v-model.number="durationSeconds"
              type="number"
              :min="PET_MIN_VIDEO_DURATION_SECONDS"
              :max="PET_MAX_VIDEO_DURATION_SECONDS"
              step="1"
              @blur="normalizeDurationInput"
              @change="normalizeDurationInput"
            />
          </label>
          <label>
            比例
            <select v-model="aspectRatio">
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
              <option value="1:1">1:1</option>
            </select>
          </label>
        </div>
        <label>
          背景/场景要求
          <input v-model.trim="backgroundPrompt" type="text" maxlength="160" placeholder="例如：午后客厅、宠物店货架、草坪露营场景" />
        </label>
        <button class="app-primary-button" type="button" :disabled="busy || linkParsing || !prompt" @click="generate">
          {{ busy ? '生成中...' : copy.actionLabel }}
        </button>
        <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>
        <p v-if="successMessage" class="app-muted">{{ successMessage }}</p>
      </section>

      <section class="app-card pet-script-panel pet-script-result">
        <div class="pet-script-section-head">
          <div>
            <h3>生成结果</h3>
            <span>已生成内容会写入宠物草稿，可继续进入宠物分镜页调整。</span>
          </div>
          <button type="button" class="app-secondary-button" :disabled="!resultDraft" @click="goStoryboard">
            进入分镜页
          </button>
        </div>

        <div v-if="!resultDraft" class="app-empty-block">生成后将在这里展示脚本和镜头结构。</div>
        <template v-else>
          <div class="pet-script-import-summary">
            <span>{{ resultDraft.roles.length }} 个角色</span>
            <span>{{ resultDraft.dialogueLines.length }} 条角色台词</span>
            <span>{{ resultDraft.shots.length }} 个分镜</span>
            <span>{{ resultDraft.materials.length }} 项已选素材</span>
            <span v-if="resultAssetId">已保存为资产 #{{ resultAssetId }}</span>
          </div>
          <section class="pet-script-output">
            <h4>脚本文案</h4>
            <p>{{ resultDraft.scriptText || '暂无脚本文案' }}</p>
          </section>
          <div class="pet-shot-list">
            <article v-for="shot in resultDraft.shots" :key="shot.id" class="pet-shot-card">
              <strong>镜头 {{ shot.index }}</strong>
              <p>{{ shot.frameDescription }}</p>
              <span>{{ shot.characterAction }} · {{ shot.cameraMove }}</span>
              <small>{{ shot.subtitle }}</small>
            </article>
          </div>
        </template>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import VideoPlatformTabs from '../../components/business/VideoPlatformTabs.vue'
import { analyzeVideoScriptByUrl } from '../../services/videoApi'
import { uploadMaterialAsset } from '../../services/assetApi'
import { cancelTask } from '../../services/taskApi'
import { trackTaskResult } from '../../services/taskRealtime'
import { notifyAuthRefresh } from '../../services/authRefreshHub'
import { clonePetDraft, defaultPetDraft } from './petCreationMock'
import {
  PET_DEFAULT_VIDEO_DURATION_SECONDS,
  PET_MAX_VIDEO_DURATION_SECONDS,
  PET_MIN_VIDEO_DURATION_SECONDS,
  normalizePetVideoDurationSeconds,
} from './petCreationValidation'
import { generatePetScript, generatePetStoryboard, savePetDraft } from '../../services/petCreationApi'
import type { PetAspectRatio, PetCreationDraft, PetCreationStyle, PetRole, PetVideoType } from './petCreationTypes'
import {
  applyVideoBenchmarkToPetDraft,
  buildPetBenchmarkDialoguePlan,
  detectPetBenchmarkPlatform,
  getPetBenchmarkPlatformOption,
  petBenchmarkPlatformOptions,
} from './petBenchmarkVideo'
import type { TaskItem } from '../../types/taskTypes'
import type { VideoScriptAnalyzeResult } from '../../types/videoTypes'
import { importPetCreationAssetContent } from './petCreationAssetImport'
import { autoMatchPetMaterials } from './petAssetAutoMatch'
import { findPetTemplate } from './petTemplateConfig'

const props = withDefaults(defineProps<{
  mode?: 'benchmark' | 'storyboard'
}>(), {
  mode: 'storyboard',
})

const router = useRouter()
const prompt = ref(defaultPrompt())
const videoType = ref<PetVideoType>('short_drama')
const style = ref<PetCreationStyle>('funny')
const durationSeconds = ref(PET_DEFAULT_VIDEO_DURATION_SECONDS)
const aspectRatio = ref<PetAspectRatio>('9:16')
const backgroundPrompt = ref('')
const busy = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const resultDraft = ref<PetCreationDraft | null>(null)
const benchmarkUrl = ref('')
const selectedBenchmarkPlatform = ref('auto')
const linkParsing = ref(false)
const linkCanceling = ref(false)
const linkStage = ref('')
const benchmarkAutoHint = ref('')
const parsedBenchmarkShotCount = ref(0)
const resultAssetId = ref<number | null>(null)
let stopLinkTracking: (() => void) | null = null
let linkAbort: AbortController | null = null
let linkRunSeq = 0
let currentLinkTaskId: number | null = null

const isBenchmarkMode = computed(() => props.mode === 'benchmark')
const benchmarkVideoPlaceholder = computed(() => getPetBenchmarkPlatformOption(selectedBenchmarkPlatform.value).placeholder)
const selectedBenchmarkLimitReason = computed(() => getPetBenchmarkPlatformOption(selectedBenchmarkPlatform.value).limitReason || '')
const canParseBenchmarkUrl = computed(() => isBenchmarkMode.value && Boolean(benchmarkUrl.value.trim()) && !selectedBenchmarkLimitReason.value)

const copy = computed(() => {
  if (props.mode === 'benchmark') {
    return {
      title: '宠物爆款对标',
      description: '按萌宠短视频的反差钩子、表情递进和结尾包袱生成对标脚本与分镜。',
      placeholder: '例如：小猫偷吃冻干被发现，先嘴硬解释，最后用撒娇反转收尾',
      actionLabel: '生成爆款分镜',
    }
  }
  return {
    title: '宠物分镜生成',
    description: '把宠物创意拆成镜头结构、宠物动作、字幕和运镜，供后续视频生成复用。',
    placeholder: '例如：小狗听见零食袋后从装睡到秒醒，跑到镜头前卖萌',
    actionLabel: '生成分镜',
  }
})

function defaultPrompt() {
  return props.mode === 'benchmark'
    ? '小猫偷吃冻干被发现，前 3 秒用反差钩子，中段用表情和动作递进，结尾撒娇反转'
    : '小狗听见零食袋后从装睡到秒醒，跑到镜头前卖萌'
}

watch(benchmarkUrl, (value) => {
  const detected = detectPetBenchmarkPlatform(value)
  if (!detected) {
    benchmarkAutoHint.value = ''
    return
  }
  selectedBenchmarkPlatform.value = detected
  benchmarkAutoHint.value = `已自动识别为 ${getPetBenchmarkPlatformOption(detected).label}`
})

async function handleParseBenchmarkUrl() {
  if (!canParseBenchmarkUrl.value || linkParsing.value || busy.value) return
  if (selectedBenchmarkLimitReason.value) {
    errorMessage.value = selectedBenchmarkLimitReason.value
    return
  }
  const targetUrl = benchmarkUrl.value.trim()
  await runBenchmarkAnalyze(
    (signal) => analyzeVideoScriptByUrl(targetUrl, selectedBenchmarkPlatform.value, { signal }),
    targetUrl,
  )
}

async function runBenchmarkAnalyze(
  submit: (signal: AbortSignal) => Promise<TaskItem>,
  targetUrl: string,
) {
  const runId = ++linkRunSeq
  stopBenchmarkParseTask()
  linkAbort?.abort()
  linkAbort = new AbortController()
  currentLinkTaskId = null
  linkParsing.value = true
  linkCanceling.value = false
  linkStage.value = '提交解析任务中...'
  errorMessage.value = ''
  successMessage.value = ''
  parsedBenchmarkShotCount.value = 0
  resultAssetId.value = null

  try {
    const task = await submit(linkAbort.signal)
    if (runId !== linkRunSeq) return
    currentLinkTaskId = task.taskId
    notifyAuthRefresh()
    linkStage.value = benchmarkStatusStage(task.status, task.progress)
    await new Promise<void>((resolve) => {
      stopLinkTracking = trackTaskResult<VideoScriptAnalyzeResult>(task.taskId, {
        onStatus(message) {
          if (runId !== linkRunSeq) return
          linkStage.value = benchmarkStatusStage(message.status, message.progress)
        },
        onResult(taskResult) {
          if (runId !== linkRunSeq) return
          const sourceShots = taskResult.result?.scripts || []
          if (sourceShots.length === 0) {
            errorMessage.value = '解析完成，但没有返回可用分镜。请换一个公开可访问的视频链接。'
            finishBenchmarkRun()
            resolve()
            return
          }
          void applyBenchmarkResult(sourceShots, targetUrl, runId)
            .catch((error) => {
              if (runId !== linkRunSeq) return
              errorMessage.value = error instanceof Error ? error.message : '链接分析结果导入失败'
            })
            .finally(() => {
              if (runId === linkRunSeq) {
                finishBenchmarkRun()
                notifyAuthRefresh()
              }
              resolve()
            })
        },
        onFailure(message) {
          if (runId !== linkRunSeq) return
          errorMessage.value = message.errorMessage || '链接分镜解析任务失败'
          finishBenchmarkRun()
          notifyAuthRefresh()
          resolve()
        },
        onError(error) {
          if (runId !== linkRunSeq) return
          errorMessage.value = error.message
          finishBenchmarkRun()
          notifyAuthRefresh()
          resolve()
        },
      })
    })
  } catch (error) {
    if (runId !== linkRunSeq) return
    if (error instanceof DOMException && error.name === 'AbortError') return
    errorMessage.value = error instanceof Error ? error.message : '链接解析失败'
    finishBenchmarkRun()
  }
}

async function applyBenchmarkResult(
  sourceShots: VideoScriptAnalyzeResult['scripts'],
  targetUrl: string,
  runId: number,
) {
  const baseDraft = createDraftFromForm()
  const title = benchmarkImportTitle()
  const dialoguePlan = buildPetBenchmarkDialoguePlan(sourceShots, baseDraft.roles)
  const roles = dialoguePlan.roles
  const dialogueLines = dialoguePlan.dialogueLines
  const structuredContent = {
    title,
    assetKind: 'storyboard',
    templateId: 'viral-benchmark-storyboard',
    sourceUrl: targetUrl,
    prompt: prompt.value.trim(),
    videoType: 'short_drama',
    durationSeconds: baseDraft.durationSeconds,
    aspectRatio: baseDraft.aspectRatio,
    style: baseDraft.style,
    subtitleEnabled: true,
    voiceEnabled: dialogueLines.length > 0,
    lipSyncEnabled: dialogueLines.length > 0,
    roles,
    dialogueLines,
    scripts: sourceShots,
    visualSettings: {
      ...baseDraft.visualSettings,
      cameraRhythm: 'short_drama',
      stylePrompt: '短视频叙事，首秒钩子，冲突递进，结尾反转或温暖收束',
    },
    materialHints: benchmarkMaterialHints(roles),
  }
  const imported = importPetCreationAssetContent(baseDraft, JSON.stringify(structuredContent), {
    title,
    sourceUrl: targetUrl,
    fileName: `${title}.json`,
  })
  const applied = applyVideoBenchmarkToPetDraft(imported.draft, sourceShots, targetUrl)
  const template = findPetTemplate('viral-benchmark-storyboard')
  if (!template) throw new Error('爆款分镜模板不可用，请刷新后重试。')
  const matchedCount = await autoMatchPetMaterials(imported.draft, template, {
    requiredRoles: imported.requiredMaterialRoles,
    replaceRoles: imported.requiredMaterialRoles,
    roleKeywords: imported.materialKeywords,
  })
  if (runId !== linkRunSeq) return
  await savePetDraft(imported.draft)
  const savedAsset = await saveBenchmarkStoryboardAsset(title, targetUrl, imported.draft, sourceShots)
  if (runId !== linkRunSeq) return
  resultDraft.value = imported.draft
  resultAssetId.value = savedAsset.assetId
  parsedBenchmarkShotCount.value = applied.shotCount
  successMessage.value = `已整理 ${roles.length} 个角色、${imported.draft.dialogueLines.length} 条台词和 ${applied.shotCount} 个分镜，匹配 ${matchedCount} 项素材，并保存到宠物分镜资产。`
}

async function saveBenchmarkStoryboardAsset(
  title: string,
  sourceUrl: string,
  draft: PetCreationDraft,
  sourceShots: VideoScriptAnalyzeResult['scripts'],
) {
  const content = JSON.stringify({
    title,
    assetKind: 'storyboard',
    templateId: 'viral-benchmark-storyboard',
    sourceUrl,
    draftSnapshot: draft,
    sourceAnalysis: { scripts: sourceShots },
  }, null, 2)
  const file = new File([content], `${safeFileName(title)}.json`, { type: 'application/json;charset=utf-8' })
  return uploadMaterialAsset(file, {
    publish: false,
    businessDomain: 'pet',
    metadataJson: JSON.stringify({
      businessDomain: 'pet',
      domain: 'pet_creation',
      from: 'pet_benchmark_link_import',
      assetGroup: '宠物分镜',
      assetRole: 'storyboard_json',
      workflowStage: 'petStoryboard',
      taskType: 'VIDEO_SCRIPT_URL_ANALYZE',
      sourceUrl,
      title,
      displayName: title,
      chineseName: title,
      templateId: 'viral-benchmark-storyboard',
    }),
  })
}

function benchmarkImportTitle() {
  const subject = prompt.value.trim().replace(/[\r\n]+/g, ' ').slice(0, 22)
  return subject ? `爆款对标分镜｜${subject}` : '爆款对标分镜'
}

function safeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48) || '宠物爆款对标分镜'
}

function benchmarkMaterialHints(roles: PetRole[]) {
  const pets = roles.filter((role) => role.type === 'cat' || role.type === 'dog')
  const human = roles.find((role) => role.type === 'other')
  return {
    ...(pets[0] ? { main_pet: { keyword: [pets[0].type, pets[0].breed, pets[0].name].filter(Boolean).join(' ') } } : {}),
    ...(pets[1] ? { second_pet: { keyword: [pets[1].type, pets[1].breed, pets[1].name].filter(Boolean).join(' ') } } : {}),
    ...(human ? { human_avatar: { keyword: [human.name, human.breed, '主人'].filter(Boolean).join(' ') } } : {}),
    ...(backgroundPrompt.value.trim() ? { scene: { keyword: backgroundPrompt.value.trim() } } : {}),
  }
}

async function cancelBenchmarkParse() {
  const taskId = currentLinkTaskId
  linkRunSeq += 1
  linkAbort?.abort()
  linkAbort = null
  stopBenchmarkParseTask()
  currentLinkTaskId = null
  linkParsing.value = false
  linkStage.value = ''
  if (!taskId) {
    linkCanceling.value = false
    return
  }
  linkCanceling.value = true
  try {
    await cancelTask(taskId)
    notifyAuthRefresh()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '取消解析失败'
  } finally {
    linkCanceling.value = false
  }
}

function createDraftFromForm() {
  normalizeDurationInput()
  const draft = clonePetDraft(defaultPetDraft)
  draft.prompt = prompt.value.trim()
  draft.videoType = videoType.value
  draft.generationMode = videoType.value === 'dialogue' ? 'dialogue_video' : 'text_video'
  draft.style = style.value
  draft.durationSeconds = normalizePetVideoDurationSeconds(durationSeconds.value)
  draft.aspectRatio = aspectRatio.value
  draft.visualSettings.backgroundPrompt = backgroundPrompt.value.trim()
  return draft
}

function stopBenchmarkParseTask() {
  if (stopLinkTracking) {
    stopLinkTracking()
    stopLinkTracking = null
  }
}

function finishBenchmarkRun() {
  linkParsing.value = false
  currentLinkTaskId = null
  linkStage.value = ''
}

function benchmarkStatusStage(status: string, progress: number | null) {
  if (status === 'QUEUED') return '排队中...'
  if (status === 'RUNNING') return progress != null ? `解析分镜中...${progress}%` : '解析分镜中...'
  return '解析分镜中...'
}

onBeforeUnmount(() => {
  linkAbort?.abort()
  stopBenchmarkParseTask()
})

async function generate() {
  if (busy.value || linkParsing.value || !prompt.value.trim()) return
  normalizeDurationInput()
  busy.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const draft = clonePetDraft(defaultPetDraft)
    draft.prompt = props.mode === 'benchmark'
      ? `请生成萌宠爆款对标结构：${prompt.value.trim()}。要求前 3 秒反差钩子，中段表情/动作递进，结尾治愈或反转包袱。`
      : prompt.value.trim()
    draft.videoType = videoType.value
    draft.generationMode = videoType.value === 'dialogue' ? 'dialogue_video' : 'text_video'
    draft.style = style.value
    draft.durationSeconds = normalizePetVideoDurationSeconds(durationSeconds.value)
    draft.aspectRatio = aspectRatio.value
    draft.visualSettings.backgroundPrompt = backgroundPrompt.value.trim()
    const nextDraft = props.mode === 'benchmark'
      ? await generatePetStoryboard(draft)
      : await generatePetStoryboard(await generatePetScript(draft))
    resultDraft.value = nextDraft
    await savePetDraft(nextDraft)
    successMessage.value = '已写入宠物创作草稿。'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '生成失败'
  } finally {
    busy.value = false
  }
}

function normalizeDurationInput() {
  durationSeconds.value = normalizePetVideoDurationSeconds(durationSeconds.value)
}

function goStoryboard() {
  void router.push({ name: 'pet-storyboard' })
}
</script>

<style scoped>
.pet-script-tool {
  width: min(1240px, calc(100% - 40px));
  margin: 0 auto 32px;
}

.pet-script-layout {
  display: grid;
  grid-template-columns: minmax(340px, 440px) minmax(0, 1fr);
  gap: 16px;
}

.pet-script-panel {
  display: grid;
  gap: 16px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
  box-shadow: none;
}

.pet-script-panel label {
  display: grid;
  gap: 8px;
  color: var(--hs-text, #172033);
  font-size: 13px;
  font-weight: 800;
}

.pet-script-panel textarea,
.pet-script-panel input,
.pet-script-panel select {
  width: 100%;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 6px;
  background: #ffffff;
  color: var(--hs-text, #172033);
  padding: 10px 12px;
  outline: none;
}

.pet-script-panel textarea:focus,
.pet-script-panel input:focus,
.pet-script-panel select:focus {
  border-color: var(--hs-primary, #2563eb);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pet-script-link-panel {
  display: grid;
  gap: 10px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
  padding: 12px;
}

.pet-script-link-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.pet-script-link-head div {
  display: grid;
  gap: 4px;
}

.pet-script-link-head strong {
  color: var(--hs-text, #172033);
  font-size: 14px;
  font-weight: 850;
}

.pet-script-link-head span,
.pet-script-link-head em,
.pet-script-link-notice {
  color: var(--hs-muted, #667085);
  font-size: 12px;
  font-style: normal;
  line-height: 1.55;
}

.pet-script-link-head em {
  color: var(--hs-primary, #2563eb);
  font-weight: 850;
  white-space: nowrap;
}

.pet-script-link-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
}

.pet-script-link-row .app-primary-button,
.pet-script-link-row .app-secondary-button {
  min-height: 40px;
  white-space: nowrap;
}

.pet-script-link-notice {
  margin: 0;
}

.pet-script-link-notice.warn {
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  padding: 8px 10px;
}

.pet-script-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.pet-script-result {
  align-content: start;
}

.pet-script-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-script-section-head h3 {
  margin: 0 0 4px;
  color: var(--hs-text, #172033);
  font-size: 16px;
}

.pet-script-section-head span {
  color: var(--hs-muted, #667085);
  font-size: 12px;
}

.pet-script-import-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-script-import-summary span {
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 800;
}

.pet-script-output {
  display: grid;
  gap: 8px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: var(--hs-surface-soft, #f8fafc);
  padding: 12px;
}

.pet-script-output h4 {
  margin: 0;
  color: var(--hs-text, #172033);
  font-size: 14px;
}

.pet-script-output p {
  margin: 0;
  color: var(--hs-muted, #667085);
  font-size: 13px;
  line-height: 1.7;
}

.pet-shot-list {
  display: grid;
  gap: 10px;
}

.pet-shot-card {
  display: grid;
  gap: 6px;
  border: 1px solid var(--hs-border, #d9e1ec);
  border-radius: 8px;
  background: #ffffff;
  padding: 12px;
}

.pet-shot-card strong {
  color: var(--hs-primary, #2563eb);
  font-size: 13px;
}

.pet-shot-card p,
.pet-shot-card span,
.pet-shot-card small {
  margin: 0;
  color: var(--hs-muted, #667085);
  font-size: 12px;
  line-height: 1.55;
}

.pet-shot-card p {
  color: var(--hs-text, #172033);
  font-size: 13px;
  font-weight: 750;
}

.app-empty-block {
  padding: 24px;
}

@media (max-width: 1024px) {
  .pet-script-tool {
    width: calc(100% - 32px);
  }

  .pet-script-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .pet-script-tool {
    width: calc(100% - 24px);
  }

  .pet-script-field-grid {
    grid-template-columns: 1fr;
  }

  .pet-script-link-row {
    grid-template-columns: 1fr;
  }

  .pet-script-section-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
