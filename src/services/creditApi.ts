import { request } from './request'
import type {
  BillingEstimateRequest,
  BillingEstimateResponse,
  TaskCreditQuoteResponse,
  UserCreditMeResponse,
} from '../types/creditTypes'

/** 当前登录用户积分账户（须带 token） */
export function getCreditsMe() {
  return request<UserCreditMeResponse>('/credits/me')
}

/**
 * 按任务类型查询配置中的预计扣费（向下兼容旧接口）。
 * 新代码请使用 {@link getBillingEstimate}，可同时拿到余额与步骤明细。
 */
export function getTaskCreditQuote(taskType: string) {
  const qs = new URLSearchParams({ taskType: taskType.trim() })
  return request<TaskCreditQuoteResponse>(`/credits/task-quote?${qs.toString()}`)
}

/**
 * 统一预估：与后端 createTask 预扣金额完全一致。
 * 已登录时自动回填 balance / enoughBalance，便于前端在提交前做余额校验。
 */
export function getBillingEstimate(req: BillingEstimateRequest) {
  const qs = new URLSearchParams({ taskType: req.taskType.trim() })
  if (req.modelCode != null && req.modelCode !== '') qs.set('modelCode', req.modelCode)
  if (req.usageUnit != null && req.usageUnit !== '') qs.set('usageUnit', req.usageUnit)
  if (req.inputTextLength != null) qs.set('inputTextLength', String(req.inputTextLength))
  if (req.imageCount != null) qs.set('imageCount', String(req.imageCount))
  if (req.segmentCount != null) qs.set('segmentCount', String(req.segmentCount))
  if (req.durationSeconds != null) qs.set('durationSeconds', String(req.durationSeconds))
  if (req.providerCredits != null) qs.set('providerCredits', String(req.providerCredits))
  return request<BillingEstimateResponse>(`/billing/estimate?${qs.toString()}`)
}
