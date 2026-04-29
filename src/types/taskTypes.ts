export type TaskStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYABLE' | 'CANCELLED'

export interface TaskItem {
  taskId: number
  projectId: number
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
  projectId: number
  taskType: string
  inputJson?: string
}
