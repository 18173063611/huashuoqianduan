export interface AccountCreditLogRecentRow {
  creditLogId: number
  createdAt: string
  taskName: string
  taskType: string
  operationType: string
  operationLabel: string
  changeAmount: number
  afterBalance: number
  status: string
}

export interface TaskCreditDetailLogLine {
  createdAt: string
  changeType: string
  operationType: string
  operationLabel: string
  changeAmount: number
  beforeBalance: number
  afterBalance: number
  idempotencyKey: string | null
  remark: string | null
}

export interface TaskCreditStepRow {
  stepName: string
  modelApi: string
  usageUnit: string
  usageDisplay: string
  estimatedCredits: number | null
  actualCredits: number | null
  status: string
}

export interface TaskCreditUsageSnapshot {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
  characterCount: number | null
  imageCount: number | null
  durationSeconds: string | number | null
  providerCredits: string | number | null
  usagePhase: string | null
}

export interface TaskCreditDetailResponse {
  taskId: number
  taskTitle: string
  taskType: string
  provider: string
  modelCode: string
  taskStatus: string
  estimatedCreditCost: number | null
  actualCreditCost: number | null
  paidCreditCost: number
  unpaidCreditCost: number
  settlementStatus: string
  settlementStatusLabel: string
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
  usage: TaskCreditUsageSnapshot
  steps: TaskCreditStepRow[]
  creditExplanation: string[]
  logs: TaskCreditDetailLogLine[]
}
