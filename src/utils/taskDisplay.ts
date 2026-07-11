/**
 * 用户端任务类型展示：表格/详情等处禁止直接展示后端 taskType 枚举串。
 */

const TASK_TYPE_LABELS: Record<string, string> = {
  PET_IMAGE_GENERATE: 'Pet image generation',
  PET_BACKGROUND_GENERATE: 'Pet background generation',
  TTS_GENERATE: '语音合成',
  VOICE_SAMPLE: '音色试听',
  AVATAR_GENERATE: '数字人形象生成',
  DIGITAL_HUMAN_GENERATE: '数字人口播',
  SCRIPT_REWRITE: '文案改写',
  STORYBOARD_GENERATE: '分镜生成',
  DOUYIN_PARSE_TRANSCRIPT: '对标解析与转写',
  VIDEO_PARSE: '视频理解',
  TEXT_TO_VIDEO_SEEDANCE_1_5: '文生视频',
  TEXT_TO_VIDEO_SEEDANCE_2_0: '文生视频',
  IMAGE_TO_VIDEO_SEEDANCE_1_5: '图生视频',
  IMAGE_TO_VIDEO_SEEDANCE_2_0: '图生视频',
  IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST: '图生视频',
  // 与后端 TaskTypeCode 对齐的补充类型
  VIDEO_SCRIPT_ANALYZE: '视频分镜解析',
  VIDEO_SCRIPT_URL_ANALYZE: '抖音分镜解析',
  DOUYIN_REWRITE: '抖音文案改写',
  DOUYIN_TRANSCRIPT: '抖音视频转写',
  /** 历史/兼容：旧 Seedance 任务类型仍可能出现在列表中 */
  SEEDANCE_TEXT_VIDEO: '文生视频',
  SEEDANCE_FIRST_FRAME_VIDEO: '图生视频',
  SEEDANCE_FIRST_LAST_FRAME_VIDEO: '图生视频',
  SEEDANCE_REFERENCE_VIDEO: '图生视频',
  SEEDANCE_CAR_SALES_VIDEO: '汽车销售成片',
  QUICK_RENDER: '一键成片编排',
}

/** 任务结果弹窗中按「视频」渲染的任务类型（含新旧 Seedance）。 */
const VIDEO_RESULT_TASK_TYPES = new Set<string>([
  'SEEDANCE_TEXT_VIDEO',
  'SEEDANCE_FIRST_FRAME_VIDEO',
  'SEEDANCE_FIRST_LAST_FRAME_VIDEO',
  'SEEDANCE_REFERENCE_VIDEO',
  'SEEDANCE_CAR_SALES_VIDEO',
  'TEXT_TO_VIDEO_SEEDANCE_1_5',
  'TEXT_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_1_5',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0',
  'IMAGE_TO_VIDEO_SEEDANCE_2_0_FAST',
])

/**
 * 将 taskType 转为中文展示名；未知类型显示「其他任务」（原始值请用 tooltip 展示）。
 */
export function taskTypeLabel(taskType?: string | null): string {
  const key = String(taskType ?? '').trim().toUpperCase()
  if (!key) {
    return '暂无'
  }
  return TASK_TYPE_LABELS[key] ?? '其他任务'
}

/** 任务中心结果弹窗：是否按视频组件展示（与 output 解析逻辑一致）。 */
export function isVideoResultTaskType(taskType?: string | null): boolean {
  if (!taskType) {
    return false
  }
  return VIDEO_RESULT_TASK_TYPES.has(taskType.trim().toUpperCase())
}

/** 分镜脚本结果（上传文件 / 抖音链接） */
export function isStoryboardScriptTask(taskType?: string | null): boolean {
  const t = String(taskType || '').trim().toUpperCase()
  return t === 'VIDEO_SCRIPT_ANALYZE' || t === 'VIDEO_SCRIPT_URL_ANALYZE'
}
