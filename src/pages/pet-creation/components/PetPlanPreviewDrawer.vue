<template>
  <Teleport to="body">
    <div v-if="modelValue" class="pet-plan-backdrop" @click.self="$emit('update:modelValue', false)">
      <aside class="pet-plan-drawer" aria-label="宠物视频生成前确认">
        <header class="pet-plan-head">
          <div>
            <span>生成前确认</span>
            <h2>确认宠物视频方案</h2>
            <p>请核对素材、角色、台词、分镜、参数和预计积分；确认后才会创建真实生成任务。</p>
          </div>
          <button type="button" aria-label="关闭" @click="$emit('update:modelValue', false)">×</button>
        </header>

        <div class="pet-plan-body">
          <section class="pet-plan-summary">
            <article>
              <span>生成模式</span>
              <strong>{{ modeLabel }}</strong>
              <small>{{ apiModeLabel }}</small>
            </article>
            <article>
              <span>预计消耗</span>
              <strong>{{ estimateCostText }}</strong>
              <small>{{ balanceText }}</small>
            </article>
            <article>
              <span>视频参数</span>
              <strong>{{ draft.durationSeconds }} 秒 · {{ draft.aspectRatio }}</strong>
              <small>{{ styleLabel }} · {{ draft.language }}</small>
            </article>
            <article>
              <span>素材/分镜</span>
              <strong>{{ materialGroups.all.length }} 个素材 · {{ validShotCount }} 镜头</strong>
              <small>{{ draft.subtitleEnabled ? '字幕建议' : '无字幕' }} · {{ draft.voiceEnabled ? '配音' : '无配音' }}</small>
            </article>
          </section>

          <p v-if="estimate?.enoughBalance === false" class="pet-plan-error">
            当前积分余额不足，无法提交真实生成任务。
          </p>

          <section v-if="preview" class="pet-plan-dry-run" :class="{ 'pet-plan-dry-run--blocked': !preview.providerSubmitEnabled }">
            <div>
              <span>{{ preview.providerSubmitEnabled ? '真实生成准备' : '本地安全预检' }}</span>
              <strong>{{ preview.message }}</strong>
              <small>
                providerSubmitted={{ preview.providerSubmitted ? 'true' : 'false' }} ·
                taskCreated={{ preview.taskCreated ? 'true' : 'false' }} ·
                wouldCreateTask={{ preview.wouldCreateTask ? 'true' : 'false' }}
              </small>
            </div>
            <div>
              <span>模型与积分</span>
              <strong>{{ preview.modelCode || preview.taskType }}</strong>
              <small>{{ preview.estimatedCreditCost }} 积分 · {{ preview.generationMode }}</small>
            </div>
          </section>

          <section v-if="validation.blockingIssues.length" class="pet-plan-issues pet-plan-issues--error">
            <strong>需要先处理</strong>
            <ul>
              <li v-for="issue in validation.blockingIssues" :key="`${issue.field}-${issue.message}`">
                {{ issue.message }}
              </li>
            </ul>
          </section>

          <section v-if="validation.warnings.length || estimate?.warnings?.length" class="pet-plan-issues">
            <strong>风险提示</strong>
            <ul>
              <li v-for="issue in validation.warnings" :key="`${issue.field}-${issue.message}`">{{ issue.message }}</li>
              <li v-for="warning in estimate?.warnings || []" :key="warning">{{ warning }}</li>
            </ul>
          </section>

          <div class="pet-plan-grid">
            <section class="pet-plan-card">
              <div class="pet-plan-card-head">
                <span>创意描述</span>
                <small>{{ draft.prompt.trim().length }}/500</small>
              </div>
              <p>{{ draft.prompt.trim() || '未填写' }}</p>
            </section>

            <section class="pet-plan-card">
              <div class="pet-plan-card-head">
                <span>宠物素材</span>
                <small>主宠 {{ materialGroups.main.length }} / 第二宠 {{ materialGroups.second.length }} / 人物 {{ materialGroups.human.length }} / 产品 {{ materialGroups.prop.length }} / 场景 {{ materialGroups.scene.length }} / 音频 {{ materialGroups.audio.length }}</small>
              </div>
              <div class="pet-plan-materials">
                <span v-for="material in materialGroups.all" :key="material.id">
                  {{ materialRoleLabel(material.role) }} · {{ material.label || material.assetId || '未命名素材' }}
                </span>
                <em v-if="materialGroups.all.length === 0">未添加素材</em>
              </div>
            </section>

            <section class="pet-plan-card">
              <div class="pet-plan-card-head">
                <span>角色设定</span>
                <small>{{ draft.roles.length }} 个角色</small>
              </div>
              <div class="pet-plan-list">
                <span v-for="role in draft.roles" :key="role.id">
                  {{ role.name || '未命名角色' }} · {{ petTypeLabel(role.type) }} · {{ role.speakingTone || '未设置口吻' }}
                </span>
              </div>
            </section>

            <section class="pet-plan-card">
              <div class="pet-plan-card-head">
                <span>台词与声音</span>
                <small>{{ dialogueCount }} 条台词</small>
              </div>
              <div class="pet-plan-list">
                <span>配音：{{ draft.voiceEnabled ? '开启' : '关闭' }}</span>
                <span>口型同步：{{ draft.lipSyncEnabled ? '开启' : '关闭' }}</span>
                <span>BGM：{{ draft.bgmEnabled ? '开启' : '关闭' }}</span>
              </div>
            </section>

            <section class="pet-plan-card">
              <div class="pet-plan-card-head">
                <span>背景与产品要求</span>
                <small>{{ draft.consistency.keepScene ? '保持场景' : '场景可调整' }}</small>
              </div>
              <div class="pet-plan-list">
                <span>{{ draft.visualSettings.backgroundPrompt || '未设置背景要求' }}</span>
                <span>{{ draft.visualSettings.productPrompt || '未设置产品/道具要求' }}</span>
              </div>
            </section>
          </div>

          <section class="pet-plan-card pet-plan-shot-card">
            <div class="pet-plan-card-head">
              <span>分镜列表</span>
              <small>{{ validShotCount }} 个镜头 · 共 {{ totalShotSeconds }} 秒</small>
            </div>
            <div class="pet-plan-shots">
              <article v-for="shot in validShots" :key="shot.id">
                <b>{{ shot.index }}</b>
                <div>
                  <strong>{{ shot.durationSeconds }} 秒 · {{ shot.cameraMove || '未设置运镜' }}</strong>
                  <p>{{ shot.frameDescription || shot.characterAction || '未填写画面描述' }}</p>
                  <small>{{ shot.subtitle || '无字幕文本' }}</small>
                </div>
              </article>
            </div>
          </section>

          <section v-if="preview" class="pet-plan-card pet-plan-preview-card">
            <div class="pet-plan-card-head">
              <span>Dry-run Prompt Preview</span>
              <small>{{ preview.promptPreview.length }} 字符</small>
            </div>
            <pre>{{ preview.promptPreview }}</pre>
          </section>

          <section v-if="preview" class="pet-plan-card pet-plan-preview-card">
            <div class="pet-plan-card-head">
              <span>Provider Payload Preview</span>
              <small>未提交第三方</small>
            </div>
            <pre>{{ payloadPreviewText }}</pre>
          </section>
        </div>

        <footer class="pet-plan-footer">
          <button type="button" class="pet-plan-secondary" :disabled="loading" @click="$emit('update:modelValue', false)">
            返回编辑
          </button>
          <button type="button" class="pet-plan-secondary" :disabled="previewLoading || loading || !validation.canSubmit" @click="$emit('preview')">
            {{ previewLoading ? '预检中...' : '生成预检 / dry-run' }}
          </button>
          <button type="button" class="pet-plan-primary" :disabled="confirmDisabled" @click="$emit('confirm')">
            {{ primaryButtonText }}
          </button>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetCreationDraft, PetVideoEstimate, PetVideoPreview } from '../petCreationTypes'
