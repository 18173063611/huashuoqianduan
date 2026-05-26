<template>
  <div class="benchmark-page">
    <div class="benchmark-layout">
      <aside class="analysis-card">
        <section class="panel-block">
          <h2>{{ sourcePanelTitle }}</h2>
          <BillingEstimateBanner
            :estimated-credit-cost="parseEstimate.estimatedCreditCost.value"
            :balance="parseEstimate.balance.value"
            :loading="parseEstimate.loading.value"
            :steps="parseEstimate.steps.value"
          />
          <div class="source-tabs" role="tablist" aria-label="解析来源">
            <button type="button" :class="{ active: inputMode === 'link' }" @click="switchInputMode('link')">链接解析</button>
            <button type="button" :class="{ active: inputMode === 'upload' }" @click="switchInputMode('upload')">本地上传</button>
          </div>

          <template v-if="inputMode === 'link'">
            <div class="platform-tabs" role="tablist" aria-label="视频平台">
              <button
                v-for="option in platformOptions"
                :key="option.value"
                type="button"
                :class="{ active: selectedPlatform === option.value }"
                @click="selectPlatform(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
            <p class="platform-note">{{ selectedPlatformNote }}</p>
            <p v-if="selectedPlatformLimitReason" class="platform-limit-note">{{ selectedPlatformLimitReason }}</p>
            <p v-if="platformAutoHint" class="platform-auto-hint">{{ platformAutoHint }}</p>
            <div class="parse-row">
              <input v-model.trim="videoUrl" :placeholder="videoPlaceholder" />
              <button
                class="primary-button"
                type="button"
                :disabled="parsing || !videoUrl || !!selectedPlatformLimitReason || !!parseEstimate.insufficientHint.value"
                :title="selectedPlatformLimitReason || parseEstimate.insufficientHint.value || ''"
                @click="handleParseVideo"
              >
                {{ parsing ? '解析中' : '解析' }}
              </button>
              <button
                class="secondary-button download-button"
                type="button"
                :disabled="downloading || !videoUrl || !!selectedPlatformLimitReason"
                :title="selectedPlatformLimitReason || ''"
                @click="handleDownloadVideo"
              >
                {{ downloading ? '下载中' : '下载视频' }}
              </button>
            </div>
            <div v-if="downloading || downloadProgressText" class="download-progress-panel" role="status">
              <div class="download-progress-head">
                <span>{{ downloadStatusText }}</span>
                <strong v-if="downloadProgressPercent !== null">{{ downloadProgressPercent }}%</strong>
              </div>
              <div
                v-if="downloadProgressPercent !== null"
                class="download-progress-track"
                role="progressbar"
                :aria-valuemin="0"
                :aria-valuemax="100"
                :aria-valuenow="downloadProgressPercent"
              >
                <div class="download-progress-fill" :style="{ width: `${downloadProgressPercent}%` }" />
              </div>
              <p v-if="downloadProgressText">{{ downloadProgressText }}</p>
            </div>
          </template>

          <div v-else class="upload-parse-panel">
            <label class="video-upload-picker" :class="{ disabled: uploadingLocalVideo || parsing }">
              <input
                type="file"
                accept="video/*"
                :disabled="uploadingLocalVideo || parsing"
                @change="handleLocalVideoChange"
              />
              <span>{{ uploadingLocalVideo ? '上传中…' : '选择视频' }}</span>
              <small :title="localVideoFileName">{{ localVideoFileName || '支持 MP4、MOV、WEBM 等视频文件，最大 100MB' }}</small>
            </label>
            <button
              class="primary-button upload-parse-button"
              type="button"
              :disabled="uploadingLocalVideo || parsing || !localVideoPreviewUrl || !!parseEstimate.insufficientHint.value"
              :title="parseEstimate.insufficientHint.value ?? ''"
              @click="handleParseUploadedVideo"
            >
              {{ parsing ? '解析中' : '解析上传视频' }}
            </button>
          </div>
          <p v-if="inputMode === 'link' && downloadMessage" class="success-text">{{ downloadMessage }}</p>
          <p v-if="inputMode === 'link' && downloadError" class="error-text">{{ downloadError }}</p>
          <p v-if="inputMode === 'upload' && localUploadMessage" class="success-text">{{ localUploadMessage }}</p>
          <p v-if="inputMode === 'upload' && localUploadError" class="error-text">{{ localUploadError }}</p>
          <p v-if="parseNotice" class="info-text">{{ parseNotice }}</p>
          <p v-if="parseError && parseStage !== 'error'" class="error-text">{{ parseError }}</p>
        </section>

        <section class="panel-block">
          <h3>对标视频信息</h3>
          <article v-if="!douyinParse" class="video-placeholder">
            <p>解析后将展示封面、标题与作者信息。</p>
          </article>
          <article v-else class="video-detail">
            <div class="video-media">
              <img
                v-if="videoCoverUrl"
                :src="videoCoverUrl"
                :alt="douyinParse.title || '封面'"
                class="cover-img"
                @error="coverImageFailed = true"
              />
              <video
                v-else-if="videoPreviewMediaUrl"
                :src="videoPreviewMediaUrl"
                class="cover-video"
                controls
                preload="metadata"
              />
              <div v-else class="cover-placeholder">{{ coverImageFailed ? '封面加载失败' : '封面' }}</div>
            </div>
            <div class="video-meta-block">
              <div class="author-line">
                <img
                  v-if="douyinParse.author?.avatarUrl"
                  :src="douyinParse.author.avatarUrl"
                  alt=""
                  class="author-avatar"
                />
                <strong class="video-title">{{ douyinParse.title }}</strong>
              </div>
              <div class="meta-line">
                <span>时长：{{ durationText }}</span>
                <span v-if="douyinParse.author?.nickname">作者：{{ douyinParse.author.nickname }}</span>
              </div>
            </div>
          </article>
        </section>

        <section class="panel-block">
          <h3>爆款分析结果</h3>
          <div class="insight-list">
            <div v-for="item in insightItems" :key="item.label" class="insight-item">
              <span class="insight-icon" aria-hidden="true">{{ item.icon }}</span>
              <strong>{{ item.label }}</strong>
              <p>{{ item.value }}</p>
            </div>
          </div>
        </section>

        <button class="secondary-button refresh-button" type="button" :disabled="parsing" @click="handleReparseCurrent">
          <span aria-hidden="true">↻</span>
          重新解析
        </button>
      </aside>

      <main class="rewrite-card">
        <h2>2. 文案改写</h2>
        <section class="rewrite-box">
          <p v-if="transcriptLoading" class="transcript-status">正在转写视频文案，请稍候…</p>
          <p v-else-if="parseStage === 'error' && parseError" class="error-text transcript-banner">{{ parseError }}</p>
          <p v-else-if="parseNotice" class="info-text transcript-banner">{{ parseNotice }}</p>

          <p class="rewrite-flow-hint">
            转写完成后可<strong>二次编辑原文</strong>，按需选择改写风格并填写补充说明；点击 <strong>开始改写</strong>
            返回新文案。
          </p>

          <div class="rewrite-fields">
            <label class="text-area-label">
              原文案 <span>（ASR 转写，可修改）</span>
              <textarea
                v-model="sourceText"
                class="source-text"
                :readonly="transcriptAreaReadonly"
                :placeholder="sourcePlaceholder"
              />
            </label>

            <section class="rewrite-confirm-panel" aria-label="AI 二次改写选项">
              <div class="rewrite-toolbar">
                <div class="tabs">
                  <button
                    type="button"
                    :class="{ active: rewriteTab === 'ai' }"
                    @click="rewriteTab = 'ai'"
                  >
                    <span aria-hidden="true">⌁</span>
                    AI 智能改写
                  </button>
                  <button
                    type="button"
                    :class="{ active: rewriteTab === 'custom' }"
                    @click="rewriteTab = 'custom'"
                  >
                    自定义改写
                  </button>
                </div>
              </div>

              <div v-show="rewriteTab === 'custom'" class="tab-panel custom-rewrite-shell">
                <p class="shell-placeholder">
                  自定义规则、字段与后端契约待定，此处仅预留入口；确认方案后可在此配置话术模板、禁用词等。
                </p>
              </div>

              <div v-show="rewriteTab === 'ai'" class="tab-panel ai-rewrite-shell">
                <div class="style-tools style-tools-row">
                  <label>
                    改写风格 <span class="tag-muted">（可选）</span>
                    <select
                      v-model="rewriteStyle"
                      class="rewrite-style-select"
                      :disabled="transcriptAreaReadonly"
                    >
                      <option value="">不指定</option>
                      <option value="口语化风格">口语化风格</option>
                      <option value="专业讲解风格">专业讲解风格</option>
                    </select>
                  </label>
                </div>

                <div class="extra-notes-block">
                  <button
                    type="button"
                    class="extra-notes-toggle"
                    :aria-expanded="extraNotesExpanded"
                    aria-controls="extra-notes-field"
                    id="extra-notes-toggle"
                    @click="extraNotesExpanded = !extraNotesExpanded"
                  >
                    <span
                      class="extra-notes-chevron"
                      :class="{ 'is-open': extraNotesExpanded }"
                      aria-hidden="true"
                    >›</span>
                    <span class="extra-notes-toggle-title">补充说明</span>
                    <span class="tag-muted">（点击展开）</span>
                  </button>
                  <div
                    v-show="extraNotesExpanded"
                    id="extra-notes-field"
                    class="extra-notes-collapse"
                    role="region"
                    aria-labelledby="extra-notes-toggle"
                  >
                    <textarea
                      v-model="rewriteIntroduce"
                      class="extra-notes-input"
                      rows="2"
                      :disabled="transcriptAreaReadonly"
                      placeholder="请描述你期望的改写效果，例如：偏种草、结尾引导关注等"
                    />
                  </div>
                </div>

                <p v-if="rewriteError" class="rewrite-error" role="alert">{{ rewriteError }}</p>

                <div v-if="showRewriteProgressBar" class="rewrite-progress-row">
                  <div
                    class="rewrite-progress-track"
                    role="progressbar"
                    :aria-valuemin="0"
                    :aria-valuemax="100"
                    :aria-valuenow="rewriteProgressPercent"
                  >
                    <div class="rewrite-progress-fill" :style="{ width: `${rewriteProgressPercent}%` }" />
                  </div>
                  <span class="rewrite-progress-pct">{{ rewriteProgressPercent }}%</span>
                </div>

                <div class="confirm-actions">
                  <button
                    class="primary-button confirm-rewrite-btn"
                    type="button"
                    :disabled="rewriteLoading || transcriptAreaReadonly || !sourceText.trim()"
                    @click="handleDouyinRewrite"
                  >
                    {{ rewriteLoading ? '改写中…' : '开始改写' }}
                  </button>
                </div>
              </div>
            </section>

            <label class="text-area-label">
              改写后文案
              <textarea
                v-model="rewrittenText"
                class="result-text"
                :readonly="transcriptAreaReadonly"
                :placeholder="rewritePlaceholder"
              />
              <small>字数：{{ rewrittenLength }}</small>
            </label>
          </div>

          <div class="rewrite-actions">
            <button class="secondary-button" type="button" @click="copyRewrittenText">
              <span aria-hidden="true">▣</span>
              复制文案
            </button>
            <button class="primary-button continue-button" type="button" @click="applyScript">
              应用文案并继续
              <span aria-hidden="true">›</span>
            </button>
          </div>
        </section>
      </main>
    </div>

    <footer class="bottom-action">
      <button class="primary-button continue-button" type="button" @click="applyScript">
        应用文案并继续
        <span aria-hidden="true">›</span>
      </button>
      <p>{{ applyMessage || '完成当前步骤后将自动进入下一步：音频生成' }}</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { downloadShareVideo, rewriteDouyinCopywriting, startDouyinParseWithTranscript } from '../../services/writerDouyinApi'
