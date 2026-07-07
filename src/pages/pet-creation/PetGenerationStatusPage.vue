<template>
  <section class="pet-status-page">
    <header class="pet-page-head">
      <span>宠物创作中心</span>
      <h2>视频生成中</h2>
      <p>展示宠物视频任务的脚本、分镜、角色一致性、配音和合成进度。</p>
    </header>

    <div v-if="loading" class="pet-panel pet-empty-state">
      <strong>正在恢复任务状态</strong>
      <p>正在根据任务编号读取宠物视频生成进度。</p>
    </div>

    <div v-else-if="errorMessage" class="pet-panel pet-empty-state">
      <strong>任务状态加载失败</strong>
      <p>{{ errorMessage }}</p>
      <div class="pet-empty-actions">
        <button type="button" @click="loadTask">重新加载</button>
        <RouterLink to="/pet-render">返回宠物首页</RouterLink>
      </div>
    </div>

    <div v-else-if="!task" class="pet-panel pet-empty-state">
      <strong>任务不存在或已被清理</strong>
      <p>没有找到当前宠物生成任务，可以返回宠物首页重新提交，或到作品页查看历史草稿。</p>
      <div class="pet-empty-actions">
        <RouterLink to="/pet-render">返回宠物首页</RouterLink>
        <RouterLink to="/pet-works">查看宠物作品</RouterLink>
      </div>
    </div>

    <PetGenerationProgress v-else :task="task" />

    <section v-if="task" class="pet-panel pet-current-shot-panel">
      <div>
        <h3>当前正在处理的分镜</h3>
        <p>共 {{ task.draft.shots.length }} 个分镜，当前生成第 {{ currentShotIndex }} 个分镜。</p>
      </div>
      <div class="pet-shot-preview-row">
        <article
          v-for="(shot, index) in visibleShots"
          :key="shot.id"
          :class="{ active: index + 1 === currentShotIndex }"
          :style="shotCoverStyle(index)"
        >
          <span>分镜 {{ String(shot.index).padStart(2, '0') }}</span>
          <strong v-if="index + 1 === currentShotIndex">正在生成</strong>
        </article>
      </div>
    </section>

    <section v-if="task" class="pet-panel">
      <h3>任务参数</h3>
      <div class="pet-param-grid">
        <span>{{ task.draft.aspectRatio }}</span>
        <span>{{ task.draft.durationSeconds }} 秒</span>
        <span>{{ task.draft.voiceEnabled ? '配音已开启' : '配音未开启' }}</span>
        <span>{{ task.draft.subtitleEnabled ? '字幕已开启' : '字幕未开启' }}</span>
        <span>参考素材 {{ task.draft.materials.length }} 个</span>
      </div>
    </section>

    <section class="pet-panel">
      <h3>生成步骤</h3>
      <div class="pet-step-grid">
        <span v-for="step in steps" :key="step" :class="{ active: step === task?.currentStep }">{{ step }}</span>
      </div>
    </section>

    <section v-if="task?.status === 'completed'" class="pet-panel pet-result-panel">
      <h3>生成结果</h3>
      <video v-if="task.previewUrl" :src="task.previewUrl" controls preload="metadata" />
      <p v-else>任务已完成，但暂未返回可播放地址，请进入作品页检查下载链接或刷新任务状态。</p>
      <RouterLink to="/pet-works">进入作品页</RouterLink>
    </section>

    <section v-if="task?.status === 'failed'" class="pet-panel pet-result-panel">
      <h3>失败原因</h3>
      <p>{{ failureText }}</p>
      <small v-if="task.errorCode">错误码：{{ task.errorCode }}</small>
      <small>{{ task.retryable ? '该任务支持重新生成。' : '该失败原因不可直接重试，请返回编辑后重新提交。' }}</small>
    </section>

    <div class="pet-actions">
      <RouterLink to="/pet-render/storyboard">返回编辑</RouterLink>
      <button type="button" :disabled="!canRetryTask || retrying" @click="retryTask">
        {{ retrying ? '重试中...' : '失败重试' }}
      </button>
      <button type="button" @click="openPetWorks">查看宠物作品</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PetGenerationProgress from './components/PetGenerationProgress.vue'
import { createPetVideoTask, getPetVideoTask } from '../../services/petCreationApi'
import type { PetVideoTask } from './petCreationTypes'
import { petErrorMessage, petFailureMessage } from './petCreationValidation'
import { usePetApiFallbackNotice } from './usePetApiFallbackNotice'

