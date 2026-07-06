<template>
  <section class="pet-works-page">
    <header class="pet-works-head">
      <span>宠物创作中心</span>
      <h2>宠物作品管理</h2>
      <p>管理宠物视频草稿、历史生成和可复用项目，支持复制项目、失败重试、下载和删除。</p>
    </header>

    <div class="pet-works-filters">
      <input v-model="keyword" placeholder="搜索作品标题或模板" />
      <select v-model="activeVideoType">
        <option value="all">全部类型</option>
        <option value="dialogue">宠物对话</option>
        <option value="short_drama">萌宠短剧</option>
        <option value="monologue">萌宠独白</option>
        <option value="talking">宠物口播</option>
        <option value="image_to_video">照片动起来</option>
        <option value="sticker">宠物表情包</option>
      </select>
      <select v-model="activePetType">
        <option value="all">全部宠物</option>
        <option value="cat">小猫</option>
        <option value="dog">小狗</option>
        <option value="other">其他宠物</option>
      </select>
      <select v-model="activeTimeRange">
        <option value="all">全部时间</option>
        <option value="today">今天</option>
        <option value="7d">近 7 天</option>
        <option value="30d">近 30 天</option>
      </select>
      <button type="button" :disabled="!hasActiveFilters" @click="resetFilters">重置筛选</button>
    </div>

    <div class="pet-works-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.label"
        type="button"
        :class="{ active: tab.status === activeStatus }"
        @click="activeStatus = tab.status"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="pet-works-empty">
      <strong>正在加载宠物作品</strong>
      <p>正在根据筛选条件读取草稿、生成中和历史作品。</p>
    </div>
    <div v-else-if="errorMessage" class="pet-works-empty">
      <strong>作品加载失败</strong>
      <p>{{ errorMessage }}</p>
      <button type="button" @click="refreshWorks">重新加载</button>
    </div>
    <div v-else-if="visibleWorks.length === 0" class="pet-works-empty">
      <strong>{{ emptyTitle }}</strong>
      <p>{{ emptyDescription }}</p>
      <RouterLink to="/pet-render">去创建</RouterLink>
    </div>
    <div v-else class="pet-works-grid">
      <PetWorkCard
        v-for="work in visibleWorks"
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

    <section v-if="activePreviewWork" class="pet-preview-panel">
      <div>
        <span>作品预览</span>
        <h3>{{ activePreviewWork.title }}</h3>
        <p>{{ activePreviewWork.templateTitle }} · {{ activePreviewWork.aspectRatio }} · {{ activePreviewWork.durationSeconds }} 秒</p>
        <video v-if="activePreviewWork.videoUrl" :src="activePreviewWork.videoUrl" controls preload="metadata" />
        <p v-else>mock 作品暂无真实视频，真实生成完成后会展示预览。</p>
      </div>
      <button type="button" @click="activePreviewWork = null">关闭</button>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PetWorkCard from './components/PetWorkCard.vue'
import { deletePetWork, downloadPetWork, forkPetWork, listPetWorks, regeneratePetWork } from '../../services/petCreationApi'
import type { PetAspectRatio, PetType, PetVideoType, PetWork, PetWorkStatus } from './petCreationTypes'
import { petErrorMessage } from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'

const tabs: Array<{ label: string; status: PetWorkStatus | 'all' }> = [
  { label: '全部作品', status: 'all' },
  { label: '草稿箱', status: 'draft' },
  { label: '生成中', status: 'running' },
  { label: '已完成', status: 'completed' },
  { label: '生成失败', status: 'failed' },
]

const activeStatus = ref<PetWorkStatus | 'all'>('all')
const activePetType = ref<PetType | 'all'>('all')
const activeVideoType = ref<PetVideoType | 'all'>('all')
const activeTimeRange = ref<'all' | 'today' | '7d' | '30d'>('all')
const keyword = ref('')
const works = ref<PetWork[]>([])
const activePreviewWork = ref<PetWork | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const actionKey = ref('')
const router = useRouter()

usePetApiFallbackNotice()

const hasActiveFilters = computed(
  () =>
    activeStatus.value !== 'all' ||
    activePetType.value !== 'all' ||
    activeVideoType.value !== 'all' ||
    activeTimeRange.value !== 'all' ||
    Boolean(keyword.value.trim()),
)
const emptyTitle = computed(() => (hasActiveFilters.value ? '没有符合条件的宠物作品' : '暂无宠物作品'))
const emptyDescription = computed(() =>
  hasActiveFilters.value
    ? '可以调整关键词、宠物类型或状态筛选后重试。'
    : '完成宠物视频生成后，这里会展示草稿、生成中、已完成和生成失败的作品卡片。',
)
const visibleWorks = computed(() =>
  works.value.filter((work) => matchesVideoType(work) && matchesTimeRange(work)),
)

