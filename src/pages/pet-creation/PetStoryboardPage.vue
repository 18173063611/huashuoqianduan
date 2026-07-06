<template>
  <section class="pet-storyboard-page">
    <header class="pet-page-head">
      <span>宠物创作中心</span>
      <h2>脚本与分镜生成</h2>
      <p>将剧情拆成镜头、动作、运镜、字幕和配音情绪，便于后续生成视频。</p>
    </header>

    <div class="pet-storyboard-toolbar">
      <input v-model="draft.prompt" placeholder="输入剧情主题，例如：小猫偷偷溜出门后用撒娇解释" />
      <button type="button" :disabled="busy" @click="handleGenerateScript">
        {{ busy ? '处理中...' : '生成脚本' }}
      </button>
      <button type="button" :disabled="busy" @click="handleGenerateStoryboard">
        {{ busy ? '处理中...' : '生成分镜' }}
      </button>
    </div>

    <div class="pet-storyboard-layout">
      <section class="pet-panel pet-script-panel">
        <h3>AI 生成脚本 ✦</h3>
        <textarea v-model="draft.scriptText" class="pet-script-input" placeholder="生成脚本后会显示在这里，也可以手动编辑。" />
        <div class="pet-topic-tags">
          <span>#猫咪日常</span>
          <span>#萌宠视频</span>
          <span>#治愈系宠物</span>
          <span>#猫咪偷偷出门</span>
        </div>
      </section>

      <section class="pet-panel pet-shot-panel">
        <div class="pet-panel-head">
          <h3>分镜列表</h3>
          <small>共 {{ draft.shots.length }} 个分镜，预计 {{ totalShotSeconds }} 秒</small>
        </div>
        <div v-if="draft.shots.length === 0" class="pet-empty-state">
          <strong>暂无分镜</strong>
          <p>请先生成分镜，或返回角色设定补充宠物素材后再试。</p>
        </div>
        <div v-else class="pet-shot-list">
          <article v-for="shot in draft.shots" :key="shot.id" class="pet-shot-card">
            <div class="pet-shot-index">
              <strong>{{ String(shot.index).padStart(2, '0') }}</strong>
              <select v-model.number="shot.durationSeconds">
                <option :value="2">2 秒</option>
                <option :value="3">3 秒</option>
                <option :value="4">4 秒</option>
                <option :value="5">5 秒</option>
                <option :value="6">6 秒</option>
              </select>
            </div>
            <div class="pet-shot-content">
              <label>
                画面描述
                <textarea v-model="shot.frameDescription" />
              </label>
              <label>
                角色动作
                <textarea v-model="shot.characterAction" />
              </label>
              <div class="pet-shot-meta">
                <label>
                  运镜方式
                  <input v-model="shot.cameraMove" />
                </label>
                <label>
                  字幕
                  <input v-model="shot.subtitle" />
                </label>
                <label>
                  配音情绪
                  <input v-model="shot.voiceEmotion" placeholder="例如：委屈 / 撒娇 / 惊讶" />
                </label>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <div class="pet-actions">
      <button type="button" :disabled="busy || creating" @click="saveAndGoRole">返回角色设定</button>
      <button type="button" :disabled="busy || creating" @click="openPlanPreview">
        {{ creating ? '提交中...' : '确认并生成' }}
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
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PetPlanPreviewDrawer from './components/PetPlanPreviewDrawer.vue'
import {
  createPetVideoTask,
  estimatePetVideoCost,
  generatePetScript,
  generatePetStoryboard,
  getPetCreationApiMode,
  previewPetVideoTask,
} from '../../services/petCreationApi'
import { usePetCreationState } from './usePetCreationState'
import type { PetVideoEstimate, PetVideoPreview } from './petCreationTypes'
import {
  hasPrompt,
  petErrorMessage,
  promptRequiredMessage,
  validatePetCreationDraft,
  validStoryboardShots,
} from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'

const router = useRouter()
const { draft, loadDraft, saveDraft, snapshotDraft } = usePetCreationState()
const busy = ref(false)
const creating = ref(false)
const planOpen = ref(false)
const planEstimate = ref<PetVideoEstimate | null>(null)
const planPreview = ref<PetVideoPreview | null>(null)
const previewing = ref(false)
const apiMode = getPetCreationApiMode()
const totalShotSeconds = computed(() => draft.shots.reduce((sum, shot) => sum + Number(shot.durationSeconds || 0), 0))

