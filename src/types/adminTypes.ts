import type { PageResult } from './apiTypes'
import type { UserRole, UserStatus } from './userTypes'

export interface AdminUserItem {
  userId: number
  username: string
  displayName: string
  role: UserRole
  status: UserStatus
  phone?: string
  email?: string
  remark?: string
  creditBalance?: number
  lastLoginAt?: string
  createdAt?: string
}

export interface AdminUserQuery {
  keyword?: string
  role?: UserRole | ''
  status?: UserStatus | ''
  pageNo?: number
  pageSize?: number
}

export interface AdminUserSaveRequest {
  username: string
  password?: string
  displayName: string
  role: UserRole
  status: UserStatus
  phone?: string
  email?: string
  remark?: string
}

export interface AdminPasswordResetRequest {
  password: string
}

export interface AdminCreditAccount {
  userId: number
  balance: number
  frozenBalance?: number
  totalRecharged?: number
  totalConsumed?: number
}

export type AdminCreditChangeType = 'ADMIN_ADD' | 'ADMIN_DEDUCT' | 'ADMIN_SET'

export interface AdminCreditAdjustRequest {
  changeType: AdminCreditChangeType
  amount: number
  remark: string
}

export interface AdminCreditLogItem {
  creditLogId: number
  userId: number
  changeType: string
  changeAmount: number
  beforeBalance: number
  afterBalance: number
  relatedTaskId?: number
  modelCode?: string
  operatorAdminId?: number
  remark?: string
  createdAt?: string
}

export interface AdminDashboardSummary {
  userCount: number
  todayTaskCount: number
  todayCreditConsumed: number
  failedTaskCount: number
  queueBacklog: number
}

export interface AdminModelItem {
  modelId: number
  modelCode: string
  modelName: string
  modelType: string
  provider: string
  providerModel?: string
  creditCost: number
  enabled: boolean
  defaultModel: boolean
  capabilityJson?: string
  defaultParamsJson?: string
  rateLimitPerMinute?: number
  concurrencyLimit?: number
  createdAt?: string
  updatedAt?: string
}

export interface AdminModelQuery {
  modelType?: string
  provider?: string
  enabled?: boolean | ''
  pageNo?: number
  pageSize?: number
}

export interface AdminModelSaveRequest {
  modelCode: string
  modelName: string
  modelType: string
  provider: string
  providerModel?: string
  creditCost: number
  enabled?: boolean
  defaultModel?: boolean
  capabilityJson?: string
  defaultParamsJson?: string
  rateLimitPerMinute?: number
  concurrencyLimit?: number
}

export interface AdminTaskItem {
  taskId: number
  ownerUserId?: number
  taskType: string
  status: string
  progress?: number
  modelCode?: string
  provider?: string
  usageUnit?: string
  estimatedUsage?: number
  actualUsage?: number
  estimatedCreditCost?: number
  actualCreditCost?: number
  settlementStatus?: string
  creditCost?: number
  creditLogId?: number
  queueName?: string
  messageId?: string
  errorCode?: string
  errorMessage?: string
  traceId?: string
  createdAt?: string
  updatedAt?: string
  startedAt?: string
  finishedAt?: string
}

export interface AdminTaskQuery {
  ownerUserId?: number
  taskType?: string
  status?: string
  modelCode?: string
  pageNo?: number
  pageSize?: number
}

export interface AdminOperationLogItem {
  operationId: number
  adminUserId: number
  operationType: string
  targetType: string
  targetId?: number
  beforeJson?: string
  afterJson?: string
  ip?: string
  traceId?: string
  createdAt?: string
}

export interface AdminOperationLogQuery {
  adminUserId?: number
  operationType?: string
  targetType?: string
  pageNo?: number
  pageSize?: number
}

export type AdminUserPage = PageResult<AdminUserItem>
export type AdminCreditLogPage = PageResult<AdminCreditLogItem>
export type AdminModelPage = PageResult<AdminModelItem>
export type AdminTaskPage = PageResult<AdminTaskItem>
export type AdminOperationLogPage = PageResult<AdminOperationLogItem>
