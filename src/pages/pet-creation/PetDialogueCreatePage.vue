<template>
  <section class="pet-dialogue-page">
    <header class="pet-page-head">
      <div>
        <span>宠物创作中心</span>
        <h2>{{ templateTitle }}生产页</h2>
        <p>按多宠物短视频的成熟链路组织角色、台词、口型、字幕和后期约束，编辑后可直接预检生成。</p>
      </div>
      <div class="pet-head-meta">
        <strong>{{ validDialogueCount }} 条台词</strong>
        <small>{{ roleCount }} 个角色 · {{ draft.durationSeconds }} 秒</small>
      </div>
    </header>

    <nav class="pet-production-steps" aria-label="宠物对话生产流程">
      <span class="active"><b>01</b>角色素材</span>
      <span class="active"><b>02</b>分角色台词</span>
      <span><b>03</b>口型字幕</span>
      <span><b>04</b>确认生成</span>
    </nav>

    <section class="pet-dialogue-command">
      <label class="pet-prompt-box">
        <span>对话主题</span>
        <textarea
          v-model="draft.prompt"
          maxlength="500"
          placeholder="描述宠物之间发生了什么，例如：三只宠物因为谁偷吃零食互相吐槽，最后主宠撒娇收尾。"
        />
      </label>
      <aside class="pet-ready-card" :class="{ warn: firstBlockingIssue }">
        <strong>{{ firstBlockingIssue ? '待补齐' : '对话结构可预检' }}</strong>
        <span>{{ firstBlockingIssue?.message || '角色、台词、口型和字幕会在确认抽屉中再次校验。' }}</span>
      </aside>
    </section>

    <section class="pet-metric-strip">
      <article>
        <span>模板</span>
        <strong>{{ templateTitle }}</strong>
      </article>
      <article>
        <span>角色</span>
        <strong>{{ roleCount }} 个</strong>
      </article>
      <article>
        <span>有效台词</span>
        <strong>{{ validDialogueCount }} 条</strong>
      </article>
      <article>
        <span>字幕字数</span>
        <strong>{{ lineCharCount }} 字</strong>
      </article>
      <article>
        <span>口型</span>
        <strong>{{ draft.lipSyncEnabled ? '开启' : '关闭' }}</strong>
      </article>
    </section>

    <div class="pet-dialogue-layout">
      <aside class="pet-panel pet-role-rail">
        <div class="pet-panel-head">
          <div>
            <h3>角色设定</h3>
            <small>支持单宠、双宠和多宠物</small>
          </div>
          <RouterLink :to="roleSetupLink">调整角色</RouterLink>
        </div>
        <div class="pet-role-list">
          <article v-for="(role, index) in draft.roles" :key="role.id" class="pet-role-card">
            <img :src="roleCover(role.type, index)" :alt="role.name" />
            <div>
              <strong>{{ role.name }}</strong>
              <span>{{ roleLabel(role.type) }} / {{ role.speakingTone || '未设置口吻' }}</span>
              <em>{{ role.personalityTags.slice(0, 3).join(' · ') || '待补性格标签' }}</em>
            </div>
            <button type="button" :disabled="saving || creating" @click="addDialogueLine(role.id)">添加该角色台词</button>
          </article>
        </div>
      </aside>

      <section class="pet-panel pet-dialogue-editor">
        <div class="pet-panel-head">
          <div>
            <h3>分角色台词</h3>
            <small>每条台词建议短句，便于口型同步和字幕安全区展示</small>
          </div>
          <button type="button" :disabled="saving || creating" @click="addDialogueLine()">添加台词</button>
        </div>

        <div v-if="draft.dialogueLines.length === 0" class="pet-empty-state">
          <strong>暂无台词</strong>
          <p>请先添加至少一条宠物台词，再继续生成分镜或视频。</p>
        </div>
        <div v-else class="pet-line-list">
          <article v-for="(line, index) in draft.dialogueLines" :key="line.id" class="pet-dialogue-line">
            <header>
              <b>{{ String(index + 1).padStart(2, '0') }}</b>
              <select v-model="line.speakerRoleId">
                <option v-for="role in draft.roles" :key="role.id" :value="role.id">{{ role.name }}</option>
              </select>
              <button type="button" :disabled="saving || creating || draft.dialogueLines.length <= 1" @click="removeDialogueLine(line.id)">删除</button>
            </header>
            <textarea v-model="line.text" maxlength="80" placeholder="输入该角色台词，建议 8-28 字。" />
            <div class="pet-dialogue-line-controls">
              <label>
                情绪
                <select v-model="line.emotion">
                  <option value="委屈">委屈</option>
                  <option value="开心">开心</option>
                  <option value="吐槽">吐槽</option>
                  <option value="认真解释">认真解释</option>
                  <option value="撒娇">撒娇</option>
                  <option value="惊讶">惊讶</option>
                </select>
              </label>
              <label>
                语速
                <select v-model="line.speed">
                  <option value="slow">慢</option>
                  <option value="normal">正常</option>
                  <option value="fast">快</option>
                </select>
              </label>
              <label>
                音色
                <input v-model="line.voiceName" />
              </label>
              <label class="pet-inline-check">
                <input v-model="line.lipSync" type="checkbox" />
                <span>口型同步</span>
              </label>
            </div>
          </article>
        </div>
      </section>

      <aside class="pet-right-column">
        <section class="pet-panel pet-check-panel">
          <div class="pet-panel-head">
            <div>
              <h3>生成检查</h3>
              <small>{{ firstBlockingIssue ? '仍有阻塞项' : '核心输入已满足' }}</small>
            </div>
          </div>
          <ul class="pet-check-list">
            <li v-for="item in checklist" :key="item.label" :class="{ ok: item.ok }">
              <b>{{ item.ok ? '✓' : '!' }}</b>
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </section>

        <PetPostProductionPanel
          :draft="draft"
          compact
          show-sync-button
          @change="saveDraft"
        />
      </aside>
    </div>

    <div class="pet-actions">
      <button type="button" :disabled="saving || creating" @click="saveAndGo('pet-storyboard')">
        {{ saving ? '保存中...' : '保存并生成分镜' }}
      </button>
      <button type="button" :disabled="saving || creating" @click="openPlanPreview">
        {{ creating ? '提交中...' : '立即生成视频' }}
      </button>
    </div>

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
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PetPlanPreviewDrawer from './components/PetPlanPreviewDrawer.vue'
import PetPostProductionPanel from './components/PetPostProductionPanel.vue'
import { createPetVideoTask, estimatePetVideoCost, getPetCreationApiMode, previewPetVideoTask } from '../../services/petCreationApi'
import { usePetCreationState } from './usePetCreationState'
import type { PetDialogueLine, PetType, PetVideoEstimate, PetVideoPreview } from './petCreationTypes'
import type { WorkbenchRouteName } from '../../router'
import {
  hasMainPetMaterial,
  hasPrompt,
  petErrorMessage,
  promptRequiredMessage,
  validatePetCreationDraft,
  validDialogueLines,
} from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'
import { findPetTemplate } from './petTemplateConfig'

