<template>
  <div class="quick-render-page app-page-stack" :class="{ 'quick-render-page--embedded': props.embedded }">
    <header v-if="!props.embedded" class="quick-head">
      <div>
        <h1>用 AI 轻松生成汽车销售视频</h1>
        <p>上传车辆图片，选择卖点或输入需求，AI 帮你生成高质量销售视频。</p>
      </div>
      <div class="quick-mode-switch" aria-label="视频制作模式">
        <span>一键汽车销售视频</span>
        <RouterLink to="/render?mode=manual">手动制作</RouterLink>
      </div>
    </header>

    <section class="quick-compose-card" aria-label="汽车销售一键成片工作台">
      <CarSalesPromptBox
        v-model="goalText"
        :disabled="busy"
        :character-count="promptCharacterCount"
        :helper-text="promptHelperText"
        :placeholder="promptPlaceholder"
        :required="!hasCarModelBundle"
        :can-use-magic="Boolean(topSellingPointMatch)"
        @use-magic="topSellingPointMatch && applySellingPointTemplate(topSellingPointMatch)"
      />

      <div class="quick-compose-body">
        <VehicleImagePicker
          :uploading="uploading"
          :busy="busy"
          :has-vehicle-input="hasVehicleInput"
          :vehicle-image-count-label="vehicleImageCountLabel"
          :validation-message="vehicleValidationMessage"
          @guard-file-input="guardAccountFileInput($event, '登录后可上传车辆图片')"
          @images-change="handleVehicleImagesSelected"
          @select-asset="openCarBundleDrawer"
        />

        <GenerationParamBar
          v-model:target-duration="targetDuration"
          v-model:voice-language="voiceLanguage"
          v-model:aspect-ratio="aspectRatio"
          :voice-language-options="voiceLanguageOptions"
          :busy="busy"
          :can-submit="canSubmit"
          :submit-block-reason="submitBlockReason"
          :plan-preview-loading="planPreviewLoading"
          :task-status="taskStatus"
          :task-progress="taskProgress"
          @open-advanced="advancedDrawerOpen = true"
          @generate="prepareAiPlanPreview"
        />
      </div>

      <details class="quick-advanced-assets">
        <summary>
          <span>补充高级素材</span>
          <small>口播音频、BGM、文案、分镜和视频素材也可从分类资产选择器统一加入。</small>
        </summary>
        <div class="quick-source-grid quick-source-grid-advanced">
          <label class="quick-upload" :class="{ disabled: uploading || busy }">
              <input
                type="file"
                multiple
                accept="audio/*,video/*,.json,.txt,.srt"
                :disabled="uploading || busy"
                @click="guardAccountFileInput($event, '登录后可上传补充素材')"
                @change="handleFilesSelected"
              />
            <strong>{{ uploading ? '上传中...' : '上传补充素材' }}</strong>
            <small>口播、BGM、字幕、分镜 JSON 或视频素材。</small>
          </label>
          <AssetPicker
            title="资产中心口播/音频"
            asset-type="AUDIO"
            :selected-url="quickPickedAudioUrl"
            :role-options="quickAudioRoleOptions"
            placeholder="搜索口播、参考音频或 BGM..."
            @select="handleAssetCenterSelect"
          />
          <AssetPicker
            title="资产中心分镜/文案"
            asset-type="JSON"
            :selected-url="quickPickedJsonUrl"
            :role-options="quickJsonRoleOptions"
            placeholder="搜索分镜、对标文案..."
            @select="handleAssetCenterSelect"
          />
          <AssetPicker
            title="资产中心文案/TXT"
            asset-type="TEXT"
            :selected-url="quickPickedTextUrl"
            :role-options="quickTextRoleOptions"
            placeholder="搜索口播文案、字幕文本..."
            @select="handleAssetCenterSelect"
          />
          <AssetPicker
            title="资产中心视频"
            asset-type="VIDEO"
            :selected-url="quickPickedVideoUrl"
            :role-options="quickVideoRoleOptions"
            placeholder="搜索视频素材..."
            @select="handleAssetCenterSelect"
          />
        </div>
      </details>

      <div v-if="materials.length" class="quick-materials">
        <article
          v-for="item in materials"
          :key="item.asset.assetId"
          class="quick-material"
          :class="{ 'quick-material--bundle': item.role === 'car_model_bundle' }"
        >
          <div v-if="item.role === 'car_model_bundle'" class="quick-material-preview">
            <template v-if="carBundleMaterialImages(item).length">
              <img :src="carBundleMaterialImages(item)[0]" :alt="carBundleMaterialTitle(item)" />
              <div v-if="carBundleMaterialImages(item).length > 1" class="quick-material-preview-stack">
                <img
                  v-for="url in carBundleMaterialImages(item).slice(1, 4)"
                  :key="url"
                  :src="url"
                  alt=""
                />
              </div>
            </template>
            <span v-else>车型包</span>
          </div>
          <div class="quick-material-main">
            <strong>{{ item.role === 'car_model_bundle' ? carBundleMaterialTitle(item) : item.asset.fileName }}</strong>
            <small>
              {{ item.role === 'car_model_bundle' ? carBundleMaterialMeta(item) : `${item.asset.assetType} · ${formatSize(item.asset.fileSize)}` }}
            </small>
          </div>
          <div class="quick-material-role">
            <strong>{{ roleLabel(item.role) }}</strong>
            <small>系统自动识别</small>
          </div>
          <button type="button" :disabled="busy" @click="removeMaterial(item.asset.assetId)">移除</button>
        </article>
      </div>

      <div v-if="showNarrationPanel" class="quick-narration-panel">
        <div class="quick-narration-head">
          <div>
            <label>最终讲述文案</label>
            <small>{{ narrationPanelHint }}</small>
          </div>
          <button
            v-if="needsNarrationLocalization"
            type="button"
            :disabled="busy || narrationLocalizationLoading || !narrationSourceText"
            @click="regenerateNarrationLocalization"
          >
            {{ narrationLocalizationLoading ? '生成中...' : '重新生成' }}
          </button>
        </div>
        <textarea
          v-model="finalNarrationText"
          :disabled="busy || narrationLocalizationLoading"
          rows="6"
          maxlength="3000"
          placeholder="确认后会作为模型讲述文案和后期字幕文案"
          @input="narrationEdited = true"
        />
        <div v-if="narrationLocalizationLoading" class="quick-progress-row">
          <div class="quick-progress-track">
            <div class="quick-progress-fill" :style="{ width: `${narrationProgressPercent}%` }" />
          </div>
          <span>{{ narrationProgressPercent }}%</span>
        </div>
        <p v-if="narrationError" class="quick-error">{{ narrationError }}</p>
      </div>

      <details class="quick-summary-details">
        <summary>
          <span>生成前摘要</span>
          <small>{{ routeLabel }} · {{ audioDecisionLabel }} · 字幕 {{ subtitleLabel }}</small>
        </summary>
        <div class="quick-summary">
          <dl>
            <div>
              <dt>系统判断</dt>
              <dd>{{ routeLabel }}</dd>
            </div>
            <div>
              <dt>素材数量</dt>
              <dd>{{ materials.length }} 个</dd>
            </div>
            <div>
              <dt>字幕</dt>
              <dd>{{ subtitleLabel }}</dd>
            </div>
            <div v-if="selectedBgmMaterial">
              <dt>BGM</dt>
              <dd>{{ bgmLabel }}</dd>
            </div>
            <div>
              <dt>目标时长</dt>
              <dd>{{ totalDuration }} 秒</dd>
            </div>
          </dl>
          <p>{{ summaryText }}</p>
          <p class="quick-summary-extra">
            {{ routeHint }} · {{ audioDecisionHint }} · {{ subtitleDecisionHint }} ·
            {{ advancedSummaryLabel }}：{{ advancedSummaryHint }}
          </p>
        </div>
      </details>

      <div v-if="errorMessage" class="quick-error">{{ errorMessage }}</div>
    </section>

    <SellingPointTemplateStrip
      :templates="visibleSellingPointTemplates"
      :selected-selling-point-ids="selectedSellingPointIds"
      :busy="busy"
      :top-selling-point-match="topSellingPointMatch"
      :match-summary-label="matchSummaryLabel"
      :match-tags="matchContext.tags"
      :matched-template-candidates="visibleMatchedTemplateCandidates"
      :template-match-loading="templateMatchLoading"
      :template-match-error="templateMatchError"
      @apply-template="applySellingPointTemplate"
      @refresh-match="loadTemplateMatchCandidates"
      @apply-candidate="applyMatchedTemplateCandidate"
    />

    <section v-if="busy || result" class="quick-result-panel" :class="{ 'is-complete': result }">
      <div v-if="busy" class="quick-generation-state">
        <div class="quick-phone-preview quick-phone-preview--generating">
          <div class="quick-phone-status">生成中</div>
          <strong>{{ topSellingPointMatch?.title || '汽车销售短视频' }}</strong>
          <span>{{ targetDuration }}s · {{ aspectRatio }} · {{ voiceLanguage }}</span>
          <div class="quick-phone-progress">
            <i :style="{ width: `${Math.max(taskProgress || 18, 18)}%` }"></i>
          </div>
        </div>

        <div class="quick-generation-main">
          <div class="quick-generation-title">
            <h2>AI 正在生成你的视频</h2>
            <p>请稍候，不要关闭页面，生成完成后会自动进入结果区。</p>
          </div>
          <ol class="quick-generation-steps">
            <li :class="{ done: (taskProgress || 0) >= 15, active: (taskProgress || 0) < 15 }">
              <span>1</span>
              <div>
                <strong>匹配卖点模板</strong>
                <small>{{ (taskProgress || 0) >= 15 ? '已完成' : '正在匹配' }}</small>
              </div>
            </li>
            <li :class="{ done: (taskProgress || 0) >= 35, active: (taskProgress || 0) >= 15 && (taskProgress || 0) < 35 }">
              <span>2</span>
              <div>
                <strong>生成视频文案</strong>
                <small>{{ (taskProgress || 0) >= 35 ? '已完成' : '等待生成' }}</small>
              </div>
            </li>
            <li :class="{ done: (taskProgress || 0) >= 58, active: (taskProgress || 0) >= 35 && (taskProgress || 0) < 58 }">
              <span>3</span>
              <div>
                <strong>生成分镜与配置</strong>
                <small>{{ (taskProgress || 0) >= 58 ? '已完成' : '等待生成' }}</small>
              </div>
            </li>
            <li :class="{ done: (taskProgress || 0) >= 100, active: (taskProgress || 0) >= 58 }">
              <span>4</span>
              <div>
                <strong>生成视频</strong>
                <small>{{ taskStatus || '正在生成中' }}</small>
              </div>
            </li>
          </ol>
          <div class="quick-generation-footer">
            <div>
              <span>当前进度</span>
              <strong>{{ taskProgress || 0 }}%</strong>
            </div>
            <button
              v-if="currentTaskId"
              class="app-secondary-button"
              type="button"
              @click="goTaskCenter(currentTaskId)"
            >
              返回任务中心
            </button>
          </div>
        </div>
      </div>

      <div v-if="result" class="quick-result-state">
        <div class="quick-phone-preview quick-phone-preview--result">
          <video :src="result.videoUrl" controls preload="metadata" />
        </div>

        <div class="quick-result-info-card">
          <div class="quick-generation-title">
            <h2>视频生成完成</h2>
            <p>还不错，你的视频已经生成完成，可以继续查看任务、结果资产或下载视频。</p>
          </div>
          <dl class="quick-video-info">
            <div>
              <dt>任务 ID</dt>
              <dd>{{ result.localTaskId || result.taskId }}</dd>
            </div>
            <div>
              <dt>使用模型</dt>
              <dd>{{ result.model }}</dd>
            </div>
            <div>
              <dt>视频规格</dt>
              <dd>{{ targetDuration }}s · {{ aspectRatio }}</dd>
            </div>
            <div v-if="selectedBgmMaterial">
              <dt>BGM</dt>
              <dd>{{ selectedBgmMaterial.asset.fileName }}</dd>
            </div>
            <div>
              <dt>消耗积分</dt>
              <dd>{{ planPreview?.estimatedCredits ?? 20 }} 积分</dd>
            </div>
          </dl>
          <div class="quick-result-actions">
            <a class="app-secondary-button" :href="result.videoUrl" target="_blank" rel="noreferrer">打开视频</a>
            <button
              v-if="currentTaskId"
              class="app-secondary-button"
              type="button"
              @click="goTaskCenter(currentTaskId)"
            >
              查看任务结果
            </button>
            <button
              v-if="result.resultAssetId"
              class="app-primary-button"
              type="button"
              @click="goAssetResult(result.resultAssetId)"
            >
              查看结果资产
            </button>
          </div>
        </div>
      </div>
    </section>

    <RecentCarSalesVideos
      :recent-tasks="recentTasks"
      :recent-loading="recentLoading"
      :recent-error="recentError"
      :current-task-id="currentTaskId"
      :car-placeholder-image="carPlaceholderImage"
      :task-type-label="taskTypeLabel"
      :format-recent-task-time="formatRecentTaskTime"
      :recent-task-credit="recentTaskCredit"
      :is-active-recent-task="isActiveRecentTask"
      :recent-task-progress-percent="recentTaskProgressPercent"
      :recent-task-status-class="recentTaskStatusClass"
      :recent-task-status-label="recentTaskStatusLabel"
      :recent-task-video-url="recentTaskVideoUrl"
      :recent-task-cover-url="recentTaskCoverUrl"
      :recent-task-title="recentTaskTitle"
      :recent-task-asset-id="recentTaskAssetId"
      :friendly-recent-task-error="friendlyRecentTaskError"
      @refresh="loadRecentGenerations(false)"
      @go-task-center="goTaskCenter"
      @go-asset-result="goAssetResult"
    />

    <CarSalesAdvancedDrawer
      v-model="advancedDrawerOpen"
      :settings="advancedSettings"
      :selected-avatar-name="selectedAvatar?.avatarName || ''"
      :selected-avatar-preview-url="selectedAvatarPreviewUrl"
      :has-host-material="hasHostMaterial"
      @update:settings="advancedSettings = $event"
      @reset="resetAdvancedSettings"
      @select-avatar="openAvatarDrawer"
      @select-host-asset="openAssetDrawer('avatar')"
      @clear-avatar="clearSelectedAvatar"
    />
    <AiPlanPreviewDrawer
      v-model="planPreviewOpen"
      :loading="planPreviewLoading"
      :error="planPreviewError"
      :plan="planPreview"
      :aspect-ratio="aspectRatio"
      @update-script="updatePlanScript"
      @update-storyboard-shot="updatePlanStoryboardShot"
      @refresh="prepareAiPlanPreview"
      @confirm="confirmAiPlanAndSubmit"
      @back="planPreviewOpen = false"
    />
    <AvatarSelectDrawer
      v-model="avatarDrawerOpen"
      :selected-avatar-id="selectedAvatar?.avatarId || null"
      @select="handleAvatarSelected"
      @create="goAvatarCreatePage"
    />
    <CarSalesAssetSelectDrawer
      v-model="assetSelectDrawerOpen"
      :initial-category="assetSelectInitialCategory"
      :locked-category="assetSelectLockedCategory"
      @select="handleClassifiedAssetSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAssets, getAssetDetail, getAssetTextContent, uploadMaterialAsset } from '../../services/assetApi'
import { getAvatars } from '../../services/avatarApi'
import { getBillingEstimate } from '../../services/creditApi'
import { API_ORIGIN } from '../../services/request'
import { getTemplates } from '../../services/templateApi'
import { rewriteDouyinCopywriting } from '../../services/writerDouyinApi'
import {
  generateCarSalesAiPlan,
  getDigitalHumanVideoTask,
  newVideoIdempotencyKey,
  quickRenderVideo,
} from '../../services/videoApi'
import { getTaskDetail, listTasks } from '../../services/taskApi'
import { trackTaskResult } from '../../services/taskRealtime'
import { getSessionTaskIds, rememberSessionTaskId } from '../../services/sessionTaskStore'
import {
  loadCarSalesPreferences,
  type CarSalesGenerationPreferences,
} from '../../services/systemWorkspaceStore'
import {
  getPendingCarSalesPlanTask,
  newPendingCarSalesPlanTaskId,
  removePendingCarSalesPlanTask,
  upsertPendingCarSalesPlanTask,
} from '../../services/carSalesPlanTaskStore'
import { useAuthRequired } from '../../composables/useAuthRequired'
import carPlaceholderImage from '../../assets/car.png'
import type { AssetItem } from '../../types/assetTypes'
import type { AvatarItem } from '../../types/avatarTypes'
import type { TaskItem } from '../../types/taskTypes'
import type { TemplateItem } from '../../types/templateTypes'
import type {
  CarSalesAssetRoleBinding,
  CarSalesAiPlanShot,
  DigitalHumanTaskDetailResponse,
  QuickRenderAssetRole,
  QuickRenderRequest,
  QuickRenderResponse,
  VideoTaskVO,
} from '../../types/videoTypes'
import type { BillingEstimateResponse } from '../../types/creditTypes'
import type { DouyinRewriteWriterVO } from '../../types/writerDouyinTypes'
import { taskTypeLabel } from '../../utils/taskDisplay'
import { formatFriendlyDateTime } from '../../utils/timeFormat'
import AiPlanPreviewDrawer from './AiPlanPreviewDrawer.vue'
import { sanitizePlanScript, type AiPlanPreview, type AiPlanStoryboardShot } from './carSalesPlanDraft'
import AssetPicker from './AssetPicker.vue'
import AvatarSelectDrawer from './AvatarSelectDrawer.vue'
import CarSalesPromptBox from './car-sales/components/CarSalesPromptBox.vue'
import GenerationParamBar from './car-sales/components/GenerationParamBar.vue'
import RecentCarSalesVideos from './car-sales/components/RecentCarSalesVideos.vue'
import SellingPointTemplateStrip from './car-sales/components/SellingPointTemplateStrip.vue'
import VehicleImagePicker from './car-sales/components/VehicleImagePicker.vue'
import CarSalesAdvancedDrawer, {
  type CarSalesAdvancedSettings,
} from './CarSalesAdvancedDrawer.vue'
import CarSalesAssetSelectDrawer, {
  type CarSalesAssetCategoryKey,
  type CarSalesAssetSelectPayload,
} from './CarSalesAssetSelectDrawer.vue'
import {
  buildCarModelBundleAssetRoleBindings,
  carModelBundleCoverUrl,
  carModelBundleDeclaredImageCount,
  carModelBundleImageUrls,
  parseCarModelBundleRecord,
} from './carModelBundle'

interface QuickMaterial {
  asset: AssetItem
  role: QuickRenderAssetRole
  textContent?: string
}

interface QuickFileLike {
  name: string
  type?: string | null
}

interface SellingPointTemplate {
  id: string
  title: string
  tags: string
  prompt: string
  keywords: string[]
  vehicleKeywords: string[]
  sceneKeywords: string[]
}

interface RankedSellingPointTemplate extends SellingPointTemplate {
  matchScore: number
  matchReason: string
  matchTags: string[]
}

interface TemplateMatchContext {
  searchText: string
  tags: string[]
  selectedSellingPointIds: string[]
}

interface CarBundleScriptContext {
  title: string
  brandModel: string
  color: string
  notes: string
  sellingPoints: string[]
  imageBriefs: string[]
  imageCount: number
}

interface MatchedTemplateCandidate {
  id: string
  source: 'template' | 'asset'
  title: string
  typeLabel: string
  score: number
  tags: string[]
  reasons: string[]
  template?: TemplateItem
  asset?: AssetItem
}

const props = withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

const ASSET_REUSE_DRAFT_KEY = 'huashuo_asset_reuse_draft'
const router = useRouter()
const route = useRoute()
const { isLoggedIn, requireAuth } = useAuthRequired()
const carSalesPreferences = loadCarSalesPreferences()
const RECENT_GENERATION_TASK_TYPES = new Set(['QUICK_RENDER', 'SEEDANCE_CAR_SALES_VIDEO'])
const RECENT_GENERATION_LIMIT = 5
const HIDDEN_RECENT_GENERATION_STATUSES = new Set(['FAILED', 'RETRYABLE', 'CANCELED'])

const roleOptions: Array<{ value: QuickRenderAssetRole; label: string }> = [
  { value: 'car_exterior_front', label: '车头外观' },
  { value: 'car_exterior_side', label: '车侧外观' },
  { value: 'car_exterior_rear', label: '车尾外观' },
  { value: 'car_interior_dashboard', label: '内饰中控' },
  { value: 'car_interior_front_seat', label: '前排座椅' },
  { value: 'car_interior_back_seat', label: '后排座椅' },
  { value: 'car_detail_sunroof', label: '天窗细节' },
  { value: 'car_detail_light', label: '车灯细节' },
  { value: 'car_detail_wheel', label: '轮毂细节' },
  { value: 'car_detail_logo', label: '车标细节' },
  { value: 'scene_showroom', label: '展厅场景' },
  { value: 'scene_outdoor', label: '户外场景' },
  { value: 'scene_road', label: '道路场景' },
  { value: 'scene_night', label: '夜景/门店' },
  { value: 'host_image', label: '数字人图片' },
  { value: 'voiceover', label: '口播音频' },
  { value: 'bgm', label: 'BGM' },
  { value: 'reference_audio', label: '参考音频' },
  { value: 'subtitle', label: '字幕文本' },
  { value: 'voice_script', label: '口播文案' },
  { value: 'storyboard_json', label: '分镜 JSON' },
  { value: 'benchmark_json', label: '对标 JSON' },
  { value: 'car_model_bundle', label: '车型素材包' },
  { value: 'material_video', label: '视频素材' },
  { value: 'host_video', label: '口播视频' },
  { value: 'reference_video', label: '参考视频' },
  { value: 'material', label: '普通素材' },
]

