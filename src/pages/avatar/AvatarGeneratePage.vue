<template>
  <section class="avatar-page app-page-stack">
    <div class="avatar-content">
      <div class="avatar-layout">
        <section class="app-card avatar-panel">
          <div class="avatar-source-tabs">
            <button type="button" :class="{ active: sourceMode === 'AI' }" @click="sourceMode = 'AI'">AI 生成</button>
            <button type="button" :class="{ active: sourceMode === 'UPLOAD' }" @click="sourceMode = 'UPLOAD'">上传形象</button>
          </div>

          <div v-if="sourceMode === 'AI'" class="avatar-form">
            <label>
              形象名称
              <input v-model.trim="form.avatarName" type="text" placeholder="请输入形象名称" />
            </label>
            <label>
              生成提示词
              <textarea
                v-model.trim="form.prompt"
                rows="7"
                placeholder="例如：生成一位适合汽车讲解的数字人形象，干净背景，正面全身，商业摄影质感"
              />
            </label>
            <section class="avatar-outfit-panel" aria-label="数字人全身与换装设置">
              <div class="avatar-section-heading avatar-section-heading-compact">
                <strong>全身照与穿着</strong>
                <span>必选全身照</span>
              </div>
              <div class="avatar-fullbody-note">
                <strong>固定生成全身照</strong>
                <small>用于后续视频分镜保持同一个数字人的身形、站姿和服装风格，减少前后段拼接换人的问题。</small>
              </div>
              <div class="avatar-outfit-options" role="radiogroup" aria-label="常见穿着">
                <button
                  v-for="option in avatarOutfitOptions"
                  :key="option.value"
                  type="button"
                  :class="{ active: form.outfitPreset === option.value }"
                  @click="form.outfitPreset = option.value"
                >
                  <strong>{{ option.label }}</strong>
                  <small>{{ option.description }}</small>
                </button>
              </div>
              <label>
                自定义穿着描述
                <textarea
                  v-model.trim="form.outfitDescription"
                  rows="3"
                  maxlength="500"
                  placeholder="例如：深灰色修身西装，白衬衫，无领带，胸牌，黑色皮鞋"
                />
              </label>
              <p class="avatar-prompt-preview">
                <strong>生成补充：</strong>{{ avatarOutfitPromptPreview }}
              </p>
            </section>
            <div class="avatar-form-grid">
              <label>
                风格
                <select v-model="form.style">
                  <option value="REALISTIC">真实写实</option>
                  <option value="COMMERCIAL">商业口播</option>
                  <option value="PROFESSIONAL">专业讲解</option>
                </select>
              </label>
              <label>
                数量
                <select v-model.number="form.imageCount">
                  <option :value="1">1 张</option>
                  <option :value="2">2 张</option>
                  <option :value="3">3 张</option>
                  <option :value="4">4 张</option>
                </select>
              </label>
              <label>
                尺寸
                <select v-model="form.size">
                  <option value="2K">2K</option>
                  <option value="1K">1K</option>
                </select>
              </label>
            </div>

            <div class="avatar-reference-block">
              <div class="avatar-section-heading">
                <strong>参考图</strong>
                <button type="button" class="app-secondary-button" :disabled="loadingAssets" @click="loadReferenceAssets">
                  {{ loadingAssets ? '刷新中…' : '刷新图片资产' }}
                </button>
              </div>
              <div class="avatar-reference-guide">
                <strong>如何选择参考图</strong>
                <ul>
                  <li>优先选择正面或 3/4 侧脸、五官清晰、光线均匀的人像照。</li>
                  <li>人物主体尽量完整，避免多人合照、夸张遮挡、过度滤镜或复杂背景。</li>
                  <li>想保持同一人物风格时选 1 张最像目标形象的图；想融合造型时最多勾选 2-3 张。</li>
                </ul>
              </div>
              <p v-if="referenceAssets.length === 0" class="app-muted avatar-small">资产中心暂无图片资产，可先上传形象照或直接文生图。</p>
              <div v-else class="avatar-reference-list">
                <div class="avatar-reference-actions">
                  <span>已选 {{ selectedReferenceAssets.length }} 张</span>
                  <button type="button" class="app-secondary-button" @click="selectAllReferenceAssets">全选</button>
                  <button type="button" class="app-secondary-button" @click="clearReferenceAssets">清空</button>
                  <button
                    type="button"
                    class="avatar-ref-delete avatar-ref-batch-delete"
                    :disabled="batchDeleting || selectedDeletableReferenceAssets.length === 0"
                    @click="deleteSelectedReferenceAssets"
                  >
                    {{ batchDeleting ? '删除中…' : `批量删除${selectedDeletableReferenceAssets.length ? ` ${selectedDeletableReferenceAssets.length}` : ''}` }}
                  </button>
                </div>
                <div v-for="asset in referenceAssets" :key="asset.assetId" class="avatar-reference-item">
                  <label class="avatar-reference-pick">
                    <input v-model="form.referenceAssetIds" type="checkbox" :value="asset.assetId" />
                    <img :src="assetUrl(asset.fileUrl)" :alt="asset.fileName" />
                    <span class="avatar-reference-name">{{ asset.fileName }}</span>
                  </label>
                  <button
                    v-if="canDeleteReferenceAsset(asset)"
                    type="button"
                    class="avatar-ref-delete"
                    title="从资产中删除（仅私有）"
                    :disabled="deletingAssetIds.has(asset.assetId)"
                    @click="deleteReferenceAsset(asset)"
                  >
                    {{ deletingAssetIds.has(asset.assetId) ? '…' : '删除' }}
                  </button>
                </div>
              </div>
            </div>

            <BillingEstimateBanner
              v-if="sourceMode === 'AI'"
              :estimated-credit-cost="avatarEstimate.estimatedCreditCost.value"
              :balance="avatarEstimate.balance.value"
              :loading="avatarEstimate.loading.value"
              :steps="avatarEstimate.steps.value"
            />

            <button
              class="app-primary-button"
              type="button"
              :disabled="submitting || !canGenerate || (sourceMode === 'AI' && !!avatarEstimate.insufficientHint.value)"
              :title="sourceMode === 'AI' ? (avatarEstimate.insufficientHint.value ?? '') : ''"
              @click="submitGenerate"
            >
              {{ submitting ? '提交中…' : '生成形象' }}
            </button>
          </div>

          <div v-else class="avatar-form">
            <label>
              形象名称
              <input v-model.trim="uploadName" type="text" placeholder="请输入形象名称" />
            </label>
            <label>
              选择图片
              <input type="file" accept="image/*" @change="onFileChange" />
            </label>
            <button class="app-primary-button" type="button" :disabled="uploading || !uploadFile || !uploadName" @click="submitUpload">
              {{ uploading ? '上传中…' : '上传并保存形象' }}
            </button>
          </div>

          <p v-if="errorMessage" class="app-error avatar-error">{{ errorMessage }}</p>
        </section>

        <section class="app-card avatar-panel avatar-result-panel">
          <div class="avatar-section-heading">
            <h3>生成结果</h3>
            <div v-if="taskStatus" class="avatar-task-head-right">
              <span class="avatar-status">{{ taskStatus }}</span>
              <div v-if="showTaskProgressBar" class="avatar-progress-row">
                <div
                  class="avatar-progress-track"
                  role="progressbar"
                  :aria-valuemin="0"
                  :aria-valuemax="100"
                  :aria-valuenow="barProgressPercent"
                >
                  <div class="avatar-progress-fill" :style="{ width: `${barProgressPercent}%` }" />
                </div>
                <span class="avatar-progress-pct">{{ barProgressPercent }}%</span>
              </div>
            </div>
          </div>
          <p v-if="taskError" class="app-error">{{ taskError }}</p>
          <p v-if="saveMessage" class="app-muted avatar-small">{{ saveMessage }}</p>
          <div v-if="generatedAvatars.length === 0" class="app-empty-block avatar-result-empty">
            提交生成任务后，这里会展示可选形象。
          </div>
          <div v-else class="avatar-grid">
            <article v-for="avatar in generatedAvatars" :key="avatar.avatarId" class="avatar-card">
              <img :src="assetUrl(avatar.previewUrl)" :alt="avatar.avatarName" />
              <div>
                <strong>{{ avatar.avatarName }}</strong>
                <span class="avatar-saved-badge">已自动保存到资产中心</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section class="app-card avatar-panel">
        <div class="avatar-section-heading">
          <h3>形象库</h3>
          <button type="button" class="app-secondary-button" :disabled="loadingAvatars" @click="loadAvatars">
            {{ loadingAvatars ? '刷新中…' : '刷新' }}
          </button>
        </div>
        <div v-if="avatars.length === 0" class="app-empty-block">暂无形象，先上传或生成一张。</div>
        <div v-else class="avatar-library">
          <article v-for="avatar in avatars" :key="avatar.avatarId" class="avatar-library-card" :class="{ active: avatar.defaultAvatar }">
            <img :src="assetUrl(avatar.previewUrl)" :alt="avatar.avatarName" />
            <div>
              <strong>{{ avatar.avatarName }}</strong>
              <p class="app-muted">{{ sourceLabel(avatar) }} · {{ visibilityLabel(avatar) }}</p>
            </div>
            <button
              v-if="canManageAvatar(avatar)"
              class="app-secondary-button"
              type="button"
              :disabled="avatar.defaultAvatar"
              @click="setAsDefault(avatar)"
            >
              {{ avatar.defaultAvatar ? '默认形象' : '设为默认形象' }}
            </button>
            <span v-else class="avatar-public-badge">公共形象</span>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'