import { API_BASE_URL, API_ORIGIN } from '../../services/request'
import { uploadFile } from '../../services/uploadApi'
import type {
  DouyinParseStage,
  DouyinParseTaskResult,
  DouyinVideoParseResponse,
  DouyinRewriteWriterVO,
} from '../../types/writerDouyinTypes'
import { rememberSessionTaskId } from '../../services/sessionTaskStore'
import { trackTaskResult } from '../../services/taskRealtime'
import BillingEstimateBanner from '../../components/business/BillingEstimateBanner.vue'
import { useBillingEstimate } from '../../composables/useBillingEstimate'
import { useSmoothTaskProgress } from '../../composables/useSmoothTaskProgress'

// 抖音解析 / 爆款对标：核心计费动作是 VIDEO_PARSE（视频理解）。
const parseEstimate = useBillingEstimate({ taskType: 'VIDEO_PARSE' })

const emit = defineEmits<{
  continue: []
}>()

type VideoPlatformOption = {
  value: string
  label: string
  placeholder: string
  officialNote: string
}

const platformOptions: VideoPlatformOption[] = [
  {
    value: 'auto',
    label: '自动',
    placeholder: '粘贴抖音 / 小红书 / 视频号 / TikTok / 快手 / B站 / YouTube 等视频链接',
    officialNote: '自动识别平台；官方文档不提供公开视频下载接口的平台，会按平台限制给出提示。',
  },
  {
    value: 'douyin',
    label: '抖音',
    placeholder: '粘贴抖音分享链接或完整分享文案',
    officialNote: '抖音开放平台视频数据能力需要开通授权；任意公开视频直链解析不属于通用官方开放能力。',
  },
  {
    value: 'xiaohongshu',
    label: '小红书',
    placeholder: '粘贴小红书完整分享文案或 http(s) 链接',
    officialNote: '小红书公开开放文档未提供任意笔记视频下载解析接口，解析稳定性受平台限制影响。',
  },
  {
    value: 'wechat_channels',
    label: '视频号',
    placeholder: '粘贴微信视频号分享链接，例如 https://weixin.qq.com/sph/...',
    officialNote: '微信视频号官方开放能力不提供任意公开视频下载解析接口；该平台内容通常需要微信登录、客户端上下文或平台授权，当前无法稳定解析。',
  },
  {
    value: 'tiktok',
    label: 'TikTok',
    placeholder: '粘贴 TikTok 视频链接',
    officialNote: 'TikTok Display API 需用户授权，官方返回元数据与 embed_link，不提供任意公开视频下载直链。',
  },
  {
    value: 'kuaishou',
    label: '快手',
    placeholder: '粘贴快手分享链接或完整分享文案',
    officialNote: '快手开放平台官方能力以登录、发布、挂载为主，未提供任意公开视频下载解析接口。',
  },
  {
    value: 'bilibili',
    label: 'B站',
    placeholder: '粘贴 B 站视频链接',
    officialNote: 'B 站官方外链播放器支持 bvid/aid/cid；当前按 bvid/cid 链路处理公开视频信息。',
  },
  {
    value: 'youtube',
    label: 'YouTube',
    placeholder: '粘贴 YouTube 视频链接',
    officialNote: 'YouTube 官方 Data/IFrame API 支持元数据与嵌入播放，不提供任意视频下载直链。',
  },
  {
    value: 'facebook',
    label: 'Facebook',
    placeholder: '粘贴 Facebook 公开视频链接',
    officialNote: 'Facebook 官方支持公开视频嵌入和 Graph API 授权访问，但不提供任意公开视频下载接口；很多视频需要登录、地区或权限校验，当前无法稳定解析。',
  },
]