const route = useRoute()
const router = useRouter()
const { draft, applyTemplate, loadDraft, saveDraft, snapshotDraft } = usePetCreationState()
const saving = ref(false)
const creating = ref(false)
const planOpen = ref(false)
const planEstimate = ref<PetVideoEstimate | null>(null)
const planPreview = ref<PetVideoPreview | null>(null)
const previewing = ref(false)
const apiMode = getPetCreationApiMode()
const catRoleCover = new URL('../../assets/pet-creation/local-cat-dialogue.jpg', import.meta.url).href
const dogRoleCover = new URL('../../assets/pet-creation/local-dog-reaction.jpg', import.meta.url).href
const template = computed(() => findPetTemplate(String(draft.templateId || route.query.templateId || '')))
const templateTitle = computed(() => template.value?.title || '多宠物对话')
const roleCount = computed(() => draft.roles.length)
const validDialogueCount = computed(() => validDialogueLines(draft).length)
const lineCharCount = computed(() => draft.dialogueLines.reduce((sum, line) => sum + line.text.trim().length, 0))
const validation = computed(() => validatePetCreationDraft(draft))
const firstBlockingIssue = computed(() => validation.value.blockingIssues[0])
const checklist = computed(() => [
  { label: '对话主题已填写', ok: hasPrompt(draft) },
  { label: '至少 2 个宠物角色', ok: draft.roles.length >= 2 },
  { label: '主宠物参考图已添加', ok: hasMainPetMaterial(draft) || draft.generationMode === 'text_video' },
  { label: '至少 1 条有效台词', ok: validDialogueCount.value >= 1 },
  { label: '口型同步有台词支撑', ok: !draft.lipSyncEnabled || validDialogueCount.value >= 1 },
])
const roleSetupLink = computed(() => ({
  name: 'pet-role-setup' as const,
  query: {
    ...route.query,
    returnTo: route.fullPath,
  },
}))

