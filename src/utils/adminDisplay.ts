import type { TagProps } from 'element-plus'

type TagType = TagProps['type']

const roleMap: Record<string, string> = {
  USER: '普通用户',
  ADMIN: '系统管理员',
}

const userStatusMap: Record<string, string> = {
  ENABLED: '正常',
  DISABLED: '已禁用',
  LOCKED: '已锁定',
}

const taskStatusMap: Record<string, string> = {
  QUEUED: '排队中',
  RUNNING: '执行中',
  SUCCESS: '成功',
  FAILED: '失败',
  RETRYABLE: '可重试',
  CANCELED: '已取消',
}

const taskTypeMap: Record<string, string> = {
  TTS_GENERATE: '语音合成',
  AVATAR_GENERATE: '形象生成',
  DIGITAL_HUMAN_GENERATE: '数字人口播',
  DOUYIN_PARSE_TRANSCRIPT: '视频解析转写',
  VOICE_SAMPLE: '音色试听',
  SCRIPT_REWRITE: '脚本改写',
  STORYBOARD_GENERATE: '分镜生成',
}

const creditChangeTypeMap: Record<string, string> = {
  ADMIN_ADD: '管理员增加',
  ADMIN_DEDUCT: '管理员扣减',
  ADMIN_SET: '管理员修正',
  AI_CONSUME: 'AI任务消耗',
  AI_REFUND: 'AI任务退款',
  SYSTEM_INIT: '系统初始化',
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
  BILLING_STEP_CREATE: '新增计费步骤',
  BILLING_STEP_UPDATE: '编辑计费步骤',
  BILLING_STEP_ENABLE: '启用计费步骤',
  BILLING_STEP_DISABLE: '禁用计费步骤',
  BILLING_PRICE_CREATE: '新增模型单价',
  BILLING_PRICE_UPDATE: '编辑模型单价',
  BILLING_PRICE_ENABLE: '启用模型单价',
  BILLING_PRICE_DISABLE: '禁用模型单价',
}

const operationTargetTypeMap: Record<string, string> = {
  USER: '用户',
  CREDIT: '积分账户',
  MODEL: '模型',
  TASK: '任务',
  BILLING_STEP: '计费步骤',
  BILLING_PRICE: '模型单价',
}

const modelTypeMap: Record<string, string> = {
  IMAGE: '图片生成',
  VIDEO: '视频生成',
  TTS: '语音合成',
  TEXT: '文本生成',
}

const providerMap: Record<string, string> = {
  VOLCENGINE: '火山引擎',
  VIDU: 'Vidu',
  LOCAL: '本地/占位',
  DOUBAO: '豆包',
}

export function formatDateTime(value?: string | null, fallback = '暂无') {
  if (!value) return fallback
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return fallback
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`
}

export function formatEmpty(value?: string | number | null, fallback = '暂无') {
  if (value === null || value === undefined) return fallback
  const text = String(value).trim()
  return text ? text : fallback
}

export function getRoleLabel(role?: string | null) {
  return mapLabel(role, roleMap)
}

export function getUserStatusLabel(status?: string | null) {
  return mapLabel(status, userStatusMap)
}

export function getTaskStatusLabel(status?: string | null) {
  return mapLabel(status, taskStatusMap)
}

export function getTaskTypeLabel(taskType?: string | null) {
  return mapLabel(taskType, taskTypeMap)
}

export function getCreditChangeTypeLabel(changeType?: string | null) {
  return mapLabel(changeType, creditChangeTypeMap)
}

export function getOperationTypeLabel(operationType?: string | null) {
  return mapLabel(operationType, operationTypeMap)
}

export function getOperationTargetTypeLabel(targetType?: string | null) {
  return mapLabel(targetType, operationTargetTypeMap)
}

export function getModelTypeLabel(modelType?: string | null) {
  return mapLabel(modelType, modelTypeMap)
}

export function getProviderLabel(provider?: string | null) {
  return mapLabel(provider, providerMap)
}

export function getTagTypeByStatus(status?: string | boolean | null): TagType {
  if (status === true || status === 'ENABLED' || status === 'SUCCESS') return 'success'
  if (status === false || status === 'DISABLED' || status === 'FAILED') return 'danger'
  if (status === 'LOCKED' || status === 'RETRYABLE') return 'warning'
  if (status === 'QUEUED' || status === 'RUNNING') return 'primary'
  return 'info'
}

export function formatCreditAmount(amount?: number | null, unit = '积分') {
  return `${Number(amount ?? 0)} ${unit}`
}

export function formatCreditChange(amount?: number | null) {
  const value = Number(amount ?? 0)
  return value > 0 ? `+${value}` : String(value)
}

export function compactCode(value?: string | null) {
  if (!value) return '暂无'
  return value.replace(/-default$/i, '').replace(/_/g, ' ')
}

export function getEmptyText(loading: boolean, total: number, filtered: boolean, baseText: string) {
  if (loading) return '加载中'
  if (filtered && total === 0) return '没有找到符合条件的数据，请调整筛选条件后重试'
  return baseText
}

function mapLabel(value: string | null | undefined, map: Record<string, string>) {
  const key = String(value || '').trim().toUpperCase()
  if (!key) return '暂无'
  return map[key] || value || '暂无'
}