async function refreshWorks() {
  loading.value = true
  errorMessage.value = ''
  try {
    works.value = await listPetWorks({
      status: activeStatus.value,
      petType: activePetType.value,
      keyword: keyword.value,
    })
  } catch (error) {
    works.value = []
    errorMessage.value = petErrorMessage(error, '作品列表加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void refreshWorks()
})

watch([activeStatus, activePetType, keyword], () => {
  void refreshWorks()
})

function previewWork(work: PetWork) {
  activePreviewWork.value = work
  if (!work.videoUrl) {
    ElMessage.info('mock 作品暂无真实视频，真实生成完成后可在这里预览。')
  }
}

async function forkWork(work: PetWork) {
  await forkWorkAsAspect(work, work.aspectRatio)
}

async function forkWorkAsAspect(work: PetWork, aspectRatio: PetAspectRatio) {
  if (actionKey.value) return
  actionKey.value = `fork-${work.id}-${aspectRatio}`
  try {
    await forkPetWork(work.id, { aspectRatio })
    ElMessage.success(`已复制为 ${aspectRatio} 草稿，可继续编辑。`)
    await refreshWorks()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '复制项目失败，请稍后重试。'))
  } finally {
    actionKey.value = ''
  }
}

async function regenerateWork(work: PetWork) {
  if (actionKey.value) return
  if (work.status === 'failed' && work.retryable !== true) {
    ElMessage.warning('当前失败原因不可直接重试，请复制项目调整素材、台词或分镜后重新生成。')
    return
  }
  actionKey.value = `regenerate-${work.id}`
  try {
    const task = await regeneratePetWork(work.id)
    await refreshWorks()
    void router.push({ name: 'pet-generation-status', params: { taskId: task.id } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '重新生成失败，请稍后重试。'))
  } finally {
    actionKey.value = ''
  }
}

async function downloadWork(work: PetWork) {
  if (actionKey.value) return
  actionKey.value = `download-${work.id}`
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
    actionKey.value = ''
  }
}

async function deleteWork(work: PetWork) {
  if (actionKey.value) return
  try {
    await ElMessageBox.confirm(`确认删除「${work.title}」吗？删除后不可恢复。`, '删除宠物作品', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  actionKey.value = `delete-${work.id}`
  try {
    await deletePetWork(work.id)
    if (activePreviewWork.value?.id === work.id) activePreviewWork.value = null
    ElMessage.success('已删除宠物作品。')
    await refreshWorks()
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '删除作品失败，请稍后重试。'))
  } finally {
    actionKey.value = ''
  }
}

function resetFilters() {
  keyword.value = ''
  activePetType.value = 'all'
  activeVideoType.value = 'all'
  activeTimeRange.value = 'all'
  activeStatus.value = 'all'
}

function matchesVideoType(work: PetWork) {
  if (activeVideoType.value === 'all') return true
  return work.draft?.videoType === activeVideoType.value
}

function matchesTimeRange(work: PetWork) {
  if (activeTimeRange.value === 'all') return true
  const createdAt = Date.parse(work.createdAt)
  if (!Number.isFinite(createdAt)) return true
  const now = Date.now()
  if (activeTimeRange.value === 'today') {
    return new Date(createdAt).toDateString() === new Date(now).toDateString()
  }
  const days = activeTimeRange.value === '7d' ? 7 : 30
  return now - createdAt <= days * 24 * 60 * 60 * 1000
}
</script>

<style scoped>
.pet-works-page {
  display: grid;
  gap: 16px;
}

.pet-works-head,
.pet-works-empty {
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-preview-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  padding: 18px 20px;
}

.pet-preview-panel span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-preview-panel h3 {
  margin: 6px 0;
  color: #172033;
  font-size: 18px;
  font-weight: 900;
}

.pet-preview-panel p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.pet-preview-panel video {
  width: min(520px, 100%);
  margin-top: 12px;
  border-radius: 8px;
  background: #0f172a;
}

.pet-preview-panel button {
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 850;
}

.pet-works-head {
  padding: 18px 20px;
}

.pet-works-head span {
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
}

.pet-works-head h2 {
  margin: 6px 0;
  color: #172033;
  font-size: 20px;
  font-weight: 900;
}

.pet-works-head p,
.pet-works-empty p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-works-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pet-works-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pet-works-filters input,
.pet-works-filters select,
.pet-works-filters button {
  min-height: 38px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #1f2a44;
  padding: 0 12px;
  font-size: 13px;
}

.pet-works-filters button {
  color: #2563eb;
  font-weight: 850;
}

.pet-works-filters button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pet-works-filters input {
  min-width: min(360px, 100%);
  flex: 1 1 260px;
}

.pet-works-tabs button {
  min-height: 34px;
  border: 1px solid #dfe7f5;
  border-radius: 999px;
  background: #ffffff;
  color: #1f2a44;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 800;
}

.pet-works-tabs button.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.pet-works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.pet-works-empty {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 20px;
  text-align: center;
}

.pet-works-empty strong {
  color: #172033;
  font-size: 16px;
  font-weight: 900;
}

.pet-works-empty a,
.pet-works-empty button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 16px;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
}
</style>