const PLATFORM_LIMIT_REASONS: Record<string, string> = {
  wechat_channels:
    '微信视频号暂不支持链接解析：视频号内容通常依赖微信登录、客户端上下文或平台授权，官方没有开放任意公开视频下载解析接口。请改用本地上传视频文件。',
  facebook:
    'Facebook 暂不支持链接解析：公开视频常受登录、地区、隐私权限和防下载策略限制，官方也不提供任意视频下载接口。请改用本地上传视频文件或可直接访问的视频直链。',
}

const videoUrl = ref('')
const selectedPlatform = ref('auto')
const inputMode = ref<'link' | 'upload'>('link')
const douyinParse = ref<DouyinVideoParseResponse | null>(null)
const coverImageFailed = ref(false)
const parseStage = ref<DouyinParseStage | ''>('')
const parsing = ref(false)
const parseError = ref('')
const parseNotice = ref('')
const downloading = ref(false)
const downloadError = ref('')
const downloadMessage = ref('')
const downloadStatusText = ref('')
const downloadReceivedBytes = ref(0)
const downloadTotalBytes = ref<number | null>(null)
const downloadProgressPercent = ref<number | null>(null)
const platformAutoHint = ref('')
const uploadingLocalVideo = ref(false)
const localVideoFileName = ref('')
const localVideoPreviewUrl = ref('')
const localVideoFilePath = ref('')
const localUploadError = ref('')
const localUploadMessage = ref('')
const rewriteStyle = ref('')
const rewriteTab = ref<'ai' | 'custom'>('ai')
const rewriteIntroduce = ref('')
const extraNotesExpanded = ref(false)
const rewriteLoading = ref(false)
const rewriteError = ref('')
const rewriteTaskStatus = ref('')
const rewriteTaskProgress = ref<number | null>(null)
const sourceText = ref('')
const rewrittenText = ref('')
const applyMessage = ref('')
const parseAbort = ref<AbortController | null>(null)
let stopParseTracking: (() => void) | null = null
let parseRunSeq = 0
let activeParseTaskId: number | null = null
let trackedParseTaskId: number | null = null
let stopRewriteTracking: (() => void) | null = null
let localUploadRequestSeq = 0

const LOCAL_VIDEO_MAX_BYTES = 100 * 1024 * 1024

const {
  showTaskProgressBar: showRewriteProgressBar,
  barProgressPercent: rewriteProgressPercent,
  reset: resetRewriteProgress,
} = useSmoothTaskProgress(rewriteTaskStatus, rewriteTaskProgress)

const videoPlaceholder = computed(
  () => platformOptions.find((option) => option.value === selectedPlatform.value)?.placeholder || platformOptions[0].placeholder,
)

const selectedPlatformNote = computed(
  () => platformOptions.find((option) => option.value === selectedPlatform.value)?.officialNote || platformOptions[0].officialNote,
)

const selectedPlatformLimitReason = computed(() => {
  if (inputMode.value !== 'link') return ''
  return PLATFORM_LIMIT_REASONS[selectedPlatform.value] || ''
})

const downloadProgressText = computed(() => {
  if (downloadReceivedBytes.value <= 0) {
    return ''
  }
  const received = formatFileSize(downloadReceivedBytes.value)
  const total = downloadTotalBytes.value && downloadTotalBytes.value > 0
    ? ` / ${formatFileSize(downloadTotalBytes.value)}`
    : ''
  return `已接收 ${received}${total}`
})

const sourcePanelTitle = computed(() => (inputMode.value === 'upload' ? '1. 上传对标视频' : '1. 输入对标视频链接'))

watch(videoUrl, (value) => {
  if (inputMode.value !== 'link') {
    return
  }
  const detected = detectPlatformFromText(value)
  if (!detected) {
    platformAutoHint.value = ''
    return
  }
  if (selectedPlatform.value !== detected) {
    selectedPlatform.value = detected
    const label = platformOptions.find((option) => option.value === detected)?.label || '对应平台'
    platformAutoHint.value = `已根据链接识别为${label}，将按该平台解析。`
  }
})

onBeforeUnmount(() => {
  parseAbort.value?.abort()
  stopParseTask()
  stopRewriteTask()
})

const transcriptLoading = computed(
  () =>
    parsing.value &&
    (parseStage.value === 'accepted' || parseStage.value === 'parsed' || parseStage.value === 'transcribing'),
)

const transcriptAreaReadonly = computed(() => transcriptLoading.value)

const sourcePlaceholder = computed(() => {
  if (parseStage.value === 'error') {
    return inputMode.value === 'upload' ? '转写失败，请重新上传或重试' : '转写失败，请重试或更换链接'
  }
  if (transcriptLoading.value) {
    return '转写中…'
  }
  if (parseNotice.value) {
    return '未识别到口播文案，可在这里手动输入原文'
  }
  return '解析完成后展示 ASR 原文'
})

const rewritePlaceholder = computed(() => {
  if (parseStage.value === 'error') {
    return inputMode.value === 'upload' ? '上传视频转写失败' : '转写失败'
  }
  if (transcriptLoading.value) {
    return '转写中…'
  }
  if (parseNotice.value) {
    return '手动输入原文后点击「开始改写」，展示返回的改写结果'
  }
  return '编辑原文后点击「开始改写」，展示返回的改写结果'
})

const durationText = computed(() => {
  const seconds = douyinParse.value?.durationSeconds ?? 0
  const minute = Math.floor(seconds / 60)
  const remain = String(seconds % 60).padStart(2, '0')
  return `${minute}:${remain}`
})

const videoCoverUrl = computed(() => {
  if (coverImageFailed.value) return ''
  const parse = douyinParse.value
  if (!parse) return ''
  return normalizeDisplayImageUrl(parse.coverUrl || inferCoverUrl(parse.rawData) || '')
})

const videoPreviewMediaUrl = computed(() => {
  if (videoCoverUrl.value) return ''
  const playUrl = douyinParse.value?.playUrl || ''
  return playUrl ? normalizePublicMediaUrl(playUrl) : ''
})

const rewrittenLength = computed(() => rewrittenText.value.replace(/\s/g, '').length)