import { deleteAsset, getAssets } from '../../services/assetApi'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { newIdempotencyKey } from '../../services/taskApi'
import {
  generateAvatar,
  getAvatars,
  updateAvatar,
  uploadAvatar,
} from '../../services/avatarApi'
import { trackTaskResult } from '../../services/taskRealtime'
import type { AssetItem } from '../../types/assetTypes'
import type { AvatarGenerateRequest, AvatarGenerateTaskResult, AvatarItem } from '../../types/avatarTypes'

const sourceMode = ref<'AI' | 'UPLOAD'>('AI')
const loggedIn = ref(false)
const form = reactive<AvatarGenerateRequest>({
  avatarName: '',
  prompt: '生成一位适合汽车销售讲解的真实数字人形象，干净背景，正面全身，商业摄影质感，不要文字、表格、说明卡片或水印',
  referenceAssetIds: [],
  style: 'REALISTIC',
  framing: 'FULL_BODY',
  outfitPreset: 'car_sales_suit',
  outfitDescription: '',
  imageCount: 4,
  size: '2K',
})
const avatarOutfitOptions = [
  {
    value: 'car_sales_suit',
    label: '汽车销售西装',
    description: '深色西装、白衬衫、胸牌，适合门店讲解',
    prompt: '深色合身商务西装，白衬衫，佩戴简洁胸牌，黑色皮鞋，汽车销售顾问气质',
  },
  {
    value: 'white_shirt_slacks',
    label: '白衬衫西裤',
    description: '干净亲和，适合短视频口播',
    prompt: '白色长袖衬衫，黑色西裤，简洁皮带，黑色皮鞋，亲和专业',
  },
  {
    value: 'tech_casual',
    label: '科技休闲',
    description: '适合新能源、智能座舱讲解',
    prompt: '浅色科技感夹克或针织外套，内搭纯色 T 恤，深色长裤，干净现代',
  },
  {
    value: 'premium_black',
    label: '高级黑商务',
    description: '稳重、高端，适合豪华车型',
    prompt: '全黑高级商务穿搭，黑色西装外套，深色内搭，黑色长裤，克制高级',
  },
  {
    value: 'custom',
    label: '自定义',
    description: '使用下方自定义描述',
    prompt: '',
  },
]
const selectedAvatarOutfitOption = computed(() =>
  avatarOutfitOptions.find((item) => item.value === form.outfitPreset) || avatarOutfitOptions[0],
)
const avatarOutfitPromptPreview = computed(() => {
  const custom = form.outfitDescription?.trim()
  const outfit = custom || selectedAvatarOutfitOption.value.prompt || '按用户自定义穿着生成'
  return `全身照，单人正面站姿，从头到脚完整入镜，服装保持一致；穿着：${outfit}；画面不要文字、表格、说明卡片或水印。`
})
// 与后端 createTask 实际预扣金额完全一致；数字人形象按张数动态预估，更贴近实际结算。
const avatarEstimate = useBillingEstimate({
  taskType: 'AVATAR_GENERATE',
  watchKeys: () => form.imageCount,
  buildRequest: () => ({ imageCount: form.imageCount }),
})

