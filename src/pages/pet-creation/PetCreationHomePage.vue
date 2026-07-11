<template>
  <div class="pet-page">
    <header class="pet-hero">
      <div>
        <h1>用 <span>AI</span> 轻松生成萌宠视频</h1>
        <p>上传宠物图片，选择剧情模板或输入创意，生成适合短视频传播的萌宠内容。</p>
      </div>
    </header>

    <section class="pet-create-panel">
      <div class="pet-create-main">
        <div class="pet-prompt-box">
          <textarea
            v-model="draft.prompt"
            :disabled="creating"
            maxlength="500"
            placeholder="描述你想要的宠物视频，例如：小猫晚上偷偷出门，被主人发现后委屈解释"
          />
          <div class="pet-prompt-footer">
            <span>输入一句自然语言即可，系统会自动识别模板并编排剧情、角色、素材、对白和分镜。</span>
            <strong>{{ draft.prompt.length }}/500</strong>
          </div>
        </div>

        <div class="pet-material-grid">
          <button class="pet-material-card" type="button" @click="goRoleSetup">
            <i>☁</i>
            <strong>{{ materialSummaryTitle }}</strong>
            <span>{{ materialSummaryText }}</span>
          </button>
          <button class="pet-material-card" type="button" @click="goRoleSetup">
            <i>↑</i>
            <strong>上传宠物图片</strong>
            <span>支持 JPG / PNG，建议正面清晰照。</span>
          </button>
          <button class="pet-material-card" type="button" @click="goRoleSetup">
            <i>▧</i>
            <strong>添加参考图</strong>
            <span>补充第二或更多宠物、道具和场景参考。</span>
          </button>
        </div>

        <div class="pet-quick-workflow">
          <button type="button" :disabled="Boolean(aiAssistBusy) || creating" @click="handleGenerateScriptQuick">
            <strong>AI 生成文案/对话</strong>
            <span>根据提示词补齐宠物口播、对话和脚本文案。</span>
          </button>
          <button type="button" :disabled="Boolean(aiAssistBusy) || creating" @click="handleGenerateStoryboardQuick">
            <strong>AI 生成分镜</strong>
            <span>把剧情拆成镜头、动作、字幕和运镜节奏。</span>
          </button>
          <button type="button" :disabled="Boolean(aiAssistBusy) || creating" @click="handleBenchmarkStoryboard">
            <strong>爆款对标分镜</strong>
            <span>套用短视频钩子、递进和反转收尾结构。</span>
          </button>
          <button type="button" :disabled="Boolean(aiAssistBusy) || creating" @click="goBackgroundEdit">
            <strong>编辑背景图</strong>
            <span>选择场景参考图，并补充背景生成要求。</span>
          </button>
        </div>
      </div>

      <aside class="pet-param-panel">
        <PetGenerationParamPanel :draft="draft" compact show-mode @change="saveDraft" />
        <div class="pet-switch-row">
          <label class="pet-param-check">
            <input v-model="draft.subtitleEnabled" type="checkbox" @change="saveDraft" />
            字幕
          </label>
          <label class="pet-param-check">
            <input v-model="draft.voiceEnabled" type="checkbox" @change="saveDraft" />
            配音
          </label>
        </div>
        <div class="pet-action-row">
          <button class="pet-advanced-button" type="button" @click="advancedOpen = !advancedOpen">
            高级参数
          </button>
          <button class="pet-primary-button" type="button" :disabled="Boolean(aiAssistBusy) || creating" @click="openPlanPreview">
            {{ creating ? '提交中...' : '立即生成 ✦' }}
          </button>
        </div>
      </aside>

      <PetPostProductionPanel
        v-if="advancedOpen"
        :draft="draft"
        compact
        @change="saveDraft"
      />
    </section>

    <section class="pet-section">
      <div class="pet-section-head">
        <h2>推荐萌宠模板</h2>
        <RouterLink to="/pet-templates">更多模板</RouterLink>
      </div>
      <div v-if="templatesLoading" class="pet-empty-state">
        <strong>正在加载萌宠模板</strong>
        <p>模板会在加载完成后自动展示。</p>
      </div>
      <div v-else-if="recommendedTemplates.length === 0" class="pet-empty-state">
        <strong>暂无可用萌宠模板</strong>
        <p>可以先填写创意描述并配置宠物素材，模板接口恢复后会自动展示。</p>
      </div>
      <div v-else class="pet-template-grid">
        <PetTemplateCard
          v-for="(template, index) in recommendedTemplates"
          :key="template.id"
          :template="template"
          :index="index"
          @use-template="handleUseTemplate"
        />
      </div>
    </section>

    <section class="pet-section">
      <div class="pet-section-head">
        <h2>我的最近生成</h2>
        <RouterLink to="/pet-works">全部作品</RouterLink>
      </div>
      <div v-if="recentLoading" class="pet-empty-state">
        <strong>正在加载最近生成</strong>
        <p>作品列表会在加载完成后自动刷新。</p>
      </div>
      <div v-else-if="recentError" class="pet-empty-state">
        <strong>最近生成加载失败</strong>
        <p>{{ recentError }}</p>
        <button type="button" @click="refreshRecentWorks">重新加载</button>
      </div>
      <div v-else-if="recentWorks.length === 0" class="pet-empty-state">
        <strong>暂无最近生成</strong>
        <p>提交宠物视频任务后，生成中、已完成或失败的作品会在这里同步展示。</p>
      </div>
      <div v-else class="pet-work-grid">
        <PetWorkCard
          v-for="work in recentWorks"
          :key="work.id"
          :work="work"
          @preview="previewWork"
          @fork="forkWork"
          @regenerate="regenerateWork"
          @download="downloadWork"
          @delete="deleteWork"
          @fork-aspect="forkWorkAsAspect"
        />
      </div>
    </section>

    <PetPlanPreviewDrawer
      v-model="planOpen"
      :draft="draft"
      :estimate="planEstimate"
      :preview="planPreview"
      :loading="creating"
      :preview-loading="previewing"
      :api-mode="apiMode"
      @preview="runPlanPreview"
      @confirm="confirmCreateTask"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PetTemplateCard from './components/PetTemplateCard.vue'
