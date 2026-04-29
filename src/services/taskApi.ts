import { request } from './request'
import type { CreateTaskRequest, TaskItem } from '../types/taskTypes'

export function createTask(payload: CreateTaskRequest) {
  return request<TaskItem>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getProjectTasks(projectId: number) {
  return request<TaskItem[]>(`/tasks?projectId=${projectId}`)
}

export function getTaskDetail(taskId: number) {
  return request<TaskItem>(`/tasks/${taskId}`)
}