async function refreshLocalBalance() {
  await avatarEstimate.refresh()
}

const uploadName = ref('')
const uploadFile = ref<File | null>(null)

const referenceAssets = ref<AssetItem[]>([])
const avatars = ref<AvatarItem[]>([])
const generatedAvatars = ref<AvatarItem[]>([])
const loadingAssets = ref(false)
const loadingAvatars = ref(false)
const submitting = ref(false)
/** 单次「生成形象」提交周期内复用 Idempotency-Key */
const avatarGenIdempotencyKey = ref<string | null>(null)
const uploading = ref(false)
const errorMessage = ref('')
const taskError = ref('')
const saveMessage = ref('')
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
let stopTaskTracking: (() => void) | null = null
const deletingAssetIds = ref<Set<number>>(new Set())
const batchDeleting = ref(false)

const { showTaskProgressBar, barProgressPercent, reset: resetSmoothProgress } = useSmoothTaskProgress(
  taskStatus,
  taskProgress,
)

const canGenerate = computed(() => Boolean(form.avatarName && form.prompt && form.imageCount >= 1))
const selectedReferenceAssets = computed(() => {
  const selectedIds = new Set(form.referenceAssetIds)
  return referenceAssets.value.filter((asset) => selectedIds.has(asset.assetId))
})
const selectedDeletableReferenceAssets = computed(() => selectedReferenceAssets.value.filter(canDeleteReferenceAsset))