usePetApiFallbackNotice()

function roleLabel(type: PetType) {
  if (type === 'cat') return '小猫'
  if (type === 'dog') return '小狗'
  return '其他宠物'
}

function roleCover(type: PetType, index: number) {
  const materialRole = index === 0 ? 'main_pet' : 'second_pet'
  const material = draft.materials.find((item) => item.role === materialRole && item.url)
  if (material?.url) return material.url
  if (type === 'dog') return dogRoleCover
  if (type === 'cat') return catRoleCover
  return index % 2 === 0 ? catRoleCover : dogRoleCover
}

async function applyRouteTemplateIfNeeded() {
  const nextTemplate = findPetTemplate(String(route.query.templateId || ''))
  if (!nextTemplate || draft.templateId === nextTemplate.id) return
  applyTemplate(nextTemplate)
  await saveDraft()
}

function defaultSpeakerRoleId() {
  if (draft.roles.length === 0) return 'main-pet'
  const nextIndex = draft.dialogueLines.length % draft.roles.length
  return draft.roles[nextIndex]?.id || draft.roles[0]?.id || 'main-pet'
}

function addDialogueLine(roleId?: string) {
  const line: PetDialogueLine = {
    id: `dialogue-${Date.now()}-${draft.dialogueLines.length}`,
    speakerRoleId: roleId || defaultSpeakerRoleId(),
    text: '',
    emotion: '开心',
    speed: 'normal',
    voiceName: '默认萌宠音',
    lipSync: true,
  }
  draft.dialogueLines.push(line)
}

function removeDialogueLine(lineId: string) {
  if (draft.dialogueLines.length <= 1) return
  draft.dialogueLines = draft.dialogueLines.filter((line) => line.id !== lineId)
}

async function saveDialogueDraft() {
  const lines = validDialogueLines(draft)
  if (lines.length === 0) {
    ElMessage.warning('请至少填写一条有效台词。')
    return false
  }
  draft.dialogueLines = lines
  draft.scriptText = lines
    .map((line) => `${draft.roles.find((role) => role.id === line.speakerRoleId)?.name || '宠物'}：${line.text}`)
    .join('\n')
  await saveDraft()
  return true
}

