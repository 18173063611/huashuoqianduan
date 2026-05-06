<template>
  <section class="avatar-page">
    <header class="avatar-hero app-card">
      <div>
        <p class="avatar-eyebrow">数字人形象</p>
        <h2>上传形象照，或用 AI 生成可复用的数字人形象</h2>
        <p class="app-muted">生成或上传的图片会自动进入资产中心，可在这里设为当前项目形象。</p>
      </div>
      <div class="avatar-hero-card">
        <span>当前默认形象</span>
        <strong>{{ defaultAvatar?.avatarName || '未设置' }}</strong>
      </div>
    </header>

    <div v-if="!project" class="app-card app-empty-block">请先在「项目管理」中选择当前项目。</div>

    <template v-else>
      <div class="avatar-layout">
        <section class="app-card avatar-panel">
          <div class="avatar-source-tabs">
            <button type="button" :class="{ active: sourceMode === 'AI' }" @click="sourceMode = 'AI'">AI 生成</button>
            <button type="button" :class="{ active: sourceMode === 'UPLOAD' }" @click="sourceMode = 'UPLOAD'">上传形象</button>
          </div>

          <div v-if="sourceMode === 'AI'" class="avatar-form">
            <label>
              形象名称
              <input v-model.trim="form.avatarName" type="text" placeholder="例如：知识类女主播" />
            </label>
            <label>
              生成提示词
              <textarea
                v-model.trim="form.prompt"
                rows="7"
                placeholder="例如：生成一位适合知识口播的数字人形象，干净背景，正面半身，商业摄影质感"
              />
            </label>
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
              <p class="app-muted avatar-small">
                参考图需要是图片生成服务可访问的地址；本地开发未配置公网访问时，可不选参考图直接生成。
              </p>
              <p v-if="referenceAssets.length === 0" class="app-muted avatar-small">资产中心暂无图片资产，可先上传形象照或直接文生图。</p>
              <div v-else class="avatar-reference-list">
                <label v-for="asset in referenceAssets" :key="asset.assetId" class="avatar-reference-item">
                  <input v-model="form.referenceAssetIds" type="checkbox" :value="asset.assetId" />
                  <img :src="assetUrl(asset.fileUrl)" alt="" />
                  <span>{{ asset.fileName }}</span>
                </label>
              </div>
            </div>

            <button class="app-primary-button" type="button" :disabled="submitting || !canGenerate" @click="submitGenerate">
              {{ submitting ? '提交中…' : '生成形象' }}
            </button>
          </div>

          <div v-else class="avatar-form">
            <label>
              形象名称
              <input v-model.trim="uploadName" type="text" placeholder="例如：品牌主理人形象" />
            </label>
            <label>
              选择图片
              <input type="file" accept="image/*" @change="onFileChange" />
            </label>
            <button class="app-primary-button" type="button" :disabled="uploading || !uploadFile" @click="submitUpload">
              {{ uploading ? '上传中…' : '上传并保存形象' }}
            </button>
          </div>

          <p v-if="errorMessage" class="app-error avatar-error">{{ errorMessage }}</p>
        </section>

        <section class="app-card avatar-panel avatar-result-panel">
          <div class="avatar-section-heading">
            <h3>生成结果</h3>
            <span v-if="taskStatus" class="avatar-status">{{ taskStatus }}<template v-if="taskProgress != null"> · {{ taskProgress }}%</template></span>
          </div>
          <p v-if="taskError" class="app-error">{{ taskError }}</p>
          <div v-if="generatedAvatars.length === 0" class="app-empty-block avatar-result-empty">
            提交生成任务后，这里会展示可选形象。
          </div>
          <div v-else class="avatar-grid">
            <article v-for="avatar in generatedAvatars" :key="avatar.avatarId" class="avatar-card">
              <img :src="assetUrl(avatar.previewUrl)" :alt="avatar.avatarName" />
              <div>
                <strong>{{ avatar.avatarName }}</strong>
                <button class="app-secondary-button" type="button" @click="setAsDefault(avatar)">设为项目形象</button>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section class="app-card avatar-panel">
        <div class="avatar-section-heading">
          <h3>项目形象库</h3>
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
              <p class="app-muted">{{ avatar.sourceType === 'AI_GENERATED' ? 'AI 生成' : '用户上传' }}</p>
            </div>
            <button class="app-secondary-button" type="button" :disabled="avatar.defaultAvatar" @click="setAsDefault(avatar)">
              {{ avatar.defaultAvatar ? '当前形象' : '设为项目形象' }}
            </button>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { getProjectAssets } from '../../services/assetApi'
import { API_ORIGIN } from '../../services/request'
import {
  generateAvatar,
  getAvatarGenerateTask,
  getProjectAvatars,
  updateAvatar,
  uploadAvatar,
} from '../../services/avatarApi'
import type { AssetItem } from '../../types/assetTypes'
import type { AvatarGenerateRequest, AvatarItem } from '../../types/avatarTypes'
import type { ProjectItem } from '../../types/projectTypes'

const props = defineProps<{
  project?: ProjectItem
}>()