onMounted(async () => {
  loggedIn.value = !!getAuthToken()
  await Promise.all([loadReferenceAssets(), loadAvatars(), avatarEstimate.refresh()])
})

onBeforeUnmount(() => {
  stopPoll()
})

async function loadReferenceAssets() {
  loadingAssets.value = true
  try {
    referenceAssets.value = await getAssets({ assetType: 'IMAGE' })
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加载图片资产失败'
  } finally {
    loadingAssets.value = false
  }
}

/** 列表中「有归属人」的条目在当前会话下即为当前用户私有资产（未登录时仅公共资产，无归属人） */
function canDeleteReferenceAsset(asset: AssetItem) {
  return asset.ownerUserId != null
}

function selectAllReferenceAssets() {
  form.referenceAssetIds = referenceAssets.value.map((asset) => asset.assetId)
}

function clearReferenceAssets() {
  form.referenceAssetIds = []
}

async function deleteReferenceAsset(asset: AssetItem) {
  if (!canDeleteReferenceAsset(asset)) {
    return
  }
  const ok = window.confirm(`确定从资产中删除「${asset.fileName}」？删除后不可恢复。`)
  if (!ok) {
    return
  }
  deletingAssetIds.value = new Set([asset.assetId])
  errorMessage.value = ''
  try {
    await deleteAsset(asset.assetId)
    form.referenceAssetIds = form.referenceAssetIds.filter((id) => id !== asset.assetId)
    referenceAssets.value = referenceAssets.value.filter((a) => a.assetId !== asset.assetId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    deletingAssetIds.value = new Set()
  }
}

async function deleteSelectedReferenceAssets() {
  const assets = selectedDeletableReferenceAssets.value
  if (assets.length === 0) {
    return
  }
  const skippedCount = selectedReferenceAssets.value.length - assets.length
  const ok = window.confirm(
    `确定从资产中批量删除 ${assets.length} 张参考图？删除后不可恢复。${skippedCount > 0 ? `\n已跳过 ${skippedCount} 张不可删除的公共资产。` : ''}`,
  )
  if (!ok) {
    return
  }
  const deletingIds = new Set(assets.map((asset) => asset.assetId))
  batchDeleting.value = true
  deletingAssetIds.value = deletingIds
  errorMessage.value = ''
  try {
    const results = await Promise.allSettled(assets.map((asset) => deleteAsset(asset.assetId)))
    const deletedIds = new Set<number>()
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        deletedIds.add(assets[index].assetId)
      }
    })
    if (deletedIds.size > 0) {
      form.referenceAssetIds = form.referenceAssetIds.filter((id) => !deletedIds.has(id))
      referenceAssets.value = referenceAssets.value.filter((asset) => !deletedIds.has(asset.assetId))
    }
    if (deletedIds.size < assets.length) {
      errorMessage.value = `已删除 ${deletedIds.size} 张，${assets.length - deletedIds.size} 张删除失败，请稍后重试。`
    } else {
      ElMessage.success(`已删除 ${deletedIds.size} 张参考图`)
    }
  } finally {
    batchDeleting.value = false
    deletingAssetIds.value = new Set()
  }
}