const route = useRoute()
const router = useRouter()
const task = ref<PetVideoTask | null>(null)
const loading = ref(false)
const retrying = ref(false)
const errorMessage = ref('')
const steps = ['脚本生成', '分镜生成', '角色一致性检查', '画面生成', 'AI 配音', '口型同步', '视频合成', '生成完成']
const shotCovers = [
  new URL('../../assets/pet-creation/local-cat-dialogue.jpg', import.meta.url).href,
  new URL('../../assets/pet-creation/local-dog-reaction.jpg', import.meta.url).href,
  new URL('../../assets/pet-creation/local-pet-monologue.jpg', import.meta.url).href,
  new URL('../../assets/pet-creation/local-photo-to-video.jpg', import.meta.url).href,
  new URL('../../assets/pet-creation/local-double-dialogue.jpg', import.meta.url).href,
]
const visibleShots = computed(() => task.value?.draft.shots.slice(0, 5) || [])
const currentShotIndex = computed(() => {
  if (!task.value) return 1
  return Math.min(Math.max(1, Math.ceil(task.value.progress / 14)), Math.max(1, task.value.draft.shots.length))
})
const failureText = computed(() => (task.value ? petFailureMessage(task.value.errorCode, task.value.errorMessage) : ''))
const canRetryTask = computed(() => task.value?.status === 'failed' && task.value.retryable === true)

usePetApiFallbackNotice()

async function retryTask() {
  if (!task.value) return
  if (!canRetryTask.value) {
    ElMessage.warning('当前失败原因不可直接重试，请返回编辑后重新提交。')
    return
  }
  retrying.value = true
  try {
    const nextTask = await createPetVideoTask(task.value.draft)
    void router.push({ name: 'pet-generation-status', params: { taskId: nextTask.id } })
  } catch (error) {
    ElMessage.error(petErrorMessage(error, '重试宠物视频任务失败，请稍后再试。'))
  } finally {
    retrying.value = false
  }
}

async function loadTask() {
  const taskId = typeof route.params.taskId === 'string' ? route.params.taskId : undefined
  loading.value = true
  errorMessage.value = ''
  try {
    task.value = await getPetVideoTask(taskId)
  } catch (error) {
    task.value = null
    errorMessage.value = petErrorMessage(error, '任务状态加载失败，请稍后重试。')
  } finally {
    loading.value = false
  }
}

function openPetWorks() {
  void router.push({ name: 'pet-works' })
}

function shotCoverStyle(index: number) {
  const url = shotCovers[index % shotCovers.length]
  return {
    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.24)), url("${url}")`,
  }
}

onMounted(async () => {
  await loadTask()
})
</script>

<style scoped>
.pet-status-page,
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

.pet-step-grid,
.pet-param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.pet-step-grid span,
.pet-param-grid span {
  min-height: 40px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fbfdff;
  color: #1f2a44;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 850;
}

.pet-step-grid span.active {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.pet-current-shot-panel {
  grid-template-columns: minmax(220px, 0.28fr) minmax(0, 1fr);
  align-items: start;
}

.pet-current-shot-panel p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
}

.pet-shot-preview-row {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.pet-shot-preview-row article {
  position: relative;
  min-height: 138px;
  overflow: hidden;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background-position: center;
  background-size: cover;
}

.pet-shot-preview-row article.active {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.16);
}

.pet-shot-preview-row span,
.pet-shot-preview-row strong {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  padding: 5px 9px;
  font-size: 12px;
  font-weight: 850;
}

.pet-shot-preview-row span {
  top: 8px;
  left: 8px;
  color: #1f2a44;
}

.pet-shot-preview-row strong {
  top: 8px;
  right: 8px;
  color: #2563eb;
}

.pet-empty-state {
  justify-items: start;
}

.pet-empty-state strong {
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.pet-empty-state p,
.pet-result-panel p,
.pet-result-panel small {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.65;
}

.pet-result-panel small {
  color: #475569;
  font-weight: 750;
}

.pet-empty-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.pet-result-panel video {
  width: min(520px, 100%);
  border-radius: 8px;
  background: #0f172a;
}

.pet-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.pet-actions a,
.pet-actions button,
.pet-empty-actions a,
.pet-empty-actions button,
.pet-result-panel a {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.pet-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 1100px) {
  .pet-current-shot-panel,
  .pet-shot-preview-row {
    grid-template-columns: 1fr;
  }
}
</style>