const quickAudioRoleOptions = roleOptions.filter((item) =>
  ['voiceover', 'reference_audio', 'bgm'].includes(item.value),
)
const quickJsonRoleOptions = roleOptions.filter((item) =>
  ['storyboard_json', 'benchmark_json', 'voice_script', 'subtitle'].includes(item.value),
)
const quickTextRoleOptions = roleOptions.filter((item) =>
  ['voice_script', 'subtitle'].includes(item.value),
)
const quickVideoRoleOptions = roleOptions.filter((item) =>
  ['material_video', 'host_video', 'reference_video'].includes(item.value),
)
const carBundleRoleLabels: Record<string, string> = {
  car_exterior_front: '车头外观',
  car_exterior_side: '车侧外观',
  car_exterior_rear: '车尾外观',
  car_exterior_45: '45度外观',
  car_interior_dashboard: '内饰中控',
  car_interior_front_seat: '前排座椅',
  car_interior_back_seat: '后排座椅',
  car_interior_steering: '方向盘',
  car_interior_trunk: '后备箱',
  car_detail_sunroof: '天窗细节',
  car_detail_light: '车灯细节',
  car_detail_wheel: '轮毂细节',
  car_detail_logo: '车标细节',
  car_detail_seat_material: '座椅材质',
  scene_showroom: '展厅场景',
  scene_outdoor: '户外场景',
  scene_road: '道路场景',
  scene_night: '夜景门店',
}
const vehicleUploadRoles: QuickRenderAssetRole[] = [
  'car_exterior_front',
  'car_exterior_side',
  'car_exterior_rear',
  'car_interior_dashboard',
  'car_interior_back_seat',
  'car_detail_wheel',
  'car_detail_light',
  'car_detail_logo',
]
const sellingPointTemplates: SellingPointTemplate[] = [
  {
    id: 'family-space',
    title: '家用空间',
    tags: '大空间 / 后排 / 后备箱',
    prompt: '帮我生成一条汽车销售视频，突出空间大、后排舒适、后备箱容量大，适合家庭出行用户。',
    keywords: ['家用空间', '空间', '后排', '后备箱', '舒适', '家庭', '亲子', '露营'],
    vehicleKeywords: ['SUV', 'MPV', '家用车', '大五座', '六座', '七座'],
    sceneKeywords: ['家庭用户', '周末出行', '通勤', '自驾'],
  },
  {
    id: 'smart-cabin',
    title: '智能座舱',
    tags: '大屏 / 语音 / 辅助驾驶',
    prompt: '帮我生成一条汽车销售视频，突出智能座舱、语音交互、科技配置和舒适驾驶体验。',
    keywords: ['智能座舱', '智能', '大屏', '语音', '辅助驾驶', '智驾', '科技', '互联'],
    vehicleKeywords: ['新能源', '纯电', '混动', '智能汽车'],
    sceneKeywords: ['年轻用户', '科技感', '通勤'],
  },
  {
    id: 'exterior-value',
    title: '外观颜值',
    tags: '设计 / 线条 / 灯组',
    prompt: '帮我生成一条汽车销售视频，突出外观设计、车身线条、灯光造型和高级质感。',
    keywords: ['外观颜值', '外观', '设计', '线条', '灯组', '车灯', '轮毂', '运动'],
    vehicleKeywords: ['轿跑', 'SUV', '年轻化', '运动版'],
    sceneKeywords: ['展厅', '门店', '夜景', '街拍'],
  },
  {
    id: 'performance',
    title: '动力性能',
    tags: '加速 / 操控 / 驾驶感',
    prompt: '帮我生成一条汽车销售视频，突出动力强、起步快、操控稳定和驾驶乐趣。',
    keywords: ['动力性能', '动力', '加速', '操控', '底盘', '驾驶感', '性能', '马力'],
    vehicleKeywords: ['燃油车', '混动', '四驱', '性能版'],
    sceneKeywords: ['试驾', '道路', '山路', '高速'],
  },
  {
    id: 'range-saving',
    title: '续航省油',
    tags: '低油耗 / 长续航 / 通勤',
    prompt: '帮我生成一条汽车销售视频，突出低油耗、长续航、经济实用和出行无忧。',
    keywords: ['续航省油', '续航', '省油', '低油耗', '电耗', '通勤成本', '补能', '节能'],
    vehicleKeywords: ['新能源', '纯电', '混动', '插混', '增程'],
    sceneKeywords: ['通勤', '城市', '长途', '家庭出行'],
  },
  {
    id: 'store-promo',
    title: '到店促销',
    tags: '试驾 / 权益 / 限时',
    prompt: '帮我生成一条汽车销售视频，突出限时优惠、到店有礼、试驾福利和购车政策。',
    keywords: ['到店促销', '促销', '试驾', '权益', '限时', '置换', '补贴', '门店'],
    vehicleKeywords: ['现车', '新车', '热销车'],
    sceneKeywords: ['门店', '展厅', '销售顾问', '活动'],
  },
  {
    id: 'price-offer',
    title: '价格优惠',
    tags: '预算 / 金融 / 礼包',
    prompt: '突出价格优势、金融方案、购车礼包和高性价比。',
    keywords: ['价格优惠', '价格', '优惠', '金融', '礼包', '性价比', '预算', '贷款'],
    vehicleKeywords: ['入门款', '高配', '置换', '现车'],
    sceneKeywords: ['预算用户', '成交转化', '门店'],
  },
]

const materials = ref<QuickMaterial[]>([])
const selectedSellingPointIds = ref<string[]>([...carSalesPreferences.preferredSellingPointIds])
const advancedDrawerOpen = ref(false)
const advancedSettings = ref<CarSalesAdvancedSettings>(createDefaultAdvancedSettings(carSalesPreferences))
const avatarDrawerOpen = ref(false)
const assetSelectDrawerOpen = ref(false)
const assetSelectInitialCategory = ref<CarSalesAssetCategoryKey>('carBundle')
const assetSelectLockedCategory = ref<CarSalesAssetCategoryKey | null>(null)
const submitAttempted = ref(false)
const selectedAvatar = ref<AvatarItem | null>(null)
const planPreviewOpen = ref(false)
const planPreviewLoading = ref(false)
const planPreviewError = ref('')
const planPreview = ref<AiPlanPreview | null>(null)
const currentPendingPlanTaskId = ref('')
const restoredPlanRequest = ref<QuickRenderRequest | null>(null)
const templateCandidates = ref<TemplateItem[]>([])
const templateAssetCandidates = ref<AssetItem[]>([])
const templateMatchLoading = ref(false)
const templateMatchError = ref('')
const templatePromptInjections = ref<Record<string, string>>({})
const quickPickedImageUrl = ref('')
const quickPickedSceneImageUrl = ref('')
const quickPickedCarBundleUrl = ref('')
const quickPickedAudioUrl = ref('')
const quickPickedJsonUrl = ref('')
const quickPickedTextUrl = ref('')
const quickPickedVideoUrl = ref('')
const aspectRatio = ref<'9:16' | '16:9' | 'auto'>(carSalesPreferences.aspectRatio)
const subtitleLanguage = ref(carSalesPreferences.voiceLanguage)
const voiceLanguage = ref<'zh-CN' | 'en-US'>(carSalesPreferences.voiceLanguage)
const goalText = ref('')
const targetDuration = ref<10 | 15 | 20 | 30>(carSalesPreferences.duration)
const uploading = ref(false)
const busy = ref(false)
const errorMessage = ref('')
const taskStatus = ref('')
const taskProgress = ref<number | null>(null)
const result = ref<VideoTaskVO | null>(null)
const currentTaskId = ref<number | null>(null)
const recentTasks = ref<TaskItem[]>([])
const recentResultAssets = ref<Record<number, AssetItem>>({})
const recentLoading = ref(false)
const recentError = ref('')
const finalNarrationText = ref('')
const narrationEdited = ref(false)
const narrationError = ref('')
const narrationLocalizationLoading = ref(false)
const narrationTaskProgress = ref<number | null>(null)
const narrationResolvedKey = ref('')
let stopTracking: (() => void) | null = null
let stopNarrationTracking: (() => void) | null = null
let digitalHumanPollTimer: number | null = null
let narrationLocalizationPromise: Promise<string> | null = null

function createDefaultAdvancedSettings(preferences: CarSalesGenerationPreferences = carSalesPreferences): CarSalesAdvancedSettings {
  return {
    hostAppearanceEnabled: false,
    subtitleMode: preferences.subtitleMode,
    customSubtitle: '',
    burnInSubtitle: preferences.burnInSubtitle,
    subtitleOverlay: {
      enabled: true,
      text: '',
      fontFamily: 'Microsoft YaHei',
      fontSize: 36,
      textColor: '#ffffff',
      outlineColor: '#111827',
      position: 'bottom',
    },
    headlineOverlay: {
      enabled: false,
      text: '',
      fontFamily: 'Microsoft YaHei',
      fontSize: 72,
      textColor: '#ffffff',
      outlineColor: '#111827',
      position: 'top',
    },
    audioPolicy: preferences.audioPolicy,
    videoStyle: preferences.videoStyle,
    nativeVoiceStyle: preferences.nativeVoiceStyle,
    nativeSpeechStyle: preferences.nativeSpeechStyle,
    model: preferences.model,
  }
}

function resetAdvancedSettings() {
  advancedSettings.value = createDefaultAdvancedSettings()
}

function guardAccountFileInput(event: MouseEvent, actionName: string) {
  if (requireAuth(actionName)) return
  event.preventDefault()
  const input = event.currentTarget as HTMLInputElement | null
  if (input) {
    input.value = ''
  }
}

const promptCharacterCount = computed(() => goalText.value.length)
const promptHelperText = computed(() =>
  goalText.value.trim()
    ? '输入框可展示模板和补充需求；方案生成会使用你实际补充的需求和车型素材包信息。'
    : hasCarModelBundle.value
      ? '可留空，AI 会根据车型素材包名称、摘要、卖点和参数生成口播文案与分镜。'
      : '选择车型素材包后，可补充活动、目标客户或门店政策。',
)
const promptPlaceholder = computed(() =>
  hasCarModelBundle.value
    ? '可选：补充本次活动、目标客户、门店政策或希望突出的卖点；不填也会按车型素材包自动生成'
    : '描述你想要的视频，例如：突出空间、续航、智能座舱或到店促销',
)
const vehicleMaterialCount = computed(() =>
  materials.value.filter((item) => item.role === 'car_model_bundle' || item.role.startsWith('car_')).length,
)
const carModelBundleMaterial = computed(() => materials.value.find((item) => item.role === 'car_model_bundle') || null)
const hasCarModelBundle = computed(() => Boolean(carModelBundleMaterial.value))
const carBundleScriptContext = computed(() => buildCarBundleScriptContext(carModelBundleMaterial.value))
const hasVehicleInput = computed(() => hasCarModelBundle.value || vehicleMaterialCount.value > 0)
const vehicleImageCountLabel = computed(() => {
  if (carModelBundleMaterial.value) return `已选择车型素材包：${carModelBundleMaterial.value.asset.fileName}`
  if (vehicleMaterialCount.value <= 0) return '尚未添加车辆素材'
  if (vehicleMaterialCount.value === 1) return '已添加 1 份车辆素材'
  if (vehicleMaterialCount.value < 3) return `已添加 ${vehicleMaterialCount.value} 份车辆素材，可继续补充到 3-8 份`
  if (vehicleMaterialCount.value <= 8) return `已添加 ${vehicleMaterialCount.value} 份车辆素材，数量合适`
  return `已添加 ${vehicleMaterialCount.value} 份车辆素材，建议精简到 8 份以内`
})
const submitBlockReason = computed(() => {
  if (uploading.value) return '等待素材上传完成'
  if (!hasCarModelBundle.value) return '选择车型素材包'
  return ''
})
const vehicleValidationMessage = computed(() =>
  submitAttempted.value && !hasCarModelBundle.value ? '请先选择车型素材包' : '',
)
const canSubmit = computed(() => !submitBlockReason.value)
const imageCount = computed(() => materials.value.filter((item) => item.asset.assetType === 'IMAGE').length)
const videoCount = computed(() => materials.value.filter((item) => item.asset.assetType === 'VIDEO').length)
const hasBgmMaterial = computed(() => materials.value.some((item) => item.role === 'bgm'))
const selectedBgmMaterial = computed(() => materials.value.find((item) => item.role === 'bgm') || null)
const selectedHostMaterial = computed(() =>
  materials.value.find((item) => item.role === 'host_image' || item.role === 'host_video') || null,
)
const hasHostMaterial = computed(() => Boolean(selectedHostMaterial.value))
const selectedAvatarPreviewUrl = computed(() =>
  resolveMediaUrl(selectedAvatar.value?.previewUrl || selectedHostMaterial.value?.asset.thumbnailUrl || selectedHostMaterial.value?.asset.fileUrl || ''),
)
const uploadedSubtitleText = computed(() =>
  materials.value.find((item) => item.role === 'subtitle' && item.textContent?.trim())?.textContent?.trim() || '',
)
const customSubtitleText = computed(() => advancedSettings.value.customSubtitle.trim())
const narrationSourceText = computed(() => extractNarrationSourceText(materials.value))
const narrationLocalizationKey = computed(() =>
  `${voiceLanguage.value}:${stableTextKey(narrationSourceText.value)}`,
)
const needsNarrationLocalization = computed(() =>
  narrationLanguageMismatch(narrationSourceText.value, voiceLanguage.value),
)
const showNarrationPanel = computed(() =>
  Boolean(narrationSourceText.value || finalNarrationText.value || narrationLocalizationLoading.value),
)
const narrationPanelHint = computed(() => {
  if (narrationLocalizationLoading.value) return `${voiceLanguageLabel.value}生成中`
  if (needsNarrationLocalization.value && finalNarrationText.value) return `已生成${voiceLanguageLabel.value}，可编辑`
  if (needsNarrationLocalization.value) return `需要生成${voiceLanguageLabel.value}`
  return `与${voiceLanguageLabel.value}一致，可编辑`
})
const narrationProgressPercent = computed(() => Math.max(0, Math.min(100, narrationTaskProgress.value ?? 0)))
const subtitleMode = computed<'off' | 'auto' | 'upload'>(() => {
  if (advancedSettings.value.subtitleMode === 'off') return 'off'
  if (advancedSettings.value.subtitleMode === 'upload') return 'upload'
  if (uploadedSubtitleText.value) return 'upload'
  return 'auto'
})
const voiceLanguageOptions = [
  { value: 'zh-CN', label: '中文讲述' },
  { value: 'en-US', label: '英语讲述' },
]
const voiceLanguageLabel = computed(
  () => voiceLanguageOptions.find((item) => item.value === voiceLanguage.value)?.label || '中文讲述',
)
const audioPolicy = computed<'auto' | 'none' | 'voiceover' | 'bgm'>(() => advancedSettings.value.audioPolicy)
const segmentCount = computed(() => {
  if (inferredRoute.value === 'digital_human' || inferredRoute.value === 'general_video') return 1
  if (inferredRoute.value === 'material_mix') return Math.max(1, Math.min(4, videoCount.value || 1))
  const durationBasedCount = targetDuration.value <= 10 ? 2 : targetDuration.value <= 15 ? 3 : 4
  return Math.max(2, Math.min(4, imageCount.value || durationBasedCount))
})
const segmentDuration = computed(() => Math.max(4, Math.round(targetDuration.value / Math.max(1, segmentCount.value))))
const totalDuration = computed(() => targetDuration.value)

const inferredRoute = computed(() => {
  if (materials.value.some((item) => item.role === 'car_model_bundle' || item.role.startsWith('car_') || item.role.startsWith('scene_'))) return 'car_sales'
  if (
    materials.value.some((item) => item.role === 'host_image') &&
    materials.value.some((item) => item.role === 'voiceover' || item.role === 'voice_script')
  ) {
    return 'digital_human'
  }
  const videoCount = materials.value.filter((item) => item.asset.assetType === 'VIDEO').length
  const imageCount = materials.value.filter((item) => item.asset.assetType === 'IMAGE').length
  if (videoCount > 0 && videoCount >= imageCount) return 'material_mix'
  if (imageCount > 0) return 'general_video'
  return 'auto'
})

const routeLabel = computed(() => {
  const map: Record<string, string> = {
    auto: '等待素材',
    car_sales: '汽车销售成片',
    digital_human: '数字人口播',
    general_video: '通用图生视频',
    material_mix: '素材混剪',
  }
  return map[inferredRoute.value] || '自动判断'
})

const routeHint = computed(() => {
  if (!materials.value.length) return '上传素材后自动判断'
  if (inferredRoute.value === 'car_sales') return '检测到车辆/场景素材，使用视频制作汽车成片链路'
  if (inferredRoute.value === 'digital_human') return '检测到人物图和口播素材，走数字人口播链路'
  if (inferredRoute.value === 'material_mix') return '视频素材占比更高，优先作为素材混剪'
  if (inferredRoute.value === 'general_video') return '图片素材为主，生成通用图生视频'
  return '继续上传图片、音频或视频素材'
})

const subtitleLabel = computed(() => {
  if (subtitleMode.value === 'off') return '关闭'
  if (subtitleMode.value === 'upload') return customSubtitleText.value ? '自定义字幕' : '使用字幕素材'
  return '自动'
})

const subtitleDecisionHint = computed(() => {
  if (subtitleMode.value === 'upload' && customSubtitleText.value) return '使用高级参数里的自定义字幕'
  if (subtitleMode.value === 'upload') return '使用字幕文件或生成前填写的字幕'
  if (subtitleMode.value === 'auto') return '优先跟随最终口播文案或音频识别'
  return '高级参数已关闭字幕'
})

const audioDecisionLabel = computed(() => {
  if (audioPolicy.value === 'none') return '关闭音频'
  if (audioPolicy.value === 'bgm') return '仅 BGM'
  if (audioPolicy.value === 'voiceover') return '口播优先'
  if (materials.value.some((item) => item.role === 'voiceover')) return '口播优先'
  if (materials.value.some((item) => item.role === 'reference_audio')) return '参考音频'
  if (materials.value.some((item) => item.role === 'voice_script' || item.role === 'benchmark_json')) return '文案驱动'
  if (hasCarModelBundle.value) return 'AI文案'
  if (hasBgmMaterial.value) return '无口播'
  return '无音频'
})

const audioDecisionHint = computed(() => {
  if (audioPolicy.value === 'none') return '高级参数已关闭口播与 BGM'
  if (audioPolicy.value === 'bgm') return hasBgmMaterial.value ? '仅混入已选 BGM' : '等待补充 BGM 素材'
  if (audioPolicy.value === 'voiceover') return '优先使用口播音频或文案驱动口播'
  if (materials.value.some((item) => item.role === 'voiceover')) return '口播音频会作为成片主音轨'
  if (materials.value.some((item) => item.role === 'reference_audio')) return '单段可参考音频，多段转后期配音'
  if (materials.value.some((item) => item.role === 'voice_script' || item.role === 'benchmark_json')) return '使用口播文案拆分到各片段'
  if (hasCarModelBundle.value) return '根据车型素材包和卖点模板自动改写口播'
  if (hasBgmMaterial.value) return '仅使用后期背景音乐'
  return '模型只按图片/视频素材生成画面'
})

const bgmLabel = computed(() => {
  const bgm = selectedBgmMaterial.value
  return bgm ? `使用 ${bgm.asset.fileName}` : '未检测到 BGM'
})

const advancedSummaryLabel = computed(() => {
  const enabled: string[] = []
  if (advancedSettings.value.hostAppearanceEnabled) enabled.push('数字人')
  if (advancedSettings.value.headlineOverlay.enabled && advancedSettings.value.headlineOverlay.text.trim()) enabled.push('大字报')
  if (advancedSettings.value.audioPolicy === 'none') enabled.push('静音')
  if (advancedSettings.value.model !== 'auto') enabled.push('指定模型')
  return enabled.length ? enabled.join(' / ') : '默认'
})

const advancedSummaryHint = computed(() => {
  const style = videoStyleLabel(advancedSettings.value.videoStyle)
  const subtitle = subtitleLabel.value
  const host = advancedSettings.value.hostAppearanceEnabled
    ? selectedAvatar.value?.avatarName || (hasHostMaterial.value ? '已选数字人素材' : '')
    : ''
  return host ? `${style}，字幕：${subtitle}，数字人：${host}` : `${style}，字幕：${subtitle}`
})

const advancedPromptText = computed(() => {
  const parts: string[] = []
  parts.push(`视频风格：${videoStyleLabel(advancedSettings.value.videoStyle)}`)
  if (advancedSettings.value.hostAppearanceEnabled) {
    parts.push('允许销售顾问/数字人自然出镜')
  } else {
    parts.push('不需要销售顾问或数字人出镜，重点展示车辆')
  }
  if (advancedSettings.value.headlineOverlay.enabled && advancedSettings.value.headlineOverlay.text.trim()) {
    parts.push(`大字报文案：${advancedSettings.value.headlineOverlay.text.trim()}`)
  }
  return parts.join('；')
})

