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
  modelCode?: string | null
  creditCost?: number | null
  creditLogId?: number | null
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
  /** 与 HTTP 头 Idempotency-Key 二选一；头优先。同一键重复提交返回同一 taskId 且不重复扣积分 */
  idempotencyKey?: string | null
}