async function loadAvatars() {
  loadingAvatars.value = true
  try {
    avatars.value = await getAvatars()
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加载形象库失败'
  } finally {
    loadingAvatars.value = false
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  uploadFile.value = input.files?.[0] || null
}

async function submitUpload() {
  if (!uploadFile.value) {
    return
  }
  uploading.value = true
  errorMessage.value = ''
  saveMessage.value = ''
  try {
    const avatar = await uploadAvatar(uploadName.value, uploadFile.value)
    generatedAvatars.value = [avatar]
    await Promise.all([loadAvatars(), loadReferenceAssets()])
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '上传失败'
  } finally {
    uploading.value = false
  }
}

async function submitGenerate() {
  if (!canGenerate.value) {
    return
  }
  if (submitting.value) {
    return
  }
  if (!avatarGenIdempotencyKey.value) {
    avatarGenIdempotencyKey.value = newIdempotencyKey()
  }
  submitting.value = true
  errorMessage.value = ''
  taskError.value = ''
  saveMessage.value = ''
  generatedAvatars.value = []
  try {
    const res = await generateAvatar({ ...form }, avatarGenIdempotencyKey.value)
    avatarGenIdempotencyKey.value = null
    rememberSessionTaskId(res.taskId)
    resetSmoothProgress()
    taskStatus.value = res.status
    taskProgress.value = 0
    startTaskTracking(res.taskId)
    await refreshLocalBalance()
    const cost = avatarEstimate.estimatedCreditCost.value
    if (cost > 0) {
      ElMessage.success(`任务已提交，已预扣 ${cost} 积分`)
    } else {
      ElMessage.success('任务已提交')
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '提交生成失败'
    errorMessage.value = msg
    avatarGenIdempotencyKey.value = null
    if (msg.includes('积分余额不足') || msg.includes('40900')) {
      ElMessage.error('积分余额不足，无法提交当前任务')
    }
  } finally {
    submitting.value = false
  }
}

function startTaskTracking(taskId: number) {
  stopTracking()
  stopTaskTracking = trackTaskResult<AvatarGenerateTaskResult>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      taskError.value = message.errorMessage || ''
    },
    async onResult(taskResult) {
      taskStatus.value = String(taskResult.status)
      taskProgress.value = taskResult.progress ?? 100
      taskError.value = taskResult.errorMessage || ''
      await applyAvatarResult(taskResult.result)
      saveMessage.value = '生成完成，形象已自动保存到资产中心。'
    },
    onFailure(message) {
      taskError.value = message.errorMessage || '形象生成任务失败'
    },
    onError(error) {
      taskError.value = error.message
    },
  })
}

async function setAsDefault(avatar: AvatarItem) {
  if (!canManageAvatar(avatar)) {
    errorMessage.value = '公共形象仅可预览，不能设为个人默认形象'
    return
  }
  errorMessage.value = ''
  try {
    await updateAvatar(avatar.avatarId, { defaultAvatar: true })
    await loadAvatars()
    generatedAvatars.value = generatedAvatars.value.map((item) => ({
      ...item,
      defaultAvatar: item.avatarId === avatar.avatarId,
    }))
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '设置默认形象失败'
  }
}

function stopPoll() {
  stopTracking()
}

function stopTracking() {
  if (stopTaskTracking) {
    stopTaskTracking()
    stopTaskTracking = null
  }
}

async function applyAvatarResult(result: AvatarGenerateTaskResult) {
  await Promise.all([loadAvatars(), loadReferenceAssets()])
  const ids = new Set(result.avatarIds || [])
  const matched = avatars.value.filter((item) => ids.has(item.avatarId))
  if (matched.length) {
    generatedAvatars.value = matched
    return
  }

  const urls = result.previewUrls?.length ? result.previewUrls : result.remoteImageUrls || []
  generatedAvatars.value = urls.map((url, index) => ({
    avatarId: result.avatarIds?.[index] ?? -(index + 1),
    projectId: null,
    taskId: null,
    assetId: result.assetIds?.[index] ?? null,
    ownerUserId: null,
    createdByUserId: null,
    visibility: 'PRIVATE',
    status: 'ACTIVE',
    manageable: true,
    avatarName: `${form.avatarName || 'AI 形象'} ${index + 1}`,
    sourceType: 'AI_GENERATED',
    prompt: form.prompt,
    referenceAssetIds: null,
    previewUrl: url,
    metadataJson: null,
    defaultAvatar: false,
    createdAt: '',
    updatedAt: '',
  }))
  if (!generatedAvatars.value.length) {
    await loadAvatars()
  }
}