const summaryText = computed(() => {
  const prompt = goalText.value.trim()
  if (!materials.value.length) {
    return prompt ? `需求：${prompt.slice(0, 120)}。请继续选择车型素材包。` : '选择车型素材包后即可自动生成车型文案和方案摘要。'
  }
  const bundleContext = carBundleScriptContext.value
  const parts = roleOptions
    .map((role) => {
      const count = materials.value.filter((item) => item.role === role.value).length
      return count > 0 ? `${role.label} ${count} 个` : ''
    })
    .filter(Boolean)
  const bundleSummary = bundleContext?.title ? `车型：${bundleContext.title}。` : ''
  const promptSummary = prompt ? `需求：${prompt.slice(0, 120)}。` : '需求：按车型素材包智能生成文案。'
  const advanced = advancedPromptText.value ? `高级参数：${advancedPromptText.value}。` : ''
  return `${bundleSummary}${promptSummary}${advanced}已识别：${parts.join('、')}。`
})

const matchContext = computed<TemplateMatchContext>(() => buildTemplateMatchContext())
const rankedSellingPointTemplates = computed<RankedSellingPointTemplate[]>(() =>
  sellingPointTemplates
    .map((template, index) => rankSellingPointTemplate(template, index, matchContext.value))
    .sort((left, right) => right.matchScore - left.matchScore),
)
const visibleSellingPointTemplates = computed(() =>
  rankedSellingPointTemplates.value.filter((template) => template.id !== 'price-offer').slice(0, 6),
)
const topSellingPointMatch = computed(() => rankedSellingPointTemplates.value[0] || null)
const matchedTemplateCandidates = computed<MatchedTemplateCandidate[]>(() => {
  const candidates = [
    ...templateCandidates.value.map((template) => buildMatchedTemplateCandidateFromTemplate(template)),
    ...templateAssetCandidates.value.map((asset) => buildMatchedTemplateCandidateFromAsset(asset)),
  ]
  return candidates
    .map((candidate) => scoreTemplateCandidate(candidate, matchContext.value))
    .filter((candidate) => candidate.score >= 35)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8)
})
const visibleMatchedTemplateCandidates = computed(() => matchedTemplateCandidates.value.slice(0, 4))
const matchSummaryLabel = computed(() => {
  if (templateMatchLoading.value) return '正在读取模板库与资产中心候选'
  const top = topSellingPointMatch.value
  const assetCount = visibleMatchedTemplateCandidates.value.length
  if (!top) return '等待输入需求后推荐模板'
  if (assetCount > 0) return `优先推荐「${top.title}」，已匹配 ${assetCount} 个模板资产`
  return `优先推荐「${top.title}」，模板资产候选不足时使用内置卖点兜底`
})

function buildTemplateMatchContext(): TemplateMatchContext {
  const tags = new Set<string>()
  const textParts = [goalText.value]
  const selectedIds = [...selectedSellingPointIds.value]

  for (const template of sellingPointTemplates) {
    if (selectedIds.includes(template.id)) {
      tags.add(template.title)
      template.keywords.slice(0, 3).forEach((tag) => tags.add(tag))
      textParts.push(template.title, template.tags, template.keywords.join(' '))
    }
  }

  const promptText = textParts.join(' ')
  for (const template of sellingPointTemplates) {
    const hits = matchTokensInText([template.title, ...template.keywords], promptText)
    if (hits.length) {
      tags.add(template.title)
      hits.slice(0, 2).forEach((tag) => tags.add(tag))
    }
  }

  for (const material of materials.value) {
    textParts.push(assetMatchText(material.asset))
    templateTagsFromRole(material.role).forEach((tag) => tags.add(tag))
    extractBusinessTagsFromMetadata(material.asset.metadataJson).forEach((tag) => tags.add(tag))
  }

  const bundleContext = carBundleScriptContext.value
  if (bundleContext) {
    textParts.push(carBundleContextSearchText(bundleContext))
    bundleContext.sellingPoints.forEach((tag) => tags.add(tag))
    if (bundleContext.brandModel) tags.add(bundleContext.brandModel)
    if (bundleContext.color) tags.add(bundleContext.color)
  }

  return {
    searchText: textParts.filter(Boolean).join(' '),
    tags: [...tags].filter(Boolean).slice(0, 12),
    selectedSellingPointIds: selectedIds,
  }
}

function rankSellingPointTemplate(
  template: SellingPointTemplate,
  index: number,
  context: TemplateMatchContext,
): RankedSellingPointTemplate {
  const tokens = [template.title, ...template.keywords, ...template.vehicleKeywords, ...template.sceneKeywords]
  const textHits = matchTokensInText(tokens, context.searchText)
  const contextHits = context.tags.filter((tag) => templateMatchesToken(template, tag))
  const selected = context.selectedSellingPointIds.includes(template.id)
  const hasContext = Boolean(context.searchText.trim() || context.tags.length)
  const sellingPointScore = selected
    ? 100
    : hasContext
      ? Math.min(100, textHits.length * 18 + contextHits.length * 16 + 18)
      : Math.max(42, 82 - index * 4)
  const vehicleScore = Math.min(100, matchTokensInText(template.vehicleKeywords, context.searchText).length * 34 +
    matchTokensInText(template.sceneKeywords, context.searchText).length * 22 +
    templateTagsFromContext(context).filter((tag) => templateMatchesToken(template, tag)).length * 12 +
    (hasContext ? 32 : 58))
  const historyScore = Math.max(58, 86 - index * 3)
  const preferenceScore = selected ? 100 : context.selectedSellingPointIds.length ? 58 : 72
  const matchScore = clampScore(
    sellingPointScore * 0.4 + vehicleScore * 0.3 + historyScore * 0.2 + preferenceScore * 0.1,
  )
  const matchTags = uniqueShortTags([
    ...(selected ? [template.title] : []),
    ...contextHits,
    ...textHits,
    ...splitTagText(template.tags),
  ]).slice(0, 4)
  return {
    ...template,
    matchScore,
    matchReason: buildSellingPointMatchReason(template, selected, textHits, contextHits, hasContext),
    matchTags: matchTags.length ? matchTags : splitTagText(template.tags).slice(0, 3),
  }
}

async function loadTemplateMatchCandidates(showAuthPrompt = false) {
  if (!isLoggedIn.value) {
    templateCandidates.value = []
    templateAssetCandidates.value = []
    templateMatchError.value = ''
    templateMatchLoading.value = false
    if (showAuthPrompt) {
      requireAuth('登录后可刷新模板库匹配')
    }
    return
  }
  templateMatchLoading.value = true
  templateMatchError.value = ''
  try {
    const keywords = templateMatchQueryKeywords()
    const [templates, assets] = await Promise.all([
      loadTemplateCandidatesByKeywords(keywords),
      loadTemplateAssetCandidatesByKeywords(keywords),
    ])
    templateCandidates.value = templates.slice(0, 40)
    templateAssetCandidates.value = assets.filter(isTemplateAssetCandidate).slice(0, 60)
    if (!templateCandidates.value.length && !templateAssetCandidates.value.length) {
      templateMatchError.value = '未读取到模板库或模板型资产，当前使用内置卖点模板兜底。'
    }
  } catch (error) {
    templateCandidates.value = []
    templateAssetCandidates.value = []
    templateMatchError.value = error instanceof Error ? error.message : '模板匹配候选加载失败'
  } finally {
    templateMatchLoading.value = false
  }
}

async function loadTemplateCandidatesByKeywords(keywords: string[]) {
  const requests = [
    getTemplates({ scope: 'all', sort: 'publishedAtDesc' }).catch(() => [] as TemplateItem[]),
    ...keywords.slice(0, 3).map((keyword) =>
      getTemplates({ scope: 'all', sort: 'publishedAtDesc', keyword }).catch(() => [] as TemplateItem[]),
    ),
  ]
  return dedupeById((await Promise.all(requests)).flat(), (item) => item.templateId)
}

async function loadTemplateAssetCandidatesByKeywords(keywords: string[]) {
  const requests = [
    getAssets({ scope: 'all', sort: 'createdAtDesc', pageSize: 80, includePreview: false }).catch(() => [] as AssetItem[]),
    ...keywords.slice(0, 4).map((keyword) =>
      getAssets({ scope: 'all', sort: 'createdAtDesc', keyword, pageSize: 40, includePreview: false }).catch(() => [] as AssetItem[]),
    ),
  ]
  return dedupeById((await Promise.all(requests)).flat(), (item) => item.assetId)
}

function templateMatchQueryKeywords() {
  const context = matchContext.value
  const tokens = uniqueShortTags([
    ...context.tags,
    ...selectedSellingPointIds.value.flatMap((id) => {
      const template = sellingPointTemplates.find((item) => item.id === id)
      return template ? [template.title, ...splitTagText(template.tags), ...template.keywords.slice(0, 3)] : []
    }),
    ...extractSearchKeywordsFromText(goalText.value),
    ...extractSearchKeywordsFromText(userGoalTextForGeneration()),
  ])
  return tokens
    .filter((token) => token.length >= 2 && token.length <= 16)
    .slice(0, 6)
}

function extractSearchKeywordsFromText(value: string) {
  return value
    .split(/[，,。.!！?？、/|;；\s\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 16)
}

function dedupeById<T>(items: T[], idOf: (item: T) => number | null | undefined) {
  const seen = new Set<number>()
  const result: T[] = []
  for (const item of items) {
    const id = idOf(item)
    if (typeof id !== 'number' || !Number.isFinite(id) || seen.has(id)) {
      continue
    }
    seen.add(id)
    result.push(item)
  }
  return result
}

function buildMatchedTemplateCandidateFromTemplate(template: TemplateItem): MatchedTemplateCandidate {
  const tags = uniqueShortTags([
    ...splitTagText(template.tags || ''),
    ...extractBusinessTagsFromMetadata(template.metadataJson),
    ...splitTagText(template.description || ''),
  ])
  return {
    id: `template-${template.templateId}`,
    source: 'template',
    title: template.title || `模板 ${template.templateId}`,
    typeLabel: '模板库',
    score: 0,
    tags,
    reasons: [],
    template,
  }
}

function buildMatchedTemplateCandidateFromAsset(asset: AssetItem): MatchedTemplateCandidate {
  const tags = uniqueShortTags([
    ...splitTagText(asset.assetGroup || ''),
    ...splitTagText(asset.sourceType || ''),
    ...extractBusinessTagsFromMetadata(asset.metadataJson),
  ])
  return {
    id: `asset-${asset.assetId}`,
    source: 'asset',
    title: asset.fileName || `资产 ${asset.assetId}`,
    typeLabel: templateAssetTypeLabel(asset),
    score: 0,
    tags,
    reasons: [],
    asset,
  }
}

function scoreTemplateCandidate(
  candidate: MatchedTemplateCandidate,
  context: TemplateMatchContext,
): MatchedTemplateCandidate {
  const text = templateCandidateSearchText(candidate)
  const contextTagHits = context.tags.filter((tag) => textIncludesToken(text, tag) || candidate.tags.some((item) => tagsEqual(item, tag)))
  const selectedTemplateHits = sellingPointTemplates
    .filter((template) => context.selectedSellingPointIds.includes(template.id))
    .filter((template) => templateMatchesCandidate(template, text, candidate.tags))
    .map((template) => template.title)
  const sellingPointScore = context.tags.length
    ? Math.min(100, contextTagHits.length * 24 + selectedTemplateHits.length * 28)
    : 56
  const vehicleScore = Math.min(100, matchTokensInText(vehicleAndSceneKeywords(), text).length * 14 +
    contextTagHits.filter((tag) => ['SUV', 'MPV', '新能源', '纯电', '混动', '展厅', '门店', '试驾'].some((token) => tagsEqual(token, tag))).length * 18 +
    42)
  const historyScore = candidate.source === 'template'
    ? templateHistoryScore(candidate.template)
    : assetHistoryScore(candidate.asset)
  const preferenceScore = selectedTemplateHits.length ? 92 : context.selectedSellingPointIds.length ? 62 : 70
  const score = clampScore(sellingPointScore * 0.4 + vehicleScore * 0.3 + historyScore * 0.2 + preferenceScore * 0.1)
  const reasons = buildCandidateReasons(candidate, contextTagHits, selectedTemplateHits)
  return {
    ...candidate,
    score,
    tags: uniqueShortTags([...contextTagHits, ...candidate.tags]).slice(0, 6),
    reasons,
  }
}

async function applyMatchedTemplateCandidate(candidate: MatchedTemplateCandidate) {
  templateMatchError.value = ''
  if (candidate.template) {
    const appliedCount = await appendTemplateAssets(candidate.template)
    if (!appliedCount) {
      templateMatchError.value = `模板「${candidate.template.title}」未绑定可用资产，请选择文案或分镜资产后生成。`
    }
    return
  }
  if (!candidate.asset) {
    return
  }
  try {
    const role = inferTemplateAssetRole(candidate.asset)
    rememberClassifiedAssetUrl(candidate.asset, role)
    await appendMaterial(candidate.asset, {
      name: candidate.asset.fileName || '',
      type: candidate.asset.mimeType || '',
    }, role)
    if (role === 'host_image' || role === 'host_video') {
      advancedSettings.value = {
        ...advancedSettings.value,
        hostAppearanceEnabled: true,
      }
    }
  } catch (error) {
    templateMatchError.value = error instanceof Error ? error.message : '推荐资产应用失败'
  }
}

async function appendTemplateAssets(template: TemplateItem) {
  const refs = Array.isArray(template.assets) ? template.assets : []
  let count = 0
  for (const ref of refs) {
    const assetId = Number(ref.assetId)
    if (!Number.isFinite(assetId) || assetId <= 0) {
      continue
    }
    try {
      const asset = await getAssetDetail(assetId)
      const role = normalizeQuickAssetRole(ref.role) || inferTemplateAssetRole(asset)
      rememberClassifiedAssetUrl(asset, role)
      await appendMaterial(asset, {
        name: asset.fileName || '',
        type: asset.mimeType || '',
      }, role)
      if (role === 'host_image' || role === 'host_video') {
        advancedSettings.value = {
          ...advancedSettings.value,
          hostAppearanceEnabled: true,
        }
      }
      count += 1
    } catch {
      // 模板可能绑定了已删除或无权限资产，跳过并继续尝试其他资产。
    }
  }
  return count
}

function buildSellingPointMatchReason(
  template: SellingPointTemplate,
  selected: boolean,
  textHits: string[],
  contextHits: string[],
  hasContext: boolean,
) {
  if (selected) return '已选择，会优先匹配文案/分镜资产'
  const hits = uniqueShortTags([...contextHits, ...textHits]).slice(0, 2)
  if (hits.length) return `命中 ${hits.join('、')}`
  if (!hasContext) return '默认高频卖点，适合新建需求'
  return `可补充${template.title}表达`
}

function buildCandidateReasons(candidate: MatchedTemplateCandidate, contextHits: string[], selectedHits: string[]) {
  const reasons: string[] = []
  if (selectedHits.length) reasons.push(`承接${selectedHits.slice(0, 2).join('、')}`)
  if (contextHits.length) reasons.push(`命中${contextHits.slice(0, 2).join('、')}`)
  reasons.push(candidate.source === 'template' ? '来自模板库' : '来自资产中心')
  return reasons.slice(0, 3)
}

function isTemplateAssetCandidate(asset: AssetItem) {
  const text = assetMatchText(asset)
  if (['TEXT', 'JSON', 'AUDIO', 'VIDEO', 'IMAGE'].includes(asset.assetType)) {
    return ['template', '模板', 'storyboard', '分镜', 'benchmark', '对标', '口播', 'voice_script', 'copywriting', '文案', 'script', '脚本', 'headline', '大字报', 'bgm', 'music', '数字人', 'avatar'].some((token) =>
      textIncludesToken(text, token),
    )
  }
  return false
}

function inferTemplateAssetRole(asset: AssetItem): QuickRenderAssetRole {
  const text = assetMatchText(asset)
  if (textIncludesAny(text, ['storyboard', '分镜'])) return 'storyboard_json'
  if (textIncludesAny(text, ['benchmark', '对标'])) return 'benchmark_json'
  if (textIncludesAny(text, ['headline', '大字报', 'subtitle', '字幕'])) return 'subtitle'
  if (textIncludesAny(text, ['copywriting', 'script', '文案', '脚本'])) return 'voice_script'
  if (textIncludesAny(text, ['bgm', 'music', '背景音乐'])) return 'bgm'
  if (textIncludesAny(text, ['avatar', 'digital_human', '数字人'])) {
    return asset.assetType === 'VIDEO' ? 'host_video' : 'host_image'
  }
  return inferRole({ name: asset.fileName || '', type: asset.mimeType || '' }, asset)
}

function templateAssetTypeLabel(asset: AssetItem) {
  const text = assetMatchText(asset)
  if (textIncludesAny(text, ['storyboard', '分镜'])) return '分镜模板'
  if (textIncludesAny(text, ['copywriting', 'script', '文案', '脚本'])) return '文案模板'
  if (textIncludesAny(text, ['headline', '大字报'])) return '大字报模板'
  if (textIncludesAny(text, ['bgm', 'music', '背景音乐'])) return '背景音乐模板'
  if (textIncludesAny(text, ['avatar', 'digital_human', '数字人'])) return '数字人模板'
  return '模板资产'
}

function templateCandidateSearchText(candidate: MatchedTemplateCandidate) {
  if (candidate.template) {
    return [
      candidate.template.title,
      candidate.template.description,
      candidate.template.tags,
      candidate.template.metadataJson,
      candidate.tags.join(' '),
    ].filter(Boolean).join(' ')
  }
  return candidate.asset ? `${assetMatchText(candidate.asset)} ${candidate.tags.join(' ')}` : candidate.tags.join(' ')
}

function assetMatchText(asset: AssetItem) {
  return [
    asset.fileName,
    asset.assetGroup,
    asset.sourceType,
    asset.kind,
    asset.mimeType,
    asset.metadataJson,
  ].filter(Boolean).join(' ')
}

function templateMatchesCandidate(template: SellingPointTemplate, candidateText: string, candidateTags: string[]) {
  return [template.title, ...template.keywords, ...template.vehicleKeywords, ...template.sceneKeywords].some((token) =>
    textIncludesToken(candidateText, token) || candidateTags.some((tag) => tagsEqual(tag, token)),
  )
}

function templateMatchesToken(template: SellingPointTemplate, token: string) {
  return [template.title, ...template.keywords, ...template.vehicleKeywords, ...template.sceneKeywords].some((item) => tagsEqual(item, token) || textIncludesToken(item, token))
}

function templateTagsFromContext(context: TemplateMatchContext) {
  return context.tags.concat(matchTokensInText(vehicleAndSceneKeywords(), context.searchText))
}

function templateTagsFromRole(role: QuickRenderAssetRole) {
  if (role === 'car_model_bundle') return ['车型素材包']
  if (role.includes('interior') || role.includes('back_seat')) return ['家用空间', '智能座舱']
  if (role.startsWith('car_detail') || role.startsWith('car_exterior')) return ['外观颜值']
  if (role === 'scene_showroom' || role === 'scene_night') return ['到店促销']
  if (role === 'scene_road' || role === 'scene_outdoor') return ['动力性能']
  if (role === 'voice_script') return ['文案模板']
  if (role === 'storyboard_json') return ['分镜模板']
  if (role === 'host_image' || role === 'host_video') return ['数字人模板']
  if (role === 'bgm') return ['背景音乐模板']
  return []
}

function extractBusinessTagsFromMetadata(value: string | null | undefined) {
  const metadata = parseQuickAssetMetadata(value)
  if (!metadata) return []
  const tags: string[] = []
  for (const key of ['tags', 'tag', 'sellingPoints', 'sellingPoint', 'vehicleType', 'carModel', 'style', 'language', 'scene', 'scenario', 'assetRole', 'templateRole']) {
    tags.push(...metadataValueToTags(metadata[key]))
  }
  return uniqueShortTags(tags)
}

function metadataValueToTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => metadataValueToTags(item))
  }
  if (typeof value === 'string') {
    return splitTagText(value)
  }
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap((item) => metadataValueToTags(item))
  }
  return []
}

function splitTagText(value: string) {
  return value
    .split(/[，,、/|;\s]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 18)
}

function uniqueShortTags(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const normalized = value.trim()
    const key = normalized.toLowerCase()
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}

function matchTokensInText(tokens: string[], text: string) {
  return uniqueShortTags(tokens.filter((token) => textIncludesToken(text, token)))
}

function textIncludesAny(text: string, tokens: string[]) {
  return tokens.some((token) => textIncludesToken(text, token))
}

function textIncludesToken(text: string, token: string) {
  const normalizedText = text.toLowerCase()
  const normalizedToken = token.trim().toLowerCase()
  return Boolean(normalizedToken) && normalizedText.includes(normalizedToken)
}