import PetWorkCard from './components/PetWorkCard.vue'
import PetPlanPreviewDrawer from './components/PetPlanPreviewDrawer.vue'
import PetPostProductionPanel from './components/PetPostProductionPanel.vue'
import PetGenerationParamPanel from './components/PetGenerationParamPanel.vue'
import {
  createPetVideoTask,
  deletePetWork,
  downloadPetWork,
  estimatePetVideoCost,
  forkPetWork,
  generatePetScript,
  generatePetStoryboard,
  getPetCreationApiMode,
  listPetTemplates,
  listPetWorks,
  previewPetVideoTask,
  regeneratePetWork,
} from '../../services/petCreationApi'
import { usePetCreationState } from './usePetCreationState'
import type { PetAspectRatio, PetCreationDraft, PetRole, PetTemplate, PetVideoEstimate, PetVideoPreview, PetWork } from './petCreationTypes'
import { hasMainPetMaterial, hasPrompt, petErrorMessage, promptRequiredMessage, validatePetCreationDraft } from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'
import { routeForPetTemplate } from './petTemplateWorkflow'
import { autoMatchPetMaterials } from './petAssetAutoMatch'
import { findPetTemplate, getFeaturedPetTemplates, inferPetStoryIntentMode, selectPetTemplateForPrompt } from './petTemplateConfig'
import { syncPetStoryMode } from './petStoryMode'

const route = useRoute()
const router = useRouter()
const { draft, applyTemplate, loadDraft, saveDraft, snapshotDraft } = usePetCreationState()
const templates = ref<PetTemplate[]>([])
const recentWorks = ref<PetWork[]>([])
const advancedOpen = ref(false)
const creating = ref(false)
const templatesLoading = ref(false)
const recentLoading = ref(false)
const recentError = ref('')
const workActionKey = ref('')
const aiAssistBusy = ref('')
const planOpen = ref(false)
const planEstimate = ref<PetVideoEstimate | null>(null)
const planPreview = ref<PetVideoPreview | null>(null)
const previewing = ref(false)
const apiMode = getPetCreationApiMode()
const appliedQueryTemplateId = ref('')
const EXTRA_ROLE_SEEDS = [
  { name: '豆包', type: 'cat' as const, breed: '英短', tone: '软萌但有点嘴硬', tags: ['好奇', '撒娇'] },
  { name: '可乐', type: 'dog' as const, breed: '柯基', tone: '机智但认真', tags: ['机智', '吐槽'] },
  { name: '团子', type: 'cat' as const, breed: '橘猫', tone: '慢悠悠但很会补刀', tags: ['淡定', '补刀'] },
  { name: '小七', type: 'dog' as const, breed: '金毛', tone: '热情又护短', tags: ['热情', '护短'] },
]