async function saveAndGo(routeName: WorkbenchRouteName) {
  if (saving.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  saving.value = true
  try {
    if (!(await saveDialogueDraft())) return
    void router.push({ name: routeName, query: route.query })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存宠物台词失败，请稍后重试。'))
  } finally {
    saving.value = false
  }
}

async function openPlanPreview() {
  if (saving.value || creating.value) return
  planOpen.value = true
  planEstimate.value = null
  planPreview.value = null
  try {
    if (!(await saveDialogueDraft())) {
      const issue = validatePetCreationDraft(draft).blockingIssues[0]
      if (issue) ElMessage.warning(issue.message)
      return
    }
    const currentValidation = validatePetCreationDraft(draft)
    if (currentValidation.blockingIssues[0]) {
      ElMessage.warning(currentValidation.blockingIssues[0].message)
      return
    }
    planEstimate.value = await estimatePetVideoCost(snapshotDraft())
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物视频积分预估失败，请稍后重试。'))
  }
}

async function runPlanPreview() {
  if (saving.value || creating.value || previewing.value) return
  const currentValidation = validatePetCreationDraft(draft)
  if (currentValidation.blockingIssues[0]) {
    ElMessage.warning(currentValidation.blockingIssues[0].message)
    return
  }
  if (planEstimate.value?.enoughBalance === false) {
    ElMessage.warning('当前积分余额不足，请充值或降低生成配置后再提交。')
    return
  }
  previewing.value = true
  try {
    if (!(await saveDialogueDraft())) return
    planPreview.value = await previewPetVideoTask(snapshotDraft())
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
  if (saving.value || creating.value || previewing.value) return
  const currentValidation = validatePetCreationDraft(draft)
  if (currentValidation.blockingIssues[0]) {
    ElMessage.warning(currentValidation.blockingIssues[0].message)
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
    return
  }
  creating.value = true
  try {
    if (!(await saveDialogueDraft())) return
    const task = await createPetVideoTask(snapshotDraft())
    planOpen.value = false
    void router.push({ name: 'pet-generation-status', params: { taskId: task.id } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '创建宠物视频任务失败，请稍后重试。'))
  } finally {
    creating.value = false
  }
}

onMounted(async () => {
  try {
    await loadDraft()
    await applyRouteTemplateIfNeeded()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物草稿恢复失败，请返回首页重试。'))
  }
  if (draft.dialogueLines.length === 0) addDialogueLine()
})
</script>

<style scoped>
.pet-dialogue-page,
.pet-panel,
.pet-role-list,
.pet-line-list,
.pet-empty-state {
  display: grid;
  gap: 14px;
}

.pet-page-head,
.pet-panel,
.pet-dialogue-command,
.pet-metric-strip,
.pet-actions {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
}

.pet-page-head span,
.pet-prompt-box span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-page-head h2,
.pet-panel h3 {
  margin: 0;
  color: #172033;
  font-weight: 900;
}

.pet-page-head h2 {
  margin-top: 6px;
  font-size: 20px;
}

.pet-page-head p {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-head-meta {
  display: grid;
  min-width: 140px;
  justify-items: end;
  gap: 4px;
}

.pet-head-meta strong {
  color: #2563eb;
  font-size: 18px;
  font-weight: 900;
}

.pet-head-meta small,
.pet-panel-head small {
  color: #667085;
  font-size: 12px;
}

.pet-production-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.pet-production-steps span {
  display: flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #667085;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
}

.pet-production-steps b {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.pet-production-steps .active {
  border-color: #bfdbfe;
  background: #f8fbff;
  color: #172033;
}

.pet-dialogue-command {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 16px;
  padding: 16px;
}

.pet-prompt-box {
  display: grid;
  gap: 10px;
}

.pet-prompt-box textarea {
  min-height: 92px;
  resize: vertical;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  padding: 12px 14px;
  font-size: 14px;
  line-height: 1.65;
}

.pet-ready-card {
  display: grid;
  align-content: center;
  gap: 6px;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  background: #f0fdf4;
  color: #166534;
  padding: 12px;
}

.pet-ready-card.warn {
  border-color: #fed7aa;
  background: #fff7ed;
  color: #9a3412;
}

.pet-ready-card strong {
  font-size: 14px;
  font-weight: 900;
}

.pet-ready-card span {
  font-size: 12px;
  line-height: 1.5;
}

.pet-metric-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  overflow: hidden;
  padding: 0;
}

.pet-metric-strip article {
  display: grid;
  gap: 4px;
  min-height: 60px;
  align-content: center;
  padding: 10px 14px;
}

.pet-metric-strip span {
  color: #667085;
  font-size: 12px;
}

.pet-metric-strip strong {
  overflow: hidden;
  color: #172033;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-dialogue-layout {
  display: grid;
  grid-template-columns: 310px minmax(0, 1fr) 320px;
  gap: 16px;
  align-items: start;
}

.pet-panel {
  padding: 16px;
}

.pet-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-panel-head > div {
  display: grid;
  gap: 3px;
}

.pet-role-rail {
  align-content: start;
}

.pet-role-list {
  max-height: 680px;
  overflow: auto;
  padding-right: 2px;
}

.pet-role-card {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px;
}

.pet-role-card img {
  width: 72px;
  height: 72px;
  border-radius: 8px;
  object-fit: cover;
}

.pet-role-card div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.pet-role-card strong {
  overflow: hidden;
  color: #172033;
  font-size: 14px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-role-card span,
.pet-role-card em {
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-style: normal;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-role-card button {
  grid-column: 1 / -1;
  border-color: #bfdbfe !important;
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}

.pet-dialogue-editor {
  align-content: start;
}

.pet-line-list {
  gap: 12px;
}

.pet-dialogue-line {
  display: grid;
  gap: 10px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 12px;
}

.pet-dialogue-line header {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr) 68px;
  gap: 8px;
  align-items: center;
}

.pet-dialogue-line b {
  display: grid;
  width: 42px;
  height: 38px;
  place-items: center;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 15px;
  font-weight: 900;
}

.pet-dialogue-line textarea {
  min-height: 78px;
  resize: vertical;
}

.pet-dialogue-line-controls {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.pet-dialogue-line-controls label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-inline-check {
  display: flex !important;
  min-height: 38px;
  align-items: center;
  gap: 8px !important;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  padding: 0 10px;
  color: #1f2a44 !important;
  font-size: 13px !important;
}

.pet-panel input,
.pet-panel select,
.pet-panel textarea,
.pet-dialogue-line input,
.pet-dialogue-line select,
.pet-dialogue-line textarea {
  min-height: 38px;
  min-width: 0;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 10px;
  font-size: 13px;
}

.pet-panel textarea,
.pet-dialogue-line textarea {
  padding: 10px;
  line-height: 1.6;
}

.pet-panel a,
.pet-panel button,
.pet-dialogue-line button,
.pet-actions button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.pet-actions button:last-child {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.pet-right-column {
  display: grid;
  gap: 14px;
}

.pet-check-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pet-check-list li {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 8px;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  background: #fff7ed;
  color: #9a3412;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 850;
}

.pet-check-list li.ok {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #166534;
}

.pet-check-list b {
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border-radius: 999px;
  background: #ffffff;
  font-size: 12px;
}

.pet-empty-state {
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  background: #f8fbff;
  padding: 20px;
}

.pet-empty-state strong {
  color: #172033;
  font-size: 14px;
  font-weight: 900;
}

.pet-empty-state p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.pet-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 1280px) {
  .pet-dialogue-layout {
    grid-template-columns: 290px minmax(0, 1fr);
  }

  .pet-right-column {
    grid-column: 1 / -1;
  }
}

@media (max-width: 980px) {
  .pet-page-head,
  .pet-dialogue-command,
  .pet-dialogue-layout {
    grid-template-columns: 1fr;
  }

  .pet-page-head {
    display: grid;
  }

  .pet-head-meta {
    justify-items: start;
  }

  .pet-production-steps,
  .pet-metric-strip {
    grid-template-columns: 1fr 1fr;
  }

  .pet-dialogue-line-controls,
  .pet-dialogue-line header {
    grid-template-columns: 1fr;
  }
}
</style>