function tagsEqual(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function vehicleAndSceneKeywords() {
  return uniqueShortTags(sellingPointTemplates.flatMap((template) => [...template.vehicleKeywords, ...template.sceneKeywords]))
}

function templateHistoryScore(template: TemplateItem | undefined) {
  if (!template) return 62
  if (template.visibility === 'public' || template.publishedAt) return 82
  if (template.status === 'published') return 78
  return 66
}

function assetHistoryScore(asset: AssetItem | undefined) {
  if (!asset) return 60
  if (asset.visibility === 'public' || asset.publishedAt) return 80
  if (asset.sourceType && asset.sourceType !== 'UPLOAD') return 72
  return 64
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

async function loadRecentGenerations(silent: boolean) {
  if (!isLoggedIn.value) {
    recentTasks.value = []
    recentResultAssets.value = {}
    recentError.value = ''
    recentLoading.value = false
    return
  }
  if (!silent) {
    recentLoading.value = true
  }
  recentError.value = ''
  try {
    let list: TaskItem[] = []
    try {
      const remoteTasks = await listTasks({ pageNo: 1, pageSize: 30 })
      const remoteIds = new Set(remoteTasks.map((task) => task.taskId))
      const sessionTasks = await loadSessionTaskDetails(remoteIds)
      list = [...remoteTasks, ...sessionTasks]
    } catch (error) {
      const sessionTasks = await loadSessionTaskDetails()
      if (!sessionTasks.length) {
        throw error
      }
      list = sessionTasks
    }
    const nextRecentTasks = list
      .filter(isRecentGenerationTask)
      .sort((a, b) => recentTaskTime(b) - recentTaskTime(a))
      .slice(0, RECENT_GENERATION_LIMIT)
    recentTasks.value = nextRecentTasks
    await loadRecentResultAssets(nextRecentTasks)
  } catch (error) {
    if (!silent) {
      recentError.value = error instanceof Error ? error.message : '加载最近生成失败'
    }
  } finally {
    if (!silent) {
      recentLoading.value = false
    }
  }
}

async function loadRecentResultAssets(tasks: TaskItem[]) {
  const assetIds = Array.from(new Set(
    tasks
      .map((task) => recentTaskAssetId(task))
      .filter((assetId): assetId is number => typeof assetId === 'number' && assetId > 0),
  )).filter((assetId) => !recentResultAssets.value[assetId])
  if (!assetIds.length) {
    return
  }
  const settled = await Promise.allSettled(assetIds.map(async (assetId) => ({
    assetId,
    asset: await getAssetDetail(assetId),
  })))
  const nextAssets = { ...recentResultAssets.value }
  settled.forEach((item) => {
    if (item.status === 'fulfilled') {
      nextAssets[item.value.assetId] = item.value.asset
    }
  })
  recentResultAssets.value = nextAssets
}

async function loadSessionTaskDetails(skipIds = new Set<number>()) {
  const ids = getSessionTaskIds()
    .filter((id) => !skipIds.has(id))
    .slice(0, 20)
  if (!ids.length) {
    return []
  }
  const details = await Promise.all(ids.map((id) => getTaskDetail(id).catch(() => null)))
  return details.filter((item): item is TaskItem => !!item)
}

function isRecentGenerationTask(task: TaskItem) {
  if (HIDDEN_RECENT_GENERATION_STATUSES.has(String(task.status || '').toUpperCase())) {
    return false
  }
  if (task.taskId === currentTaskId.value) {
    return true
  }
  const taskType = normalizeTaskType(task.taskType)
  if (!RECENT_GENERATION_TASK_TYPES.has(taskType)) {
    return false
  }
  if (taskType === 'QUICK_RENDER' && String(task.status || '').toUpperCase() === 'SUCCESS') {
    return Boolean(recentTaskAssetId(task) || recentTaskVideoUrl(task))
  }
  return true
}

function normalizeTaskType(taskType: string | null | undefined) {
  return String(taskType || '').trim().toUpperCase()
}

function rememberRenderTask(taskId: number | null | undefined) {
  if (typeof taskId !== 'number' || !Number.isFinite(taskId) || taskId <= 0) {
    return
  }
  currentTaskId.value = taskId
  rememberSessionTaskId(taskId)
  void loadRecentGenerations(true)
}

function goTaskCenter(taskId?: number | null) {
  if (!requireAuth('登录后可查看任务中心和我的视频')) return
  const query = taskId ? { taskId: String(taskId) } : undefined
  void router.push({ name: 'my-videos', query })
}

function goAssetResult(assetId?: number | null) {
  if (!requireAuth('登录后可查看结果资产')) return
  if (!assetId) {
    return
  }
  void router.push({
    name: 'AssetCenter',
    query: { tab: 'materials', highlight: String(assetId) },
  })
}

function recentTaskTitle(task: TaskItem) {
  return task.taskTitle?.trim() || taskTypeLabel(task.taskType)
}

function formatRecentTaskTime(value: string | null | undefined) {
  return formatFriendlyDateTime(value)
}

function recentTaskCredit(task: TaskItem) {
  const cost = task.creditCost ?? task.actualCreditCost ?? task.estimatedCreditCost ?? 0
  return cost > 0 ? `积分 ${cost}` : ''
}

function isActiveRecentTask(task: TaskItem) {
  return task.status === 'QUEUED' || task.status === 'RUNNING'
}

function recentTaskProgressPercent(task: TaskItem) {
  const raw = Number(task.progress ?? 0)
  if (!Number.isFinite(raw)) {
    return 0
  }
  return Math.max(0, Math.min(100, Math.round(raw)))
}

function recentTaskStatusLabel(status: string) {
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

function recentTaskStatusClass(status: string) {
  const raw = String(status || '').toUpperCase()
  const key = ['QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(raw)
    ? raw
    : 'OTHER'
  return `quick-status-pill--${key}`
}

function recentTaskVideoUrl(task: TaskItem) {
  const output = recentTaskOutput(task)
  const outputAsset = plainRecordField(output, 'outputAsset')
  const resultAsset = recentTaskResultAsset(task)
  return resolveRecentMediaUrl(stringRecordField(output, 'videoUrl') ||
    stringRecordField(output, 'fileUrl') ||
    stringRecordField(outputAsset, 'fileUrl') ||
    resultAsset?.fileUrl ||
    '')
}

function recentTaskCoverUrl(task: TaskItem) {
  const output = recentTaskOutput(task)
  const outputAsset = plainRecordField(output, 'outputAsset')
  const resultAsset = recentTaskResultAsset(task)
  const resultAssetMetadata = parseRecentAssetMetadata(resultAsset)
  const raw =
    stringRecordField(output, 'coverUrl') ||
    stringRecordField(output, 'thumbnailUrl') ||
    stringRecordField(output, 'posterUrl') ||
    stringRecordField(output, 'poster') ||
    stringRecordField(output, 'lastFrameUrl') ||
    stringRecordField(output, 'firstFrameUrl') ||
    stringRecordField(output, 'previewUrl') ||
    stringRecordField(output, 'imageUrl') ||
    stringRecordField(outputAsset, 'thumbnailUrl') ||
    stringRecordField(outputAsset, 'coverUrl') ||
    stringRecordField(outputAsset, 'posterUrl') ||
    imageLikeFileUrl(outputAsset) ||
    resultAsset?.thumbnailUrl ||
    recentAssetMetadataText(resultAssetMetadata, 'thumbnailUrl') ||
    recentAssetMetadataText(resultAssetMetadata, 'coverUrl') ||
    recentAssetMetadataText(resultAssetMetadata, 'firstFrameUrl') ||
    recentAssetMetadataText(resultAssetMetadata, 'posterUrl') ||
    imageLikeAssetFileUrl(resultAsset)
  return resolveRecentMediaUrl(raw) || carPlaceholderImage
}

function recentTaskResultAsset(task: TaskItem) {
  const assetId = recentTaskAssetId(task)
  return assetId ? recentResultAssets.value[assetId] : undefined
}

function imageLikeFileUrl(record: Record<string, unknown> | null) {
  const url = stringRecordField(record, 'fileUrl')
  const mimeType = stringRecordField(record, 'mimeType').toLowerCase()
  const assetType = stringRecordField(record, 'assetType').toUpperCase()
  if (assetType === 'IMAGE' || assetType === 'COVER' || mimeType.startsWith('image/')) {
    return url
  }
  return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(url) ? url : ''
}

function imageLikeAssetFileUrl(asset: AssetItem | undefined) {
  if (!asset) return ''
  const mimeType = String(asset.mimeType || '').toLowerCase()
  if (asset.assetType === 'IMAGE' || asset.assetType === 'COVER' || mimeType.startsWith('image/')) {
    return asset.fileUrl || ''
  }
  return /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(asset.fileUrl || '') ? asset.fileUrl : ''
}

function parseRecentAssetMetadata(asset: AssetItem | undefined) {
  if (!asset?.metadataJson) return null
  try {
    const parsed = JSON.parse(asset.metadataJson) as unknown
    return isPlainRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function recentAssetMetadataText(record: Record<string, unknown> | null, field: string) {
  const raw = record?.[field]
  return typeof raw === 'string' ? raw : ''
}

function resolveRecentMediaUrl(url: string) {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`
}

function recentTaskAssetId(task: TaskItem) {
  if (typeof task.resultAssetId === 'number' && task.resultAssetId > 0) {
    return task.resultAssetId
  }
  const output = recentTaskOutput(task)
  const outputAsset = plainRecordField(output, 'outputAsset')
  return positiveNumberField(output, 'resultAssetId') || positiveNumberField(outputAsset, 'assetId')
}

function friendlyRecentTaskError(message?: string | null) {
  const text = String(message || '').trim()
  return text.length > 90 ? `${text.slice(0, 90)}...` : text
}

function recentTaskTime(task: TaskItem) {
  const raw = Date.parse(task.updatedAt || task.createdAt || '')
  return Number.isFinite(raw) ? raw : 0
}

function recentTaskOutput(task: TaskItem) {
  if (!task.outputJson) {
    return null
  }
  try {
    const parsed = JSON.parse(task.outputJson) as unknown
    return isPlainRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function plainRecordField(record: Record<string, unknown> | null, field: string) {
  const raw = record?.[field]
  return isPlainRecord(raw) ? raw : null
}

function stringRecordField(record: Record<string, unknown> | null, field: string) {
  const raw = record?.[field]
  return typeof raw === 'string' ? raw : ''
}

function positiveNumberField(record: Record<string, unknown> | null, field: string) {
  const raw = record?.[field]
  const value = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

async function handleFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!requireAuth('登录后可上传补充素材')) {
    input.value = ''
    return
  }
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  uploading.value = true
  errorMessage.value = ''
  try {
    for (const file of files) {
      const inferredRole = inferUploadedAssetRoleForMetadata(file)
      const asset = await uploadMaterialAsset(file, {
        metadataJson: JSON.stringify({
          from: 'quick_render_upload',
          assetRole: inferredRole || undefined,
          originalFileName: file.name,
          source: 'quick_render',
        }),
      })
      await appendMaterial(asset, { name: file.name, type: file.type })
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '素材上传失败'
  } finally {
    uploading.value = false
  }
}

async function handleVehicleImagesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!requireAuth('登录后可上传车辆图片')) {
    input.value = ''
    return
  }
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  uploading.value = true
  errorMessage.value = ''
  try {
    const existingVehicleCount = vehicleMaterialCount.value
    for (const [index, file] of files.entries()) {
      const forcedRole = vehicleRoleForUpload(file, existingVehicleCount + index)
      const asset = await uploadMaterialAsset(file, {
        metadataJson: JSON.stringify({
          from: 'quick_render_vehicle_upload',
          assetRole: forcedRole,
          originalFileName: file.name,
          source: 'quick_render',
        }),
      })
      await appendMaterial(asset, { name: file.name, type: file.type }, forcedRole)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '车辆图片上传失败'
  } finally {
    uploading.value = false
  }
}

async function handleAssetCenterSelect(payload: { asset: AssetItem; url: string }) {
  errorMessage.value = ''
  rememberPickedAssetUrl(payload.asset, payload.url)
  try {
    await appendMaterial(payload.asset, {
      name: payload.asset.fileName || '',
      type: payload.asset.mimeType || '',
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资产加入失败'
  }
}

function openAssetDrawer(category: CarSalesAssetCategoryKey) {
  if (!requireAuth('登录后可从资产中心选择素材')) return
  assetSelectLockedCategory.value = null
  assetSelectInitialCategory.value = category
  assetSelectDrawerOpen.value = true
}

function openCarBundleDrawer() {
  if (!requireAuth('登录后可从资产中心选择车型素材包')) return
  assetSelectLockedCategory.value = 'carBundle'
  assetSelectInitialCategory.value = 'carBundle'
  assetSelectDrawerOpen.value = true
}

function openAvatarDrawer() {
  if (!requireAuth('登录后可选择数字人形象')) return
  avatarDrawerOpen.value = true
}

async function handleClassifiedAssetSelect(payload: CarSalesAssetSelectPayload) {
  errorMessage.value = ''
  const role = payload.role
  rememberClassifiedAssetUrl(payload.asset, role)
  try {
    await appendMaterial(payload.asset, {
      name: payload.asset.fileName || '',
      type: payload.asset.mimeType || '',
    }, role)
    if (role === 'host_image' || role === 'host_video') {
      selectedAvatar.value = null
      advancedSettings.value = {
        ...advancedSettings.value,
        hostAppearanceEnabled: true,
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资产加入失败'
  }
}

async function handleAvatarSelected(avatar: AvatarItem) {
  selectedAvatar.value = avatar
  advancedSettings.value = {
    ...advancedSettings.value,
    hostAppearanceEnabled: true,
  }
  if (!avatar.assetId) {
    errorMessage.value = '该数字人缺少资产 ID，无法加入本次生成'
    return
  }
  errorMessage.value = ''
  try {
    const asset = await getAssetDetail(avatar.assetId).catch(() => avatarToAsset(avatar))
    await appendMaterial(asset, {
      name: asset.fileName || avatar.avatarName || '',
      type: asset.mimeType || 'image/*',
    }, 'host_image')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '数字人加入失败'
  }
}

function clearSelectedAvatar() {
  selectedAvatar.value = null
  materials.value = materials.value.filter((item) => item.role !== 'host_image' && item.role !== 'host_video')
  advancedSettings.value = {
    ...advancedSettings.value,
    hostAppearanceEnabled: false,
  }
}

function goAvatarCreatePage() {
  if (!requireAuth('登录后可创建数字人形象')) return
  avatarDrawerOpen.value = false
  void router.push({ name: 'avatar' })
}

function applySellingPointTemplate(template: (typeof sellingPointTemplates)[number]) {
  if (selectedSellingPointIds.value.includes(template.id)) {
    selectedSellingPointIds.value = selectedSellingPointIds.value.filter((id) => id !== template.id)
    removeTemplatePromptFromGoalText(template)
    return
  }
  selectedSellingPointIds.value.push(template.id)
  appendTemplatePromptToGoalText(template)
}

async function appendMaterial(asset: AssetItem, file: QuickFileLike, forcedRole?: QuickRenderAssetRole) {
  const existing = materials.value.find((item) => item.asset.assetId === asset.assetId)
  if (existing) {
    if (forcedRole) {
      existing.role = forcedRole
    }
    return existing
  }
  const material: QuickMaterial = {
    asset,
    role: forcedRole || inferRole(file, asset),
  }
  materials.value.push(material)
  if (shouldReadText(asset, file)) {
    void readTextContent(asset)
      .then((text) => {
        material.textContent = text
      })
      .catch(() => {
        material.textContent = ''
      })
  }
  return material
}

async function ensureMaterialTextContent(material: QuickMaterial) {
  if (material.textContent?.trim()) {
    return material.textContent.trim()
  }
  const file = {
    name: material.asset.fileName || '',
    type: material.asset.mimeType || '',
  }
  if (!shouldReadText(material.asset, file) && !['TEXT', 'JSON'].includes(material.asset.assetType)) {
    return ''
  }
  try {
    const text = await readTextContent(material.asset)
    material.textContent = text
    return text.trim()
  } catch {
    material.textContent = ''
    return ''
  }
}

async function ensurePlanTextMaterialsReady() {
  const roles: QuickRenderAssetRole[] = ['car_model_bundle']
  const targets = materials.value.filter((item) => roles.includes(item.role))
  if (!targets.length) {
    return
  }
  await Promise.all(targets.map((item) => ensureMaterialTextContent(item)))
}

function rememberPickedAssetUrl(asset: AssetItem, url: string) {
  if (asset.assetType === 'IMAGE' || asset.assetType === 'COVER') {
    quickPickedImageUrl.value = url
  } else if (asset.assetType === 'AUDIO') {
    quickPickedAudioUrl.value = url
  } else if (asset.assetType === 'VIDEO') {
    quickPickedVideoUrl.value = url
  } else if (asset.assetType === 'JSON') {
    if (isCarModelBundleAsset(asset)) {
      quickPickedCarBundleUrl.value = url
    } else {
      quickPickedJsonUrl.value = url
    }
  } else if (asset.assetType === 'TEXT') {
    quickPickedTextUrl.value = url
  }
}

function rememberClassifiedAssetUrl(asset: AssetItem, role: QuickRenderAssetRole) {
  const url = assetUrlForSelection(asset)
  if (role === 'car_model_bundle') {
    quickPickedCarBundleUrl.value = url
  } else if (role.startsWith('scene_')) {
    quickPickedSceneImageUrl.value = url
  } else if (role.startsWith('car_')) {
    quickPickedImageUrl.value = url
  } else if (role === 'bgm' || role === 'voiceover' || role === 'reference_audio') {
    quickPickedAudioUrl.value = url
  } else if (role === 'voice_script' || role === 'subtitle') {
    quickPickedTextUrl.value = url
  } else if (role === 'storyboard_json' || role === 'benchmark_json') {
    quickPickedJsonUrl.value = url
  } else if (role === 'material_video' || role === 'host_video' || role === 'reference_video') {
    quickPickedVideoUrl.value = url
  }
}

function assetUrlForSelection(asset: AssetItem) {
  return asset.fileUrl || asset.thumbnailUrl || ''
}

function avatarToAsset(avatar: AvatarItem): AssetItem {
  const now = new Date().toISOString()
  return {
    assetId: Number(avatar.assetId),
    ownerUserId: avatar.ownerUserId ?? null,
    createdByUserId: avatar.createdByUserId ?? null,
    projectId: avatar.projectId,
    taskId: avatar.taskId,
    assetType: 'IMAGE',
    visibility: avatar.visibility ?? null,
    status: avatar.status ?? null,
    fileName: avatar.avatarName || '数字人形象',
    filePath: null,
    fileUrl: avatar.previewUrl || '',
    thumbnailUrl: avatar.previewUrl,
    mimeType: 'image/*',
    fileSize: 0,
    sourceType: avatar.sourceType || 'AVATAR_GENERATE',
    metadataJson: JSON.stringify({
      avatarId: avatar.avatarId,
      avatarName: avatar.avatarName,
      assetRole: 'host_image',
    }),
    createdAt: avatar.createdAt || now,
    updatedAt: avatar.updatedAt || now,
  }
}

function resolveMediaUrl(url: string | null | undefined) {
  const raw = String(url || '').trim()
  if (!raw) {
    return ''
  }
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
    return raw
  }
  return `${API_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`
}

function removeMaterial(assetId: number) {
  const removed = materials.value.find((item) => item.asset.assetId === assetId)
  materials.value = materials.value.filter((item) => item.asset.assetId !== assetId)
  if (removed && (removed.role === 'host_image' || removed.role === 'host_video') && selectedAvatar.value?.assetId === assetId) {
    selectedAvatar.value = null
  }
}

function roleLabel(role: QuickRenderAssetRole | string) {
  return roleOptions.find((item) => item.value === role)?.label || '自动素材'
}

function videoStyleLabel(style: CarSalesAdvancedSettings['videoStyle']) {
  const labels: Record<CarSalesAdvancedSettings['videoStyle'], string> = {
    realistic: '真实销售',
    premium: '高级质感',
    energetic: '高能短视频',
    family: '家庭温暖',
    tech: '科技智能',
  }
  return labels[style] || '真实销售'
}

function buildGoalTextForRequest() {
  const storyboardSummary = planPreview.value?.storyboard
    .map((shot) => shot.visual.trim())
    .filter(Boolean)
    .join('; ')
  const parts = [
    planPreview.value?.configItems.length ? `confirmed config: ${planPreview.value.configItems.join('; ')}` : '',
    storyboardSummary ? `confirmed storyboard: ${storyboardSummary}` : '',
  ].filter(Boolean)
  return parts.length ? parts.join('\n') : undefined
}

function appendTemplatePromptToGoalText(template: SellingPointTemplate) {
  const prompt = template.prompt.trim()
  if (!prompt) return
  templatePromptInjections.value = {
    ...templatePromptInjections.value,
    [template.id]: prompt,
  }
  const current = goalText.value.trim()
  if (current.includes(prompt)) {
    return
  }
  goalText.value = (current ? `${current}\n${prompt}` : prompt).slice(0, 500)
}

function removeTemplatePromptFromGoalText(template: SellingPointTemplate) {
  const prompt = templatePromptInjections.value[template.id] || template.prompt.trim()
  const { [template.id]: _removed, ...rest } = templatePromptInjections.value
  templatePromptInjections.value = rest
  if (!prompt) return
  goalText.value = removePromptBlock(goalText.value, prompt)
}

function userGoalTextForGeneration() {
  return stripTemplatePromptsFromGoalText(goalText.value)
}

function stripTemplatePromptsFromGoalText(value: string) {
  const prompts = uniqueShortTags([
    ...Object.values(templatePromptInjections.value),
    ...sellingPointTemplates.map((template) => template.prompt),
  ]).sort((left, right) => right.length - left.length)
  return prompts.reduce((text, prompt) => removePromptBlock(text, prompt), value).trim()
}

function removePromptBlock(value: string, prompt: string) {
  const target = prompt.trim()
  if (!target) return value.trim()
  let cleaned = value
    .split(target)
    .join('\n')
  const maxPrefixLength = Math.min(target.length - 1, cleaned.length)
  for (let length = maxPrefixLength; length >= 12; length -= 1) {
    const prefix = target.slice(0, length)
    if (cleaned.endsWith(prefix)) {
      cleaned = `${cleaned.slice(0, -prefix.length)}\n`
      break
    }
  }
  return cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

function overlayForRequest(overlay: CarSalesAdvancedSettings['headlineOverlay']) {
  if (!overlay.enabled && !overlay.text.trim()) {
    return undefined
  }
  return {
    enabled: overlay.enabled,
    text: overlay.text.trim() || undefined,
    fontFamily: overlay.fontFamily,
    fontSize: overlay.fontSize,
    textColor: overlay.textColor,
    outlineColor: overlay.outlineColor,
    position: overlay.position,
  }
}

async function prepareAiPlanPreview() {
  if (!requireAuth('登录后可生成汽车销售视频')) return
  submitAttempted.value = true
  if (planPreviewLoading.value) return
  if (submitBlockReason.value) {
    errorMessage.value = `生成前还需：${submitBlockReason.value}`
    if (!hasCarModelBundle.value) {
      openCarBundleDrawer()
    }
    return
  }
  planPreviewOpen.value = true
  planPreviewLoading.value = true
  planPreviewError.value = ''
  const warnings: string[] = []

  let scriptFallback = false
  let storyboardFallback = false
  let script = ''
  await ensurePlanTextMaterialsReady()
  const sourceText = buildPlanSourceText()
  const estimate = await fetchPlanBillingEstimate(warnings)
  const shouldUseLocalPlanOnly = estimate?.enoughBalance === false
  let storyboard: AiPlanStoryboardShot[] = []

  if (shouldUseLocalPlanOnly) {
    scriptFallback = true
    storyboardFallback = true
    warnings.push('当前积分余额不足，已跳过 AI 文案与分镜接口，使用本地方案预览。')
    script = buildFallbackPlanScript()
  } else {
    try {
      const aiPlan = await generateCarSalesAiPlan({
        prompt: userGoalTextForGeneration() || selectedSellingPointLabels().join('，') || '根据车型素材包生成汽车销售视频',
        carModelName: carBundleMaterialForPlanName(),
        carModelSummary: carBundleScriptContext.value ? carBundleContextSearchText(carBundleScriptContext.value) : '',
        sellingPoints: selectedSellingPointLabels(),
        aspectRatio: aspectRatio.value,
        voiceLanguage: voiceLanguage.value,
        totalDuration: totalDuration.value,
        segmentCount: segmentCount.value,
        segmentDuration: segmentDuration.value,
        sourceText,
      })
      script = sanitizePlanScript(normalizeNarrationText(aiPlan.script || ''), userGoalTextForGeneration())
      storyboard = normalizeAiPlanStoryboardShots(aiPlan.storyboard, userGoalTextForGeneration())
      if (!script) {
        throw new Error('方案接口返回文案为空')
      }
      if (!storyboard.length) {
        throw new Error('方案接口返回分镜为空')
      }
    } catch (error) {
      scriptFallback = true
      storyboardFallback = true
      warnings.push(`AI 方案生成使用本地兜底：${errorMessageFrom(error)}`)
      script = buildFallbackPlanScript()
    }
  }
  if (!storyboard.length) {
    storyboard = buildFallbackStoryboard(script)
  }

  planPreview.value = {
    script,
    scriptFallback,
    storyboard,
    storyboardFallback,
    estimatedCredits: estimate?.estimatedCreditCost ?? 20,
    balance: estimate?.balance ?? null,
    enoughBalance: estimate?.enoughBalance ?? null,
    estimatedDuration: estimatedRenderDurationLabel(),
    totalDuration: totalDuration.value,
    segmentCount: segmentCount.value,
    materialCount: materials.value.length,
    vehicleMaterialCount: vehicleMaterialCount.value,
    configItems: planConfigItems(),
    warnings,
  }
  persistCurrentPendingPlanTask()
  planPreviewLoading.value = false
}

function updatePlanScript(value: string) {
  if (!planPreview.value) return
  planPreview.value = {
    ...planPreview.value,
    script: normalizeNarrationText(value),
  }
  persistCurrentPendingPlanTask()
}

function updatePlanStoryboardShot(index: number, field: 'visual' | 'narration', value: string) {
  if (!planPreview.value) return
  planPreview.value = {
    ...planPreview.value,
    storyboard: planPreview.value.storyboard.map((shot) =>
      shot.index === index
        ? { ...shot, [field]: value.trim() }
        : shot,
    ),
  }
  persistCurrentPendingPlanTask()
}

function confirmAiPlanAndSubmit() {
  if (!requireAuth('登录后可生成汽车销售视频')) return
  if (!planPreview.value || planPreviewLoading.value) return
  planPreviewOpen.value = false
  void submitQuickRender()
}

function storyboardForRequest() {
  return planPreview.value?.storyboard.map((shot) => ({
    index: shot.index,
    visual: shot.visual,
    narration: shot.narration,
    duration: shot.duration,
  }))
}

function buildQuickRenderPayload(finalVoiceTextForRequest: string, baseRequest?: QuickRenderRequest | null): QuickRenderRequest {
  if (baseRequest) {
    return {
      ...baseRequest,
      finalVoiceText: finalVoiceTextForRequest || undefined,
      strictVoiceText: Boolean(finalVoiceTextForRequest),
      generatedStoryboard: storyboardForRequest(),
      goalText: buildGoalTextForRequest(),
    }
  }

  const bundleBindings = selectedCarBundleAssetRoleBindings()
  const bundleVehicleImageUrls = bindingImageUrls(bundleBindings, false)
  const bundleSceneImageUrls = bindingImageUrls(bundleBindings, true)
  const bundleCoverUrl = carModelBundleMaterial.value
    ? carModelBundleCoverUrl(carModelBundleMaterial.value.asset, carModelBundleMaterial.value.textContent, resolveMediaUrl)
    : ''

  return {
    intent: 'car_sales',
    assetIds: materials.value.map((item) => item.asset.assetId),
    assetRoles: Object.fromEntries(materials.value.map((item) => [String(item.asset.assetId), item.role])),
    assetTextContents: Object.fromEntries(
      materials.value
        .filter((item) => item.textContent && item.textContent.trim())
        .map((item) => [String(item.asset.assetId), item.textContent || '']),
    ),
    imageUrls: bundleVehicleImageUrls.length ? bundleVehicleImageUrls : undefined,
    sceneImageUrls: bundleSceneImageUrls.length ? bundleSceneImageUrls : undefined,
    assetRoleBindings: bundleBindings.length ? bundleBindings : undefined,
    coverUrl: bundleCoverUrl || undefined,
    aspectRatio: aspectRatio.value,
    subtitleMode: subtitleMode.value,
    subtitleLanguage: subtitleLanguage.value,
    nativeVoiceLanguage: voiceLanguage.value,
    nativeVoiceStyle: advancedSettings.value.nativeVoiceStyle,
    nativeSpeechStyle: advancedSettings.value.nativeSpeechStyle,
    burnInSubtitle: subtitleMode.value !== 'off' && advancedSettings.value.burnInSubtitle,
    customSubtitle: subtitleMode.value === 'upload'
      ? customSubtitleText.value || uploadedSubtitleText.value || undefined
      : undefined,
    finalVoiceText: finalVoiceTextForRequest || undefined,
    strictVoiceText: Boolean(finalVoiceTextForRequest),
    audioPolicy: audioPolicy.value,
    model: advancedSettings.value.model,
    segmentCount: segmentCount.value,
    segmentDuration: segmentDuration.value,
    generatedStoryboard: storyboardForRequest(),
    goalText: buildGoalTextForRequest(),
    outputPurpose: 'car_sales_video',
    hostAppearanceEnabled: advancedSettings.value.hostAppearanceEnabled,
    subtitleOverlay: overlayForRequest(advancedSettings.value.subtitleOverlay),
    headlineOverlay: overlayForRequest(advancedSettings.value.headlineOverlay),
  }
}

function persistCurrentPendingPlanTask() {
  if (!planPreview.value) return
  const id = currentPendingPlanTaskId.value || newPendingCarSalesPlanTaskId('ai-smart')
  currentPendingPlanTaskId.value = id
  const request = buildQuickRenderPayload(planPreview.value.script, restoredPlanRequest.value)
  restoredPlanRequest.value = request
  upsertPendingCarSalesPlanTask({
    id,
    source: 'ai-smart',
    title: carBundleMaterialForPlanName() || 'AI智能创作方案',
    routeName: 'render',
    routeQuery: {},
    aspectRatio: aspectRatio.value,
    plan: planPreview.value,
    request,
  })
}

function clearCurrentPendingPlanTask() {
  if (currentPendingPlanTaskId.value) {
    removePendingCarSalesPlanTask(currentPendingPlanTaskId.value)
  }
  currentPendingPlanTaskId.value = ''
  restoredPlanRequest.value = null
}

function restorePendingPlanFromRoute() {
  const planDraftId = typeof route.query.planDraftId === 'string' ? route.query.planDraftId : ''
  if (!planDraftId) return
  const task = getPendingCarSalesPlanTask(planDraftId)
  if (!task || task.source !== 'ai-smart') return
  currentPendingPlanTaskId.value = task.id
  restoredPlanRequest.value = task.request || null
  aspectRatio.value = task.aspectRatio
  if (task.request?.nativeVoiceLanguage === 'en-US' || task.request?.nativeVoiceLanguage === 'zh-CN') {
    voiceLanguage.value = task.request.nativeVoiceLanguage
  }
  planPreview.value = task.plan
  planPreviewError.value = ''
  planPreviewLoading.value = false
  planPreviewOpen.value = true
}

function buildPlanSourceText() {
  const selectedTemplates = sellingPointTemplates
    .filter((item) => selectedSellingPointIds.value.includes(item.id))
    .map((item) => selectedSellingPointSummary(item))
  const bundleContext = carBundleScriptContext.value
  const userGoal = userGoalTextForGeneration()
  const parts = [
    bundleContext ? `车型资料：${carBundleContextSearchText(bundleContext)}` : '',
    userGoal
      ? `用户补充需求：${userGoal}`
      : '用户补充需求：未填写，请根据车型素材包和卖点模板自动生成。',
    selectedTemplates.length ? `已选卖点：${selectedTemplates.join('；')}` : '',
    `车辆素材：${vehicleMaterialCount.value} 份，全部素材：${materials.value.length} 个`,
    `生成参数：${totalDuration.value} 秒，${segmentCount.value} 段，比例 ${aspectRatio.value}，${voiceLanguageLabel.value}`,
    `字幕策略：${subtitleLabel.value}`,
    advancedSettings.value.hostAppearanceEnabled
      ? `数字人出镜：${selectedAvatar.value?.avatarName || (hasHostMaterial.value ? '已选数字人素材' : '待选择')}`
      : '',
    advancedPromptText.value ? `高级配置：${advancedPromptText.value}` : '',
  ].filter(Boolean)
  return parts.join('\n')
}

function selectedSellingPointSummary(template: SellingPointTemplate) {
  const tags = uniqueShortTags([
    template.title,
    ...splitTagText(template.tags),
    ...template.keywords.slice(0, 4),
  ]).slice(0, 6)
  return tags.join('、') || template.title
}

function selectedSellingPointLabels() {
  return sellingPointTemplates
    .filter((item) => selectedSellingPointIds.value.includes(item.id))
    .map((item) => selectedSellingPointSummary(item))
    .filter(Boolean)
}

function carBundleMaterialForPlanName() {
  const material = carModelBundleMaterial.value
  return material ? carBundleMaterialTitle(material) : ''
}

function buildFallbackPlanScript() {
  const goal = userGoalTextForGeneration()
  const bundleContext = carBundleScriptContext.value
  const sellingPoints = sellingPointTemplates
    .filter((item) => selectedSellingPointIds.value.includes(item.id))
    .map((item) => item.title)
    .join('、')
  const pointText = uniqueShortTags([
    ...(bundleContext?.sellingPoints || []),
    ...splitTagText(sellingPoints),
  ]).slice(0, 5).join('、') || sellingPoints || '车辆质感、核心卖点和到店转化'
  const carName = bundleContext?.title || bundleContext?.brandModel || '这款车'
  const detailLine = bundleContext?.notes
    ? `${bundleContext.notes}`
    : bundleContext?.imageBriefs.length
      ? `本次素材包含${bundleContext.imageBriefs.slice(0, 4).join('、')}。`
      : ''
  return normalizeNarrationText(
    [
      goal || `帮我生成一条${carName}汽车销售短视频。`,
      `开场突出${carName}的第一眼质感，快速抓住用户注意力。`,
      detailLine,
      `中段围绕${pointText}展开，用真实车辆画面说明价值。`,
      `结尾给出自然行动号召，引导预约试驾或到店咨询。`,
    ].filter(Boolean).join('\n'),
  )
}

function normalizeAiPlanStoryboardShots(shots: CarSalesAiPlanShot[], userPrompt = '') {
  return (shots || []).slice(0, segmentCount.value).map((shot, index) => ({
    index: shot.index || index + 1,
    visual: shot.visual || `展示车辆卖点镜头 ${index + 1}`,
    narration: sanitizePlanScript(shot.narration || '', userPrompt),
    duration: Math.max(1, Math.round(shot.duration || segmentDuration.value)),
  }))
}

function buildFallbackStoryboard(script: string): AiPlanStoryboardShot[] {
  const lines = normalizeNarrationText(script).split(/\n+/).filter(Boolean)
  const fallbackGoal = selectedSellingPointLabels().join('，') || carBundleMaterialForPlanName() || '汽车销售口播'
  const visualTemplates = [
    '车辆外观开场，镜头从车头或侧身进入，建立第一眼吸引力。',
    '展示内饰、空间或核心配置，用稳定镜头突出真实质感。',
    '补充细节、场景或使用价值，围绕用户关心的卖点推进。',
    '门店或车辆高光收尾，配合自然行动号召。',
  ]
  return Array.from({ length: segmentCount.value }).map((_, index) => ({
    index: index + 1,
    visual: visualTemplates[index % visualTemplates.length],
    narration: lines[index] || lines[lines.length - 1] || fallbackGoal,
    duration: segmentDuration.value,
  }))
}

async function fetchPlanBillingEstimate(warnings: string[]) {
  try {
    return await getBillingEstimate({
      taskType: 'SEEDANCE_CAR_SALES_VIDEO',
      modelCode: advancedSettings.value.model === 'auto' ? undefined : advancedSettings.value.model,
      imageCount: vehicleMaterialCount.value,
      segmentCount: segmentCount.value,
      durationSeconds: totalDuration.value,
    })
  } catch (error) {
    warnings.push(`积分估算失败，暂按 20 积分展示：${errorMessageFrom(error)}`)
    return null as BillingEstimateResponse | null
  }
}

function estimatedRenderDurationLabel() {
  if (advancedSettings.value.hostAppearanceEnabled) return '3-8 分钟'
  if (segmentCount.value >= 4 || totalDuration.value >= 20) return '2-5 分钟'
  return '1-2 分钟'
}

function planConfigItems() {
  const items = [
    `比例 ${aspectRatio.value}`,
    `${totalDuration.value} 秒`,
    `${segmentCount.value} 段`,
    voiceLanguageLabel.value,
    `字幕 ${subtitleLabel.value}`,
    `音频 ${audioDecisionLabel.value}`,
    `风格 ${videoStyleLabel(advancedSettings.value.videoStyle)}`,
  ]
  if (advancedSettings.value.hostAppearanceEnabled) items.push('数字人出镜')
  if (selectedAvatar.value?.avatarName) {
    items.push(`数字人 ${selectedAvatar.value.avatarName}`)
  } else if (hasHostMaterial.value) {
    items.push('数字人素材')
  }
  if (advancedSettings.value.headlineOverlay.enabled && advancedSettings.value.headlineOverlay.text.trim()) {
    items.push('大字报')
  }
  if (advancedSettings.value.model !== 'auto') {
    items.push(`模型 ${advancedSettings.value.model}`)
  }
  return items
}

function errorMessageFrom(error: unknown) {
  return error instanceof Error ? error.message : String(error || '未知错误')
}

function vehicleRoleForUpload(file: File, index: number): QuickRenderAssetRole {
  const inferred = inferRoleFromNameAndMime(file.name, file.type)
  if (inferred.startsWith('car_')) {
    return inferred
  }
  return vehicleUploadRoles[index % vehicleUploadRoles.length]
}

async function ensureNarrationReadyForSubmit() {
  const source = narrationSourceText.value.trim()
  if (!source) {
    return ''
  }
  if (!needsNarrationLocalization.value) {
    if (!finalNarrationText.value.trim() || narrationResolvedKey.value !== narrationLocalizationKey.value) {
      finalNarrationText.value = source
      narrationResolvedKey.value = narrationLocalizationKey.value
      narrationEdited.value = false
    }
    return finalNarrationText.value.trim()
  }
  try {
    return await localizeNarrationCopy(false)
  } catch {
    errorMessage.value = narrationError.value || '讲述文案生成失败'
    return null
  }
}

async function resolveFinalVoiceTextForSubmit(source: string) {
  const normalized = normalizeNarrationText(source)
  if (!normalized) {
    return ''
  }
  if (!narrationLanguageMismatch(normalized, voiceLanguage.value)) {
    return normalized
  }
  try {
    return await localizeAdHocNarrationText(normalized)
  } catch {
    errorMessage.value = narrationError.value || `生成${voiceLanguageLabel.value}失败`
    return null
  }
}

async function localizeAdHocNarrationText(source: string) {
  stopNarrationTracking?.()
  stopNarrationTracking = null
  narrationError.value = ''
  narrationLocalizationLoading.value = true
  narrationTaskProgress.value = 0
  try {
    const task = await rewriteDouyinCopywriting({
      originalText: source,
      style: narrationRewriteStyle(voiceLanguage.value),
      introduce: narrationRewriteInstruction(voiceLanguage.value),
    })
    narrationTaskProgress.value = task.progress ?? 0
    if (!task.taskId) {
      throw new Error('文案生成任务未返回 taskId')
    }
    return await new Promise<string>((resolve, reject) => {
      stopNarrationTracking = trackTaskResult<DouyinRewriteWriterVO>(task.taskId, {
        onStatus(message) {
          narrationTaskProgress.value = message.progress
        },
        onResult(taskResult) {
          const text = normalizeNarrationText(taskResult.result?.translatedText || '')
          if (!text) {
            reject(new Error('豆包返回的讲述文案为空'))
            return
          }
          narrationTaskProgress.value = taskResult.progress ?? 100
          stopNarrationTracking = null
          resolve(text)
        },
        onFailure(message) {
          stopNarrationTracking = null
          reject(new Error(message.errorMessage || '讲述文案生成失败'))
        },
        onError(error) {
          stopNarrationTracking = null
          reject(error)
        },
      })
    })
  } catch (error) {
    narrationError.value = error instanceof Error ? error.message : '讲述文案生成失败'
    throw error
  } finally {
    narrationLocalizationLoading.value = false
  }
}

function regenerateNarrationLocalization() {
  narrationEdited.value = false
  void localizeNarrationCopy(true).catch(() => undefined)
}

function refreshNarrationEditorForCurrentSource() {
  stopNarrationTracking?.()
  stopNarrationTracking = null
  narrationLocalizationPromise = null
  narrationTaskProgress.value = null
  narrationError.value = ''
  narrationLocalizationLoading.value = false
  const source = narrationSourceText.value.trim()
  if (!source) {
    finalNarrationText.value = ''
    narrationResolvedKey.value = ''
    narrationEdited.value = false
    return
  }
  if (!needsNarrationLocalization.value) {
    finalNarrationText.value = source
    narrationResolvedKey.value = narrationLocalizationKey.value
    narrationEdited.value = false
    return
  }
  finalNarrationText.value = ''
  narrationResolvedKey.value = ''
  narrationEdited.value = false
  void localizeNarrationCopy(false).catch(() => undefined)
}

async function localizeNarrationCopy(force: boolean) {
  const source = narrationSourceText.value.trim()
  const key = narrationLocalizationKey.value
  if (!source) {
    return ''
  }
  if (!needsNarrationLocalization.value) {
    finalNarrationText.value = source
    narrationResolvedKey.value = key
    narrationEdited.value = false
    return source
  }
  if (!force && finalNarrationText.value.trim() && narrationResolvedKey.value === key) {
    return finalNarrationText.value.trim()
  }
  if (!force && narrationLocalizationPromise) {
    return narrationLocalizationPromise
  }

  stopNarrationTracking?.()
  stopNarrationTracking = null
  narrationError.value = ''
  narrationLocalizationLoading.value = true
  narrationTaskProgress.value = 0

  const promise = (async () => {
    const task = await rewriteDouyinCopywriting({
      originalText: source,
      style: narrationRewriteStyle(voiceLanguage.value),
      introduce: narrationRewriteInstruction(voiceLanguage.value),
    })
    narrationTaskProgress.value = task.progress ?? 0
    if (!task.taskId) {
      throw new Error('文案生成任务未返回 taskId')
    }
    return await new Promise<string>((resolve, reject) => {
      stopNarrationTracking = trackTaskResult<DouyinRewriteWriterVO>(task.taskId, {
        onStatus(message) {
          narrationTaskProgress.value = message.progress
        },
        onResult(taskResult) {
          const text = normalizeNarrationText(taskResult.result?.translatedText || '')
          if (!text) {
            const error = new Error('豆包返回的讲述文案为空')
            narrationError.value = error.message
            reject(error)
            return
          }
          finalNarrationText.value = text
          narrationResolvedKey.value = key
          narrationEdited.value = false
          narrationTaskProgress.value = taskResult.progress ?? 100
          stopNarrationTracking = null
          resolve(text)
        },
        onFailure(message) {
          const error = new Error(message.errorMessage || '讲述文案生成失败')
          narrationTaskProgress.value = message.progress
          narrationError.value = error.message
          stopNarrationTracking = null
          reject(error)
        },
        onError(error) {
          narrationError.value = error.message
          stopNarrationTracking = null
          reject(error)
        },
      })
    })
  })()

  narrationLocalizationPromise = promise
  try {
    return await promise
  } catch (error) {
    narrationError.value = error instanceof Error ? error.message : '讲述文案生成失败'
    throw error
  } finally {
    narrationLocalizationLoading.value = false
    narrationLocalizationPromise = null
  }
}

async function submitQuickRender() {
  if (!requireAuth('登录后可生成汽车销售视频')) return
  submitAttempted.value = true
  if (busy.value) return
  const usingRestoredPlanRequest = Boolean(restoredPlanRequest.value && planPreview.value)
  if (submitBlockReason.value && !usingRestoredPlanRequest) {
    errorMessage.value = `生成前还需：${submitBlockReason.value}`
    if (!hasCarModelBundle.value) {
      openCarBundleDrawer()
    }
    return
  }
  errorMessage.value = ''
  result.value = null
  currentTaskId.value = null
  taskStatus.value = ''
  taskProgress.value = null
  const planScript = planPreview.value?.script.trim() || ''
  const finalNarration = planScript ? '' : await ensureNarrationReadyForSubmit()
  if (finalNarration == null) {
    return
  }
  const finalVoiceTextForRequest = await resolveFinalVoiceTextForSubmit(planScript || finalNarration || '')
  if (finalVoiceTextForRequest == null) {
    return
  }
  busy.value = true
  stopRenderTracking()

  const payload = buildQuickRenderPayload(finalVoiceTextForRequest, restoredPlanRequest.value)

  try {
    const submitted = await quickRenderVideo(payload, newVideoIdempotencyKey())
    clearCurrentPendingPlanTask()
    if (submitted.task?.taskId) {
      startQuickRenderTracking(submitted.task.taskId)
      return
    }
    if (submitted.digitalHumanTask?.taskId) {
      startDigitalHumanPoll(submitted.digitalHumanTask.taskId)
      return
    }
    busy.value = false
    errorMessage.value = submitted.summary || '任务提交成功，但未返回可跟踪任务'
    void loadRecentGenerations(true)
  } catch (error) {
    busy.value = false
    errorMessage.value = error instanceof Error ? error.message : '一键成片提交失败'
    void loadRecentGenerations(true)
  }
}

function startQuickRenderTracking(taskId: number) {
  rememberRenderTask(taskId)
  stopTracking = trackTaskResult<QuickRenderResponse>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      errorMessage.value = message.errorMessage || ''
    },
    onResult(taskResult) {
      const quick = taskResult.result
      taskStatus.value = 'QUICK_RENDER_DONE'
      taskProgress.value = taskResult.progress ?? 100
      if (quick.outputAsset?.fileUrl) {
        result.value = outputAssetToVideoResult(quick.outputAsset)
        busy.value = false
        void loadRecentGenerations(true)
        return
      }
      if (quick.task?.taskId) {
        rememberRenderTask(quick.task.taskId)
        startTaskTracking(quick.task.taskId)
        return
      }
      if (quick.digitalHumanTask?.taskId) {
        rememberRenderTask(quick.digitalHumanTask.taskId)
        startDigitalHumanPoll(quick.digitalHumanTask.taskId)
        return
      }
      busy.value = false
      errorMessage.value = quick.summary || '一键成片已完成，但未返回下游生成任务'
      void loadRecentGenerations(true)
    },
    onFailure(message) {
      errorMessage.value = message.errorMessage || '一键成片编排任务失败'
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      busy.value = false
      void loadRecentGenerations(true)
    },
    onError(error) {
      errorMessage.value = error.message
      busy.value = false
      void loadRecentGenerations(true)
    },
  })
}

function outputAssetToVideoResult(asset: AssetItem): VideoTaskVO {
  const now = Math.floor(Date.now() / 1000)
  return {
    taskId: String(asset.taskId || asset.assetId),
    model: 'material_mix',
    status: 'succeeded',
    createdAt: now,
    updatedAt: now,
    videoUrl: asset.fileUrl || '',
    resultAssetId: asset.assetId,
    lastFrameUrl: asset.thumbnailUrl || null,
    completionTokens: 0,
    errorCode: null,
    errorMessage: null,
  }
}

function startTaskTracking(taskId: number) {
  stopTracking?.()
  rememberRenderTask(taskId)
  stopTracking = trackTaskResult<VideoTaskVO>(taskId, {
    onStatus(message) {
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      errorMessage.value = message.errorMessage || ''
    },
    onResult(taskResult) {
      taskStatus.value = String(taskResult.status)
      taskProgress.value = taskResult.progress ?? 100
      result.value = taskResult.result
      busy.value = false
      void loadRecentGenerations(true)
    },
    onFailure(message) {
      errorMessage.value = message.errorMessage || '一键成片任务失败'
      taskStatus.value = String(message.status)
      taskProgress.value = message.progress
      busy.value = false
      void loadRecentGenerations(true)
    },
    onError(error) {
      errorMessage.value = error.message
      busy.value = false
      void loadRecentGenerations(true)
    },
  })
}

function startDigitalHumanPoll(taskId: number) {
  stopDigitalHumanPoll()
  rememberRenderTask(taskId)
  void pollDigitalHumanOnce(taskId)
  digitalHumanPollTimer = window.setInterval(() => {
    void pollDigitalHumanOnce(taskId)
  }, 2000)
}

async function pollDigitalHumanOnce(taskId: number) {
  try {
    const detail = await getDigitalHumanVideoTask(taskId)
    taskStatus.value = detail.status
    taskProgress.value = detail.progress
    errorMessage.value = detail.errorMessage || ''
    if (['SUCCESS', 'FAILED', 'RETRYABLE', 'CANCELED'].includes(detail.status)) {
      stopDigitalHumanPoll()
      busy.value = false
      if (detail.status === 'SUCCESS' && detail.videoUrl) {
        result.value = digitalHumanDetailToVideoResult(detail)
      }
      void loadRecentGenerations(true)
    }
  } catch (error) {
    stopDigitalHumanPoll()
    busy.value = false
    errorMessage.value = error instanceof Error ? error.message : '数字人口播任务查询失败'
    void loadRecentGenerations(true)
  }
}

function stopDigitalHumanPoll() {
  if (digitalHumanPollTimer != null) {
    window.clearInterval(digitalHumanPollTimer)
    digitalHumanPollTimer = null
  }
}

function stopAllTracking() {
  stopRenderTracking()
  stopNarrationTracking?.()
  stopNarrationTracking = null
}

function stopRenderTracking() {
  stopTracking?.()
  stopTracking = null
  stopDigitalHumanPoll()
}

function digitalHumanDetailToVideoResult(detail: DigitalHumanTaskDetailResponse): VideoTaskVO {
  const now = Math.floor(Date.now() / 1000)
  return {
    taskId: String(detail.taskId),
    model: detail.model || 'viduq2-turbo',
    status: 'succeeded',
    createdAt: now,
    updatedAt: now,
    videoUrl: detail.videoUrl || '',
    resultAssetId: detail.resultAssetId,
    lastFrameUrl: detail.coverUrl,
    completionTokens: detail.credits || 0,
    errorCode: null,
    errorMessage: null,
  }
}

function inferRole(file: QuickFileLike, asset: AssetItem): QuickRenderAssetRole {
  const metadata = parseQuickAssetMetadata(asset.metadataJson)
  const explicitRole = normalizeQuickAssetRole(
    quickMetadataText(metadata, 'assetRole') || quickMetadataText(metadata, 'role'),
  )
  if (explicitRole) {
    return explicitRole
  }
  const sourceType = String(asset.sourceType || '').trim().toUpperCase()
  const metadataSource = quickMetadataText(metadata, 'source').toUpperCase()
  if (
    asset.assetType === 'JSON' &&
    ['DOUYIN_BENCHMARK', 'DOUYIN_PARSE_TRANSCRIPT', 'DOUYIN_REWRITE', 'DOUYIN_TRANSCRIPT'].includes(sourceType)
  ) {
    return 'benchmark_json'
  }
  if (
    asset.assetType === 'JSON' &&
    ['STORYBOARD_GENERATE', 'VIDEO_SCRIPT_ANALYZE', 'VIDEO_SCRIPT_URL_ANALYZE'].includes(sourceType)
  ) {
    return 'storyboard_json'
  }
  if (asset.assetType === 'AUDIO' && ['TTS_GENERATE', 'VOICE_SAMPLE'].includes(sourceType)) {
    return 'voiceover'
  }
  if (asset.assetType === 'VIDEO' && sourceType === 'DIGITAL_HUMAN_GENERATE') {
    return 'host_video'
  }
  if (
    asset.assetType === 'IMAGE' &&
    (sourceType === 'AVATAR_GENERATE' || metadataSource === 'DOUBAO_SEEDREAM' || quickMetadataText(metadata, 'avatarName'))
  ) {
    return 'host_image'
  }
  const name = [
    file.name,
    asset.fileName,
    quickMetadataText(metadata, 'originalFileName'),
    quickMetadataText(metadata, 'title'),
    quickMetadataText(metadata, 'sourceTitle'),
  ].filter(Boolean).join(' ')
  if (isCarModelBundleAsset(asset) || name.includes('车型素材包') || name.toLowerCase().includes('car_model_bundle')) {
    return 'car_model_bundle'
  }
  const mime = file.type || asset.mimeType || ''
  return inferRoleFromNameAndMime(name, mime)
}

function inferUploadedAssetRoleForMetadata(file: File): QuickRenderAssetRole | '' {
  const role = inferRoleFromNameAndMime(file.name, file.type)
  if (role === 'material') {
    return ''
  }
  if (role === 'scene_outdoor' && !hasExplicitOutdoorImageSignal(file.name)) {
    return ''
  }
  return role
}

function inferRoleFromNameAndMime(nameText: string, mimeText: string | null | undefined): QuickRenderAssetRole {
  const name = nameText.toLowerCase()
  const mime = String(mimeText || '').toLowerCase()
  if (name.includes('车型素材包') || name.includes('car_model_bundle')) {
    return 'car_model_bundle'
  }
  if (mime.startsWith('audio/')) {
    if (name.includes('bgm') || name.includes('music') || name.includes('背景')) return 'bgm'
    if (name.includes('ref') || name.includes('reference')) return 'reference_audio'
    return 'voiceover'
  }
  if (mime.startsWith('video/')) {
    if (name.includes('host') || name.includes('avatar') || name.includes('主播') || name.includes('口播')) {
      return 'host_video'
    }
    if (name.includes('ref') || name.includes('reference') || name.includes('对标')) return 'reference_video'
    return 'material_video'
  }
  if (mime.includes('json') || name.endsWith('.json')) {
    if (name.includes('benchmark') || name.includes('对标')) return 'benchmark_json'
    return 'storyboard_json'
  }
  if (mime.startsWith('text/') || name.endsWith('.srt') || name.endsWith('.txt')) {
    if (name.includes('subtitle') || name.includes('字幕') || name.endsWith('.srt')) return 'subtitle'
    return 'voice_script'
  }
  if (mime.startsWith('image/')) {
    if (name.includes('host') || name.includes('avatar') || name.includes('主播') || name.includes('数字人')) return 'host_image'
    if (name.includes('side') || name.includes('侧')) return 'car_exterior_side'
    if (name.includes('rear') || name.includes('back') || name.includes('尾')) return 'car_exterior_rear'
    if (name.includes('interior') || name.includes('内饰') || name.includes('dashboard')) return 'car_interior_dashboard'
    if (name.includes('sunroof') || name.includes('天窗') || name.includes('全景天幕')) return 'car_detail_sunroof'
    if (name.includes('wheel') || name.includes('轮')) return 'car_detail_wheel'
    if (name.includes('logo') || name.includes('标')) return 'car_detail_logo'
    if (name.includes('light') || name.includes('灯')) return 'car_detail_light'
    if (name.includes('showroom') || name.includes('展厅')) return 'scene_showroom'
    if (name.includes('road') || name.includes('道路')) return 'scene_road'
    if (name.includes('night') || name.includes('夜景') || name.includes('门店')) return 'scene_night'
    if (name.includes('outdoor') || name.includes('city') || name.includes('户外') || name.includes('城市') || name.includes('场景')) return 'scene_outdoor'
    if (name.includes('car') || name.includes('front') || name.includes('车')) return 'car_exterior_front'
    return 'scene_outdoor'
  }
  return 'material'
}

function hasExplicitOutdoorImageSignal(nameText: string) {
  const name = nameText.toLowerCase()
  return ['outdoor', 'city', '户外', '城市', '街景', '外景'].some((token) => name.includes(token))
}

function parseQuickAssetMetadata(value: string | null | undefined): Record<string, unknown> | null {
  if (!value || !value.trim()) {
    return null
  }
  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null
  } catch {
    return null
  }
}

function quickMetadataText(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeQuickAssetRole(role: string | null | undefined): QuickRenderAssetRole | '' {
  const normalized = String(role || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const aliases: Record<string, QuickRenderAssetRole> = {
    voice: 'voiceover',
    voice_over: 'voiceover',
    tts: 'voiceover',
    music: 'bgm',
    background_music: 'bgm',
    storyboard: 'storyboard_json',
    benchmark: 'benchmark_json',
    script: 'voice_script',
    subtitle_text: 'subtitle',
    car_bundle: 'car_model_bundle',
    model_bundle: 'car_model_bundle',
    host: 'host_image',
    avatar: 'host_image',
    host_video_asset: 'host_video',
    reference: 'reference_video',
  }
  const roleValue = aliases[normalized] || normalized
  return roleOptions.some((option) => option.value === roleValue)
    ? roleValue as QuickRenderAssetRole
    : ''
}

function isCarModelBundleAsset(asset: AssetItem) {
  const meta = (asset.metadataJson || '').toLowerCase()
  const name = (asset.fileName || '').toLowerCase()
  return meta.includes('car_model_bundle') || (meta.includes('car_model') && meta.includes('bundle')) ||
    name.includes('车型素材包') || name.includes('car-model-bundle') || name.includes('car_model_bundle')
}

function shouldReadText(asset: AssetItem, file: QuickFileLike) {
  const mime = (file.type || asset.mimeType || '').toLowerCase()
  const name = (file.name || asset.fileName || '').toLowerCase()
  return mime.startsWith('text/') || mime.includes('json') || name.endsWith('.json') || name.endsWith('.txt') || name.endsWith('.srt')
}

async function readTextContent(asset: AssetItem) {
  const text = await getAssetTextContent(asset)
  return text.length > 20000 ? text.slice(0, 20000) : text
}

function extractNarrationSourceText(items: QuickMaterial[]) {
  const preferredRoles: QuickRenderAssetRole[] = ['voice_script', 'subtitle', 'benchmark_json', 'storyboard_json']
  for (const role of preferredRoles) {
    for (const item of items) {
      if (item.role !== role || !item.textContent?.trim()) {
        continue
      }
      const text = role === 'voice_script' || role === 'subtitle'
        ? normalizeNarrationText(item.textContent)
        : extractNarrationFromJsonText(item.textContent)
      if (text) {
        return text
      }
    }
  }
  return ''
}

function extractNarrationFromJsonText(value: string) {
  const raw = value.trim()
  if (!raw) {
    return ''
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    const direct = firstJsonText(parsed, [
      ['rewriteResult', 'translatedText'],
      ['transcriptResult', 'translatedText'],
      ['transcriptResult', 'originalText'],
      ['translatedText'],
      ['rewrittenText'],
      ['finalScript'],
      ['finalVoiceText'],
      ['sourceScript'],
      ['originalText'],
    ])
    if (direct) {
      return normalizeNarrationText(direct)
    }
    const collected: string[] = []
    collectJsonNarrationText(parsed, collected)
    return normalizeNarrationText(collected.slice(0, 8).join('\n'))
  } catch {
    return normalizeNarrationText(raw)
  }
}

function firstJsonText(value: unknown, paths: string[][]) {
  for (const path of paths) {
    let cursor = value as unknown
    for (const key of path) {
      if (!cursor || typeof cursor !== 'object' || Array.isArray(cursor)) {
        cursor = undefined
        break
      }
      cursor = (cursor as Record<string, unknown>)[key]
    }
    if (typeof cursor === 'string' && cursor.trim()) {
      return cursor.trim()
    }
  }
  return ''
}

function collectJsonNarrationText(value: unknown, output: string[]) {
  if (!value || output.length >= 12) {
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectJsonNarrationText(item, output)
    }
    return
  }
  if (typeof value !== 'object') {
    return
  }
  const preferredKeys = new Set(['voiceText', 'content', 'narration', 'script', 'text', 'copywriting'])
  const record = value as Record<string, unknown>
  for (const [key, child] of Object.entries(record)) {
    if (preferredKeys.has(key) && typeof child === 'string' && child.trim() && child.trim() !== '无') {
      output.push(child.trim())
    }
  }
  for (const child of Object.values(record)) {
    collectJsonNarrationText(child, output)
  }
}

function normalizeNarrationText(value: string) {
  const withoutSrt = value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^\d+$/.test(line) && !/^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s+-->/i.test(line))
    .join('\n')
  const normalized = withoutSrt
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return normalized.length > 3000 ? normalized.slice(0, 3000).trim() : normalized
}

function narrationLanguageMismatch(text: string, targetLanguage: string) {
  const clean = normalizeNarrationText(text)
  if (!clean) {
    return false
  }
  const stats = narrationLanguageStats(clean)
  if (targetLanguage === 'en-US') {
    return stats.cjk > 0
  }
  if (stats.cjk === 0) {
    return stats.latin >= 4
  }
  return stats.latin >= 12 && stats.latin > stats.cjk * 2
}

function narrationLanguageStats(text: string) {
  let cjk = 0
  let latin = 0
  for (const char of text) {
    if (/[\u4E00-\u9FFF]/.test(char)) {
      cjk += 1
    } else if (/[A-Za-z]/.test(char)) {
      latin += 1
    }
  }
  return { cjk, latin }
}

function stableTextKey(text: string) {
  const normalized = normalizeNarrationText(text)
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0
  }
  return `${normalized.length}:${hash}`
}

function narrationRewriteStyle(language: string) {
  return language === 'en-US' ? '自然英语口播翻译' : '自然中文口播翻译'
}

function narrationRewriteInstruction(language: string) {
  if (language === 'en-US') {
    return '将原文改写式翻译成自然、简洁、可直接讲述的英文口播。保留品牌、车型、价格、数字和单位，不添加不存在的卖点，不要生硬直译，只输出英文文案。'
  }
  return '将原文改写式翻译成自然、简洁、可直接讲述的中文普通话口播。保留品牌、车型、价格、数字和单位，不添加不存在的卖点，不要生硬直译，只输出中文文案。'
}

function formatSize(size: number | null | undefined) {
  const value = Number(size || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function buildCarBundleScriptContext(item: QuickMaterial | null): CarBundleScriptContext | null {
  if (!item) {
    return null
  }
  const record = carBundleMaterialRecord(item)
  const title = carBundleMaterialTitle(item)
  const brandModel = firstText(
    quickMetadataText(record, 'brandModel'),
    quickMetadataText(record, 'modelName'),
    quickMetadataText(record, 'carModel'),
    title,
  )
  const color = firstText(
    quickMetadataText(record, 'color'),
    quickMetadataText(record, 'exteriorColor'),
    quickMetadataText(record, 'interiorColor'),
  )
  const notes = firstText(
    quickMetadataText(record, 'notes'),
    quickMetadataText(record, 'description'),
    quickMetadataText(record, 'summary'),
  )
  const sellingPoints = uniqueShortTags([
    ...metadataValueToTags(record?.sellingPoints),
    ...metadataValueToTags(record?.sellingPointTags),
    ...metadataValueToTags(record?.tags),
    ...metadataValueToTags(record?.scenes),
  ]).slice(0, 10)
  const imageBriefs = carBundleImageBriefs(record)
  return {
    title,
    brandModel,
    color,
    notes,
    sellingPoints,
    imageBriefs,
    imageCount: carBundleMaterialImageCount(item),
  }
}

function carBundleContextSearchText(context: CarBundleScriptContext) {
  return [
    context.title,
    context.brandModel ? `车型 ${context.brandModel}` : '',
    context.color ? `颜色 ${context.color}` : '',
    context.sellingPoints.length ? `卖点 ${context.sellingPoints.join('、')}` : '',
    context.imageCount ? `素材 ${context.imageCount} 张` : '',
    context.imageBriefs.length ? `图片 ${context.imageBriefs.join('；')}` : '',
    context.notes,
  ].filter(Boolean).join('；').slice(0, 1600)
}

function carBundleImageBriefs(record: Record<string, unknown> | null) {
  const rawImages = record?.images
  if (!Array.isArray(rawImages)) {
    return []
  }
  const briefs: string[] = []
  for (const image of rawImages) {
    if (!isPlainRecord(image)) {
      continue
    }
    const role = firstText(
      quickMetadataText(image, 'role'),
      quickMetadataText(image, 'assetRole'),
      quickMetadataText(image, 'category'),
    )
    const roleLabel = carBundleRoleLabels[role] || role
    const title = firstText(
      quickMetadataText(image, 'title'),
      quickMetadataText(image, 'fileName'),
      quickMetadataText(image, 'name'),
    )
    const tags = metadataValueToTags(image.tags).slice(0, 3).join('、')
    const brief = [roleLabel, title, tags].filter(Boolean).join(' ')
    if (brief) {
      briefs.push(brief)
    }
  }
  return uniqueShortTags(briefs).slice(0, 12)
}

function carBundleMaterialRecord(item: QuickMaterial) {
  return parseCarModelBundleRecord(item.textContent, item.asset.metadataJson)
}

function carBundleMaterialTitle(item: QuickMaterial) {
  const record = carBundleMaterialRecord(item)
  const title = [
    firstText(
      quickMetadataText(record, 'brandModel'),
      quickMetadataText(record, 'title'),
      quickMetadataText(record, 'modelName'),
    ),
    quickMetadataText(record, 'color'),
  ].filter(Boolean).join(' · ')
  return title || item.asset.fileName
}

function carBundleMaterialMeta(item: QuickMaterial) {
  const count = carBundleMaterialImageCount(item)
  return [
    count > 0 ? `${count} 张车辆图` : '车型素材包',
    item.asset.assetType,
    formatSize(item.asset.fileSize),
  ].filter(Boolean).join(' · ')
}

function carBundleMaterialImages(item: QuickMaterial) {
  const images = carModelBundleImageUrls(item.asset, item.textContent, resolveMediaUrl)
  if (images.length) {
    return images
  }
  const cover = carModelBundleCoverUrl(item.asset, item.textContent, resolveMediaUrl)
  return cover ? [cover] : []
}

function carBundleMaterialImageCount(item: QuickMaterial) {
  return carModelBundleDeclaredImageCount(item.asset, item.textContent) || carBundleMaterialImages(item).length
}

function selectedCarBundleAssetRoleBindings(): CarSalesAssetRoleBinding[] {
  const bundle = carModelBundleMaterial.value
  if (!bundle) {
    return []
  }
  return buildCarModelBundleAssetRoleBindings(bundle.asset, bundle.textContent, resolveMediaUrl)
}

function bindingImageUrls(bindings: CarSalesAssetRoleBinding[], sceneOnly: boolean) {
  const urls = bindings
    .filter((binding) => {
      const role = String(binding.assetRole || '').toLowerCase()
      const isScene = role.startsWith('scene_')
      return sceneOnly ? isScene : !isScene
    })
    .map((binding) => binding.url)
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
  return Array.from(new Set(urls))
}

function firstText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) {
      return text
    }
  }
  return ''
}

async function consumeAssetReuseDraft() {
  if (route.query.reuseDraft !== '1' || typeof window === 'undefined') {
    return
  }
  const raw = window.sessionStorage.getItem(ASSET_REUSE_DRAFT_KEY)
  if (!raw) return
  window.sessionStorage.removeItem(ASSET_REUSE_DRAFT_KEY)
  try {
    const parsed = JSON.parse(raw) as {
      prompt?: unknown
      assets?: Array<{ asset?: unknown; assetId?: unknown; role?: unknown }>
    }
    const prompt = typeof parsed.prompt === 'string' ? parsed.prompt.trim() : ''
    if (prompt && !goalText.value.trim()) {
      goalText.value = prompt.slice(0, 500)
    }
    for (const item of Array.isArray(parsed.assets) ? parsed.assets : []) {
      const draftAsset = isDraftAsset(item.asset)
        ? item.asset
        : typeof item.assetId === 'number'
          ? await getAssetDetail(item.assetId)
          : null
      if (!draftAsset) continue
      const role = normalizeQuickAssetRole(String(item.role || '')) || inferRole(
        { name: draftAsset.fileName || '', type: draftAsset.mimeType || '' },
        draftAsset,
      )
      rememberClassifiedAssetUrl(draftAsset, role)
      await appendMaterial(draftAsset, {
        name: draftAsset.fileName || '',
        type: draftAsset.mimeType || '',
      }, role)
      if (role === 'host_image' || role === 'host_video') {
        advancedSettings.value = {
          ...advancedSettings.value,
          hostAppearanceEnabled: true,
        }
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '资产复用草稿读取失败'
  }
}

function isDraftAsset(value: unknown): value is AssetItem {
  return Boolean(
    value &&
      typeof value === 'object' &&
      typeof (value as AssetItem).assetId === 'number' &&
      typeof (value as AssetItem).assetType === 'string',
  )
}

async function applyPreferredAvatar() {
  const preferredAvatarId = carSalesPreferences.preferredAvatarId
  if (!preferredAvatarId || selectedAvatar.value || hasHostMaterial.value) {
    return
  }
  try {
    const avatars = await getAvatars()
    const preferredAvatar = avatars.find((avatar) => avatar.avatarId === preferredAvatarId)
    if (preferredAvatar) {
      await handleAvatarSelected(preferredAvatar)
    }
  } catch {
    // 未登录或头像列表暂不可用时，仅跳过默认数字人回填。
  }
}

watch([narrationSourceText, voiceLanguage], () => refreshNarrationEditorForCurrentSource())

watch(
  () => route.query.planDraftId,
  () => restorePendingPlanFromRoute(),
  { immediate: true },
)

onMounted(() => {
  void loadRecentGenerations(false)
  void loadTemplateMatchCandidates()
  void consumeAssetReuseDraft()
  void applyPreferredAvatar()
})

onBeforeUnmount(stopAllTracking)
</script>

<style>
.quick-render-page {
  display: grid;
  gap: 16px;
}

.quick-render-page--embedded {
  gap: 14px;
}

.quick-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.quick-head h1 {
  margin: 0 0 8px;
  color: #151a2d;
  font-size: 22px;
  font-weight: 850;
}

.quick-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.7;
}

.quick-mode-switch {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 6px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  padding: 4px;
}

.quick-mode-switch a,
.quick-mode-switch span {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border-radius: 6px;
  padding: 0 12px;
  color: #4f586c;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.quick-mode-switch span {
  background: #f5f3ff;
  color: #5e50df;
}

.quick-panel {
  display: grid;
  gap: 16px;
}

.quick-prompt-box {
  display: grid;
  gap: 8px;
}

.quick-prompt-box textarea {
  width: 100%;
  min-height: 138px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: #fff;
  color: var(--hs-text);
  padding: 14px;
  font-size: 14px;
  line-height: 1.7;
  outline: none;
  resize: vertical;
}

.quick-prompt-box textarea:focus {
  border-color: var(--hs-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.quick-prompt-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--hs-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.quick-prompt-meta span {
  color: var(--hs-primary);
}

.quick-prompt-meta span.warning {
  color: var(--hs-warning);
}

.quick-template-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(142px, 1fr));
  gap: 10px;
}

.quick-template-strip button {
  display: grid;
  min-height: 102px;
  align-content: start;
  gap: 6px;
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: var(--hs-surface);
  color: var(--hs-text);
  padding: 12px;
  text-align: left;
}

.quick-template-strip button:hover,
.quick-template-strip button.active {
  border-color: #bfdbfe;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
}

.quick-template-strip strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
}

.quick-template-strip strong em {
  flex: 0 0 auto;
  border-radius: 999px;
  background: #edf4ff;
  color: var(--hs-primary);
  padding: 2px 7px;
  font-style: normal;
  font-size: 11px;
  font-weight: 900;
}

.quick-template-strip span {
  color: var(--hs-text-muted);
  font-size: 12px;
  font-weight: 650;
}

.quick-template-strip small {
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.45;
}

.quick-match-panel {
  display: grid;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.quick-match-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quick-match-head > div {
  display: grid;
  gap: 3px;
}

.quick-match-head strong {
  color: #172033;
  font-size: 14px;
  font-weight: 850;
}

.quick-match-head span {
  color: #667085;
  font-size: 12px;
  font-weight: 650;
}

.quick-match-tags,
.quick-match-mini-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.quick-match-tags span,
.quick-match-mini-tags span {
  display: inline-flex;
  min-height: 22px;
  align-items: center;
  border-radius: 999px;
  background: #eef2ff;
  color: #475467;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 800;
}

.quick-match-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.quick-match-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: start;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.quick-match-card--primary {
  grid-template-columns: 48px minmax(0, 1fr);
  border-color: #bfdbfe;
  background: #f8fbff;
}

.quick-match-score {
  display: grid;
  width: 48px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
  font-size: 12px;
  font-weight: 900;
}

.quick-match-card strong {
  display: block;
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 850;
  line-height: 1.4;
}

.quick-match-card p {
  margin: 4px 0 8px;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
  line-height: 1.5;
}

.quick-match-card button {
  min-height: 30px;
  border: 1px solid #d0d5dd;
  border-radius: 7px;
  background: #fff;
  color: #344054;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 800;
}

.quick-match-card button:hover {
  border-color: #bfdbfe;
  color: var(--hs-primary);
}

.quick-match-error {
  margin: 0;
  color: #b54708;
  font-size: 12px;
  font-weight: 700;
}

.quick-source-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) repeat(3, minmax(200px, 1fr));
  gap: 12px;
  align-items: stretch;
}

.quick-source-grid-advanced {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 12px;
}

.quick-source-grid--single {
  grid-template-columns: minmax(260px, 1fr);
}

.quick-upload {
  display: grid;
  min-height: 112px;
  place-items: center;
  gap: 6px;
  border: 1px dashed #c8bfff;
  border-radius: 8px;
  background: #fbfaff;
  color: #5e50df;
  cursor: pointer;
  padding: 18px;
  text-align: center;
}

.quick-upload input {
  display: none;
}

.quick-upload strong {
  font-size: 15px;
  font-weight: 900;
}

.quick-upload small {
  color: #98a2b3;
  font-size: 12.5px;
  font-weight: 700;
}

.quick-upload.disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.quick-vehicle-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
  padding: 10px 12px;
  font-size: 12px;
  line-height: 1.5;
}

.quick-vehicle-hint.warning {
  border-color: #fed7aa;
  background: #fff7ed;
  color: var(--hs-warning);
}

.quick-vehicle-hint--error {
  border-color: #fecaca;
  background: #fff1f2;
  color: #be123c;
}

.quick-vehicle-hint--error span {
  color: #9f1239;
}

.quick-vehicle-hint strong {
  flex: 0 0 auto;
  font-weight: 850;
}

.quick-vehicle-hint span {
  color: var(--hs-text-muted);
}

.quick-asset-hub-callout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #fff;
  padding: 12px 14px;
}

.quick-asset-hub-callout > div {
  display: grid;
  gap: 4px;
}

.quick-asset-hub-callout strong {
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 850;
}

.quick-asset-hub-callout span {
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.quick-advanced-assets {
  border: 1px solid var(--hs-border);
  border-radius: 8px;
  background: var(--hs-surface-muted);
  padding: 0;
}

.quick-advanced-assets summary {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  list-style: none;
  padding: 0 14px;
}

.quick-advanced-assets summary::-webkit-details-marker {
  display: none;
}

.quick-advanced-assets summary span {
  color: var(--hs-text);
  font-size: 13px;
  font-weight: 850;
}

.quick-advanced-assets summary small {
  color: var(--hs-text-muted);
  font-size: 12px;
  line-height: 1.5;
}

.quick-advanced-assets[open] {
  padding: 0 12px 12px;
}

.quick-materials {
  display: grid;
  gap: 10px;
}

.quick-material {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px 64px;
  gap: 12px;
  align-items: center;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fff;
  padding: 10px 12px;
}

.quick-material--bundle {
  grid-template-columns: 132px minmax(0, 1fr) 150px 64px;
  align-items: stretch;
  border-color: #bfdbfe;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.quick-material-preview {
  position: relative;
  display: grid;
  min-height: 78px;
  place-items: center;
  overflow: hidden;
  border-radius: 8px;
  background: #eaf2ff;
  color: var(--hs-primary);
  font-size: 13px;
  font-weight: 850;
}

.quick-material-preview > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quick-material-preview-stack {
  position: absolute;
  right: 6px;
  bottom: 6px;
  display: grid;
  grid-template-columns: repeat(3, 24px);
  gap: 3px;
}

.quick-material-preview-stack img {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 5px;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.18);
  object-fit: cover;
}

.quick-material-role {
  display: grid;
  gap: 2px;
  justify-items: start;
  border-radius: 8px;
  background: #f6f4ff;
  padding: 8px 10px;
}

.quick-material-role strong {
  color: #5e50df;
  font-size: 12.5px;
  font-weight: 850;
}

.quick-material-role small {
  color: #98a2b3;
  font-size: 11px;
  font-weight: 750;
}

.quick-material-main {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.quick-material-main strong,
.quick-material-main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-material-main strong {
  color: #232838;
  font-size: 13.5px;
  font-weight: 850;
}

.quick-material-main small {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 700;
}

.quick-material select,
.quick-field select,
.quick-field input,
.quick-field textarea,
.quick-drawer-button {
  height: 38px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 0 10px;
  font-size: 13px;
  outline: none;
}

.quick-drawer-button {
  background: var(--hs-primary-soft);
  color: var(--hs-primary);
  cursor: pointer;
  font-weight: 800;
}

.quick-drawer-button:hover:not(:disabled) {
  border-color: #bfdbfe;
  background: #dbeafe;
}

.quick-field textarea {
  min-height: 92px;
  padding: 10px;
  line-height: 1.6;
  resize: vertical;
}

.quick-material button {
  height: 34px;
  border: 1px solid #f4cccc;
  border-radius: 8px;
  background: #fff5f5;
  color: #d92d20;
  cursor: pointer;
  font-weight: 800;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.quick-grid-compact {
  grid-template-columns: repeat(auto-fit, minmax(220px, 320px));
}

.quick-smart-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.quick-smart-grid > div {
  display: grid;
  gap: 6px;
  min-height: 92px;
  align-content: start;
  border: 1px solid #e8ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfcff 100%);
  padding: 14px;
}

.quick-smart-grid span {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 850;
}

.quick-smart-grid strong {
  color: #1f2540;
  font-size: 15px;
  font-weight: 900;
}

.quick-smart-grid small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.quick-field {
  display: grid;
  gap: 8px;
}

.quick-field label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 850;
}

.quick-summary {
  display: grid;
  gap: 12px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.quick-summary dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.quick-summary dt {
  color: #98a2b3;
  font-size: 12px;
  font-weight: 800;
}

.quick-summary dd {
  margin: 4px 0 0;
  color: #232838;
  font-size: 13px;
  font-weight: 850;
}

.quick-summary p {
  margin: 0;
  color: #4f586c;
  font-size: 13px;
  line-height: 1.7;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-status {
  color: #5e50df;
  font-size: 13px;
  font-weight: 800;
}

.quick-submit-hint {
  color: var(--hs-warning);
  font-size: 13px;
  font-weight: 700;
}

.quick-error {
  border-radius: 8px;
  background: #fff1f0;
  color: #b42318;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.6;
}

.quick-narration-panel {
  display: grid;
  gap: 10px;
  border: 1px solid #dce3f2;
  border-radius: 8px;
  background: #fbfcff;
  padding: 14px;
}

.quick-narration-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.quick-narration-head > div {
  display: grid;
  gap: 4px;
}

.quick-narration-head label {
  color: #2d3446;
  font-size: 13px;
  font-weight: 850;
}

.quick-narration-head small {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.quick-narration-head button {
  height: 34px;
  border: 1px solid #d9ddff;
  border-radius: 8px;
  background: #fff;
  color: #5e50df;
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 850;
  padding: 0 12px;
}

.quick-narration-head button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.quick-narration-panel textarea {
  width: 100%;
  min-height: 132px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  padding: 10px;
  font-size: 13px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
}

.quick-progress-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  color: #5e50df;
  font-size: 12px;
  font-weight: 850;
}

.quick-progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: #e9ecf5;
}

.quick-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #635bff;
  transition: width 0.2s ease;
}

.quick-empty,
.quick-running {
  margin: 0;
}

.quick-running {
  color: #5e50df;
  font-weight: 800;
}

.quick-generation-state,
.quick-result-state {
  display: grid;
  grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
  gap: 24px;
  align-items: center;
}

.quick-phone-preview {
  position: relative;
  display: grid;
  width: min(280px, 100%);
  aspect-ratio: 9 / 16;
  justify-self: center;
  align-content: end;
  gap: 8px;
  overflow: hidden;
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(16, 24, 40, 0.04), rgba(16, 24, 40, 0.86)),
    linear-gradient(135deg, #dbeafe, #5f7391 52%, #172033);
  color: #fff;
  box-shadow: 0 18px 38px rgba(16, 24, 40, 0.16);
  padding: 18px;
}

.quick-phone-preview--generating::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    linear-gradient(140deg, transparent 0 36%, rgba(255, 255, 255, 0.18) 38%, transparent 42%),
    linear-gradient(180deg, transparent 0 58%, rgba(21, 94, 239, 0.36) 100%);
}

.quick-phone-status,
.quick-phone-preview strong,
.quick-phone-preview span,
.quick-phone-progress {
  position: relative;
  z-index: 1;
}

.quick-phone-status {
  position: absolute;
  top: 16px;
  left: 16px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
  font-weight: 850;
  padding: 5px 10px;
}

.quick-phone-preview strong {
  font-size: 22px;
  font-weight: 900;
  line-height: 1.25;
}

.quick-phone-preview span {
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  font-weight: 750;
}

.quick-phone-progress {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.quick-phone-progress i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #fff;
}

.quick-phone-preview--result {
  align-content: stretch;
  background: #101828;
  padding: 0;
}

.quick-phone-preview--result video {
  width: 100%;
  height: 100%;
  background: #101828;
  object-fit: cover;
}

.quick-generation-main,
.quick-result-info-card {
  display: grid;
  gap: 18px;
  min-width: 0;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
  padding: 20px;
}

.quick-generation-title h2 {
  margin: 0;
  color: #101828;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.2;
}

.quick-generation-title p {
  margin: 7px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.quick-generation-steps {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.quick-generation-steps li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  color: #667085;
}

.quick-generation-steps li > span {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #dfe7f5;
  border-radius: 50%;
  background: #fff;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 900;
}

.quick-generation-steps li.done > span {
  border-color: #22c55e;
  background: #dcfce7;
  color: #15803d;
}

.quick-generation-steps li.active > span {
  border-color: #155eef;
  background: #eff6ff;
  color: #155eef;
  box-shadow: 0 0 0 5px rgba(21, 94, 239, 0.08);
}

.quick-generation-steps strong {
  display: block;
  color: #101828;
  font-size: 14px;
  font-weight: 900;
}

.quick-generation-steps small {
  display: block;
  margin-top: 3px;
  color: #667085;
  font-size: 12px;
}

.quick-generation-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px solid #e6ecf7;
  padding-top: 16px;
}

.quick-generation-footer div {
  display: grid;
  gap: 2px;
}

.quick-generation-footer span {
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.quick-generation-footer strong {
  color: #155eef;
  font-size: 22px;
  font-weight: 900;
}

.quick-video-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
}

.quick-video-info div {
  display: grid;
  min-width: 0;
  gap: 4px;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fff;
  padding: 11px 12px;
}

.quick-video-info dt {
  color: #667085;
  font-size: 12px;
  font-weight: 850;
}

.quick-video-info dd {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: #101828;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-result-actions,
.quick-recent-toolbar,
.quick-recent-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.quick-recent-list {
  display: grid;
  gap: 10px;
}

.quick-recent-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid #e5e9f2;
  border-radius: 8px;
  background: #fff;
  padding: 12px;
}

.quick-recent-item--current {
  border-color: #c7d2fe;
  background: #f8f9ff;
}

.quick-recent-main {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.quick-recent-main strong {
  overflow: hidden;
  color: #232838;
  font-size: 14px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-recent-main p,
.quick-recent-error {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.quick-recent-error {
  color: #b42318;
  font-weight: 700;
}

.quick-recent-side {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.quick-recent-progress {
  max-width: 320px;
}

.quick-recent-side .app-task-status {
  min-height: 24px;
  padding: 0 10px;
}

.quick-status-pill--RUNNING {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.quick-status-pill--SUCCESS {
  background: rgba(34, 197, 94, 0.1);
  color: #16a34a;
}

.quick-status-pill--FAILED {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.quick-status-pill--QUEUED {
  background: rgba(99, 91, 255, 0.12);
  color: #5e50df;
}

.quick-status-pill--RETRYABLE {
  background: rgba(245, 158, 11, 0.12);
  color: #d97706;
}

.quick-status-pill--CANCELED,
.quick-status-pill--OTHER {
  background: rgba(107, 114, 128, 0.1);
  color: #6b7280;
}

@media (max-width: 900px) {
  .quick-head,
  .quick-actions,
  .quick-section-head,
  .quick-asset-hub-callout,
  .quick-match-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .quick-recent-item {
    grid-template-columns: 1fr;
  }

  .quick-recent-side {
    justify-items: start;
  }

  .quick-grid,
  .quick-smart-grid,
  .quick-source-grid,
  .quick-summary dl {
    grid-template-columns: 1fr 1fr;
  }

  .quick-material {
    grid-template-columns: 1fr;
  }

  .quick-match-card {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .quick-match-card button {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 560px) {
  .quick-grid,
  .quick-smart-grid,
  .quick-source-grid,
  .quick-summary dl,
  .quick-match-grid {
    grid-template-columns: 1fr;
  }

  .quick-match-card,
  .quick-match-card--primary {
    grid-template-columns: 1fr;
  }

  .quick-match-card button {
    grid-column: auto;
  }
}
/* Prototype alignment overrides for the car-sales home workspace. */
.quick-render-page,
.quick-render-page--embedded {
  gap: 22px;
}

.quick-head {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 4px 0 2px;
  text-align: center;
}

.quick-head h1 {
  margin: 0;
  color: #101828;
  font-size: 30px;
  font-weight: 900;
  line-height: 1.2;
}

.quick-head h1::after {
  content: " ✦";
  color: #72a5ff;
  font-size: 22px;
}

.quick-head p {
  color: #667085;
}

.quick-mode-switch {
  border-color: #e6ecf7;
  border-radius: 8px;
}

.quick-mode-switch a,
.quick-mode-switch span {
  padding: 7px 12px;
}

.quick-mode-switch span {
  color: #155eef;
}

.quick-compose-card,
.quick-template-section,
.quick-result-panel,
.quick-recent-panel {
  display: grid;
  gap: 18px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 42px rgba(16, 24, 40, 0.06);
  padding: 16px;
}

.quick-compose-card {
  max-width: 1230px;
  width: 100%;
  justify-self: center;
}

.quick-prompt-box {
  gap: 0;
  overflow: hidden;
  border: 1px solid #d6deec;
  border-radius: 8px;
  background: #fff;
}

.quick-prompt-box textarea {
  min-height: 118px;
  border: 0;
  border-radius: 0;
  padding: 18px;
  font-size: 15px;
  resize: vertical;
}

.quick-prompt-box:focus-within {
  border-color: #9ebcff;
  box-shadow: 0 0 0 3px rgba(21, 94, 239, 0.08);
}

.quick-prompt-meta {
  min-height: 38px;
  justify-content: flex-end;
  border-top: 1px solid #eef2f7;
  padding: 0 16px;
}

.quick-prompt-meta span {
  color: #155eef;
}

.quick-compose-body {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) auto;
  gap: 18px;
  align-items: end;
}

.quick-vehicle-area {
  display: grid;
  gap: 10px;
}

.quick-vehicle-area h2,
.quick-section-head h2 {
  margin: 0;
  color: #101828;
  font-size: 18px;
  font-weight: 900;
  line-height: 1.2;
}

.quick-vehicle-area p,
.quick-section-head p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.quick-compose-card .quick-source-grid {
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 14px;
}

.quick-source-grid-advanced {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  padding: 0 14px 14px;
}

.quick-upload {
  min-height: 108px;
  align-content: center;
  justify-items: center;
  border-color: #b8c7e6;
  background: #f8fbff;
}

.quick-upload::before {
  content: "+";
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  color: #155eef;
  font-size: 28px;
  font-weight: 300;
  line-height: 1;
}

.quick-upload strong {
  color: #155eef;
}

.quick-upload-button {
  border-style: solid;
  background: #f4f7ff;
}

.quick-upload-button::before {
  content: "▣";
  font-size: 22px;
  font-weight: 700;
}

.quick-vehicle-hint {
  flex-wrap: wrap;
  padding: 0;
  background: transparent;
}

.quick-control-area {
  display: grid;
  justify-items: end;
  gap: 8px;
}

.quick-control-bar {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.quick-control-field {
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 52px;
  align-items: center;
  gap: 8px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #fff;
  padding: 0 12px;
  white-space: nowrap;
}

.quick-control-field span {
  flex: 0 0 auto;
  color: #344054;
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
}

.quick-control-field select {
  flex: 0 0 auto;
  min-width: 78px;
  border: 0;
  background: transparent;
  color: #155eef;
  font-size: 13px;
  font-weight: 850;
  outline: none;
}

.quick-drawer-button {
  flex: 0 0 auto;
  width: auto;
  min-height: 52px;
  border-color: #bfdbfe;
  color: #155eef;
  padding: 0 16px;
  white-space: nowrap;
}

.quick-generate-button {
  flex: 0 0 auto;
  min-width: 168px;
  min-height: 52px;
  border-radius: 8px;
  box-shadow: 0 14px 26px rgba(21, 94, 239, 0.22);
  white-space: nowrap;
}

.quick-generate-button--needs-input {
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.16);
}

.quick-credit-line {
  min-height: 18px;
  color: #98a2b3;
  font-size: 12px;
  font-weight: 750;
}

.quick-submit-block-reason {
  color: #be123c;
}

.quick-decision-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.quick-decision-strip > div {
  display: grid;
  min-width: 0;
  gap: 4px;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
  padding: 11px 12px;
}

.quick-decision-strip span {
  color: #7f8aa3;
  font-size: 11px;
  font-weight: 800;
}

.quick-decision-strip strong {
  overflow: hidden;
  color: #232838;
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-decision-strip small {
  color: #667085;
  font-size: 11.5px;
  line-height: 1.45;
}

.quick-advanced-assets {
  border-color: #e6ecf7;
  background: #fbfcff;
}

.quick-summary-details {
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fbfcff;
}

.quick-summary-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  padding: 12px 14px;
}

.quick-summary-details summary::-webkit-details-marker {
  display: none;
}

.quick-summary-details summary span {
  color: #344054;
  font-size: 13px;
  font-weight: 850;
}

.quick-summary-details summary small {
  color: #667085;
  font-size: 12px;
  line-height: 1.5;
}

.quick-summary-details .quick-summary {
  margin: 0 14px 14px;
}

.quick-summary {
  border-color: #e6ecf7;
}

.quick-summary dl {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.quick-summary-extra {
  color: #667085;
}

.quick-section-head {
  align-items: center;
}

.quick-more-button {
  min-height: 36px;
  border: 1px solid #e6ecf7;
  border-radius: 8px;
  background: #fff;
  color: #155eef;
  cursor: pointer;
  font-size: 13px;
  font-weight: 850;
  padding: 0 14px;
}

.quick-template-strip {
  grid-template-columns: repeat(6, minmax(148px, 1fr));
  gap: 12px;
}

.quick-template-strip button {
  min-height: 130px;
}

.quick-template-icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 8px;
  background: #155eef;
  color: #fff;
  font-size: 17px;
  font-weight: 900;
}

.quick-template-strip b {
  color: #155eef;
  font-size: 12px;
  font-weight: 850;
}

.quick-match-panel {
  display: block;
  padding: 0;
  border-color: #e6ecf7;
}

.quick-match-panel summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  cursor: pointer;
  padding: 12px 14px;
}

.quick-match-panel summary::-webkit-details-marker {
  display: none;
}

.quick-match-panel summary strong {
  color: #232838;
  font-size: 14px;
  font-weight: 850;
}

.quick-match-panel summary span {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.quick-match-panel summary button {
  min-height: 32px;
  border: 1px solid #d9ddff;
  border-radius: 8px;
  background: #fff;
  color: #5e50df;
  cursor: pointer;
  font-size: 12px;
  font-weight: 850;
  padding: 0 12px;
}

.quick-match-panel .quick-match-tags,
.quick-match-panel .quick-match-grid,
.quick-match-panel .quick-match-error {
  padding-right: 14px;
  padding-left: 14px;
}

.quick-match-panel .quick-match-grid {
  padding-bottom: 14px;
}

.quick-recent-list {
  grid-template-columns: repeat(5, minmax(180px, 1fr));
  gap: 14px;
}

.quick-recent-item {
  grid-template-columns: 1fr;
  gap: 0;
  overflow: hidden;
  padding: 0;
  box-shadow: 0 12px 28px rgba(16, 24, 40, 0.06);
}

.quick-recent-thumb {
  display: grid;
  aspect-ratio: 16 / 9;
  place-items: center;
  overflow: hidden;
  background: linear-gradient(135deg, #dbeafe, #eef2ff);
  color: #155eef;
  font-size: 18px;
  font-weight: 900;
}

.quick-recent-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.quick-recent-main {
  padding: 12px 12px 0;
}

.quick-recent-side {
  justify-items: start;
  padding: 12px;
}

@media (max-width: 1180px) {
  .quick-compose-body {
    grid-template-columns: 1fr;
  }

  .quick-control-area {
    justify-items: stretch;
  }

  .quick-control-bar {
    justify-content: flex-start;
  }

  .quick-template-strip,
  .quick-decision-strip,
  .quick-recent-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .quick-generation-state,
  .quick-result-state {
    grid-template-columns: minmax(200px, 280px) minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .quick-head {
    justify-items: start;
    text-align: left;
  }

  .quick-head h1 {
    font-size: 24px;
  }

  .quick-compose-card,
  .quick-template-section,
  .quick-result-panel,
  .quick-recent-panel {
    padding: 12px;
  }

  .quick-control-bar {
    display: grid;
    grid-template-columns: 1fr;
  }

  .quick-control-field,
  .quick-drawer-button,
  .quick-generate-button {
    width: 100%;
  }

  .quick-compose-card .quick-source-grid,
  .quick-template-strip,
  .quick-decision-strip,
  .quick-recent-list,
  .quick-summary dl,
  .quick-match-panel summary,
  .quick-generation-state,
  .quick-result-state,
  .quick-video-info {
    grid-template-columns: 1fr;
  }

  .quick-phone-preview {
    width: min(230px, 100%);
  }

  .quick-generation-main,
  .quick-result-info-card {
    padding: 14px;
  }
}

/* Final first-screen alignment for the car-sales one-click workspace. */
.quick-render-page,
.quick-render-page--embedded {
  gap: 20px;
}

.quick-render-page.quick-render-page--embedded {
  width: 100%;
  max-width: none;
  margin: 0;
}

.quick-compose-card {
  gap: 16px;
  width: 100%;
  max-width: none;
  border-color: #dfe7f5;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.07);
  padding: 18px;
}

.quick-prompt-box {
  position: relative;
  border-color: #ccd8ec;
  border-radius: 14px;
}

.quick-prompt-box textarea {
  min-height: 112px;
  max-height: 124px;
  padding: 18px 62px 38px 18px;
  color: #23304a;
  font-size: 15px;
  line-height: 1.65;
  resize: none;
}

.quick-prompt-box textarea::placeholder {
  color: #8390aa;
}

.quick-prompt-meta {
  position: absolute;
  right: 14px;
  bottom: 10px;
  min-height: auto;
  gap: 12px;
  border-top: 0;
  padding: 0;
}

.quick-prompt-meta small {
  display: none;
}

.quick-magic-button {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid #dbe5ff;
  border-radius: 10px;
  background: #f7faff;
  color: #155eef;
  font-size: 17px;
  font-weight: 900;
}

.quick-magic-button:hover:not(:disabled) {
  border-color: #b9ccff;
  background: #edf4ff;
}

.quick-compose-body {
  grid-template-columns: minmax(360px, min(42%, 470px)) minmax(0, 1fr);
  gap: 18px;
  align-items: end;
}

.quick-vehicle-area {
  gap: 10px;
}

.quick-vehicle-area h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
}

.quick-info-icon {
  display: inline-grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border: 1px solid #9aa9c2;
  border-radius: 999px;
  color: #667085;
  font-size: 11px;
  font-weight: 900;
}

.quick-compose-card .quick-source-grid {
  grid-template-columns: repeat(2, 190px);
  gap: 14px;
}

.quick-upload {
  width: 190px;
  height: 108px;
  min-height: 108px;
  border-radius: 10px;
  border-color: #bed0ef;
  background: linear-gradient(180deg, #fbfdff 0%, #f5f8ff 100%);
  padding: 10px 14px;
}

.quick-upload::before {
  margin-bottom: 2px;
}

.quick-upload strong {
  font-size: 14px;
}

.quick-upload small {
  max-width: 132px;
  line-height: 1.45;
}

.quick-vehicle-area p {
  color: #7a86a0;
  font-size: 12.5px;
}

.quick-vehicle-hint {
  border: 0;
  color: #155eef;
  font-size: 12px;
}

.quick-control-area {
  align-self: end;
  width: 100%;
  min-width: 0;
}

.quick-control-bar {
  align-items: stretch;
  flex-wrap: wrap;
  gap: 6px;
  max-width: 100%;
}

.quick-control-field {
  min-width: 118px;
  min-height: 50px;
  gap: 6px;
  border-color: #e0e7f3;
  border-radius: 10px;
  padding: 0 10px;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.03);
}

.quick-control-field select {
  min-width: 58px;
}

.quick-drawer-button {
  min-width: 96px;
  min-height: 50px;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.03);
}

.quick-generate-button {
  min-width: 160px;
  min-height: 50px;
  border-radius: 10px;
  background: linear-gradient(90deg, #155eef 0%, #8b5cf6 100%);
  box-shadow: 0 16px 30px rgba(37, 99, 235, 0.24);
}

.quick-generate-button::before {
  content: "✦";
  margin-right: 6px;
  font-size: 14px;
}

.quick-generate-button:disabled {
  background: linear-gradient(90deg, #2f6cf6 0%, #a855f7 100%);
  color: #fff;
  opacity: 0.58;
}

.quick-credit-line {
  width: min(180px, 100%);
  justify-self: end;
  text-align: center;
}

.quick-compose-card > .quick-advanced-assets,
.quick-compose-card > .quick-summary-details {
  display: none;
}

.quick-template-section,
.quick-recent-panel {
  border: 0;
  background: transparent;
  box-shadow: none;
  padding: 0 4px;
}

.quick-section-head {
  min-height: 34px;
}

.quick-section-head h2::after {
  content: "⌄";
  margin-left: 8px;
  color: #344054;
  font-size: 13px;
}

.quick-more-button {
  border-radius: 999px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.05);
}

.quick-template-strip {
  grid-template-columns: repeat(6, minmax(148px, 1fr));
}

.quick-template-strip button {
  height: 130px;
  min-height: 130px;
  border-color: #e5ebf5;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
  padding: 13px 14px 12px;
}

.quick-template-strip strong {
  color: #23304a;
}

.quick-template-strip strong em {
  background: #eef4ff;
  color: #155eef;
}

.quick-template-strip small {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.quick-match-panel {
  display: none;
}

.quick-recent-list {
  grid-template-columns: repeat(5, minmax(170px, 1fr));
}

.quick-recent-item {
  border-color: #e5ebf5;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
}

.quick-recent-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.18)),
    linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
}

.quick-recent-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 78%;
}

.quick-recent-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 16px;
  line-height: 1;
  transform: translate(-50%, -50%);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.18);
}

.quick-recent-main {
  gap: 5px;
  padding: 10px 12px 0;
}

.quick-recent-main strong {
  font-size: 13.5px;
}

.quick-recent-side {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 12px 12px;
}

.quick-recent-side .app-task-status {
  min-height: 22px;
  font-size: 11px;
}

.quick-recent-buttons {
  margin-left: auto;
}

.quick-recent-buttons .app-secondary-button:not(:first-child),
.quick-recent-buttons a.app-secondary-button {
  display: none;
}

.quick-recent-buttons .app-secondary-button {
  min-height: 28px;
  border-radius: 8px;
  padding: 0 9px;
  font-size: 12px;
}

@media (max-width: 1320px) {
  .quick-compose-body {
    grid-template-columns: 1fr;
  }

  .quick-control-area,
  .quick-credit-line {
    min-width: 0;
    justify-self: stretch;
  }

  .quick-control-bar {
    flex-wrap: wrap;
  }
}

@media (max-width: 900px) {
  .quick-template-strip,
  .quick-recent-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .quick-prompt-box textarea {
    max-height: none;
    min-height: 130px;
    padding-right: 18px;
  }

  .quick-prompt-meta {
    left: 14px;
    justify-content: space-between;
  }

  .quick-compose-card .quick-source-grid,
  .quick-template-strip,
  .quick-recent-list {
    grid-template-columns: 1fr;
  }

  .quick-credit-line {
    width: 100%;
  }
}

.quick-render-page.quick-render-page--embedded {
  gap: 22px;
}

.quick-compose-card {
  padding: 18px 18px 14px;
}

.quick-prompt-box textarea {
  min-height: 116px;
}

.quick-compose-body {
  align-items: end;
}

.quick-control-field::after {
  color: #155eef;
  content: "⌄";
  font-size: 13px;
  font-weight: 900;
}

.quick-control-field select {
  appearance: none;
}

.quick-drawer-button::before {
  content: "≡";
  margin-right: 7px;
  color: #155eef;
  font-size: 15px;
  font-weight: 900;
  transform: rotate(90deg);
}

.quick-generate-button:disabled {
  opacity: 0.88;
}

.quick-template-section,
.quick-recent-panel {
  width: 100%;
}

.quick-template-strip button {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr) 28px;
  align-items: start;
  gap: 4px 12px;
  height: 126px;
  min-height: 126px;
  padding: 16px 18px 14px;
  text-align: left;
}

.quick-template-icon {
  grid-row: 1 / 4;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid #bfd7ff;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.94)),
    #fff;
  color: #155eef;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.78),
    0 10px 22px rgba(21, 94, 239, 0.16);
}

.quick-template-icon svg {
  width: 22px;
  height: 22px;
  stroke-width: 2.25;
}

.quick-template-icon--family-space {
  border-color: #9cc4ff;
  color: #155eef;
}

.quick-template-icon--smart-cabin {
  border-color: #c7b6ff;
  color: #6d28d9;
}

.quick-template-icon--exterior-value {
  border-color: #ffbf8a;
  color: #ea580c;
}

.quick-template-icon--performance {
  border-color: #8ddce8;
  color: #0891b2;
}

.quick-template-icon--range-saving {
  border-color: #8fdcc2;
  color: #059669;
}

.quick-template-icon--store-promo {
  border-color: #f8a7b8;
  color: #e11d48;
}

.quick-template-strip button:hover .quick-template-icon,
.quick-template-strip button.active .quick-template-icon {
  background: #fff;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.9),
    0 12px 26px rgba(21, 94, 239, 0.2);
}

.quick-template-strip strong,
.quick-template-strip button > span:not(.quick-template-icon),
.quick-template-strip small {
  grid-column: 2;
}

.quick-template-strip strong {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 1.25;
}

.quick-template-strip strong em {
  display: none;
}

.quick-template-strip button > span:not(.quick-template-icon),
.quick-template-strip small {
  color: #667085;
  font-size: 11.5px;
  line-height: 1.45;
}

.quick-template-strip small {
  -webkit-line-clamp: 2;
}

.quick-template-strip b {
  display: grid;
  grid-column: 1 / -1;
  height: 28px;
  place-items: center;
  border-radius: 8px;
  background: #f8fbff;
}

.quick-recent-toolbar .app-secondary-button:first-child {
  display: none;
}

.quick-recent-list {
  gap: 14px;
}

.quick-recent-item {
  overflow: hidden;
}

.quick-recent-item--placeholder .quick-recent-thumb {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0), rgba(15, 23, 42, 0.28)),
    linear-gradient(135deg, #dbeafe 0%, #c8d7ec 48%, #1f2a44 100%);
}

.quick-recent-item--placeholder .quick-recent-thumb img {
  object-position: center 78%;
  transform: scale(1.2);
}

.quick-recent-main p {
  white-space: nowrap;
}

.quick-recent-side {
  min-height: 40px;
}

.quick-recent-side .app-task-status {
  display: none;
}

.quick-compose-card .quick-bundle-select-grid {
  grid-template-columns: minmax(380px, 520px);
  width: min(520px, 100%);
}

.quick-bundle-select {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #cfe0ff;
  border-radius: 10px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  color: #155eef;
  cursor: pointer;
  padding: 10px 12px;
  text-align: left;
  box-shadow: 0 8px 22px rgba(21, 94, 239, 0.06);
}

.quick-bundle-select:hover:not(:disabled) {
  border-color: #9ebcff;
  background: #f3f8ff;
  box-shadow: 0 10px 26px rgba(21, 94, 239, 0.1);
}

.quick-bundle-select:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.quick-bundle-select-icon {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 9px;
  background: #eaf2ff;
  color: #155eef;
  font-size: 19px;
}

.quick-bundle-select-copy {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.quick-bundle-select-copy strong,
.quick-bundle-select-copy small,
.quick-vehicle-area > p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-bundle-select-copy strong {
  color: #155eef;
  font-size: 14px;
  font-weight: 900;
}

.quick-bundle-select-copy small {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.quick-bundle-select-action {
  display: inline-flex;
  min-width: 52px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #155eef;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}

@media (max-width: 760px) {
  .quick-compose-card .quick-bundle-select-grid {
    grid-template-columns: minmax(0, 1fr);
    width: 100%;
  }

  .quick-bundle-select {
    grid-template-columns: 36px minmax(0, 1fr) auto;
  }
}

@media (min-width: 901px) {
  .quick-recent-list {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .quick-render-page.quick-render-page--embedded {
    gap: 16px;
  }

  .quick-compose-card {
    border-radius: 14px;
    padding: 14px;
  }

  .quick-compose-card .quick-source-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-upload {
    width: 100%;
  }

  .quick-control-bar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-control-field,
  .quick-drawer-button,
  .quick-generate-button {
    width: 100%;
    min-width: 0;
  }

  .quick-generate-button,
  .quick-credit-line {
    grid-column: 1 / -1;
  }

  .quick-credit-line {
    justify-self: stretch;
    text-align: left;
  }

  .quick-template-strip,
  .quick-recent-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .quick-template-strip button {
    min-width: 0;
    height: auto;
    min-height: 118px;
    padding: 14px;
  }

  .quick-section-head {
    flex-flow: row wrap;
    align-items: center;
  }

  .quick-recent-toolbar {
    margin-left: auto;
  }

  .quick-recent-main p {
    display: -webkit-box;
    overflow: hidden;
    white-space: normal;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}

@media (max-width: 640px) {
  .quick-compose-card .quick-source-grid,
  .quick-template-strip,
  .quick-recent-list {
    grid-template-columns: 1fr;
  }

  .quick-control-bar {
    grid-template-columns: 1fr;
  }

  .quick-template-strip button {
    grid-template-columns: 42px minmax(0, 1fr);
  }

  .quick-bundle-select {
    grid-template-columns: 36px minmax(0, 1fr);
  }

  .quick-bundle-select-action {
    grid-column: 1 / -1;
    width: 100%;
  }

  .quick-recent-side {
    min-height: auto;
    padding-top: 8px;
  }

  .quick-recent-buttons,
  .quick-recent-buttons .app-secondary-button {
    width: 100%;
  }

  .quick-recent-buttons .app-secondary-button {
    justify-content: center;
  }
}
</style>
