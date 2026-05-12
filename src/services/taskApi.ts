import { request } from './request'
import type { CreateTaskRequest, TaskItem, TaskResultItem, TaskSummaryResponse } from '../types/taskTypes'

export interface ListTasksParams {
  /** 不传或 null：当前登录用户的跨项目任务（须已登录） */
  taskType?: string
  status?: string
  pageNo?: number
  pageSize?: number
}

export function createTask(payload: CreateTaskRequest) {
  return request<TaskItem>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function listTasks(params: ListTasksParams) {
  const search = new URLSearchParams()
  if (params.taskType && params.taskType.trim()) {
    search.set('taskType', params.taskType.trim())
  }
  if (params.status && params.status.trim()) {
    search.set('status', params.status.trim())
  }
  search.set('pageNo', String(params.pageNo ?? 1))
  search.set('pageSize', String(params.pageSize ?? 20))
  const qs = search.toString()
  return request<TaskItem[]>(`/tasks?${qs}`)
}

/** 全局任务汇总（与 listTasks 不传 projectId 一致，须已登录） */
export function getTaskSummary() {
  return request<TaskSummaryResponse>('/tasks/summary')
}

export function retryTask(taskId: number) {
  return request<TaskItem>(`/tasks/${taskId}/retry`, { method: 'POST' })
}

export function cancelTask(taskId: number) {
  return request<TaskItem>(`/tasks/${taskId}/cancel`, { method: 'POST' })
}

export function markTaskViewed(taskId: number) {
  return request<TaskItem>(`/tasks/${taskId}/viewed`, { method: 'PATCH' })
}

export function getTaskDetail(taskId: number) {
  return request<TaskItem>(`/tasks/${taskId}`)
}

export function getTaskResult<T = unknown>(taskId: number) {
  return request<TaskResultItem<T>>(`/tasks/${taskId}/result`)
}