import { validatePetCreationDraft, validDialogueLines, validStoryboardShots } from '../petCreationValidation'

const props = defineProps<{
  modelValue: boolean
  draft: PetCreationDraft
  estimate: PetVideoEstimate | null
  preview: PetVideoPreview | null
  loading?: boolean
  previewLoading?: boolean
  apiMode?: string
}>()

defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'preview'): void
  (event: 'confirm'): void
}>()

const validation = computed(() => validatePetCreationDraft(props.draft))
const validShots = computed(() => validStoryboardShots(props.draft))
const validShotCount = computed(() => validShots.value.length)
const totalShotSeconds = computed(() => validShots.value.reduce((sum, shot) => sum + Number(shot.durationSeconds || 0), 0))
const dialogueCount = computed(() => validDialogueLines(props.draft).length)
const confirmDisabled = computed(() => Boolean(props.loading) || Boolean(props.previewLoading) || !validation.value.canSubmit || props.estimate?.enoughBalance === false)
const primaryButtonText = computed(() => {
  if (props.loading) return '提交中...'
  if (props.preview && !props.preview.providerSubmitEnabled) return '预检通过，等待真实生成确认'
  if (!props.preview) return `先预检，再确认生成（${estimateCostText.value}）`
  return `确认真实生成（${estimateCostText.value}）`
})
const payloadPreviewText = computed(() => JSON.stringify(props.preview?.payloadPreview || {}, null, 2))

