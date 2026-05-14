import { request } from './request'
import type { AccountCreditLogRecentRow, TaskCreditDetailResponse } from '../types/accountTypes'

export function getCreditLogRecent(limit = 20) {
  const q = new URLSearchParams({ limit: String(limit) })
  return request<AccountCreditLogRecentRow[]>(`/account/credit-log-recent?${q.toString()}`)
}

export function getTaskCreditDetail(taskId: number) {
  return request<TaskCreditDetailResponse>(`/account/task-credit-detail/${taskId}`)
}
