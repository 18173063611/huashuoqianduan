<template>
  <section class="app-card app-page-stack">
    <div class="app-card-header">
      <div>
        <h2 class="app-card-title">任务中心</h2>
        <p class="app-muted">
          登录后查看与您账号相关的<strong>全部任务</strong>（含公共演示任务与本人任务）。可在
          <RouterLink class="task-hub-asset-link" to="/assets?tab=tasks">资产中心 · 最近任务</RouterLink>
          查看预扣与积分详情。
        </p>
      </div>
      <button
        class="app-secondary-button"
        type="button"
        :disabled="loading || !canQuery"
        @click="loadData(false)"
      >
        {{ loading ? '加载中...' : '刷新' }}
      </button>
    </div>

    <p v-if="!canQuery && !hasSessionTasks && panelActive" class="app-muted task-hint">
      请先<strong>登录</strong>以查看全部任务。
    </p>

    <p v-else-if="!canQuery && hasSessionTasks && panelActive" class="app-muted task-hint">
      当前为<strong>本机会话任务</strong>视图（未登录时）：展示你在此浏览器里触发过的任务。
    </p>

    <template v-if="canQuery || hasSessionTasks">
      <div class="app-selected-project">
        <strong>全部任务</strong>
        <span v-if="summary" class="task-count-inline">
          · 进行中 {{ summary.processingCount }} · 成功 {{ summary.successCount }} · 失败/取消等
          {{ summary.failedCount }}
        </span>
      </div>

      <div class="task-toolbar">
        <select v-model="taskTypeFilter" class="asset-type-select" :disabled="loading" @change="loadData(false)">
          <option value="">全部类型</option>
          <option value="VIDEO_PARSE">视频理解</option>
          <option value="DOUYIN_PARSE_TRANSCRIPT">对标解析与转写</option>
          <option value="DOUYIN_REWRITE">抖音文案改写</option>
          <option value="DOUYIN_TRANSCRIPT">抖音视频转写</option>
          <option value="VIDEO_SCRIPT_ANALYZE">视频分镜解析</option>
          <option value="VIDEO_SCRIPT_URL_ANALYZE">抖音分镜解析</option>
          <option value="TTS_GENERATE">语音合成</option>
          <option value="VOICE_SAMPLE">音色试听</option>
          <option value="AVATAR_GENERATE">数字人形象生成</option>
          <option value="TEXT_TO_VIDEO_SEEDANCE_1_5">文生视频（Seedance 1.5）</option>
          <option value="TEXT_TO_VIDEO_SEEDANCE_2_0">文生视频（Seedance 2.0）</option>
          <option value="IMAGE_TO_VIDEO_SEEDANCE_1_5">图生视频（Seedance 1.5）</option>
          <option value="IMAGE_TO_VIDEO_SEEDANCE_2_0">图生视频（Seedance 2.0）</option>
          <option value="IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST">图生视频（Seedance 2.0 快速）</option>
          <option value="SEEDANCE_TEXT_VIDEO">文生视频（旧）</option>
          <option value="SEEDANCE_FIRST_FRAME_VIDEO">图生视频 · 首帧（旧）</option>
          <option value="SEEDANCE_FIRST_LAST_FRAME_VIDEO">图生视频 · 首尾帧（旧）</option>
          <option value="SEEDANCE_REFERENCE_VIDEO">图生视频 · 参照（旧）</option>
          <option value="SEEDANCE_CAR_SALES_VIDEO">汽车销售成片</option>
          <option value="DIGITAL_HUMAN_GENERATE">数字人口播</option>
        </select>
        <select v-model="statusFilter" class="asset-type-select" :disabled="loading" @change="loadData(false)">
          <option value="">全部状态</option>
          <option value="QUEUED">排队中</option>
          <option value="RUNNING">执行中</option>
          <option value="SUCCESS">成功</option>
          <option value="FAILED">失败</option>
          <option value="RETRYABLE">可重试</option>
          <option value="CANCELED">已取消</option>
        </select>
      </div>

      <p v-if="errorMessage" class="app-error">{{ errorMessage }}</p>

      <div v-if="tasks.length === 0 && !loading" class="app-empty">暂无符合条件的任务。</div>
      <div v-else class="app-file-list">
        <div v-for="task in tasks" :key="task.taskId" class="app-file-item task-row">
          <div class="task-row-main">
            <strong>{{ displayTitle(task) }}</strong>
            <TaskRowSmoothProgress
              v-if="taskRowProgressEligible(task)"
              :task-id="task.taskId"
              :task-updated-at="task.updatedAt"
              :status="task.status"
              :progress="task.progress"
              :virtual-ceil="taskSmoothProgressCeil(task)"
              :smooth-min-step="taskSmoothProgressMinStep(task)"
              :smooth-room-rate="taskSmoothProgressRoomRate(task)"
            />
            <p v-if="taskProgressCaption(task)" class="task-row-stage">
              {{ taskProgressCaption(task) }}
            </p>
            <div v-if="carSalesSegmentBadges(task).length" class="task-segment-badges" aria-label="汽车成片分段进度">
              <span
                v-for="segment in carSalesSegmentBadges(task)"
                :key="segment.index"
                class="task-segment-badge"
                :class="`task-segment-badge--${segment.state}`"
                :title="segment.title"
              >
                {{ segment.label }}
              </span>
            </div>
            <p class="task-row-meta task-row-meta-primary">
              <el-tooltip v-if="task.taskType" :content="task.taskType" placement="top">
                <span>{{ taskTypeLabel(task.taskType) }}</span>
              </el-tooltip>
              <span v-else>{{ taskTypeLabel(task.taskType) }}</span>
              <template v-if="task.modelCode"> · 模型 {{ compactModel(task.modelCode) }}</template>
              <template v-if="(task.creditCost ?? 0) > 0"> · 预扣 {{ task.creditCost }} 积分</template>
              <template v-if="task.createdAt"> · 创建 {{ formatFriendlyDateTime(task.createdAt) }}</template>
              <span v-if="task.status === 'RETRYABLE'" class="task-retry-chip">可重试</span>
              <template v-if="creditRefundHint(task)"> · {{ creditRefundHint(task) }}</template>
            </p>
            <p class="task-row-meta">
              状态 {{ task.status }} · 重试 {{ task.retryCount ?? 0 }} 次
              <template v-if="task.errorCode"> · {{ task.errorCode }} </template>
              <template v-if="task.startedAt">
                · 开始 {{ formatFriendlyDateTime(task.startedAt) }}
              </template>
              <template v-if="task.finishedAt">
                · 结束 {{ formatFriendlyDateTime(task.finishedAt) }}
              </template>
              <template v-if="task.status === 'SUCCESS' && task.resultViewed === false && resultAssetId(task)">
                · <span class="task-unread">结果未读</span>
              </template>
            </p>
            <p v-if="task.errorMessage" class="task-row-err">{{ friendlyTaskErrorMessage(task.errorMessage) }}</p>
          </div>
          <div class="task-row-actions">
            <span class="app-task-status" :class="statusPillClass(task.status)">{{ taskStatusLabel(task.status) }}</span>
            <button
              v-if="canCancelTask(task)"
              type="button"
              class="app-secondary-button task-cancel"
              :disabled="loading"
              @click="handleCancel(task.taskId)"
            >
              取消
            </button>
            <button
              v-if="
                task.status === 'RETRYABLE' ||
                task.status === 'FAILED' ||
                task.status === 'CANCELED'
              "
              type="button"
              class="app-secondary-button task-retry"
              :disabled="loading || retryingTaskId === task.taskId"
              @click="handleRetry(task.taskId)"
            >
              重试
            </button>
            <button
              v-if="task.status === 'SUCCESS' || canOpenRunningProgress(task)"
              type="button"
              class="app-secondary-button task-open-asset"
              :disabled="resultLoading"
              @click="openResult(task)"
            >
              {{ resultLoading && selectedTaskId === task.taskId ? '加载中...' : task.status === 'SUCCESS' ? '查看结果' : '查看进度' }}
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-if="resultModalOpen" class="task-result-mask" @click.self="closeResultModal">
      <section class="task-result-modal" role="dialog" aria-modal="true" aria-label="任务结果">
        <header class="task-result-head">
          <div>
            <h3>{{ selectedResultTask ? displayTitle(selectedResultTask) : '任务结果' }}</h3>
            <p v-if="selectedResultTask" class="app-muted">
              <el-tooltip
                v-if="selectedResultTask.taskType && selectedResultTask.taskType.trim()"
                :content="selectedResultTask.taskType"
                placement="top"
              >
                <span>{{ taskTypeLabel(selectedResultTask.taskType) }}</span>
              </el-tooltip>
              <span v-else>{{ taskTypeLabel(selectedResultTask.taskType) }}</span>
              · 任务 ID {{ selectedResultTask.taskId }}
            </p>
          </div>
          <div class="task-result-head-actions">
            <button
              v-if="canImportSelectedRenderParameters"
              type="button"
              class="task-result-import-button"
              @click="importSelectedRenderParameters"
            >
              导入视频制作
            </button>
            <button type="button" class="task-result-close" aria-label="关闭" @click="closeResultModal">×</button>
          </div>
        </header>

        <p v-if="resultError" class="app-error">{{ resultError }}</p>

        <div v-else-if="isVideoResultTaskType(selectedResultTask?.taskType)" class="task-result-video">
          <video v-if="seedanceVideoUrl" :src="seedanceVideoUrl" controls preload="metadata" />
          <div v-else-if="carSalesPartialVisible" class="task-result-partial">
            <strong>{{ selectedCarSalesStageText }}</strong>
            <span>{{ carSalesCompletedSegmentCount }} / {{ carSalesSegmentCount }} 段已完成</span>
          </div>
          <div v-else class="task-result-empty">
            {{ isActiveTask(selectedResultTask) ? '任务正在准备中，完成首个片段后可在这里预览。' : '未找到视频地址。' }}
          </div>
          <div v-if="carSalesSegmentVideos.length" class="task-result-segments">
            <h4>{{ seedanceVideoUrl ? '分段视频' : '已完成片段预览' }}</h4>
            <div class="task-result-segment-grid">
              <article
                v-for="(segment, idx) in carSalesSegmentVideos"
                :key="segmentKey(segment, idx)"
                class="task-result-segment-item"
              >
                <video :src="segmentVideoUrl(segment)" controls preload="metadata" />
                <div>
                  <strong>片段 {{ idx + 1 }}</strong>
                  <small>资产 ID：{{ segmentAssetId(segment) || '-' }}</small>
                </div>
                <div class="task-segment-actions">
                  <a :href="segmentVideoUrl(segment)" target="_blank" rel="noreferrer">打开片段</a>
                  <button
                    v-if="canRegenerateCarSalesSegment"
                    type="button"
                    class="task-segment-action-button"
                    :disabled="segmentRegenerationState(idx)?.loading || segmentRegenerationState(idx)?.adopting"
                    @click="handleRegenerateSegment(idx)"
                  >
                    {{ segmentRegenerationState(idx)?.loading ? '提交中...' : '重新生成此段' }}
                  </button>
                  <button
                    v-if="canRegenerateCarSalesSegment"
                    type="button"
                    class="task-segment-action-button task-segment-action-button--danger"
                    :disabled="composeBusy || carSalesSegmentVideos.length <= 1"
                    @click="handleRemoveCurrentSegment(idx)"
                  >
                    移除并重拼
                  </button>
                </div>
                <div v-if="segmentRegenerationState(idx)" class="task-segment-regeneration">
                  <div class="task-segment-regeneration-head">
                    <span>
                      重生任务 #{{ segmentRegenerationState(idx)?.taskId || '-' }}
                      · {{ taskStatusLabel(segmentRegenerationState(idx)?.status || 'QUEUED') }}
                      <template v-if="typeof segmentRegenerationState(idx)?.progress === 'number'">
                        {{ segmentRegenerationState(idx)?.progress }}%
                      </template>
                    </span>
                    <button
                      type="button"
                      class="task-segment-mini-button"
                      :disabled="segmentRegenerationState(idx)?.loading"
                      @click="refreshSegmentRegeneration(idx, false)"
                    >
                      刷新
                    </button>
                  </div>
                  <p v-if="segmentRegenerationState(idx)?.error" class="app-error">
                    {{ segmentRegenerationState(idx)?.error }}
                  </p>
                  <video
                    v-if="segmentReplacementVideoUrl(idx)"
                    :src="segmentReplacementVideoUrl(idx)"
                    controls
                    preload="metadata"
                  />
                  <button
                    v-if="canAdoptSegmentRegeneration(idx)"
                    type="button"
                    class="task-segment-adopt-button"
                    :disabled="segmentRegenerationState(idx)?.adopting"
                    @click="handleAdoptSegment(idx)"
                  >
                    {{ segmentRegenerationState(idx)?.adopting ? '重新拼接中...' : '采用此段并重新拼接' }}
                  </button>
                </div>
              </article>
            </div>
            <section v-if="canRegenerateCarSalesSegment" class="task-compose-panel">
              <div class="task-compose-head">
                <div>
                  <h4>手动拼接</h4>
                  <p>按下方顺序重新合成当前成片，可加入资产中心里的任意视频。</p>
                </div>
                <button type="button" class="task-segment-mini-button" :disabled="composeBusy" @click="resetManualComposeSegmentsFromCurrent">
                  恢复当前分段
                </button>
              </div>
              <div class="task-compose-list">
                <article
                  v-for="(item, idx) in manualComposeSegments"
                  :key="`${item.assetId || item.videoUrl}-${idx}`"
                  class="task-compose-item"
                >
                  <video :src="item.videoUrl" controls preload="metadata" />
                  <div class="task-compose-item-main">
                    <strong>{{ idx + 1 }}. {{ item.title || '视频片段' }}</strong>
                    <small>{{ item.assetId ? `资产 ID：${item.assetId}` : '外部视频链接' }}</small>
                  </div>
                  <div class="task-compose-item-actions">
                    <button type="button" :disabled="composeBusy || idx === 0" @click="moveComposeSegment(idx, -1)">上移</button>
                    <button type="button" :disabled="composeBusy || idx === manualComposeSegments.length - 1" @click="moveComposeSegment(idx, 1)">下移</button>
                    <button type="button" :disabled="composeBusy || manualComposeSegments.length <= 1" @click="removeManualComposeSegment(idx)">移除</button>
                  </div>
                </article>
              </div>
              <AssetPicker
                title="选择视频加入拼接"
                asset-type="VIDEO"
                :selected-url="manualVideoPickerUrl"
                placeholder="搜索视频资产..."
                source-hint="从资产中心选择任意视频，加入到当前拼接队列"
                @select="handleManualComposeAssetSelect"
              />
              <p v-if="composeError" class="app-error">{{ composeError }}</p>
              <button
                type="button"
                class="task-compose-submit"
                :disabled="!canComposeCarSalesSegments || composeBusy"
                @click="submitManualCompose"
              >
                {{ composeBusy ? '重新拼接中...' : '按当前顺序重新拼接' }}
              </button>
            </section>
          </div>
          <section
            v-if="selectedResultTask && isImportableRenderTaskType(selectedResultTask.taskType)"
            class="task-parameter-panel"
          >
            <div class="task-parameter-head">
              <div>
                <h4>生成参数</h4>
                <p>本次视频生成使用的请求参数，可导入到视频制作页检查并重新生成。</p>
              </div>
              <button
                v-if="canImportSelectedRenderParameters"
                type="button"
                class="task-result-import-button"
                @click="importSelectedRenderParameters"
              >
                导入视频制作
              </button>
            </div>
            <pre v-if="selectedTaskParameterJsonText" class="task-parameter-json">{{ selectedTaskParameterJsonText }}</pre>
            <div v-else class="task-result-empty">该任务暂无保存参数；新提交的视频任务会自动保存。</div>
          </section>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'TTS_GENERATE'" class="task-result-audio">
          <audio v-if="ttsAudioUrl" :src="normalizePreviewUrl(ttsAudioUrl)" controls preload="metadata" />
          <div v-else class="task-result-empty">未找到音频地址。</div>
        </div>

        <div v-else-if="isStoryboardScriptTask(selectedResultTask?.taskType)" class="task-result-storyboard">
          <template v-if="scriptShots.length">
            <div class="storyboard-toolbar">
              <label class="storyboard-toolbar-label" for="storyboard-shot-select">查看场景</label>
              <select
                id="storyboard-shot-select"
                v-model.number="selectedShotIndex"
                class="storyboard-shot-select"
              >
                <option :value="-1">全部场景（共 {{ scriptShots.length }} 个）</option>
                <option v-for="(shot, index) in scriptShots" :key="shot.order" :value="index">
                  场景{{ orderLabel(shot.order) }}{{ shot.time ? ` · ${shot.time}` : '' }}
                </option>
              </select>
              <div class="storyboard-toolbar-nav" v-if="selectedShotIndex !== -1">
                <button
                  type="button"
                  class="storyboard-nav-button"
                  :disabled="selectedShotIndex <= 0"
                  @click="selectedShotIndex = Math.max(0, selectedShotIndex - 1)"
                >
                  上一个
                </button>
                <span class="storyboard-nav-indicator">
                  {{ selectedShotIndex + 1 }} / {{ scriptShots.length }}
                </span>
                <button
                  type="button"
                  class="storyboard-nav-button"
                  :disabled="selectedShotIndex >= scriptShots.length - 1"
                  @click="selectedShotIndex = Math.min(scriptShots.length - 1, selectedShotIndex + 1)"
                >
                  下一个
                </button>
              </div>
            </div>
            <div class="task-result-table-wrap">
              <table class="task-result-storyboard-table">
                <thead>
                  <tr>
                    <th class="result-col-order">场景序号</th>
                    <th class="result-col-time">时间</th>
                    <th class="result-col-summary">场景概述</th>
                    <th class="result-col-dialogue">台词</th>
                    <th class="result-col-tips">拍摄技巧</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="shot in displayedShots" :key="`${shot.order}-${shot.time}`">
                    <td class="result-col-order">场景{{ orderLabel(shot.order) }}</td>
                    <td class="result-col-time">{{ shot.time || '-' }}</td>
                    <td class="result-col-summary">
                      <div class="task-result-shot-text">{{ shot.page || '-' }}</div>
                      <p v-if="shot.backgroundMusic && shot.backgroundMusic !== '无'" class="task-result-bgm">
                        {{ shot.backgroundMusic }}
                      </p>
                    </td>
                    <td class="result-col-dialogue">{{ shot.content || '-' }}</td>
                    <td class="result-col-tips">{{ shot.highlight || '-' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <div v-else class="task-result-empty">未找到分镜脚本数据。</div>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'DOUYIN_REWRITE'" class="task-result-text">
          {{ douyinRewriteText || '未找到改写文案。' }}
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'AVATAR_GENERATE'" class="task-result-avatar-grid">
          <img
            v-for="url in avatarPreviewUrls"
            :key="url"
            :src="normalizePreviewUrl(url)"
            alt="生成形象"
          />
          <div v-if="!avatarPreviewUrls.length" class="task-result-empty">未找到图片预览地址。</div>
        </div>

        <div v-else-if="selectedResultTask?.taskType === 'DOUYIN_PARSE_TRANSCRIPT'" class="task-result-text">
          {{ douyinTranscriptText || '未找到转写原文。' }}
        </div>

        <pre v-else class="task-result-json">{{ resultJsonText }}</pre>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">

import { computed, ref, watch, watchEffect } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import TaskRowSmoothProgress from '../../components/TaskRowSmoothProgress.vue'
import AssetPicker from '../render/AssetPicker.vue'
import { API_ORIGIN, getAuthToken } from '../../services/request'
import {
  cancelTask,
  getTaskDetail,
  getTaskResult,
  getTaskSummary,
  listTasks,
  markTaskViewed,
  retryTask,
} from '../../services/taskApi'
import { adoptCarSalesSegment, composeCarSalesSegments, regenerateCarSalesSegment } from '../../services/videoApi'
import {
  readRenderTaskSnapshot,
  savePendingRenderTaskImport,
} from '../../services/renderTaskImport'
import { getSessionTaskIds } from '../../services/sessionTaskStore'
import type { AssetItem } from '../../types/assetTypes'
import type { TaskItem, TaskResultItem, TaskSummaryResponse } from '../../types/taskTypes'
import { isStoryboardScriptTask, isVideoResultTaskType, taskTypeLabel } from '../../utils/taskDisplay'
import { formatFriendlyDateTime } from '../../utils/timeFormat'

interface ScriptShot {
  order: number
  time: string
  content: string
  backgroundMusic: string
  page: string
  highlight: string
}

interface SegmentBadge {
  index: number
  label: string
  state: 'done' | 'active' | 'pending'
  title: string
}

interface SegmentRegenerationState {
  taskId: number | null
  status: string
  progress: number | null
  result: Record<string, unknown> | null
  loading: boolean
  adopting: boolean
  error: string
}

interface ManualComposeSegment {
  assetId: number | null
  videoUrl: string
  title: string
  source: 'current' | 'asset'
}

const props = withDefaults(
  defineProps<{
    /** 为 false 时停止轮询（例如切换离开任务页） */
    panelActive?: boolean
  }>(),
  { panelActive: true },
)

const IMPORTABLE_RENDER_TASK_TYPES = new Set([
  'SEEDANCE_CAR_SALES_VIDEO',
  'SEEDANCE_TEXT_VIDEO',
  'TEXT_TO_VIDEO_SEEDANCE_1_5',
  'TEXT_TO_VIDEO_SEEDANCE_2_0',
  'SEEDANCE_FIRST_FRAME_VIDEO',
  'SEEDANCE_FIRST_LAST_FRAME_VIDEO',
  'SEEDANCE_REFERENCE_VIDEO',
  'IMAGE_TO_VIDEO_SEEDANCE_1_5',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
])

const router = useRouter()

const hasToken = ref(false)
const tasks = ref<TaskItem[]>([])
const summary = ref<TaskSummaryResponse | null>(null)
const loading = ref(false)
/** 重试请求进行中时记录 taskId，用于仅禁用对应行的重试按钮 */
const retryingTaskId = ref<number | null>(null)
const errorMessage = ref('')
const taskTypeFilter = ref('')
const statusFilter = ref('')
const resultModalOpen = ref(false)
const resultLoading = ref(false)
const resultError = ref('')
const selectedTaskId = ref<number | null>(null)
const selectedResultTask = ref<TaskItem | null>(null)
const selectedTaskResult = ref<unknown>(null)
const selectedOutputJson = ref<unknown>(null)
const selectedShotIndex = ref(-1)
const segmentRegenerations = ref<Record<number, SegmentRegenerationState>>({})
const manualComposeSegments = ref<ManualComposeSegment[]>([])
const manualVideoPickerUrl = ref('')
const composeBusy = ref(false)
const composeError = ref('')
let loadInFlight = false

const canQuery = computed(() => hasToken.value)
const hasSessionTasks = computed(() => getSessionTaskIds().length > 0)
const resultObject = computed(() => {
  const primary = isRecord(selectedTaskResult.value) ? selectedTaskResult.value : null
  const fallback = isRecord(selectedOutputJson.value) ? selectedOutputJson.value : null
  if (primary && (primary.videoUrl || primary.segmentVideos || primary.partial)) {
    return primary
  }
  return fallback || primary
})
const outputObject = computed(() => (isRecord(selectedOutputJson.value) ? selectedOutputJson.value : null))
const seedanceVideoUrl = computed(() => stringField(resultObject.value, 'videoUrl'))
const carSalesSegmentVideos = computed<Record<string, unknown>[]>(() => {
  const raw = resultObject.value?.segmentVideos
  return Array.isArray(raw) ? raw.filter(isRecord) : []
})
const canRegenerateCarSalesSegment = computed(() => {
  const task = selectedResultTask.value
  return isCarSalesTask(task) && task?.status === 'SUCCESS' && carSalesSegmentVideos.value.length > 0
})
const canComposeCarSalesSegments = computed(() => canRegenerateCarSalesSegment.value && manualComposeSegments.value.length > 0)
const carSalesSegmentCount = computed(() => {
  const raw = resultObject.value?.segmentCount
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Math.max(1, carSalesSegmentVideos.value.length)
})
const carSalesCompletedSegmentCount = computed(() => {
  const raw = resultObject.value?.completedSegmentCount
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Math.min(
    carSalesSegmentCount.value,
    Math.max(Number.isFinite(parsed) ? parsed : 0, carSalesSegmentVideos.value.length),
  )
})
const carSalesPartialVisible = computed(() =>
  isCarSalesTask(selectedResultTask.value) &&
  (carSalesSegmentVideos.value.length > 0 || Boolean(resultObject.value?.partial) || isActiveTask(selectedResultTask.value)),
)
const selectedCarSalesStageText = computed(() => {
  const stage = stringField(resultObject.value, 'stage')
  if (stage) return stage
  const task = selectedResultTask.value
  if (!task) return '正在生成视频片段'
  return taskProgressCaption(task) || '正在生成视频片段'
})
const ttsAudioUrl = computed(() => stringField(resultObject.value, 'previewUrl'))
const scriptShots = computed<ScriptShot[]>(() => {
  const scripts = resultObject.value?.scripts
  return Array.isArray(scripts) ? scripts.filter(isScriptShot) : []
})
const displayedShots = computed<ScriptShot[]>(() => {
  const list = scriptShots.value
  const index = selectedShotIndex.value
  if (index < 0 || index >= list.length) {
    return list
  }
  return [list[index]]
})
const douyinRewriteText = computed(() => stringField(resultObject.value, 'translatedText'))
const avatarPreviewUrls = computed(() => {
  const fromOutput = arrayStringField(outputObject.value, 'previewUrls')
  if (fromOutput.length) {
    return fromOutput
  }
  return arrayStringField(resultObject.value, 'previewUrls')
})
const douyinTranscriptText = computed(() => {
  const transcriptResult = isRecord(resultObject.value?.transcriptResult)
    ? resultObject.value.transcriptResult
    : isRecord(outputObject.value?.transcriptResult)
      ? outputObject.value.transcriptResult
      : null
  return stringField(transcriptResult, 'originalText')
})
const resultJsonText = computed(() => JSON.stringify(selectedTaskResult.value ?? selectedOutputJson.value ?? {}, null, 2))
const selectedTaskParameters = computed(() => {
  const task = selectedResultTask.value
  if (!task) {
    return null
  }
  const parsed = parseJsonObject(task.inputJson)
  if (isRecord(parsed)) {
    return parsed
  }
  const localSnapshot = readRenderTaskSnapshot(task.taskId)
  return isRecord(localSnapshot?.input) ? localSnapshot.input : null
})
const selectedTaskParameterJsonText = computed(() =>
  selectedTaskParameters.value ? JSON.stringify(selectedTaskParameters.value, null, 2) : '',
)
const canImportSelectedRenderParameters = computed(() =>
  Boolean(
    selectedResultTask.value &&
    isImportableRenderTaskType(selectedResultTask.value.taskType) &&
    selectedTaskParameters.value,
  ),
)

function refreshAuthState() {
  hasToken.value = !!getAuthToken()
}

watch(
  () =>
    [
      props.panelActive,
      taskTypeFilter.value,
      statusFilter.value,
    ] as const,
  () => {
    if (!props.panelActive) {
      return
    }
    refreshAuthState()
    void loadData(false)
  },
  { immediate: true },
)

watchEffect((onCleanup) => {
  if (!props.panelActive) {
    return
  }
  refreshAuthState()
  if (!canQuery.value && !hasSessionTasks.value) {
    return
  }
  const hasActive = tasks.value.some((t) => t.status === 'QUEUED' || t.status === 'RUNNING')
  if (!hasActive) {
    return
  }
  const timer = window.setInterval(() => {
    void loadData(true)
  }, 3000)
  onCleanup(() => window.clearInterval(timer))
})

watchEffect((onCleanup) => {
  const task = selectedResultTask.value
  if (!resultModalOpen.value || !task || !isActiveTask(task)) {
    return
  }
  const timer = window.setInterval(() => {
    void refreshSelectedResult(true)
  }, 3500)
  onCleanup(() => window.clearInterval(timer))
})

watchEffect((onCleanup) => {
  if (!resultModalOpen.value) {
    return
  }
  const activeIndexes = Object.entries(segmentRegenerations.value)
    .filter(([, state]) => state.taskId && isActiveStatus(state.status))
    .map(([index]) => Number(index) - 1)
  if (!activeIndexes.length) {
    return
  }
  const timer = window.setInterval(() => {
    activeIndexes.forEach((index) => {
      void refreshSegmentRegeneration(index, true)
    })
  }, 3500)
  onCleanup(() => window.clearInterval(timer))
})

async function loadData(silent: boolean) {
  if (loadInFlight) {
    return
  }
  loadInFlight = true
  refreshAuthState()
  const useSessionFallback = !hasToken.value
  if (useSessionFallback && !hasSessionTasks.value) {
    tasks.value = []
    summary.value = null
    loadInFlight = false
    if (!silent) {
      loading.value = false
    }
    return
  }
  if (!silent) {
    loading.value = true
    errorMessage.value = ''
  }
  try {
    const typeArg = taskTypeFilter.value.trim()
    const statusArg = statusFilter.value.trim()
    if (useSessionFallback) {
      const ids = getSessionTaskIds()
      const details = await Promise.all(ids.map((id) => getTaskDetail(id).catch(() => null)))
      let list = details.filter((x): x is TaskItem => !!x)
      if (typeArg) {
        list = list.filter((t) => t.taskType === typeArg)
      }
      if (statusArg) {
        list = list.filter((t) => String(t.status) === statusArg)
      }
      tasks.value = list
      summary.value = {
        processingCount: list.filter((t) => t.status === 'QUEUED' || t.status === 'RUNNING').length,
        successCount: list.filter((t) => t.status === 'SUCCESS').length,
        failedCount: list.filter((t) => ['FAILED', 'RETRYABLE', 'CANCELED'].includes(String(t.status))).length,
        records: list,
      }
    } else {
      const list = await listTasks({
        ...(typeArg ? { taskType: typeArg } : {}),
        ...(statusArg ? { status: statusArg } : {}),
        pageNo: 1,
        pageSize: 50,
      })
      tasks.value = await hydrateLiveCarSalesRows(list)
      if (silent && summary.value) {
        summary.value = { ...summary.value, records: tasks.value.slice(0, 10) }
      } else {
        const sum = await getTaskSummary()
        summary.value = sum
      }
    }
  } catch (error) {
    if (!silent) {
      errorMessage.value = error instanceof Error ? error.message : '加载任务失败'
    }
  } finally {
    loadInFlight = false
    if (!silent) {
      loading.value = false
    }
  }
}

function shouldHydrateLiveCarSalesTask(task: TaskItem) {
  return isCarSalesTask(task) && isActiveTask(task)
}

async function hydrateLiveCarSalesRows(list: TaskItem[]) {
  const targets = list.filter(shouldHydrateLiveCarSalesTask)
  if (!targets.length) {
    return list
  }
  const results = await Promise.all(
    targets.map((task) =>
      getTaskResult<unknown>(task.taskId)
        .then((result) => ({ taskId: task.taskId, result }))
        .catch(() => null),
    ),
  )
  const resultByTaskId = new Map<number, TaskResultItem<unknown>>(
    results
      .filter((item): item is { taskId: number; result: TaskResultItem<unknown> } => !!item)
      .map((item) => [item.taskId, item.result]),
  )
  return list.map((task) => {
    const result = resultByTaskId.get(task.taskId)
    if (!result) {
      return task
    }
    return {
      ...task,
      taskTitle: result.taskTitle || task.taskTitle,
      status: result.status || task.status,
      progress: result.progress ?? task.progress,
      errorCode: result.errorCode ?? task.errorCode,
      errorMessage: result.errorMessage ?? task.errorMessage,
      outputJson: result.result == null ? task.outputJson : JSON.stringify(result.result),
    }
  })
}

async function handleRetry(taskId: number) {
  if (loading.value || retryingTaskId.value !== null) {
    return
  }
  retryingTaskId.value = taskId
  loading.value = true
  errorMessage.value = ''
  try {
    await retryTask(taskId)
    await loadData(false)
  } catch (error) {
    await loadData(false)
    errorMessage.value = error instanceof Error ? error.message : '重试失败'
  } finally {
    loading.value = false
    retryingTaskId.value = null
  }
}

async function handleCancel(taskId: number) {
  if (loading.value) {
    return
  }
  loading.value = true
  errorMessage.value = ''
  try {
    await cancelTask(taskId)
    await loadData(false)
  } catch (error) {
    await loadData(false)
    errorMessage.value = error instanceof Error ? error.message : '取消失败'
  } finally {
    loading.value = false
  }
}

function displayTitle(task: TaskItem) {
  if (task.taskTitle && task.taskTitle.trim()) {
    return task.taskTitle
  }
  return taskTypeLabel(task.taskType)
}

function compactModel(code: string | null | undefined) {
  if (!code) return '—'
  return code.length > 36 ? `${code.slice(0, 18)}…${code.slice(-8)}` : code
}

/** 与后端退款策略大致对齐：未开始执行即失败/取消多已退；已开始执行后失败默认未自动退。 */
function creditRefundHint(task: TaskItem): string | null {
  const cost = task.creditCost ?? 0
  if (cost <= 0) {
    return null
  }
  const s = String(task.status || '')
  if (s === 'SUCCESS' || s === 'QUEUED' || s === 'RUNNING') {
    return null
  }
  if (s === 'CANCELED') {
    return '已退款'
  }
  if (s === 'FAILED' || s === 'RETRYABLE') {
    return task.startedAt ? '未退款' : '已退款'
  }
  return null
}

function taskRowProgressEligible(task: TaskItem) {
  return task.status === 'QUEUED' || task.status === 'RUNNING' || task.status === 'SUCCESS'
}

function isActiveTask(task: TaskItem | null | undefined) {
  return task?.status === 'QUEUED' || task?.status === 'RUNNING'
}

function isActiveStatus(status: string | null | undefined) {
  return status === 'QUEUED' || status === 'RUNNING'
}

function canCancelTask(task: TaskItem | null | undefined) {
  return task?.status === 'QUEUED' || task?.status === 'RUNNING' || task?.status === 'RETRYABLE'
}

function isCarSalesTask(task: TaskItem | null | undefined) {
  return String(task?.taskType || '').trim().toUpperCase() === 'SEEDANCE_CAR_SALES_VIDEO'
}

function canOpenRunningProgress(task: TaskItem) {
  return isCarSalesTask(task) && isActiveTask(task)
}

function taskStatusLabel(status: string) {
  const raw = String(status || '').toUpperCase()
  const map: Record<string, string> = {
    QUEUED: '排队中',
    RUNNING: '生成中',
    SUCCESS: '已完成',
    FAILED: '失败',
    RETRYABLE: '可重试',
    CANCELED: '已取消',
  }
  return map[raw] || raw || '未知'
}

function taskSegmentCount(task: TaskItem) {
  if (!isCarSalesTask(task)) {
    return 1
  }
  const output = taskOutputObject(task)
  const outputCount = Number(output?.segmentCount ?? 0)
  if (Number.isFinite(outputCount) && outputCount > 0) {
    return Math.max(1, outputCount)
  }
  const cost = Number(task.creditCost ?? task.estimatedCreditCost ?? 0)
  if (Number.isFinite(cost) && cost >= 220) {
    return Math.max(1, Math.round(cost / 220))
  }
  return 4
}

function taskOutputObject(task: TaskItem) {
  const parsed = parseJsonObject(task.outputJson)
  return isRecord(parsed) ? parsed : null
}

function taskCompletedSegmentsByProgress(task: TaskItem) {
  const total = taskSegmentCount(task)
  const output = taskOutputObject(task)
  const outputCompleted = Number(output?.completedSegmentCount ?? Number.NaN)
  if (Number.isFinite(outputCompleted)) {
    return Math.max(0, Math.min(total, outputCompleted))
  }
  const progress = Number(task.progress ?? 0)
  if (progress >= 86) return total
  if (progress <= 22) return 0
  return Math.max(0, Math.min(total, Math.floor(((progress - 22) / 58) * total)))
}

function taskActiveSegmentIndex(task: TaskItem) {
  const output = taskOutputObject(task)
  const rawActive = Number(output?.activeSegmentIndex ?? Number.NaN)
  if (Number.isFinite(rawActive) && rawActive > 0) {
    return Math.max(1, Math.min(taskSegmentCount(task), rawActive))
  }
  if (task.status !== 'RUNNING') {
    return 0
  }
  const completed = taskCompletedSegmentsByProgress(task)
  return Math.min(taskSegmentCount(task), completed + 1)
}

function carSalesSegmentBadges(task: TaskItem): SegmentBadge[] {
  if (!isCarSalesTask(task)) {
    return []
  }
  const status = String(task.status || '').toUpperCase()
  if (!['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(status)) {
    return []
  }
  const total = taskSegmentCount(task)
  const completed = status === 'SUCCESS' ? total : taskCompletedSegmentsByProgress(task)
  const active = taskActiveSegmentIndex(task)
  return Array.from({ length: total }, (_, index) => {
    const segmentIndex = index + 1
    const done = segmentIndex <= completed
    const activeNow = !done && status === 'RUNNING' && segmentIndex === active
    const state: SegmentBadge['state'] = done ? 'done' : activeNow ? 'active' : 'pending'
    const title =
      state === 'done'
        ? `第 ${segmentIndex} 段已完成，可在查看进度中预览`
        : state === 'active'
          ? `第 ${segmentIndex} 段正在生成`
          : `第 ${segmentIndex} 段等待生成`
    return {
      index: segmentIndex,
      label: `第${segmentIndex}段`,
      state,
      title,
    }
  })
}

function taskProgressCaption(task: TaskItem) {
  if (!isCarSalesTask(task) || task.status === 'SUCCESS') {
    return ''
  }
  if (task.status === 'QUEUED') {
    return '已进入队列，等待开始并行分段生成；如果长时间未被消费，系统会自动重新投递。'
  }
  if (task.status !== 'RUNNING') {
    return ''
  }
  const liveStage = stringField(taskOutputObject(task), 'stage')
  if (liveStage) {
    return liveStage
  }
  const total = taskSegmentCount(task)
  const completed = taskCompletedSegmentsByProgress(task)
  const progress = Number(task.progress ?? 0)
  if (progress >= 95) {
    return '最终成片已生成，正在保存到资产中心。'
  }
  if (progress >= 86) {
    return '分段视频已完成，正在合成整条视频并处理音频。'
  }
  if (completed > 0) {
    return `并行生成中，已完成 ${completed} / ${total} 段，可点击“查看进度”预览已完成片段。`
  }
  return `正在并行生成 ${total} 段视频，完成的片段会先进入进度详情。`
}

function taskSmoothProgressCeil(task: TaskItem) {
  return isCarSalesTask(task) ? 88 : 95
}

function taskSmoothProgressMinStep(task: TaskItem) {
  return isCarSalesTask(task) ? 0.07 : 0.22
}

function taskSmoothProgressRoomRate(task: TaskItem) {
  return isCarSalesTask(task) ? 0.012 : 0.038
}

function resultAssetId(task: TaskItem): number | null {
  const rid = task.resultAssetId
  if (typeof rid === 'number' && rid > 0) {
    return rid
  }
  return null
}

function statusPillClass(status: string) {
  const raw = String(status || '').toUpperCase()
  const key = ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(raw)
    ? raw
    : 'OTHER'
  return `task-status-pill--${key}`
}

function friendlyTaskErrorMessage(message?: string | null) {
  const text = message || ''
  if (!text) {
    return ''
  }
  if (
    text.includes('TikHub parse failed') ||
    text.includes('hybrid error') ||
    text.includes('TikHub request failed with HTTP 400') ||
    text.includes('平台解析接口拒绝了当前链接')
  ) {
    return '平台暂未返回可解析的视频数据，请确认视频是公开可访问的视频，并尽量复制分享内容中的完整 http(s) 链接或完整分享文案后重试。'
  }
  if (
    text.includes('Source video download failed') ||
    text.includes('ASR audio preprocess failed') ||
    text.includes('Upload public base url') ||
    text.includes('TOS')
  ) {
    return '本地视频已上传，但转写服务暂时无法读取该视频文件。请检查 TOS 公网访问地址与桶读权限，或稍后重试。'
  }
  if (
    text.includes('Volcengine ASR query succeeded but returned empty text') ||
    text.includes('没有识别到可转写的口播文案') ||
    (text.toLowerCase().includes('asr') && text.toLowerCase().includes('empty text'))
  ) {
    return '视频里没有识别到可转写的口播文案，可以手动输入/上传文案后继续改写。'
  }
  return text
}

async function openResult(task: TaskItem) {
  resultLoading.value = true
  selectedTaskId.value = task.taskId
  resultError.value = ''
  selectedTaskResult.value = null
  selectedOutputJson.value = parseJsonObject(task.outputJson)
  selectedResultTask.value = task
  selectedShotIndex.value = -1
  segmentRegenerations.value = {}
  manualComposeSegments.value = []
  manualVideoPickerUrl.value = ''
  composeError.value = ''
  resultModalOpen.value = true

  await refreshSelectedResult(false)
  resetManualComposeSegmentsFromCurrent()
}

async function refreshSelectedResult(silent: boolean) {
  const task = selectedResultTask.value
  if (!task) {
    return
  }
  if (!silent) {
    resultLoading.value = true
  }
  try {
    const [detail, taskResult] = await Promise.all([
      getTaskDetail(task.taskId).catch(() => task),
      getTaskResult<unknown>(task.taskId),
    ])
    selectedResultTask.value = detail
    const parsedOutput = parseJsonObject(detail.outputJson)
    selectedOutputJson.value = parsedOutput ?? selectedOutputJson.value
    selectedTaskResult.value = isRecord(taskResult.result) ? taskResult.result : parsedOutput
    if (detail.status === 'SUCCESS') {
      await markTaskViewed(task.taskId)
    }
    void loadData(true)
  } catch (error) {
    if (!silent) {
      resultError.value = error instanceof Error ? error.message : '查询任务结果失败'
    }
  } finally {
    if (!silent) {
      resultLoading.value = false
      selectedTaskId.value = null
    }
  }
}

function closeResultModal() {
  resultModalOpen.value = false
  resultError.value = ''
  segmentRegenerations.value = {}
  manualComposeSegments.value = []
  manualVideoPickerUrl.value = ''
  composeError.value = ''
}

function isImportableRenderTaskType(taskType: string | null | undefined) {
  return taskType ? IMPORTABLE_RENDER_TASK_TYPES.has(taskType) : false
}

async function importSelectedRenderParameters() {
  const task = selectedResultTask.value
  const parameters = selectedTaskParameters.value
  if (!task || !isImportableRenderTaskType(task.taskType) || !parameters) {
    ElMessage.warning('该任务暂无可导入的视频生成参数')
    return
  }
  savePendingRenderTaskImport({
    taskId: task.taskId,
    taskType: task.taskType,
    input: parameters,
    savedAt: Date.now(),
    source: 'task-center',
  })
  closeResultModal()
  await router.push({
    name: 'render',
    query: { importTask: String(task.taskId) },
  })
  ElMessage.success('已导入到视频制作，请检查参数后重新生成')
}

function parseJsonObject(value: string | null | undefined) {
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return typeof raw === 'string' ? raw : ''
}

function arrayStringField(value: Record<string, unknown> | null | undefined, field: string) {
  const raw = value?.[field]
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string' && item.length > 0) : []
}

function segmentVideoUrl(segment: Record<string, unknown>) {
  return stringField(segment, 'videoUrl')
}

function segmentAssetId(segment: Record<string, unknown>) {
  const raw = segment.resultAssetId
  const parsed = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function segmentKey(segment: Record<string, unknown>, idx: number) {
  return String(segmentAssetId(segment) || stringField(segment, 'taskId') || idx)
}

function currentSegmentsForCompose(): ManualComposeSegment[] {
  return carSalesSegmentVideos.value
    .map((segment, idx) => {
      const videoUrl = segmentVideoUrl(segment)
      return {
        assetId: segmentAssetId(segment),
        videoUrl: normalizePreviewUrl(videoUrl),
        title: `片段 ${idx + 1}`,
        source: 'current' as const,
      }
    })
    .filter((item) => !!item.videoUrl)
}

function resetManualComposeSegmentsFromCurrent() {
  manualComposeSegments.value = currentSegmentsForCompose()
  composeError.value = ''
}

function ensureManualComposeSegments() {
  if (!manualComposeSegments.value.length) {
    resetManualComposeSegmentsFromCurrent()
  }
}

function handleManualComposeAssetSelect(payload: { asset: AssetItem; url: string }) {
  ensureManualComposeSegments()
  manualVideoPickerUrl.value = payload.url
  manualComposeSegments.value = [
    ...manualComposeSegments.value,
    {
      assetId: payload.asset.assetId,
      videoUrl: payload.url,
      title: payload.asset.fileName || `视频 ${manualComposeSegments.value.length + 1}`,
      source: 'asset',
    },
  ]
  composeError.value = ''
}

function moveComposeSegment(index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= manualComposeSegments.value.length) {
    return
  }
  const next = manualComposeSegments.value.slice()
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  manualComposeSegments.value = next
}

function removeManualComposeSegment(index: number) {
  if (manualComposeSegments.value.length <= 1) {
    ElMessage.warning('至少保留一个视频片段')
    return
  }
  manualComposeSegments.value = manualComposeSegments.value.filter((_, idx) => idx !== index)
}

async function handleRemoveCurrentSegment(index: number) {
  if (carSalesSegmentVideos.value.length <= 1) {
    ElMessage.warning('至少保留一个视频片段')
    return
  }
  const next = currentSegmentsForCompose().filter((_, idx) => idx !== index)
  await composeSegmentsWith(next, '已移除片段并重新拼接')
}

async function submitManualCompose() {
  ensureManualComposeSegments()
  await composeSegmentsWith(manualComposeSegments.value, '已按当前顺序重新拼接')
}

async function composeSegmentsWith(segments: ManualComposeSegment[], successMessage: string) {
  const task = selectedResultTask.value
  const rows = segments.filter((item) => item.videoUrl)
  if (!task || !canRegenerateCarSalesSegment.value || rows.length === 0) {
    return
  }
  composeBusy.value = true
  composeError.value = ''
  try {
    const updated = await composeCarSalesSegments(task.taskId, {
      segments: rows.map((item) => ({
        assetId: item.assetId,
        videoUrl: item.videoUrl,
        title: item.title,
      })),
    })
    selectedTaskResult.value = updated
    selectedOutputJson.value = updated
    resetManualComposeSegmentsFromCurrent()
    await refreshSelectedResult(true)
    resetManualComposeSegmentsFromCurrent()
    await loadData(true)
    ElMessage.success(successMessage)
  } catch (error) {
    composeError.value = error instanceof Error ? error.message : '重新拼接失败'
  } finally {
    composeBusy.value = false
  }
}

function segmentRegenerationState(idx: number) {
  return segmentRegenerations.value[idx + 1] || null
}

function updateSegmentRegeneration(segmentIndex: number, patch: Partial<SegmentRegenerationState>) {
  const previous = segmentRegenerations.value[segmentIndex] || {
    taskId: null,
    status: 'QUEUED',
    progress: null,
    result: null,
    loading: false,
    adopting: false,
    error: '',
  }
  segmentRegenerations.value = {
    ...segmentRegenerations.value,
    [segmentIndex]: {
      ...previous,
      ...patch,
    },
  }
}

function segmentReplacementResult(idx: number) {
  const state = segmentRegenerationState(idx)
  const result = state?.result
  if (!result) {
    return null
  }
  const segments = result.segmentVideos
  if (Array.isArray(segments)) {
    const first = segments.find(isRecord)
    if (first) {
      return first
    }
  }
  return result
}

function segmentReplacementVideoUrl(idx: number) {
  const replacement = segmentReplacementResult(idx)
  return replacement ? segmentVideoUrl(replacement) : ''
}

function canAdoptSegmentRegeneration(idx: number) {
  const state = segmentRegenerationState(idx)
  return !!state?.taskId && state.status === 'SUCCESS' && !!segmentReplacementVideoUrl(idx)
}

async function handleRegenerateSegment(idx: number) {
  const task = selectedResultTask.value
  if (!task || !canRegenerateCarSalesSegment.value) {
    return
  }
  const segmentIndex = idx + 1
  updateSegmentRegeneration(segmentIndex, {
    loading: true,
    error: '',
  })
  try {
    const created = await regenerateCarSalesSegment(task.taskId, segmentIndex)
    const createdOutput = parseJsonObject(created.outputJson)
    updateSegmentRegeneration(segmentIndex, {
      taskId: created.taskId,
      status: String(created.status || 'QUEUED'),
      progress: created.progress,
      result: isRecord(createdOutput) ? createdOutput : null,
      loading: false,
    })
    await refreshSegmentRegeneration(idx, true)
    void loadData(true)
  } catch (error) {
    updateSegmentRegeneration(segmentIndex, {
      loading: false,
      error: error instanceof Error ? error.message : '重新生成片段失败',
    })
  }
}

async function refreshSegmentRegeneration(idx: number, silent: boolean) {
  const segmentIndex = idx + 1
  const state = segmentRegenerationState(idx)
  if (!state?.taskId) {
    return
  }
  if (!silent) {
    updateSegmentRegeneration(segmentIndex, { loading: true, error: '' })
  }
  try {
    const [detail, taskResult] = await Promise.all([
      getTaskDetail(state.taskId),
      getTaskResult<unknown>(state.taskId).catch(() => null),
    ])
    const detailOutput = parseJsonObject(detail.outputJson)
    updateSegmentRegeneration(segmentIndex, {
      status: String(detail.status || state.status),
      progress: detail.progress,
      result: isRecord(taskResult?.result) ? taskResult.result : isRecord(detailOutput) ? detailOutput : null,
      loading: false,
    })
  } catch (error) {
    updateSegmentRegeneration(segmentIndex, {
      loading: false,
      error: error instanceof Error ? error.message : '刷新片段结果失败',
    })
  }
}

async function handleAdoptSegment(idx: number) {
  const task = selectedResultTask.value
  const state = segmentRegenerationState(idx)
  if (!task || !state?.taskId || !canAdoptSegmentRegeneration(idx)) {
    return
  }
  const segmentIndex = idx + 1
  updateSegmentRegeneration(segmentIndex, {
    adopting: true,
    error: '',
  })
  try {
    const updated = await adoptCarSalesSegment(task.taskId, segmentIndex, state.taskId)
    selectedTaskResult.value = updated
    selectedOutputJson.value = updated
    updateSegmentRegeneration(segmentIndex, {
      adopting: false,
      status: 'SUCCESS',
    })
    await refreshSelectedResult(true)
    resetManualComposeSegmentsFromCurrent()
    await loadData(true)
  } catch (error) {
    updateSegmentRegeneration(segmentIndex, {
      adopting: false,
      error: error instanceof Error ? error.message : '采用片段并重新拼接失败',
    })
  }
}

function isScriptShot(value: unknown): value is ScriptShot {
  return isRecord(value) && typeof value.order === 'number'
}

function orderLabel(order: number) {
  const labels = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
  if (order >= 1 && order <= labels.length) {
    return labels[order - 1]
  }
  return String(order)
}

function normalizePreviewUrl(url: string) {
  if (!url) {
    return ''
  }
  return url.startsWith('http') ? url : `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}
</script>

<style scoped>
/* —— 任务中心：现代 SaaS 视觉（仅本页覆盖全局 app-card / app-file-item） —— */

section.app-card.app-page-stack {
  /* 与全局 .app-page-stack / .app-hero 同宽且水平居中，禁止 margin 简写顶掉 margin: auto */
  box-sizing: border-box;
  width: min(var(--app-content-width), calc(100% - 76px));
  max-width: 100%;
  margin-top: 0;
  margin-bottom: 24px;
  margin-left: auto;
  margin-right: auto;
  border: 1px solid #f0f1f3;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
  padding: 24px;
}

.app-card-header {
  align-items: flex-start;
  margin-bottom: 24px;
}

.app-card-header .app-card-title {
  margin: 0 0 12px;
  color: #111827;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.35;
}

.app-card-header .app-muted {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

.app-card-header .app-secondary-button {
  flex-shrink: 0;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f5f6f8;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  transform: none;
  box-shadow: none;
}

.app-card-header .app-secondary-button:hover:not(:disabled) {
  background: #eef0f3;
  border-color: #e5e7eb;
  color: #111827;
  transform: none;
}

.task-hint {
  margin: 0 0 16px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.6;
}

/* 当前范围：轻量信息卡 */
.app-selected-project {
  box-sizing: border-box;
  width: 100%;
  margin-top: 0;
  margin-bottom: 24px;
  padding: 12px 16px;
  border: none;
  border-radius: 10px;
  background: #f8f9fc;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.5;
  box-shadow: none;
}

.app-selected-project strong {
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.task-count-inline {
  font-size: 12px;
  color: #6b7280;
}

/* 筛选：轻工具栏 */
.task-toolbar {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 240px));
  align-items: center;
  gap: 12px;
  margin-top: 0;
  margin-bottom: 16px;
}

.task-toolbar .asset-type-select {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f5f6f8;
  color: #374151;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.task-toolbar .asset-type-select:hover:not(:disabled) {
  border-color: #7c6cff;
}

.task-toolbar .asset-type-select:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.15);
}

.task-toolbar .asset-type-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.app-error {
  margin: 0 0 16px;
  border: 1px solid #fecaca;
  background: #fef2f2;
}

.app-empty {
  margin-top: 8px;
  border: 1px dashed #e5e7eb;
  border-radius: 10px;
  background: #fafbfc;
  color: #6b7280;
  font-size: 13px;
  padding: 32px 24px;
}

.app-file-list {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 12px;
  margin-top: 8px;
}

/* 任务卡片 */
.app-file-item.task-row {
  box-sizing: border-box;
  display: grid;
  width: 100%;
  min-width: 0;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 0;
  padding: 16px;
  border: 1px solid #f0f1f3;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: none;
  transition:
    box-shadow 0.2s ease,
    transform 0.2s ease,
    border-color 0.2s ease;
}

.app-file-item.task-row:hover {
  border-color: #e5e7eb;
  background: #ffffff;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.task-row-main {
  flex: 1;
  min-width: 0;
}

.app-file-item.task-row .task-row-main > strong {
  display: block;
  margin: 0 0 8px;
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-row-meta {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.55;
}

.task-row-meta-primary {
  margin: 6px 0 0;
  color: #475569;
  font-weight: 500;
}

.task-row-stage {
  margin: 8px 0 0;
  border: 1px solid #d8e2ff;
  border-radius: 8px;
  background: #f8fbff;
  color: #365899;
  padding: 8px 10px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.5;
}

.task-segment-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 8px 0 0;
}

.task-segment-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 12px;
  font-weight: 750;
  line-height: 1;
  white-space: nowrap;
}

.task-segment-badge--done {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}

.task-segment-badge--active {
  border-color: rgba(79, 70, 229, 0.28);
  background: rgba(79, 70, 229, 0.1);
  color: #4338ca;
}

.task-segment-badge--pending {
  border-color: #e5e7eb;
  background: #f8fafc;
  color: #64748b;
}

.task-retry-chip {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  font-size: 11px;
  font-weight: 600;
}

.task-row-err {
  margin: 12px 0 0;
  color: #ef4444;
  font-size: 12px;
  line-height: 1.5;
}

.task-unread {
  color: #6c5ce7;
  font-weight: 500;
}

/* 状态标签 */
.app-file-item .app-task-status {
  min-height: 0;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.task-status-pill--RUNNING {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.task-status-pill--SUCCESS {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.task-status-pill--FAILED {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.task-status-pill--QUEUED {
  background: rgba(124, 108, 255, 0.12);
  color: #6c5ce7;
}

.task-status-pill--RETRYABLE {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.task-status-pill--CANCELED {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

.task-status-pill--OTHER {
  background: rgba(107, 114, 128, 0.08);
  color: #6b7280;
}

.task-row-actions {
  display: grid;
  min-width: 112px;
  flex-shrink: 0;
  align-items: flex-end;
  justify-items: end;
  gap: 10px;
}

.task-row-actions .app-secondary-button {
  min-height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #f5f6f8;
  color: #374151;
  font-size: 13px;
  font-weight: 500;
  transform: none;
  box-shadow: none;
}

.task-row-actions .app-secondary-button:hover:not(:disabled) {
  background: #eef0f3;
  border-color: #e5e7eb;
  color: #111827;
  transform: none;
}

.task-row-actions .task-cancel:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.08);
  border-color: #fecaca;
  color: #b91c1c;
}

.task-open-asset,
.task-retry,
.task-cancel {
  white-space: nowrap;
}

.task-hub-asset-link {
  color: #4f46e5;
  font-weight: 650;
  text-decoration: none;
}

.task-hub-asset-link:hover {
  text-decoration: underline;
}

@media (max-width: 760px) {
  section.app-card.app-page-stack {
    width: calc(100% - 24px);
    padding: 18px;
  }

  .task-toolbar {
    grid-template-columns: 1fr;
  }

  .app-file-item.task-row {
    grid-template-columns: 1fr;
  }

  .task-row-actions {
    width: 100%;
    min-width: 0;
    grid-template-columns: auto auto;
    align-items: center;
    justify-items: start;
  }

  .task-row-actions .app-task-status {
    justify-self: start;
  }

  .task-row-actions .app-secondary-button {
    justify-self: end;
  }
}

.task-result-mask {
  position: fixed;
  z-index: 80;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 32px;
  background: rgba(15, 23, 42, 0.42);
}

.task-result-modal {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1100px, 100%);
  height: min(760px, calc(100vh - 64px));
  gap: 16px;
  overflow: hidden;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 24px 72px rgba(15, 23, 42, 0.22);
  padding: 20px;
}

.task-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #edf0f6;
  padding-bottom: 14px;
}

.task-result-head h3 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 18px;
  font-weight: 650;
}

.task-result-head p {
  margin: 0;
  font-size: 12px;
}

.task-result-head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.task-result-import-button {
  min-height: 34px;
  border: 0;
  border-radius: 8px;
  background: #6252f3;
  color: #fff;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.task-result-import-button:hover {
  background: #4f46e5;
}

.task-result-close {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8f9fc;
  color: #374151;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.task-result-close:hover {
  background: #eef0f3;
}

.task-result-video,
.task-result-audio,
.task-result-storyboard,
.task-result-avatar-grid,
.task-result-text,
.task-result-json {
  min-height: 0;
  overflow: auto;
}

.task-result-video {
  display: grid;
  gap: 14px;
}

.task-result-video video {
  display: block;
  width: 100%;
  max-height: 600px;
  border-radius: 10px;
  background: #111827;
}

.task-result-partial {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #d8e2ff;
  border-radius: 10px;
  background: #f8fbff;
  padding: 14px 16px;
}

.task-result-partial strong {
  color: #1f2937;
  font-size: 14px;
  font-weight: 800;
}

.task-result-partial span {
  flex: 0 0 auto;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 800;
}

.task-result-segments {
  display: grid;
  gap: 12px;
}

.task-result-segments h4 {
  margin: 0;
  color: #1f2937;
  font-size: 14px;
  font-weight: 850;
}

.task-parameter-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #fbfcff;
  padding: 14px;
}

.task-parameter-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-parameter-head h4 {
  margin: 0 0 4px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 850;
}

.task-parameter-head p {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.task-parameter-json {
  max-height: 260px;
  overflow: auto;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  padding: 12px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.task-result-segment-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.task-result-segment-item {
  display: grid;
  gap: 8px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fafbff;
  padding: 10px;
}

.task-result-segment-item video {
  width: 100%;
  max-height: 180px;
  border-radius: 8px;
  background: #111827;
}

.task-result-segment-item strong,
.task-result-segment-item small {
  display: block;
}

.task-result-segment-item strong {
  color: #1f2937;
  font-size: 13px;
  font-weight: 850;
}

.task-result-segment-item small {
  color: #667085;
  font-size: 12px;
}

.task-result-segment-item a {
  color: #4f46e5;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.task-segment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.task-segment-action-button,
.task-segment-mini-button,
.task-segment-adopt-button {
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #ffffff;
  color: #344054;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.task-segment-action-button {
  padding: 7px 10px;
}

.task-segment-mini-button {
  padding: 4px 8px;
}

.task-segment-adopt-button {
  width: 100%;
  padding: 8px 10px;
  border-color: rgba(79, 70, 229, 0.35);
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
}

.task-segment-action-button:disabled,
.task-segment-mini-button:disabled,
.task-segment-adopt-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.task-segment-action-button--danger {
  border-color: #fecaca;
  background: #fff7f7;
  color: #b42318;
}

.task-segment-regeneration {
  display: grid;
  gap: 8px;
  border: 1px solid rgba(79, 70, 229, 0.18);
  border-radius: 8px;
  background: #ffffff;
  padding: 8px;
}

.task-segment-regeneration-head {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  color: #475467;
  font-size: 12px;
  font-weight: 750;
}

.task-compose-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #dbe3f0;
  border-radius: 10px;
  background: #ffffff;
  padding: 12px;
}

.task-compose-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.task-compose-head h4 {
  margin: 0;
}

.task-compose-head p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.task-compose-list {
  display: grid;
  gap: 8px;
}

.task-compose-item {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fbfcff;
  padding: 8px;
}

.task-compose-item video {
  width: 92px;
  height: 56px;
  border-radius: 6px;
  background: #111827;
  object-fit: cover;
}

.task-compose-item-main {
  min-width: 0;
}

.task-compose-item-main strong,
.task-compose-item-main small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-compose-item-main strong {
  color: #1f2937;
  font-size: 12.5px;
  font-weight: 850;
}

.task-compose-item-main small {
  margin-top: 3px;
  color: #667085;
  font-size: 11.5px;
}

.task-compose-item-actions {
  display: flex;
  gap: 6px;
}

.task-compose-item-actions button,
.task-compose-submit {
  border: 1px solid #dbe3f0;
  border-radius: 8px;
  background: #fff;
  color: #344054;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.task-compose-item-actions button {
  padding: 5px 8px;
}

.task-compose-submit {
  width: 100%;
  padding: 9px 12px;
  border-color: rgba(79, 70, 229, 0.35);
  background: rgba(79, 70, 229, 0.08);
  color: #4338ca;
}

.task-compose-item-actions button:disabled,
.task-compose-submit:disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

@media (max-width: 640px) {
  .task-compose-head,
  .task-compose-item {
    grid-template-columns: 1fr;
  }

  .task-compose-head {
    display: grid;
  }

  .task-compose-item video {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .task-compose-item-actions {
    flex-wrap: wrap;
  }
}

.task-result-audio {
  display: grid;
  min-height: 180px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fbfcff;
  padding: 24px;
}

.task-result-audio audio {
  width: 100%;
}

.task-result-storyboard {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.storyboard-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fbfcff;
  flex-shrink: 0;
}

.storyboard-toolbar-label {
  flex-shrink: 0;
  color: #5c6477;
  font-size: 13px;
  font-weight: 600;
}

.storyboard-shot-select {
  flex: 1 1 220px;
  min-width: 180px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #d8dce8;
  border-radius: 8px;
  background: #ffffff;
  color: #2d3446;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}

.storyboard-shot-select:hover {
  border-color: #7c6cff;
}

.storyboard-shot-select:focus {
  border-color: #7c6cff;
  box-shadow: 0 0 0 2px rgba(124, 108, 255, 0.15);
}

.storyboard-toolbar-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.storyboard-nav-button {
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #d8dce8;
  border-radius: 8px;
  background: #ffffff;
  color: #374151;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}

.storyboard-nav-button:hover:not(:disabled) {
  background: #eef0f3;
  border-color: #7c6cff;
  color: #111827;
}

.storyboard-nav-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.storyboard-nav-indicator {
  color: #6b7280;
  font-size: 12px;
  font-weight: 600;
  min-width: 48px;
  text-align: center;
}

.task-result-table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fff;
}

.task-result-storyboard-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
  table-layout: fixed;
  color: #2d3446;
  font-size: 13px;
}

.task-result-storyboard-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 12px 14px;
  border-bottom: 1px solid #edf0f6;
  background: #f5f6fa;
  color: #5c6477;
  font-weight: 750;
  text-align: left;
}

.task-result-storyboard-table td {
  padding: 14px;
  border-bottom: 1px solid #edf0f6;
  line-height: 1.7;
  vertical-align: top;
}

.task-result-storyboard-table tbody tr:last-child td {
  border-bottom: 0;
}

.result-col-order {
  width: 96px;
  font-weight: 700;
}

.result-col-time {
  width: 138px;
  color: #6b7280;
}

.result-col-summary {
  width: 320px;
}

.result-col-dialogue {
  width: 240px;
}

.result-col-tips {
  width: auto;
}

.task-result-shot-text {
  white-space: pre-wrap;
}

.task-result-bgm {
  display: inline-flex;
  margin: 10px 0 0;
  border-radius: 999px;
  background: #f1efff;
  color: #5e50df;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 700;
}

.task-result-text {
  min-height: 220px;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #fbfcff;
  color: #2d3446;
  padding: 16px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.task-result-avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.task-result-avatar-grid img {
  width: 100%;
  aspect-ratio: 1 / 1;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #f8f9fc;
  object-fit: contain;
}

.task-result-json {
  margin: 0;
  border: 1px solid #edf0f6;
  border-radius: 10px;
  background: #111827;
  color: #f9fafb;
  padding: 16px;
  font-size: 12px;
  line-height: 1.6;
}

.task-result-empty {
  display: grid;
  min-height: 180px;
  place-items: center;
  border: 1px dashed #d8dce8;
  border-radius: 10px;
  background: #fbfcff;
  color: #6b7280;
  font-size: 13px;
}

@media (max-width: 720px) {
  .task-result-mask {
    padding: 14px;
  }

  .task-result-modal {
    max-height: calc(100vh - 28px);
    padding: 16px;
  }
}
</style>