function assetUrl(url?: string | null) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}

function canManageAvatar(avatar: AvatarItem) {
  return avatar.manageable !== false
}

function sourceLabel(avatar: AvatarItem) {
  if (avatar.sourceType === 'AVATAR_GENERATE') return '数字人形象生成'
  if (avatar.sourceType === 'AI_GENERATED') return 'AI 生成'
  if (avatar.sourceType === 'USER_UPLOAD') return '用户上传'
  return avatar.sourceType || '形象资产'
}

function visibilityLabel(avatar: AvatarItem) {
  if (avatar.visibility === 'PUBLIC') return '公共'
  if (avatar.visibility === 'PRIVATE') return '私有'
  return avatar.ownerUserId == null ? '公共' : '私有'
}
</script>

<style scoped>
.avatar-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 8px 0 32px;
}

.avatar-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border: 1px solid #e1ecff;
  border-radius: var(--app-radius-lg);
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
  box-shadow: var(--app-shadow);
}

.avatar-eyebrow {
  margin: 0 0 8px;
  color: var(--app-primary);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.avatar-hero h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 850;
}

.avatar-hero p {
  margin: 0;
}

.avatar-hero-card {
  min-width: 190px;
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: var(--app-radius-md);
  background: rgba(255, 255, 255, 0.75);
}

.avatar-hero-card span,
.avatar-small {
  font-size: 12px;
}

.avatar-hero-card strong {
  display: block;
  margin-top: 6px;
}

.avatar-credit-line {
  margin: 0 0 8px;
  font-size: 14px;
  color: #374151;
}

.avatar-credit-line strong {
  color: #111827;
}

.avatar-content {
  display: grid;
  gap: 20px;
}

.avatar-layout {
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(340px, 460px) 1fr;
}

.avatar-panel {
  padding: 22px 24px;
  border-radius: var(--app-radius-lg);
}

.avatar-source-tabs {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
  margin-bottom: 18px;
}

.avatar-source-tabs button {
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
  padding: 12px;
  font-weight: 800;
}

.avatar-source-tabs button.active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.avatar-form {
  display: grid;
  gap: 14px;
}

.avatar-form label {
  display: grid;
  gap: 8px;
  font-weight: 800;
}

.avatar-form input,
.avatar-form select,
.avatar-form textarea {
  width: 100%;
  border: 1px solid var(--app-border-strong);
  border-radius: var(--app-radius-sm);
  background: #fff;
  padding: 11px 12px;
  font-weight: 500;
}

.avatar-form-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
}

.avatar-reference-block {
  padding: 14px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
}

.avatar-reference-guide {
  margin: 12px 0;
  padding: 12px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: var(--app-radius-sm);
  background: rgba(255, 255, 255, 0.74);
}

.avatar-reference-guide strong {
  display: block;
  margin-bottom: 8px;
  color: var(--app-text-main);
  font-size: 13px;
}

.avatar-reference-guide ul {
  margin: 0;
  padding-left: 18px;
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.65;
}

.avatar-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.avatar-section-heading-compact {
  margin-bottom: 10px;
}

.avatar-section-heading-compact strong {
  color: var(--app-text-main);
  font-size: 14px;
}

.avatar-section-heading-compact span {
  border-radius: 999px;
  background: var(--app-primary-soft);
  color: var(--app-primary);
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 900;
}

.avatar-section-heading h3 {
  margin: 0;
  font-size: 18px;
}

.avatar-outfit-panel {
  display: grid;
  gap: 12px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
  padding: 14px;
}

.avatar-fullbody-note {
  display: grid;
  gap: 4px;
  border: 1px solid rgba(99, 102, 241, 0.18);
  border-radius: var(--app-radius-sm);
  background: rgba(255, 255, 255, 0.74);
  padding: 12px;
}

.avatar-fullbody-note strong {
  color: var(--app-text-main);
  font-size: 13px;
}

