<template>
  <section class="pet-dialogue-page">
    <header class="pet-page-head">
      <span>宠物创作中心</span>
      <h2>宠物对话视频创建</h2>
      <p>设置宠物 A / 宠物 B、分角色台词、AI 配音、口型同步和字幕样式。</p>
    </header>

    <div class="pet-dialogue-layout">
      <section class="pet-panel">
        <h3>角色设定</h3>
        <article v-for="(role, index) in draft.roles" :key="role.id" class="pet-role-card">
          <img :src="roleCover(role.type, index)" :alt="role.name" />
          <div>
            <strong>{{ role.name }}</strong>
            <span>{{ roleLabel(role.type) }} / {{ role.speakingTone || '未设置口吻' }}</span>
          </div>
        </article>
        <RouterLink to="/pet-render/role">调整角色</RouterLink>
      </section>

      <section class="pet-panel pet-dialogue-editor">
        <div class="pet-panel-head">
          <h3>分角色台词</h3>
          <button type="button" :disabled="saving || creating" @click="addDialogueLine">添加台词</button>
        </div>
        <article v-for="(line, index) in draft.dialogueLines" :key="line.id" class="pet-dialogue-line">
          <b>{{ index + 1 }}</b>
          <select v-model="line.speakerRoleId">
            <option v-for="role in draft.roles" :key="role.id" :value="role.id">{{ role.name }}</option>
          </select>
          <textarea v-model="line.text" placeholder="输入该角色台词" />
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
              口型同步
            </label>
            <button type="button" :disabled="saving || creating" @click="removeDialogueLine(line.id)">删除</button>
          </div>
        </article>
        <div v-if="draft.dialogueLines.length === 0" class="pet-empty-state">
          <strong>暂无台词</strong>
          <p>请先添加至少一条宠物台词，再继续生成分镜或视频。</p>
        </div>
      </section>

      <PetPostProductionPanel
        :draft="draft"
        compact
        show-sync-button
        @change="saveDraft"
      />
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
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PetPlanPreviewDrawer from './components/PetPlanPreviewDrawer.vue'
import PetPostProductionPanel from './components/PetPostProductionPanel.vue'
import { createPetVideoTask, estimatePetVideoCost, getPetCreationApiMode, previewPetVideoTask } from '../../services/petCreationApi'
import { usePetCreationState } from './usePetCreationState'
import type { PetDialogueLine, PetType, PetVideoEstimate, PetVideoPreview } from './petCreationTypes'
import type { WorkbenchRouteName } from '../../router'
import {
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
const catRoleCover = new URL('../../assets/pet-creation/template-cat-dialogue.png', import.meta.url).href
const dogRoleCover = new URL('../../assets/pet-creation/template-dog-reaction.png', import.meta.url).href

usePetApiFallbackNotice()

function roleLabel(type: PetType) {
  if (type === 'cat') return '小猫'
  if (type === 'dog') return '小狗'
  return '其他宠物'
}

function roleCover(type: PetType, index: number) {
  if (type === 'dog') return dogRoleCover
  if (type === 'cat') return catRoleCover
  return index % 2 === 0 ? catRoleCover : dogRoleCover
}

async function applyRouteTemplateIfNeeded() {
  const template = findPetTemplate(String(route.query.templateId || ''))
  if (!template || draft.templateId === template.id) return
  applyTemplate(template)
  await saveDraft()
}

function addDialogueLine() {
  const line: PetDialogueLine = {
    id: `dialogue-${Date.now()}`,
    speakerRoleId: draft.roles[0]?.id || 'main-pet',
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
    void router.push({ name: routeName })
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
    const validation = validatePetCreationDraft(draft)
    if (validation.blockingIssues[0]) {
      ElMessage.warning(validation.blockingIssues[0].message)
      return
    }
    planEstimate.value = await estimatePetVideoCost(snapshotDraft())
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物视频积分预估失败，请稍后重试。'))
  }
}

async function runPlanPreview() {
  if (saving.value || creating.value || previewing.value) return
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
.pet-panel {
  display: grid;
  gap: 16px;
}

.pet-page-head,
.pet-panel {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-page-head span {
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

.pet-dialogue-layout {
  display: grid;
  grid-template-columns: minmax(220px, 0.75fr) minmax(360px, 1.5fr) minmax(240px, 0.75fr);
  gap: 16px;
}

.pet-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-role-card,
.pet-dialogue-line,
.pet-empty-state {
  display: grid;
  gap: 8px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  padding: 12px;
}

.pet-role-card {
  grid-template-columns: 84px 1fr;
  align-items: center;
}

.pet-role-card img {
  width: 84px;
  height: 84px;
  border-radius: 8px;
  object-fit: cover;
}

.pet-role-card strong {
  color: #172033;
  font-size: 14px;
  font-weight: 900;
}

.pet-role-card span {
  color: #667085;
  font-size: 13px;
}

.pet-dialogue-line {
  position: relative;
  padding-left: 48px;
}

.pet-dialogue-line b {
  position: absolute;
  top: 14px;
  left: 12px;
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
}

.pet-dialogue-line textarea {
  min-height: 74px;
  resize: vertical;
}

.pet-dialogue-line-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 8px;
}

.pet-panel label,
.pet-dialogue-line-controls label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-inline-check {
  display: flex !important;
  align-items: center;
  gap: 8px !important;
  color: #1f2a44 !important;
  font-size: 13px !important;
}

.pet-panel input,
.pet-panel select,
.pet-panel textarea,
.pet-dialogue-line input,
.pet-dialogue-line select,
.pet-dialogue-line textarea {
  min-height: 36px;
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
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.pet-panel button:disabled,
.pet-dialogue-line button:disabled,
.pet-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
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
}

@media (max-width: 1080px) {
  .pet-dialogue-layout {
    grid-template-columns: 1fr;
  }
}
</style>