usePetApiFallbackNotice()

const recommendedTemplates = computed(() => getFeaturedPetTemplates(templates.value).slice(0, 4))
const materialSummaryTitle = computed(() =>
  draft.materials.length > 0 ? `已配置 ${draft.materials.length} 个宠物参考素材` : '从宠物资产中心选择素材',
)
const materialSummaryText = computed(() => {
  if (draft.materials.length === 0) {
    return '支持主宠物、第二或更多宠物、产品/道具、背景/场景和口播/BGM 音频；可从宠物资产中心选择、上传或粘贴 URL。'
  }
  return draft.materials.map((material) => material.label).join(' / ')
})
function cloneDraft(payload: PetCreationDraft): PetCreationDraft {
  return JSON.parse(JSON.stringify(payload)) as PetCreationDraft
}

async function applyTemplateFromQuery() {
  const templateId = String(route.query.templateId || '')
  if (!templateId || appliedQueryTemplateId.value === templateId) return
  const template = findPetTemplate(templateId, templates.value)
  if (!template) return
  appliedQueryTemplateId.value = templateId
  applyTemplate(template)
  if (template.id === 'multi-pet-dialogue') syncPetStoryMode(draft)
  await saveDraft()
  if (route.name === 'pet-render') {
    void router.replace(routeForPetTemplate(template))
  }
}

async function handleUseTemplate(template: PetTemplate) {
  applyTemplate(template)
  if (template.id === 'multi-pet-dialogue') syncPetStoryMode(draft)
  await saveDraft()
  ElMessage.success(`已应用「${template.title}」模板`)
  void router.push(routeForPetTemplate(template))
}