.avatar-fullbody-note small {
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.avatar-outfit-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.avatar-outfit-options button {
  display: grid;
  min-height: 72px;
  gap: 4px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: #fff;
  color: var(--app-text-main);
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.avatar-outfit-options button.active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
  color: var(--app-primary);
}

.avatar-outfit-options strong {
  font-size: 13px;
  font-weight: 900;
}

.avatar-outfit-options small {
  color: var(--app-text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.avatar-prompt-preview {
  margin: 0;
  border: 1px dashed var(--app-border-strong);
  border-radius: var(--app-radius-sm);
  background: #fff;
  color: var(--app-text-secondary);
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.65;
}

.avatar-prompt-preview strong {
  color: var(--app-text-main);
}

.avatar-reference-list {
  display: grid;
  max-height: 240px;
  gap: 10px;
  overflow: auto;
}

.avatar-reference-actions {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 8px;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-sm);
  background: rgba(255, 255, 255, 0.96);
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 800;
}

.avatar-reference-actions .app-secondary-button,
.avatar-reference-actions .avatar-ref-delete {
  min-height: 30px;
  padding: 5px 10px;
  font-size: 12px;
}

.avatar-reference-item {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: 1fr auto;
  padding: 8px;
  border-radius: var(--app-radius-sm);
  background: #fff;
}

.avatar-reference-pick {
  display: grid;
  align-items: center;
  gap: 10px;
  grid-template-columns: auto 52px 1fr;
  min-width: 0;
  cursor: pointer;
}

.avatar-reference-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  font-size: 13px;
}

.avatar-ref-delete {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: var(--app-radius-sm);
  border: 1px solid rgba(239, 68, 68, 0.45);
  background: rgba(254, 242, 242, 0.9);
  color: #b91c1c;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    opacity 0.15s ease;
}

.avatar-ref-delete:hover:not(:disabled) {
  background: rgba(254, 226, 226, 0.95);
}

.avatar-ref-delete:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.avatar-ref-batch-delete {
  margin-left: auto;
}

.avatar-reference-item img,
.avatar-card img,
.avatar-library-card img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-reference-item img {
  width: 52px;
  height: 52px;
  border-radius: 10px;
}

.avatar-error {
  margin: 14px 0 0;
}

.avatar-result-panel {
  min-width: 0;
}

.avatar-status {
  color: var(--app-text-secondary);
  font-size: 13px;
  font-weight: 800;
}

.avatar-task-head-right {
  display: flex;
  min-width: 0;
  flex: 1;
  max-width: 320px;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.avatar-progress-row {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
}

.avatar-progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf4;
}

.avatar-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--app-primary) 0%, #6366f1 100%);
  transition: width 0.35s ease;
}

.avatar-progress-pct {
  flex-shrink: 0;
  min-width: 2.75rem;
  color: var(--app-text-secondary);
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.avatar-result-empty,
.app-empty-block {
  padding: 24px;
}

.avatar-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(240px, 320px));
  justify-content: start;
}

.avatar-card,
.avatar-library-card {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
}

.avatar-card img {
  display: block;
  height: auto;
  background: #fff;
  object-fit: contain;
}

.avatar-card div {
  display: grid;
  gap: 10px;
  padding: 12px;
}

.avatar-saved-badge {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid #d8d2ff;
  border-radius: var(--app-radius-sm);
  background: #f5f3ff;
  color: var(--app-primary);
  padding: 0 12px;
  font-size: 13px;
  font-weight: 800;
}

.avatar-public-badge {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  border: 1px solid #dbeafe;
  border-radius: var(--app-radius-sm);
  background: #eff6ff;
  color: #1d4ed8;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.avatar-library {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
}

.avatar-library-card {
  display: grid;
  align-items: center;
  gap: 12px;
  grid-template-columns: 72px 1fr auto;
  padding: 12px;
}

.avatar-library-card.active {
  border-color: var(--app-primary);
  background: var(--app-primary-soft);
}

.avatar-library-card img {
  width: 72px;
  height: 72px;
  border-radius: 12px;
}

.avatar-library-card p {
  margin: 4px 0 0;
  font-size: 12px;
}

@media (max-width: 1024px) {
  .avatar-layout {
    grid-template-columns: 1fr;
  }

  .avatar-hero {
    flex-direction: column;
  }
}
</style>