const materialGroups = computed(() => ({
  all: props.draft.materials,
  main: props.draft.materials.filter((item) => item.role === 'main_pet'),
  second: props.draft.materials.filter((item) => item.role === 'second_pet'),
  human: props.draft.materials.filter((item) => item.role === 'human_avatar'),
  prop: props.draft.materials.filter((item) => item.role === 'prop'),
  scene: props.draft.materials.filter((item) => item.role === 'scene'),
  audio: props.draft.materials.filter((item) => item.role === 'audio'),
}))

const modeLabel = computed(() => {
  if (validation.value.mode === 'text_video') return '纯文本生成'
  if (validation.value.mode === 'dialogue_video') return '多宠物对话'
  if (validation.value.mode === 'image_to_video') return '图片生成视频'
  return '参考图生成'
})

const estimateCostText = computed(() =>
  props.estimate ? `${props.estimate.estimatedCreditCost} 积分` : '估算中',
)

const balanceText = computed(() => {
  if (!props.estimate) return '正在获取余额'
  if (props.estimate.balance == null) return '未获取余额'
  return props.estimate.enoughBalance === false ? `余额 ${props.estimate.balance}，不足` : `余额 ${props.estimate.balance}`
})

const apiModeLabel = computed(() => {
  if (props.apiMode === 'real') return '真实接口模式'
  if (props.apiMode === 'mock') return '本地 mock 模式'
  return 'auto 联调模式'
})

const styleLabel = computed(() => {
  const map: Record<string, string> = {
    realistic: '写实',
    cute: '可爱',
    anime: '动漫',
    anthropomorphic: '拟人',
    funny: '搞笑',
    healing: '治愈',
  }
  return map[props.draft.style] || props.draft.style
})

function materialRoleLabel(role: string) {
  const map: Record<string, string> = {
    main_pet: '主宠物',
    second_pet: '第二宠物',
    human_avatar: '人物/主人',
    prop: '产品/道具',
    scene: '场景',
    audio: '音频',
  }
  return map[role] || role
}

function petTypeLabel(type: string) {
  if (type === 'cat') return '猫'
  if (type === 'dog') return '狗'
  return '其他宠物'
}
</script>

<style scoped>
.pet-plan-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  justify-content: flex-end;
  background: rgba(15, 23, 42, 0.32);
}

.pet-plan-drawer {
  display: grid;
  width: min(860px, 100vw);
  max-height: 100vh;
  grid-template-rows: auto minmax(0, 1fr) auto;
  background: #f7faff;
  box-shadow: -24px 0 60px rgba(15, 23, 42, 0.18);
}

.pet-plan-head,
.pet-plan-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  padding: 18px 22px;
}