const insightItems = computed(() => {
  const p = douyinParse.value
  let status = inputMode.value === 'upload' ? '选择本地视频后开始解析' : '提交社媒视频链接后开始解析'
  if (parseStage.value === 'completed') {
    status = parseNotice.value || '已完成转写，右侧已填入原文；改写稿请点击「开始改写」拉取'
  } else if (parseStage.value === 'accepted') {
    status = '已提交解析任务，正在等待平台返回视频信息…'
  } else if (parseStage.value === 'parsed' || parseStage.value === 'transcribing') {
    status = '正在转写口播文案…'
  } else if (parseStage.value === 'error') {
    status = parseError.value || '转写失败'
  }

  const rows: { icon: string; label: string; value: string }[] = []
  if (p) {
    rows.push({ icon: '◉', label: '标题', value: p.title || '—' })
    rows.push({ icon: '◎', label: '作者', value: p.author?.nickname || '—' })
    rows.push({ icon: '◌', label: '时长', value: durationText.value })
    rows.push({ icon: '□', label: '视频 ID', value: p.videoId || '—' })
  }
  rows.push({ icon: '▣', label: '转写进度', value: status })
  rows.push({
    icon: '⌂',
    label: '说明',
    value: '解析成功后展示封面与元信息；文案随 SSE completed 事件刷新。',
  })
  return rows
})

function inferCoverUrl(rawData: unknown) {
  const urls: string[] = []
  collectCoverUrls(rawData, '', urls)
  return urls.find(isCoverLikeUrl) || urls[0] || ''
}

function collectCoverUrls(value: unknown, path: string, urls: string[]) {
  if (!value) return
  if (typeof value === 'string') {
    if (isHttpUrl(value) && isCoverLikePath(path)) {
      urls.push(value.trim())
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectCoverUrls(item, `${path}/${index}`, urls))
    return
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      const nextPath = `${path}/${key}`
      if (typeof child === 'string' && isHttpUrl(child) && isCoverLikePath(nextPath)) {
        urls.push(child.trim())
      } else {
        collectCoverUrls(child, nextPath, urls)
      }
    })
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

function detectPlatformFromText(value: string) {
  const text = value.toLowerCase()
  if (!text.trim()) return ''
  if (/douyin\.com|iesdouyin\.com|amemv\.com|douyinvod\.com/.test(text)) return 'douyin'
  if (/xiaohongshu\.com|xhslink\.com|xhscdn\.com|xhs\.cn/.test(text)) return 'xiaohongshu'
  if (/weixin\.qq\.com\/sph|channels\.weixin\.qq\.com|finder\.video\.qq\.com|finder\.video\.wechat\.com/.test(text)) return 'wechat_channels'
  if (/tiktok\.com|tiktokv\.com|vm\.tiktok\.com|vt\.tiktok\.com|musical\.ly/.test(text)) return 'tiktok'
  if (/kuaishou\.com|kwai\.com|gifshow\.com|kwaicdn\.com|ksapisrv\.com|oskwai\.com|yximgs\.com/.test(text)) return 'kuaishou'
  if (/bilibili\.com|b23\.tv|bilivideo\.com|hdslb\.com|biliimg\.com/.test(text)) return 'bilibili'
  if (/youtube\.com|youtu\.be|googlevideo\.com/.test(text)) return 'youtube'
  if (/facebook\.com|fb\.watch|fbcdn\.net|fb\.com/.test(text)) return 'facebook'
  return ''
}

function normalizeDisplayImageUrl(value: string) {
  const url = value.trim()
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return url
  }
  if (url.startsWith('/')) {
    return `${API_ORIGIN}${url}`
  }
  if (isHttpUrl(url)) {
    return `${API_BASE_URL}/writer/media/cover?url=${encodeURIComponent(url)}`
  }
  return url
}

function isCoverLikePath(path: string) {
  return /cover|thumbnail|thumb|image|display|poster|pic/i.test(path)
}

function isCoverLikeUrl(url: string) {
  const normalized = url.toLowerCase()
  if (normalized.includes('.mp4') || normalized.includes('.m3u8') || normalized.includes('mime=video')) {
    return false
  }
  return (
    normalized.includes('.jpg') ||
    normalized.includes('.jpeg') ||
    normalized.includes('.png') ||
    normalized.includes('.webp') ||
    normalized.includes('i.ytimg.com') ||
    normalized.includes('ytimg.com') ||
    normalized.includes('hdslb.com') ||
    normalized.includes('biliimg.com') ||
    normalized.includes('kwaicdn.com') ||
    normalized.includes('ksapisrv.com') ||
    normalized.includes('gifshow.com') ||
    normalized.includes('p16-sign') ||
    normalized.includes('p19-sign') ||
    normalized.includes('tos-maliva-p') ||
    (normalized.includes('tiktokcdn') && /image|jpeg|webp/.test(normalized))
  )
}

function normalizePublicMediaUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (isHttpUrl(trimmed)) return trimmed
  return trimmed.startsWith('/') ? `${API_ORIGIN}${trimmed}` : `${API_ORIGIN}/${trimmed}`
}

function formatFileSize(size: number) {
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function resetDownloadProgress() {
  downloadStatusText.value = ''
  downloadReceivedBytes.value = 0
  downloadTotalBytes.value = null
  downloadProgressPercent.value = null
}

function isSupportedLocalVideoFile(file: File) {
  if (file.type.startsWith('video/')) {
    return true
  }
  return /\.(mp4|mov|m4v|webm)$/i.test(file.name)
}

function selectPlatform(value: string) {
  selectedPlatform.value = value
  platformAutoHint.value = ''
}

function effectivePlatformForUrl(url: string) {
  const detected = detectPlatformFromText(url)
  if (detected) {
    selectedPlatform.value = detected
    return detected
  }
  return selectedPlatform.value
}

function switchInputMode(mode: 'link' | 'upload') {
  if (inputMode.value === mode) {
    return
  }
  inputMode.value = mode
  parseAbort.value?.abort()
  stopParseTask()
  resetParseWorkflowState()
  downloadError.value = ''
  downloadMessage.value = ''
  platformAutoHint.value = ''
  resetDownloadProgress()
  localUploadError.value = ''
}

function resetParseWorkflowState() {
  douyinParse.value = null
  sourceText.value = ''
  rewrittenText.value = ''
  rewriteIntroduce.value = ''
  extraNotesExpanded.value = false
  rewriteError.value = ''
  rewriteLoading.value = false
  rewriteTaskStatus.value = ''
  rewriteTaskProgress.value = null
  resetRewriteProgress()
  parseError.value = ''
  parseNotice.value = ''
  coverImageFailed.value = false
  parseStage.value = ''
  parsing.value = false
  applyMessage.value = ''
  activeParseTaskId = null
}

async function handleLocalVideoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const requestId = ++localUploadRequestSeq

  parseAbort.value?.abort()
  stopParseTask()
  resetParseWorkflowState()
  localVideoFileName.value = ''
  localVideoPreviewUrl.value = ''
  localVideoFilePath.value = ''
  localUploadError.value = ''
  localUploadMessage.value = ''
  downloadError.value = ''
  downloadMessage.value = ''
  resetDownloadProgress()

  if (!file) {
    return
  }
  if (!isSupportedLocalVideoFile(file)) {
    localUploadError.value = '请上传 MP4、MOV、M4V 或 WEBM 格式的视频文件'
    input.value = ''
    return
  }
  if (file.size > LOCAL_VIDEO_MAX_BYTES) {
    localUploadError.value = `视频文件不能超过 ${formatFileSize(LOCAL_VIDEO_MAX_BYTES)}`
    input.value = ''
    return
  }

  localVideoFileName.value = `${file.name}（${formatFileSize(file.size)}）`
  uploadingLocalVideo.value = true

  try {
    const uploaded = await uploadFile(file)
    if (requestId !== localUploadRequestSeq) {
      return
    }
    localVideoPreviewUrl.value = normalizePublicMediaUrl(uploaded.previewUrl)
    localVideoFilePath.value = uploaded.filePath || ''
    localUploadMessage.value = `${uploaded.originalFileName || file.name} 已上传，可开始解析`
  } catch (error) {
    if (requestId !== localUploadRequestSeq) {
      return
    }
    localUploadError.value = error instanceof Error ? error.message : '上传失败'
    localVideoFileName.value = ''
    localVideoPreviewUrl.value = ''
    localVideoFilePath.value = ''
    input.value = ''
  } finally {
    if (requestId === localUploadRequestSeq) {
      uploadingLocalVideo.value = false
    }
  }
}