async function handleGenerateScriptQuick() {
  if (aiAssistBusy.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  aiAssistBusy.value = 'script'
  try {
    await saveDraft()
    const nextDraft = await generatePetScript(cloneDraft(snapshotDraft()))
    Object.assign(draft, nextDraft)
    await saveDraft()
    ElMessage.success('已生成宠物文案/对话，可继续调整后生成分镜。')
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物文案失败，请稍后重试。'))
  } finally {
    aiAssistBusy.value = ''
  }
}

async function handleGenerateStoryboardQuick() {
  if (aiAssistBusy.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  aiAssistBusy.value = 'storyboard'
  try {
    await saveDraft()
    const nextDraft = await generatePetStoryboard(cloneDraft(snapshotDraft()))
    Object.assign(draft, nextDraft)
    await saveDraft()
    ElMessage.success('已生成宠物分镜，可在脚本分镜页继续精修。')
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物分镜失败，请稍后重试。'))
  } finally {
    aiAssistBusy.value = ''
  }
}

async function handleBenchmarkStoryboard() {
  if (aiAssistBusy.value || creating.value) return
  const basePrompt = draft.prompt.trim() || '主宠被发现做了一件小坏事，努力用可爱表情解释'
  draft.prompt = `${basePrompt}。参考爆款萌宠短视频结构：前三秒抛出反差钩子，中段用宠物表情和动作递进，结尾用治愈或反转包袱收束。`
  draft.visualSettings.cameraRhythm = 'short_drama'
  draft.visualSettings.expressionIntensity = Math.max(draft.visualSettings.expressionIntensity, 82)
  draft.subtitleEnabled = true
  await handleGenerateStoryboardQuick()
}

function routeForSmartTemplate(template: PetTemplate, prompt: string) {
  const target = routeForPetTemplate(template)
  if (typeof target === 'string') return target
  return {
    ...target,
    query: {
      ...(target.query || {}),
      from: 'ai-prompt',
      ...(template.id === 'multi-pet-dialogue' ? { intentMode: inferPetStoryIntentMode(prompt) } : {}),
    },
  }
}

function targetRoleCountForPrompt(prompt: string) {
  const value = prompt.toLowerCase()
  if (/[六6]|six/.test(value)) return 6
  if (/[五5]|five/.test(value)) return 5
  if (/[四4]|four/.test(value)) return 4
  if (/[三3]|three/.test(value)) return 3
  if (value.includes('多宠物') || value.includes('多只') || value.includes('multiple') || value.includes('many pets')) return 3
  return 2
}

function ensureDialogueRolesForPrompt(prompt: string) {
  const targetCount = Math.min(6, Math.max(2, targetRoleCountForPrompt(prompt)))
  while (draft.roles.length < targetCount) {
    const index = draft.roles.length
    const seed = EXTRA_ROLE_SEEDS[(index - 2 + EXTRA_ROLE_SEEDS.length) % EXTRA_ROLE_SEEDS.length]
    const role: PetRole = {
      id: `ai-pet-role-${Date.now()}-${index}`,
      name: seed.name,
      type: seed.type,
      breed: seed.breed,
      ageFeel: '青年',
      personalityTags: seed.tags,
      speakingTone: seed.tone,
      roleTags: ['对话角色'],
      anthropomorphic: true,
      referenceAssetIds: [],
    }
    draft.roles.push(role)
  }
}

async function prepareAiTemplateDraftAndGo() {
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  creating.value = true
  try {
    const originalPrompt = draft.prompt.trim()
    const template = selectPetTemplateForPrompt(originalPrompt, templates.value)
    applyTemplate(template)
    draft.prompt = originalPrompt
    if (template.workflow === 'sticker') {
      prepareStickerDraftFromPrompt(originalPrompt)
    }
    if (template.workflow === 'dialogue' && inferPetStoryIntentMode(originalPrompt) === 'multi-pet') {
      ensureDialogueRolesForPrompt(originalPrompt)
    }
    const matchedCount = await autoMatchPetMaterials(draft, template)
    if (template.id === 'multi-pet-dialogue') syncPetStoryMode(draft)
    if (template.id === 'pet-ai-smart-story' && !hasMainPetMaterial(draft)) {
      draft.generationMode = 'text_video'
    }
    if (template.workflow === 'background' && !draft.visualSettings.backgroundPrompt.trim()) {
      draft.visualSettings.backgroundPrompt = originalPrompt.slice(0, 160)
    }
    await saveDraft()
    if (template.workflow === 'dialogue') {
      const nextDraft = await generatePetScript(cloneDraft(snapshotDraft()))
      Object.assign(draft, nextDraft)
      if (template.id === 'multi-pet-dialogue') syncPetStoryMode(draft)
    } else if (template.workflow === 'smart' || template.workflow === 'storyboard' || template.id === 'pet-dance-sing') {
      const nextDraft = await generatePetStoryboard(cloneDraft(snapshotDraft()))
      Object.assign(draft, nextDraft)
    }
    await saveDraft()
    ElMessage.success(`已匹配「${template.title}」并预填${matchedCount > 0 ? ` ${matchedCount} 个素材、` : ''}文案/分镜草稿。`)
    void router.push(routeForSmartTemplate(template, originalPrompt))
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物创作草稿失败，请稍后重试。'))
  } finally {
    creating.value = false
  }
}

function prepareStickerDraftFromPrompt(prompt: string) {
  draft.scriptText = prompt
  const quotedCaption = prompt.match(/[“\"「『](.{1,16}?)[”\"」』]/)?.[1]?.trim()
  const inferredCaption = quotedCaption
    || (/偷吃/.test(prompt) && /发现/.test(prompt) ? '糟糕，被发现了' : '')
    || (/文字|加字|字幕/.test(prompt) ? '我什么都没做' : '')
  draft.subtitleEnabled = Boolean(inferredCaption)
  draft.subtitleStyle.strokeMode = /白色描边|白描边/.test(prompt) ? 'strong' : draft.subtitleStyle.strokeMode
  draft.shots = inferredCaption
    ? [{
        id: `ai-sticker-${Date.now()}`,
        index: 1,
        durationSeconds: draft.durationSeconds,
        frameDescription: '宠物聊天表情包近景，主体清晰，背景干净',
        characterAction: '宠物发现偷吃被看到后露出搞笑又心虚的表情',
        cameraMove: '固定近景',
        subtitle: inferredCaption,
      }]
    : []
}

async function openPlanPreview() {
  if (aiAssistBusy.value || creating.value) return
  if (hasPrompt(draft)) return prepareAiTemplateDraftAndGo()
  planOpen.value = true
  planEstimate.value = null
  planPreview.value = null
  const validation = validatePetCreationDraft(draft)
  if (validation.blockingIssues[0]) {
    ElMessage.warning(validation.blockingIssues[0].message)
    return
  }
  try {
    await saveDraft()
    planEstimate.value = await estimatePetVideoCost(cloneDraft(snapshotDraft()))
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物视频积分预估失败，请稍后重试。'))
  }
}

async function runPlanPreview() {
  if (previewing.value || creating.value) return
  const validation = validatePetCreationDraft(draft)
  if (validation.blockingIssues[0]) {
    ElMessage.warning(validation.blockingIssues[0].message)
    return
  }
  if (planEstimate.value?.enoughBalance === false) {
    ElMessage.warning('当前积分余额不足，请充值或降低生成配置后再提交。')
    return
  }
  previewing.value = true
  try {
    await saveDraft()
    planPreview.value = await previewPetVideoTask(cloneDraft(snapshotDraft()))
    if (planPreview.value.providerSubmitEnabled) {
      ElMessage.success('预检通过。继续确认将调用第三方视频生成并可能产生费用。')
      return
    }
    ElMessage.warning('当前为本地安全测试模式，未调用第三方视频生成。')
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物视频 dry-run 预检失败，请稍后重试。'))
  } finally {
    previewing.value = false
  }
}

async function confirmCreateTask() {
  if (creating.value || previewing.value) return
  const validation = validatePetCreationDraft(draft)
  if (validation.blockingIssues[0]) {
    ElMessage.warning(validation.blockingIssues[0].message)
    return
  }
  if (planEstimate.value?.enoughBalance === false) {
    ElMessage.warning('当前积分余额不足，请充值或降低生成配置后再提交。')
    return
  }
  if (!planPreview.value) {
    await runPlanPreview()
    if (!planPreview.value) return
  }
  if (!planPreview.value.providerSubmitEnabled) {
    ElMessage.warning('当前为本地安全测试模式，未调用第三方视频生成。需要真实生成时，请先由管理员开启 provider submit 并再次确认。')
    return
  }
  creating.value = true
  try {
    await ElMessageBox.confirm(
      '将调用第三方视频生成并可能产生费用。本次只生成 1 条，确认后不可撤销。是否继续？',
      '确认真实生成',
      {
        confirmButtonText: '确认真实生成 1 条',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    creating.value = false
    return
  }
  try {
    await saveDraft()
    const task = await createPetVideoTask(cloneDraft(snapshotDraft()))
    planOpen.value = false
    void router.push({ name: 'pet-generation-status', params: { taskId: task.id } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '创建宠物视频任务失败，请稍后重试。'))
  } finally {
    creating.value = false
  }
}

async function refreshRecentWorks() {
  recentLoading.value = true
  recentError.value = ''
  try {
    recentWorks.value = (await listPetWorks({ status: 'all' })).slice(0, 3)
  } catch (error) {
    recentWorks.value = []
    recentError.value = petErrorMessage(error, '最近生成加载失败，请稍后重试。')
  } finally {
    recentLoading.value = false
  }
}

async function goRoleSetup() {
  await saveDraft()
  void router.push({ name: 'pet-role-setup' })
}

async function goBackgroundEdit() {
  advancedOpen.value = true
  if (!draft.visualSettings.backgroundPrompt.trim()) {
    draft.visualSettings.backgroundPrompt = '温暖客厅背景，浅景深，干净柔和，宠物主体清晰突出'
  }
  await saveDraft()
  void router.push({ name: 'pet-role-setup', query: { focus: 'scene' } })
}

function previewWork() {
  void router.push({ name: 'pet-works' })
}

async function forkWork(work: PetWork) {
  await forkWorkAsAspect(work, work.aspectRatio)
}

async function forkWorkAsAspect(work: PetWork, aspectRatio: PetAspectRatio) {
  if (workActionKey.value) return
  workActionKey.value = `fork-${work.id}-${aspectRatio}`
  try {
    await forkPetWork(work.id, { aspectRatio })
    ElMessage.success(`已复制为 ${aspectRatio} 草稿，可继续编辑。`)
    await refreshRecentWorks()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '复制项目失败，请稍后重试。'))
  } finally {
    workActionKey.value = ''
  }
}

async function regenerateWork(work: PetWork) {
  if (workActionKey.value) return
  workActionKey.value = `regenerate-${work.id}`
  try {
    const task = await regeneratePetWork(work.id)
    void router.push({ name: 'pet-generation-status', params: { taskId: task.id } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '重新生成失败，请稍后重试。'))
  } finally {
    workActionKey.value = ''
  }
}

async function downloadWork(work: PetWork) {
  if (workActionKey.value) return
  workActionKey.value = `download-${work.id}`
  try {
    const result = await downloadPetWork(work.id)
    if (result.url) {
      const anchor = document.createElement('a')
      anchor.href = result.url
      anchor.download = result.fileName
      anchor.target = '_blank'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      return
    }
    if (!result.content) {
      ElMessage.warning('当前作品暂无可下载的视频文件，真实生成完成后可下载。')
      return
    }
    const blob = new Blob([result.content], { type: result.mimeType })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '下载作品失败，请稍后重试。'))
  } finally {
    workActionKey.value = ''
  }
}

async function deleteWork(work: PetWork) {
  if (workActionKey.value) return
  try {
    await ElMessageBox.confirm(`确认删除「${work.title}」吗？删除后不可恢复。`, '删除宠物作品', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  workActionKey.value = `delete-${work.id}`
  try {
    await deletePetWork(work.id)
    ElMessage.success('已删除宠物作品。')
    await refreshRecentWorks()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '删除作品失败，请稍后重试。'))
  } finally {
    workActionKey.value = ''
  }
}

onMounted(async () => {
  try {
    await loadDraft()
    if (!draft.templateId && !hasPrompt(draft)) {
      draft.videoType = 'short_drama'
      draft.generationMode = hasMainPetMaterial(draft) ? 'reference_video' : 'text_video'
    }
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物草稿恢复失败，已使用默认草稿。'))
  }
  templatesLoading.value = true
  try {
    templates.value = await listPetTemplates()
  } catch (error) {
    templates.value = []
    ElMessage.error(petErrorMessage(error, '萌宠模板加载失败，请稍后重试。'))
  } finally {
    templatesLoading.value = false
  }
  void refreshRecentWorks()
  void applyTemplateFromQuery()
})

watch(
  () => route.query.templateId,
  () => {
    void applyTemplateFromQuery()
  },
)
</script>

<style scoped>
.pet-page {
  display: grid;
  gap: 20px;
  padding-top: 18px;
}

.pet-hero {
  display: flex;
  justify-content: center;
  text-align: center;
}

.pet-hero h1 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.18;
}

.pet-hero h1 span {
  color: #2563eb;
}

.pet-hero p {
  margin: 0;
  color: #64748b;
  font-size: 15px;
  line-height: 1.7;
}

.pet-create-panel,
.pet-empty-state {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
}

.pet-create-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  padding: 18px;
}

