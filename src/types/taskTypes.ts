/** 与《前端文件代码开发规范》§13 任务状态展示约定一致 */
export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRYABLE'
  | 'CANCELED'

export interface TaskItem {
  taskId: number
  projectId: number | null
  /** 与当前登录用户关联时非空；历史演示任务可能为空 */
  ownerUserId?: number | null
  taskType: string
  /** 后端可能扩展新状态，展示时以字符串为准 */
  status: TaskStatus | string
  taskTitle?: string
  progress: number | null
  resultAssetId: number | null
  errorCode: string | null
  retryCount: number
  resultViewed?: boolean
  inputJson: string | null
  outputJson: string | null
  errorMessage: string | null
  traceId: string | null
  createdAt: string
  updatedAt: string
  startedAt?: string | null
  finishedAt?: string | null
}

export interface TaskStatusMessage {
  taskId: number
  ownerUserId?: number | null
  taskType: string
  status: TaskStatus | string
  progress: number | null
  errorMessage: string | null
}

export interface TaskResultItem<T = unknown> {
  taskId: number
  projectId: number | null
  ownerUserId?: number | null
  taskType: string
  taskTitle?: string
  status: TaskStatus | string
  progress: number | null
  errorCode: string | null
  errorMessage: string | null
  result: T
}

export interface TaskSummaryResponse {
  processingCount: number
  successCount: number
  failedCount: number
  records: TaskItem[]
}

export interface CreateTaskRequest {
  projectId?: number | null
  taskType: string
  inputJson?: string
}