async function handleParseUploadedVideo() {
  const url = localVideoPreviewUrl.value.trim()
  if (!url || uploadingLocalVideo.value || parsing.value) {
    return
  }
  const title = localVideoFileName.value.replace(/（.*$/, '').trim() || '本地上传视频'
  await runParseVideo(url, 'upload', title, {
    sourceType: 'upload',
    filePath: localVideoFilePath.value,
  })
}

async function handleDownloadVideo() {
  const url = videoUrl.value.trim()
  if (!url || downloading.value) {
    return
  }
  const platform = effectivePlatformForUrl(url)
  const platformLimitReason = PLATFORM_LIMIT_REASONS[platform]
  if (platformLimitReason) {
    downloadError.value = platformLimitReason
    return
  }

  downloading.value = true
  downloadError.value = ''
  downloadMessage.value = ''
  downloadStatusText.value = '正在连接下载服务…'
  downloadReceivedBytes.value = 0
  downloadTotalBytes.value = null
  downloadProgressPercent.value = null
  try {
    // 直链通常存在跨域与防盗链限制，因此下载走后端代理，页面只负责触发浏览器保存。
    await downloadShareVideo(
      { url, platform },
      {
        onStarted(progress) {
          downloadStatusText.value = '已连接，正在接收视频…'
          downloadTotalBytes.value = progress.totalBytes
        },
        onProgress(progress) {
          downloadReceivedBytes.value = progress.receivedBytes
          downloadTotalBytes.value = progress.totalBytes
          downloadProgressPercent.value = progress.percent
        },
        onRetry(retry) {
          downloadStatusText.value = `下载中断，正在自动重试（${retry.nextAttempt}/${retry.maxAttempts}）…`
          downloadProgressPercent.value = null
          downloadTotalBytes.value = null
          downloadReceivedBytes.value = 0
          downloadError.value = ''
        },
      },
    )
    downloadStatusText.value = '接收完成'
    downloadMessage.value = '视频已接收完成，浏览器正在保存文件'
  } catch (error) {
    downloadStatusText.value = downloadReceivedBytes.value > 0 ? '下载中断' : ''
    downloadError.value = friendlyDownloadErrorMessage(error instanceof Error ? error.message : '下载失败')
  } finally {
    downloading.value = false
  }
}

async function handleParseVideo() {
  const url = videoUrl.value.trim()
  if (!url || parsing.value) {
    return
  }
  const platform = effectivePlatformForUrl(url)
  const platformLimitReason = PLATFORM_LIMIT_REASONS[platform]
  if (platformLimitReason) {
    parseStage.value = 'error'
    parseNotice.value = ''
    parseError.value = platformLimitReason
    return
  }
  await runParseVideo(url, platform)
}

async function handleReparseCurrent() {
  if (inputMode.value === 'upload') {
    await handleParseUploadedVideo()
    return
  }
  await handleParseVideo()
}

async function runParseVideo(
  url: string,
  platform: string,
  title?: string,
  extra?: { sourceType?: string; filePath?: string },
) {
  if (!url || parsing.value) {
    return
  }

  const runId = ++parseRunSeq
  parseAbort.value?.abort()
  stopParseTask()
  parseAbort.value = new AbortController()
  activeParseTaskId = null

  douyinParse.value = null
  sourceText.value = ''
  rewrittenText.value = ''
  rewriteIntroduce.value = ''
  extraNotesExpanded.value = false
  rewriteError.value = ''
  rewriteLoading.value = false
  rewriteTaskStatus.value = ''
  rewriteTaskProgress.value = null
  resetRewriteProgress()
  parseError.value = ''
  parseNotice.value = ''
  coverImageFailed.value = false
  downloadError.value = ''
  downloadMessage.value = ''
  resetDownloadProgress()
  parseStage.value = ''
  applyMessage.value = ''
  parsing.value = true

  try {
    await startDouyinParseWithTranscript({
      url,
      platform,
      title,
      sourceType: extra?.sourceType,
      filePath: extra?.filePath,
      signal: parseAbort.value.signal,
      onAccepted(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'accepted'
        rememberParseTask(payload.data?.taskId, runId)
      },
      onParsed(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'parsed'
        rememberParseTask(payload.data?.taskId, runId)
        applyParseTaskOutput(
          {
            parseResult: payload.data?.parseResult,
            transcriptResult: null,
          },
          { completed: false },
        )
      },
      onTranscribing(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'transcribing'
      },
      onCompleted(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        parseStage.value = 'completed'
        rememberParseTask(payload.data?.taskId, runId)
        applyParseTaskOutput(
          {
            parseResult: payload.data?.parseResult,
            transcriptResult: payload.data?.transcriptResult,
          },
          { completed: true, message: payload.message },
        )
        stopParseTask()
      },
      onErrorEvent(payload) {
        if (!isActiveParseRun(runId, payload.data?.taskId)) {
          return
        }
        const friendlyMessage = friendlyParseErrorMessage(payload.message)
        if (payload.code === 50215) {
          parseStage.value = 'completed'
          parseError.value = ''
          parseNotice.value = friendlyMessage
          rememberParseTask(payload.data?.taskId, runId)
          applyParseTaskOutput(
            {
              parseResult: payload.data?.parseResult,
              transcriptResult: payload.data?.transcriptResult,
            },
            { completed: true, message: payload.message },
          )
          return
        }
        parseStage.value = 'error'
        parseNotice.value = ''
        rememberParseTask(payload.data?.taskId, runId)
        parseError.value = `${friendlyMessage}${payload.traceId ? `（traceId：${payload.traceId}）` : ''}`
        if (payload.data?.parseResult) {
          douyinParse.value = payload.data.parseResult
        }
      },
    })
  } catch (error) {
    if (!isActiveParseRun(runId)) {
      return
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return
    }
    if (!parseStage.value) {
      parseStage.value = 'error'
    }
    parseNotice.value = ''
    parseError.value = friendlyParseErrorMessage(error instanceof Error ? error.message : '请求失败')
  } finally {
    if (isActiveParseRun(runId)) {
      parsing.value = false
    }
  }
}

function isActiveParseRun(runId: number, taskId?: number | null) {
  if (runId !== parseRunSeq) {
    return false
  }
  return taskId == null || activeParseTaskId == null || activeParseTaskId === taskId
}

function rememberParseTask(taskId?: number | null, runId = parseRunSeq) {
  if (!taskId) {
    return
  }
  if (!isActiveParseRun(runId, taskId)) {
    return
  }
  activeParseTaskId = taskId
  rememberSessionTaskId(taskId)
  startParseTaskFallback(taskId, runId)
}