.pet-create-main {
  display: grid;
  gap: 14px;
}

.pet-prompt-box {
  display: grid;
  min-height: 136px;
  border: 1px solid #d7e2f5;
  border-radius: 8px;
  background: #fbfdff;
}

.pet-prompt-box textarea {
  min-height: 92px;
  resize: none;
  border: 0;
  outline: none;
  background: transparent;
  color: #172033;
  padding: 18px;
  font-size: 14px;
  line-height: 1.7;
}

.pet-prompt-footer,
.pet-create-row,
.pet-section-head,
.pet-param-list {
  display: flex;
  align-items: center;
}

.pet-prompt-footer {
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px 14px;
  color: #7f8aaa;
  font-size: 12px;
}

.pet-prompt-footer strong {
  color: #d97706;
}

.pet-material-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.pet-quick-workflow {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.pet-quick-workflow button {
  display: grid;
  min-height: 74px;
  align-content: center;
  gap: 6px;
  border: 1px solid #d7e2f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 12px;
  text-align: left;
  cursor: pointer;
}

.pet-quick-workflow button:hover {
  border-color: #93c5fd;
  background: #f8fbff;
}

.pet-quick-workflow button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.pet-quick-workflow strong {
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 900;
}

.pet-quick-workflow span {
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}

.pet-create-row {
  gap: 12px;
}

.pet-material-card {
  display: grid;
  grid-template-columns: 44px 1fr;
  min-height: 64px;
  flex: 1 1 auto;
  gap: 4px 12px;
  align-items: center;
  border: 1px solid #d7e2f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
}

.pet-material-card i {
  display: grid;
  width: 44px;
  height: 44px;
  grid-row: span 2;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-style: normal;
  font-size: 20px;
  font-weight: 900;
}

.pet-material-card strong {
  color: #2563eb;
  font-size: 14px;
}

.pet-material-card span {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.pet-param-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  border-left: 1px solid #e4ebf7;
  padding-left: 18px;
}

.pet-param-panel h3 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 900;
}

