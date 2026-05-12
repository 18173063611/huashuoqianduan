const taskTypeMap: Record<string, string> = {
  TTS_GENERATE: '语音合成',
  AVATAR_GENERATE: '形象生成',
  DIGITAL_HUMAN_GENERATE: '数字人视频',
  VOICE_SAMPLE: '音色试听',
  SCRIPT_REWRITE: '脚本改写',
}

const taskStatusMap: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '运行中',
  SUCCESS: '成功',
  FAILED: '失败',
  RETRYABLE: '可重试',
  CANCELED: '已取消',
}

const creditChangeTypeMap: Record<string, string> = {
  ADMIN_ADD: '管理员加分',
  ADMIN_DEDUCT: '管理员扣分',
  ADMIN_SET: '管理员修正',
  AI_CONSUME: 'AI任务扣费',
  AI_REFUND: '任务失败退款',
}

const operationTypeMap: Record<string, string> = {
  USER_CREATE: '新增用户',
  USER_UPDATE: '编辑用户',
  USER_ENABLE: '启用用户',
  USER_DISABLE: '禁用用户',
  USER_DELETE: '删除用户',
  USER_RESET_PASSWORD: '重置密码',
  CREDIT_ADJUST: '调整积分',
  MODEL_CREATE: '新增模型',
  MODEL_UPDATE: '编辑模型',
  MODEL_ENABLE: '启用模型',
  MODEL_DISABLE: '禁用模型',
  MODEL_SET_DEFAULT: '设为默认模型',
  MODEL_SAVE: '保存模型',
}

const operationTargetTypeMap: Record<string, string> = {
  USER: '用户',
  CREDIT: '积分账户',
  MODEL: '模型',
  TASK: '任务',
}

const modelTypeMap: Record<string, string> = {
  TTS: '语音',
  IMAGE: '形象/图片',
  VIDEO: '视频',
  TEXT: '文本',
}

const providerMap: Record<string, string> = {
  VOLCENGINE: '火山引擎',
  VIDU: 'Vidu',
  LOCAL: '本地/占位',
  DOUBAO: '豆包',
}

export function taskTypeText(value?: string | null) {
  return displayText(value, taskTypeMap)
}

export function taskStatusText(value?: string | null) {
  return displayText(value, taskStatusMap)
}

export function creditChangeTypeText(value?: string | null) {
  return displayText(value, creditChangeTypeMap)
}

export function operationTypeText(value?: string | null) {
  return displayText(value, operationTypeMap)
}

export function operationTargetTypeText(value?: string | null) {
  return displayText(value, operationTargetTypeMap)
}

export function modelTypeText(value?: string | null) {
  return displayText(value, modelTypeMap)
}

export function providerText(value?: string | null) {
  return displayText(value, providerMap)
}

export function compactCode(value?: string | null) {
  if (!value) return '-'
  return value
    .replace(/-default$/i, '')
    .replace(/_/g, ' ')
}

function displayText(value: string | null | undefined, map: Record<string, string>) {
  if (!value) return '-'
  const key = value.trim().toUpperCase()
  return map[key] || value
}