function startParseTaskFallback(taskId: number, runId = parseRunSeq) {
  if (!isActiveParseRun(runId, taskId)) {
    return
  }
  if (stopParseTracking && trackedParseTaskId === taskId) {
    return
  }
  stopParseTask()
  trackedParseTaskId = taskId
  stopParseTracking = trackTaskResult<DouyinParseTaskResult>(taskId, {
    pollIntervalMs: 1500,
    onStatus(message) {
      if (!isActiveParseRun(runId, message.taskId)) {
        return
      }
      const status = String(message.status || '')
      if (status === 'RUNNING' && (!parseStage.value || parseStage.value === 'accepted')) {
        parseStage.value = douyinParse.value ? 'transcribing' : 'accepted'
      }
    },
    onResult(taskResult) {
      if (!isActiveParseRun(runId, taskResult.taskId)) {
        return
      }
      applyParseTaskOutput(taskResult.result, { completed: true })
      parseStage.value = 'completed'
      parsing.value = false
      parseAbort.value?.abort()
      stopParseTracking = null
      trackedParseTaskId = null
    },
    onFailure(message) {
      if (!isActiveParseRun(runId, message.taskId)) {
        return
      }
      if (parseStage.value === 'completed') {
        return
      }
      parseStage.value = 'error'
      parseNotice.value = ''
      parseError.value = friendlyParseErrorMessage(message.errorMessage || '解析或转写失败')
      parsing.value = false
      parseAbort.value?.abort()
      stopParseTracking = null
      trackedParseTaskId = null
    },
    onError(error) {
      if (!isActiveParseRun(runId, taskId)) {
        return
      }
      if (!douyinParse.value && parseStage.value !== 'completed') {
        parseError.value = friendlyParseErrorMessage(error.message)
      }
    },
  })
}

function applyParseTaskOutput(
  output: DouyinParseTaskResult | null | undefined,
  options: { completed: boolean; message?: string },
) {
  if (!output) {
    return
  }
  if (output.parseResult) {
    douyinParse.value = output.parseResult
    coverImageFailed.value = false
  }
  if (output.transcriptResult) {
    sourceText.value = output.transcriptResult.originalText || ''
    rewrittenText.value = ''
  }
  if (options.completed) {
    parseError.value = ''
    parseNotice.value = sourceText.value.trim() ? '' : friendlyEmptyTranscriptMessage(options.message)
  }
}

function friendlyEmptyTranscriptMessage(message?: string) {
  return friendlyParseErrorMessage(message || '视频里没有识别到可转写的口播文案，可以手动输入原文后继续改写')
}

function friendlyDownloadErrorMessage(message?: string) {
  if (isTransientDownloadErrorMessage(message || '')) {
    return '视频下载连接中断，已自动重试但仍未完成。请稍后再试，或重新解析后再次下载。'
  }
  const text = message || '下载失败'
  if (
    text.includes('没有拿到可下载') ||
    text.includes('未返回可下载') ||
    text.includes('without downloadable url') ||
    text.includes('no downloadable')
  ) {
    return '已识别到视频信息，但平台未返回可下载的视频地址。请确认视频为公开且允许下载，或更换分享链接后重试。'
  }
  if (text.includes('bvc2') || text.includes('HEVC') || text.includes('AV1')) {
    return '平台返回的视频编码暂不适合通用 MP4 下载，请更换公开分享链接后重试。'
  }
  if (text.includes('HTTP 400') || text.includes('TikHub parse failed') || text.includes('平台暂未返回可解析')) {
    return '平台暂未返回可解析的视频数据，请确认链接公开可访问，并尽量粘贴完整分享文案后重试。'
  }
  return text
}

function isTransientDownloadErrorMessage(message: string) {
  const text = message.toLowerCase()
  return (
    text.includes('network error') ||
    text.includes('failed to fetch') ||
    text.includes('load failed') ||
    text.includes('body stream') ||
    text.includes('connection') ||
    text.includes('timeout') ||
    text.includes('terminated') ||
    text.includes('interrupted') ||
    text.includes('unexpected end') ||
    text.includes('premature eof') ||
    text.includes('closed before expected')
  )
}

function friendlyParseErrorMessage(message?: string) {
  const text = message || '解析或转写失败'
  if (
    text.includes('Volcengine ASR query succeeded but returned empty text') ||
    text.includes('没有识别到可转写的口播文案') ||
    (text.toLowerCase().includes('asr') && text.toLowerCase().includes('empty text'))
  ) {
    return '视频里没有识别到可转写的口播文案，可以手动输入原文后继续改写。'
  }
  if (text.includes('bvc2') || text.includes('HEVC') || text.includes('AV1')) {
    return '平台返回的视频编码当前播放器不兼容，已尽量选择通用 MP4；如果仍失败，请换公开视频链接后重试。'
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
    text.includes('TikHub parse failed') ||
    text.includes('hybrid error') ||
    text.includes('TikHub request failed with HTTP 400') ||
    text.includes('平台解析接口拒绝了当前链接')
  ) {
    if (inputMode.value === 'upload') {
      return '本地视频解析未正确进入上传流程，请重新选择视频后再解析。'
    }
    return '平台暂未返回可解析的视频数据，请确认视频是公开可访问的视频，并尽量复制分享内容中的完整 http(s) 链接或完整分享文案后重试。'
  }
  if (text.includes('未识别到可解析的视频链接')) {
    return '没有识别到可解析的视频链接，请粘贴包含 http(s) 链接的社媒分享内容后重试。'
  }
  return text
}

async function handleDouyinRewrite() {
  const originalText = sourceText.value.trim()
  if (!originalText) {
    rewriteError.value = '原文不能为空'
    return
  }
  if (transcriptAreaReadonly.value) {
    return
  }

  rewriteLoading.value = true
  rewriteError.value = ''
  rewrittenText.value = ''
  rewriteTaskStatus.value = 'QUEUED'
  rewriteTaskProgress.value = 0
  resetRewriteProgress()

  try {
    const task = await rewriteDouyinCopywriting({
      originalText,
      style: rewriteStyle.value.trim() || undefined,
      introduce: rewriteIntroduce.value.trim() || undefined,
    })
    rememberSessionTaskId(task.taskId)
    rewriteTaskStatus.value = String(task.status || 'QUEUED')
    rewriteTaskProgress.value = task.progress ?? 0
    await new Promise<void>((resolve) => {
      stopRewriteTask()
      stopRewriteTracking = trackTaskResult<DouyinRewriteWriterVO>(task.taskId, {
        onStatus(message) {
          rewriteTaskStatus.value = String(message.status)
          rewriteTaskProgress.value = message.progress
        },
        onResult(taskResult) {
          rewriteTaskStatus.value = String(taskResult.status || 'SUCCESS')
          rewriteTaskProgress.value = taskResult.progress ?? 100
          rewrittenText.value = taskResult.result?.translatedText ?? ''
          rewriteLoading.value = false
          resolve()
        },
        onFailure(message) {
          rewriteTaskStatus.value = String(message.status)
          rewriteTaskProgress.value = message.progress
          rewriteError.value = message.errorMessage || '改写任务失败'
          rewriteLoading.value = false
          resolve()
        },
        onError(error) {
          rewriteError.value = error.message
          rewriteLoading.value = false
          resolve()
        },
      })
    })
  } catch (e) {
    rewriteError.value = e instanceof Error ? e.message : '请求失败'
    rewriteLoading.value = false
    rewriteTaskStatus.value = 'FAILED'
  } finally {
    stopRewriteTask()
  }
}