.pet-duration-tabs,
.pet-style-tabs,
.pet-switch-row,
.pet-action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pet-duration-tabs button,
.pet-style-tabs button {
  min-height: 36px;
  min-width: 72px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-duration-tabs button.active,
.pet-style-tabs button.active {
  border-color: #7aa7ff;
  background: #eff6ff;
  color: #2563eb;
}

.pet-param-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.pet-param-grid label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-param-grid select {
  min-height: 36px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  padding: 0 10px;
  font-size: 13px;
}

.pet-param-list {
  flex-wrap: wrap;
  gap: 8px;
}

.pet-param-list label,
.pet-param-list select,
.pet-advanced-button {
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  font-size: 13px;
  font-weight: 800;
}

.pet-param-list label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}

.pet-param-list select {
  min-height: 30px;
  border: 0;
  padding: 0;
  outline: none;
}

.pet-param-check input {
  margin: 0;
}

.pet-advanced-button {
  padding: 0 12px;
}

.pet-advanced-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 10px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 12px;
}

.pet-advanced-panel label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-advanced-panel select,
.pet-advanced-panel input[type='range'] {
  min-height: 34px;
}

.pet-advanced-panel .pet-param-check {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2a44;
  font-size: 13px;
}

.pet-advanced-panel .pet-advanced-wide {
  grid-column: 1 / -1;
}