.pet-plan-head {
  border-bottom: 1px solid #dfe7f5;
}

.pet-plan-head span,
.pet-plan-card-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-plan-head h2 {
  margin: 4px 0 4px;
  color: #111827;
  font-size: 22px;
  font-weight: 900;
}

.pet-plan-head p,
.pet-plan-card p,
.pet-plan-shots p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.65;
}

.pet-plan-head button {
  width: 34px;
  height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  color: #475467;
  font-size: 20px;
  cursor: pointer;
}

.pet-plan-body {
  display: grid;
  gap: 14px;
  overflow: auto;
  padding: 16px 22px 22px;
}

.pet-plan-summary,
.pet-plan-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.pet-plan-summary article,
.pet-plan-card,
.pet-plan-issues,
.pet-plan-error,
.pet-plan-dry-run {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
}

.pet-plan-summary article {
  display: grid;
  gap: 5px;
  padding: 12px;
}

.pet-plan-summary span,
.pet-plan-summary small,
.pet-plan-list span,
.pet-plan-materials span,
.pet-plan-materials em,
.pet-plan-shots small {
  color: #64748b;
  font-size: 12px;
}

.pet-plan-summary strong {
  color: #172033;
  font-size: 16px;
  font-weight: 900;
}

.pet-plan-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pet-plan-card {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.pet-plan-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.pet-plan-card-head small {
  color: #94a3b8;
  font-size: 12px;
}

.pet-plan-list,
.pet-plan-materials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-plan-list span,
.pet-plan-materials span {
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 6px 9px;
  font-weight: 750;
}

.pet-plan-materials em {
  font-style: normal;
}

.pet-plan-issues {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  color: #92400e;
  background: #fffbeb;
  border-color: #fde68a;
}

.pet-plan-issues--error,
.pet-plan-error {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fecaca;
}

.pet-plan-error {
  margin: 0;
  padding: 12px 14px;
  font-size: 13px;
  font-weight: 850;
}

.pet-plan-issues strong {
  font-size: 13px;
}

.pet-plan-issues ul {
  margin: 0;
  padding-left: 18px;
}

.pet-plan-issues li {
  margin: 4px 0;
  font-size: 13px;
  line-height: 1.5;
}

.pet-plan-dry-run {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 12px;
  padding: 12px 14px;
  border-color: #bfdbfe;
  background: #eff6ff;
}

.pet-plan-dry-run--blocked {
  border-color: #fde68a;
  background: #fffbeb;
}

.pet-plan-dry-run div {
  display: grid;
  gap: 5px;
}

.pet-plan-dry-run span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-plan-dry-run strong {
  color: #172033;
  font-size: 14px;
  line-height: 1.5;
}

.pet-plan-dry-run small {
  color: #64748b;
  font-size: 12px;
}

.pet-plan-shot-card {
  min-height: 160px;
}

.pet-plan-preview-card pre {
  max-height: 220px;
  overflow: auto;
  border-radius: 8px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.6;
  margin: 0;
  padding: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}

.pet-plan-shots {
  display: grid;
  gap: 10px;
}

.pet-plan-shots article {
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  border: 1px solid #e6edf8;
  border-radius: 8px;
  background: #fbfdff;
  padding: 10px;
}

.pet-plan-shots b {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
}

.pet-plan-shots strong {
  color: #172033;
  font-size: 13px;
}

.pet-plan-footer {
  border-top: 1px solid #dfe7f5;
}

.pet-plan-primary,
.pet-plan-secondary {
  min-height: 40px;
  border-radius: 8px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 850;
  cursor: pointer;
}

.pet-plan-primary {
  border: 0;
  background: #2563eb;
  color: #fff;
}

.pet-plan-secondary {
  border: 1px solid #dfe7f5;
  background: #fff;
  color: #1f2a44;
}

.pet-plan-primary:disabled,
.pet-plan-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

@media (max-width: 820px) {
  .pet-plan-summary,
  .pet-plan-grid,
  .pet-plan-dry-run {
    grid-template-columns: 1fr;
  }
}
</style>