function stopRewriteTask() {
  if (stopRewriteTracking) {
    stopRewriteTracking()
    stopRewriteTracking = null
  }
}

function stopParseTask() {
  if (stopParseTracking) {
    stopParseTracking()
    stopParseTracking = null
  }
  trackedParseTaskId = null
}

async function copyRewrittenText() {
  if (!rewrittenText.value) {
    return
  }
  await navigator.clipboard?.writeText(rewrittenText.value)
  applyMessage.value = '文案已复制'
}

function applyScript() {
  applyMessage.value = '文案已应用，下一步可进入音频生成'
  emit('continue')
}
</script>

<style scoped>
.benchmark-page {
  width: min(var(--app-content-width), calc(100% - 76px));
  margin: 24px auto 30px;
}

.benchmark-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 30px;
}

.benchmark-head h1 {
  margin: 0 0 10px;
  color: #151a2d;
  font-size: 24px;
  font-weight: 850;
  letter-spacing: 0;
}

.benchmark-head p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.6;
}

.secondary-button,
.primary-button {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 8px;
  padding: 0 17px;
  font-weight: 800;
}

.secondary-button {
  border: 1px solid #e5e7f0;
  background: #fff;
  color: #394053;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.secondary-button:hover:not(:disabled) {
  border-color: #c9c2ff;
  color: #5148e5;
}

.primary-button {
  border: 0;
  background: #563bf0;
  box-shadow: 0 10px 18px rgba(86, 59, 240, 0.24);
  color: #fff;
}

.primary-button:hover:not(:disabled) {
  background: #4630d1;
  transform: translateY(-1px);
}

.primary-button:disabled,
.secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tips-bar {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 8px;
  border: 1px solid #e3dcff;
  border-radius: 8px;
  background: rgba(247, 245, 255, 0.78);
  color: #657084;
  margin-bottom: 24px;
  padding: 0 16px;
  font-weight: 700;
}

.tips-bar span {
  color: #8b7cf6;
  font-size: 18px;
}

.tips-bar strong {
  color: #5c6477;
}

.benchmark-layout {
  display: grid;
  grid-template-columns: 380px minmax(0, 1fr);
  gap: 34px;
  align-items: stretch;
}

.analysis-card,
.rewrite-card {
  border: 1px solid #e8ebf3;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 12px 34px rgba(15, 23, 42, 0.06);
  min-height: 0;
}

.analysis-card {
  display: flex;
  flex-direction: column;
  padding: 20px 18px 28px;
}

.rewrite-card {
  display: flex;
  flex-direction: column;
  padding: 20px 20px 28px;
}

.panel-block + .panel-block {
  border-top: 1px solid #edf0f6;
  margin-top: 16px;
  padding-top: 18px;
}

.panel-block h2,
.rewrite-card h2 {
  flex-shrink: 0;
  margin: 0 0 20px;
  color: #1f2437;
  font-size: 18px;
  font-weight: 850;
}

.panel-block h3 {
  margin: 0 0 12px;
  color: #2a3042;
  font-size: 14px;
  font-weight: 850;
}

.parse-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px 92px;
  gap: 10px;
}

.source-tabs,
.platform-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 14px 0 10px;
}

.source-tabs button,
.platform-tabs button {
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #dfe5f2;
  border-radius: 8px;
  background: #fff;
  color: #516078;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

.source-tabs button.active,
.platform-tabs button.active {
  border-color: #7d67ff;
  background: #f2efff;
  color: #513ee8;
}

.source-tabs {
  margin-bottom: 12px;
}

.platform-note {
  margin: 0 0 12px;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.6;
}

.platform-auto-hint {
  margin: -4px 0 12px;
  color: #256a52;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.5;
}

.platform-limit-note {
  margin: -4px 0 12px;
  border: 1px solid #ffd9a8;
  border-radius: 8px;
  background: #fff8ec;
  color: #9a5a12;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.6;
}

.upload-parse-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 10px;
  align-items: stretch;
}

.video-upload-picker {
  display: flex;
  min-width: 0;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  border: 1px dashed #cfd6e6;
  border-radius: 8px;
  background: #fff;
  padding: 0 14px;
  cursor: pointer;
}

.video-upload-picker input {
  display: none;
}

.video-upload-picker span {
  flex-shrink: 0;
  color: #4630d1;
  font-size: 13px;
  font-weight: 850;
}

.video-upload-picker small {
  min-width: 0;
  overflow: hidden;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.video-upload-picker.disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.upload-parse-button {
  min-height: 52px;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select,
.text-area-label textarea {
  width: 100%;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #232838;
  outline: none;
}

.parse-row input,
.rewrite-toolbar select,
.rewrite-style-select {
  height: 42px;
  padding: 0 12px;
}

.parse-row input::placeholder {
  color: #99a3b5;
}

.parse-row input:focus,
.rewrite-toolbar select:focus,
.rewrite-style-select:focus,
.text-area-label textarea:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.error-text {
  margin: 10px 0 0;
  color: #d64c4c;
  font-size: 13px;
}

.success-text {
  margin: 10px 0 0;
  color: #178a4c;
  font-size: 13px;
  font-weight: 750;
}

.info-text {
  margin: 10px 0 0;
  color: #4d5f7c;
  font-size: 13px;
  line-height: 1.65;
}

.download-progress-panel {
  display: grid;
  gap: 8px;
  margin-top: 10px;
  border: 1px solid #d8e8df;
  border-radius: 8px;
  background: #f8fcfa;
  padding: 10px 12px;
}

.download-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #365647;
  font-size: 13px;
  font-weight: 800;
}

.download-progress-head strong {
  color: #197351;
  font-size: 12px;
}

.download-progress-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #dfece6;
}

.download-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1f8a61 0%, #3fb77f 100%);
  transition: width 0.25s ease;
}

.download-progress-panel p {
  margin: 0;
  color: #5d6f65;
  font-size: 12px;
  font-weight: 750;
}

.transcript-status {
  flex-shrink: 0;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e3dcff;
  background: rgba(247, 245, 255, 0.78);
  color: #5c6477;
  font-size: 13px;
  font-weight: 750;
}

.transcript-banner {
  flex-shrink: 0;
  margin: 0 0 14px;
}

.video-placeholder {
  margin: 0;
  border: 1px dashed #e1e6ef;
  border-radius: 8px;
  padding: 18px 14px;
  color: #98a2b3;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.6;
}

.video-placeholder p {
  margin: 0;
}

.video-detail {
  display: grid;
  gap: 14px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  padding: 12px;
}

.video-media {
  display: grid;
  gap: 10px;
}

.cover-img {
  width: 100%;
  max-height: 200px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #edf0f6;
}

.cover-video {
  width: 100%;
  max-height: 220px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #111827;
}

.cover-placeholder {
  display: grid;
  min-height: 132px;
  place-items: center;
  border: 1px dashed #d9deea;
  border-radius: 8px;
  background: #f8fafc;
  color: #8a94a6;
  font-size: 13px;
  font-weight: 800;
}

.video-meta-block {
  min-width: 0;
}