.pet-advanced-panel textarea {
  min-height: 68px;
  resize: vertical;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.pet-primary-button {
  min-height: 44px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 24px;
  font-weight: 850;
  cursor: pointer;
}

.pet-action-row .pet-primary-button {
  flex: 1 1 auto;
}

.pet-primary-button:disabled,
.pet-empty-state button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.pet-section {
  display: grid;
  gap: 12px;
}

.pet-section-head {
  justify-content: space-between;
}

.pet-section-head h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
}

.pet-section-head a {
  border: 1px solid #dfe7f5;
  border-radius: 999px;
  background: #ffffff;
  color: #2563eb;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}

.pet-template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  grid-auto-rows: 1fr;
  gap: 14px;
}

.pet-template-grid > * {
  min-width: 0;
}

.pet-work-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.pet-empty-state {
  display: grid;
  gap: 8px;
  padding: 20px;
}

.pet-empty-state strong {
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.pet-empty-state p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-empty-state button {
  justify-self: start;
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}

@media (max-width: 900px) {
  .pet-create-panel {
    grid-template-columns: 1fr;
  }

  .pet-param-panel {
    border-left: 0;
    border-top: 1px solid #e4ebf7;
    padding-left: 0;
    padding-top: 16px;
  }

  .pet-material-grid {
    grid-template-columns: 1fr;
  }

  .pet-quick-workflow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pet-create-row {
    align-items: stretch;
    flex-direction: column;
  }

  .pet-primary-button {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .pet-quick-workflow {
    grid-template-columns: 1fr;
  }
}
</style>