const sourceMode = ref<'AI' | 'UPLOAD'>('AI')
const form = reactive<AvatarGenerateRequest>({
  projectId: 0,
  avatarName: '知识类女主播',
  prompt: '生成一位适合知识口播的数字人形象，干净背景，正面半身，商业摄影质感',
  referenceAssetIds: [],
  style: 'REALISTIC',
  imageCount: 4,
  size: '2K',
})
const uploadName = ref('上传形象')
const uploadFile = ref<File | null>(null)

const referenceAssets = ref<AssetItem[]>([])
const avatars = ref<AvatarItem[]>([])
const generatedAvatars = ref<AvatarItem[]>([])
const loadingAssets = ref(false)
const loadingAvatars = ref(false)
const submitting = ref(false)
const uploading = ref(false)
const errorMessage = ref('')
const taskError = ref('')
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const pollTimer = ref<number | null>(null)

const defaultAvatar = computed(() => avatars.value.find((item) => item.defaultAvatar))
const canGenerate = computed(() => Boolean(props.project && form.avatarName && form.prompt && form.imageCount >= 1))

watch(
  () => props.project?.projectId,
  async (projectId) => {
    stopPoll()
    errorMessage.value = ''
    taskError.value = ''
    taskStatus.value = ''
    taskProgress.value = null
    generatedAvatars.value = []
    form.referenceAssetIds = []
    if (projectId) {
      form.projectId = projectId
      await Promise.all([loadReferenceAssets(), loadAvatars()])
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopPoll()
})

async function loadReferenceAssets() {
  if (!props.project) {
    return
  }
  loadingAssets.value = true
  try {
    referenceAssets.value = await getProjectAssets(props.project.projectId, 'IMAGE')
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '加载图片资产失败'
  } finally {
    loadingAssets.value = false
  }
}

async function loadAvatars() {
  if (!props.project) {
    return
  }
  loadingAvatars.value = true
  try {
    avatars.value = await getProjectAvatars(props.project.projectId)
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
  if (!props.project || !uploadFile.value) {
    return
  }
  uploading.value = true
  errorMessage.value = ''
  try {
    const avatar = await uploadAvatar(props.project.projectId, uploadName.value || '上传形象', uploadFile.value)
    generatedAvatars.value = [avatar]
    await Promise.all([loadAvatars(), loadReferenceAssets()])
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '上传失败'
  } finally {
    uploading.value = false
  }
}

async function submitGenerate() {
  if (!props.project || !canGenerate.value) {
    return
  }
  submitting.value = true
  errorMessage.value = ''
  taskError.value = ''
  generatedAvatars.value = []
  try {
    const res = await generateAvatar({ ...form, projectId: props.project.projectId })
    taskStatus.value = res.status
    taskProgress.value = 10
    startPoll(res.taskId)
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '提交生成失败'
  } finally {
    submitting.value = false
  }
}

function startPoll(taskId: number) {
  stopPoll()
  void pollOnce(taskId)
  pollTimer.value = window.setInterval(() => {
    void pollOnce(taskId)
  }, 3000)
}

async function pollOnce(taskId: number) {
  try {
    const detail = await getAvatarGenerateTask(taskId)
    taskStatus.value = detail.status
    taskProgress.value = detail.progress
    taskError.value = detail.errorMessage || ''
    if (detail.avatars?.length) {
      generatedAvatars.value = detail.avatars
    }
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopPoll()
      await Promise.all([loadAvatars(), loadReferenceAssets()])
    }
  } catch (e) {
    taskError.value = e instanceof Error ? e.message : '查询生成任务失败'
  }
}

async function setAsDefault(avatar: AvatarItem) {
  errorMessage.value = ''
  try {
    await updateAvatar(avatar.avatarId, { defaultAvatar: true })
    await loadAvatars()
    generatedAvatars.value = generatedAvatars.value.map((item) => ({
      ...item,
      defaultAvatar: item.avatarId === avatar.avatarId,
    }))
  } catch (e) {
    errorMessage.value = e instanceof Error ? e.message : '设置项目形象失败'
  }
}

function stopPoll() {
  if (pollTimer.value != null) {
    window.clearInterval(pollTimer.value)
    pollTimer.value = null
  }
}

function assetUrl(url?: string | null) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`
}
</script>

<style scoped>
.avatar-page {
  display: flex;
  max-width: var(--app-content-width);
  flex-direction: column;
  gap: 20px;
  margin: 0 auto;
  padding: 8px 8px 32px;
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

.avatar-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.avatar-section-heading h3 {
  margin: 0;
  font-size: 18px;
}

.avatar-reference-list {
  display: grid;
  max-height: 240px;
  gap: 10px;
  overflow: auto;
}

.avatar-reference-item {
  display: grid;
  align-items: center;
  gap: 10px;
  grid-template-columns: auto 52px 1fr;
  padding: 8px;
  border-radius: var(--app-radius-sm);
  background: #fff;
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

.avatar-result-empty,
.app-empty-block {
  padding: 24px;
}

.avatar-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.avatar-card,
.avatar-library-card {
  overflow: hidden;
  border: 1px solid var(--app-border);
  border-radius: var(--app-radius-md);
  background: var(--app-surface-soft);
}

.avatar-card img {
  height: 210px;
  background: #eef2ff;
}

.avatar-card div {
  display: grid;
  gap: 10px;
  padding: 12px;
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
