import { request } from './request'
import type { TaskCreditQuoteResponse, UserCreditMeResponse } from '../types/creditTypes'

/** 当前登录用户积分账户（须带 token） */
export function getCreditsMe() {
  return request<UserCreditMeResponse>('/credits/me')
}

/** 按任务类型查询配置中的预计扣费（无需登录；实际扣费以提交时后端为准） */
export function getTaskCreditQuote(taskType: string) {
  const qs = new URLSearchParams({ taskType: taskType.trim() })
  return request<TaskCreditQuoteResponse>(`/credits/task-quote?${qs.toString()}`)
}