.author-line {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.author-avatar {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #edf0f6;
}

.video-title {
  margin: 0;
  color: #2d3446;
  font-size: 15px;
  line-height: 1.45;
  font-weight: 800;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  color: #7b8495;
  font-size: 13px;
  line-height: 1.7;
}

.video-meta-block > .meta-line {
  margin-top: 10px;
}

.insight-list {
  display: grid;
  gap: 12px;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  padding: 14px 12px;
}

.insight-item {
  display: grid;
  grid-template-columns: 24px 82px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-height: 28px;
}

.insight-icon {
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border-radius: 999px;
  background: #7567f6;
  color: #fff;
  font-size: 11px;
  font-weight: 900;
}

.insight-item strong {
  color: #566074;
  font-size: 13px;
}

.insight-item p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.refresh-button {
  min-width: 122px;
  margin-top: auto;
  margin-right: auto;
  margin-bottom: 0;
  margin-left: auto;
  padding-top: 18px;
}

.rewrite-box {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  border: 1px solid #e8ebf3;
  border-radius: 8px;
  padding: 10px 12px 18px;
}

.rewrite-flow-hint {
  flex-shrink: 0;
  margin: 0 0 14px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px dashed #d8d2ff;
  background: rgba(250, 249, 255, 0.65);
  color: #5c6477;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.rewrite-flow-hint strong {
  color: #4630c9;
  font-weight: 850;
}

.rewrite-api-tag {
  margin: 0 2px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(86, 59, 240, 0.08);
  color: #5148e5;
  font-size: 12px;
  font-weight: 800;
}

.rewrite-confirm-panel {
  flex-shrink: 0;
  border: 1px solid #edf0f6;
  border-radius: 8px;
  background: #fcfcff;
  padding: 12px 12px 14px;
}

.rewrite-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 0;
}

.rewrite-fields {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 18px;
  min-height: 0;
}

.rewrite-fields .text-area-label {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.rewrite-fields .text-area-label textarea {
  flex: 1;
}

.tabs {
  display: flex;
  gap: 8px;
}

.tabs button {
  display: inline-flex;
  height: 42px;
  align-items: center;
  gap: 7px;
  border: 1px solid #e7eaf2;
  border-radius: 8px;
  background: #fff;
  color: #4f586c;
  padding: 0 18px;
  font-weight: 800;
}

.tabs button.active {
  border-color: #a79bff;
  background: #faf9ff;
  box-shadow: inset 0 0 0 1px #d8d2ff;
  color: #5e50df;
}

.tab-panel {
  margin-top: 12px;
}

.custom-rewrite-shell {
  border-radius: 8px;
  border: 1px dashed #e1e6ef;
  background: #fff;
  padding: 14px 12px;
}

.shell-placeholder {
  margin: 0;
  color: #8b94a8;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.65;
}

.ai-rewrite-shell {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.style-tools {
  display: flex;
  align-items: center;
  gap: 14px;
}

.style-tools-row {
  flex-wrap: wrap;
}

.style-tools-row label {
  flex-wrap: wrap;
  white-space: normal;
}

.style-tools label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #4c566a;
  font-weight: 750;
  white-space: nowrap;
}

.rewrite-toolbar select,
.rewrite-style-select {
  min-width: 146px;
}

/* 避免继承 label 上的高字重；与 body 使用同一套无衬线，与输入框视觉一致 */
.rewrite-style-select {
  box-sizing: border-box;
  max-width: 100%;
  padding-right: 32px;
  border: 1px solid #e3e7ef;
  font-family: Inter, 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: 0;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%2364748b' d='M1.4 0 6 4.6 10.6 0 12 1.4l-6 6-6-6Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-color: #fff;
}

.rewrite-style-select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tag-muted {
  color: #98a2b3;
  font-weight: 700;
}

.rewrite-error {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #f5c4c4;
  background: #fff8f8;
  color: #c24141;
  font-size: 13px;
  font-weight: 750;
  line-height: 1.5;
}

.rewrite-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rewrite-progress-track {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8ecf4;
}

.rewrite-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #563bf0 0%, #7c6dff 100%);
  transition: width 0.35s ease;
}

.rewrite-progress-pct {
  flex-shrink: 0;
  min-width: 2.75rem;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
  text-align: right;
}

.extra-notes-block {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.extra-notes-toggle {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px dashed #e1e6ef;
  border-radius: 8px;
  background: #fff;
  color: #374055;
  font-size: 13px;
  font-weight: 800;
  text-align: left;
  cursor: pointer;
  outline: none;
}

.extra-notes-toggle:hover {
  border-color: #c9c2ff;
  background: rgba(250, 249, 255, 0.85);
}

.extra-notes-toggle:focus-visible {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
}

.extra-notes-toggle-title {
  flex-shrink: 0;
}

.extra-notes-chevron {
  display: inline-flex;
  flex-shrink: 0;
  font-size: 18px;
  font-weight: 900;
  color: #8b7cf6;
  line-height: 1;
  transform: rotate(0deg);
  transition: transform 0.18s ease;
}

.extra-notes-chevron.is-open {
  transform: rotate(90deg);
}

.extra-notes-collapse {
  margin-top: 8px;
}

.extra-notes-input {
  width: 100%;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid #e3e7ef;
  border-radius: 8px;
  background: #fff;
  color: #4e596d;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
}

.extra-notes-input:focus {
  border-color: #8f81ff;
  box-shadow: 0 0 0 3px rgba(99, 91, 255, 0.12);
  outline: none;
}

.extra-notes-input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.confirm-rewrite-btn {
  min-width: 96px;
}

.text-area-label {
  position: relative;
  display: block;
  color: #374055;
  font-weight: 850;
}

.text-area-label + .text-area-label {
  margin-top: 18px;
}

.rewrite-fields .text-area-label + .text-area-label {
  margin-top: 0;
}

.text-area-label span {
  color: #7b8496;
  font-weight: 700;
}

.text-area-label textarea {
  display: block;
  margin-top: 10px;
  padding: 13px 14px;
  color: #4e596d;
  line-height: 1.8;
  resize: vertical;
}

.source-text {
  min-height: 164px;
  background: #f8f9fc !important;
}

.result-text {
  min-height: 230px;
}

.text-area-label small {
  position: absolute;
  right: 14px;
  bottom: 10px;
  color: #7d8797;
  font-size: 12px;
  font-weight: 800;
}

.rewrite-actions {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 22px;
}

.continue-button {
  min-width: 160px;
}

.bottom-action {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin-top: 32px;
}

.bottom-action p {
  margin: 0;
  color: #98a2b3;
  font-weight: 700;
}

@media (max-width: 1024px) {
  .benchmark-page {
    width: calc(100% - 48px);
  }

  .benchmark-layout {
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 18px;
  }

  .rewrite-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 900px) {
  .benchmark-page {
    width: calc(100% - 32px);
  }

  .benchmark-head,
  .style-tools,
  .confirm-actions,
  .rewrite-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .benchmark-layout {
    grid-template-columns: 1fr;
  }

  .parse-row {
    grid-template-columns: 1fr;
  }

  .upload-parse-panel {
    grid-template-columns: 1fr;
  }

  .parse-row button {
    width: 100%;
  }

  .tabs,
  .style-tools label {
    width: 100%;
  }

  .tabs button,
  .style-tools select,
  .rewrite-style-select,
  .style-tools .secondary-button,
  .confirm-actions .primary-button,
  .rewrite-actions button {
    width: 100%;
  }
}
</style>