usePetApiFallbackNotice()

async function handleGenerateScript() {
  if (busy.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  busy.value = true
  try {
    const nextDraft = await generatePetScript(snapshotDraft())
    Object.assign(draft, nextDraft)
    await saveDraft()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物脚本失败，请稍后重试。'))
  } finally {
    busy.value = false
  }
}

async function handleGenerateStoryboard() {
  if (busy.value || creating.value) return
  if (!hasPrompt(draft)) {
    ElMessage.warning(promptRequiredMessage())
    return
  }
  busy.value = true
  try {
    const nextDraft = await generatePetStoryboard(snapshotDraft())
    Object.assign(draft, nextDraft)
    await saveDraft()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '生成宠物分镜失败，请稍后重试。'))
  } finally {
    busy.value = false
  }
}

async function saveAndGoRole() {
  if (busy.value || creating.value) return
  try {
    await saveDraft()
    void router.push({ name: 'pet-role-setup' })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '保存分镜失败，请稍后重试。'))
  }
}

async function openPlanPreview() {
  if (busy.value || creating.value) return
  planOpen.value = true
  planEstimate.value = null
  planPreview.value = null
  try {
    draft.shots = validStoryboardShots(draft)
    await saveDraft()
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
  if (busy.value || creating.value || previewing.value) return
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
    draft.shots = validStoryboardShots(draft)
    await saveDraft()
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
  if (busy.value || creating.value || previewing.value) return
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
    draft.shots = validStoryboardShots(draft)
    await saveDraft()
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
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '宠物草稿恢复失败，请返回首页重试。'))
  }
  if (draft.shots.length === 0 && hasPrompt(draft)) {
    await handleGenerateStoryboard()
  }
})
</script>

<style scoped>
.pet-storyboard-page,
.pet-panel,
.pet-shot-list,
.pet-empty-state {
  display: grid;
  gap: 16px;
}

.pet-page-head,
.pet-panel,
.pet-shot-card,
.pet-empty-state {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-page-head span,
.pet-shot-card span {
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

.pet-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-storyboard-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px 160px;
  gap: 12px;
}

.pet-storyboard-toolbar input {
  min-height: 46px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  padding: 0 18px;
  font-size: 14px;
}

.pet-storyboard-toolbar button {
  min-height: 46px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  font-size: 14px;
  font-weight: 850;
  cursor: pointer;
}

.pet-storyboard-toolbar button:first-of-type {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

.pet-storyboard-layout {
  display: grid;
  grid-template-columns: minmax(320px, 0.45fr) minmax(0, 1fr);
  gap: 16px;
}

.pet-script-panel {
  align-content: start;
}

.pet-panel-actions button,
.pet-actions button {
  min-height: 36px;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
}

.pet-panel-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-panel-actions button:disabled,
.pet-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.pet-script-input {
  min-height: 430px;
  resize: vertical;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  padding: 12px;
  font-size: 13px;
  line-height: 1.65;
}

.pet-topic-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-topic-tags span {
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 850;
}

.pet-shot-card {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 10px;
}

.pet-shot-index {
  display: grid;
  align-content: start;
  gap: 10px;
  border-right: 1px solid #e4ebf7;
  padding-right: 12px;
}

.pet-shot-index strong {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  font-size: 24px;
  font-weight: 900;
}

.pet-shot-index select {
  width: 64px;
}

.pet-shot-content {
  display: grid;
  gap: 10px;
}

.pet-shot-card label {
  display: grid;
  gap: 6px;
  color: #475467;
  font-size: 12px;
  font-weight: 800;
}

.pet-shot-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.pet-shot-card input,
.pet-shot-card select,
.pet-shot-card textarea {
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #172033;
  padding: 0 12px;
  font-size: 13px;
}

.pet-shot-card textarea {
  min-height: 64px;
  resize: vertical;
  padding: 10px 12px;
  line-height: 1.6;
}

.pet-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
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

@media (max-width: 1080px) {
  .pet-storyboard-toolbar,
  .pet-storyboard-layout {
    grid-template-columns: 1fr;
  }

  .pet-shot-card {
    grid-template-columns: 1fr;
  }

  .pet-shot-index {
    grid-template-columns: 56px 1fr;
    align-items: center;
    border-right: 0;
    border-bottom: 1px solid #e4ebf7;
    padding-right: 0;
    padding-bottom: 10px;
  }
}
</style>
