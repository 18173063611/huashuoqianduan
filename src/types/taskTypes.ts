/** 与《前端文件代码开发规范》§13 任务状态展示约定一致 */
export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYABLE'

export interface TaskItem {
  taskId: number
  projectId: number | null
  taskType: string
  status: TaskStatus
  inputJson: string | null
  outputJson: string | null
  retryCount: number
  errorMessage: string | null
  traceId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTaskRequest {
  projectId?: number | null
  taskType: string
  inputJson?: string
}
