import { request } from './request'
import type {
  AdminCreditAccount,
  AdminCreditAdjustRequest,
  AdminCreditLogPage,
  AdminDashboardSummary,
  AdminModelItem,
  AdminModelPage,
  AdminModelQuery,
  AdminModelSaveRequest,
  AdminOperationLogPage,
  AdminOperationLogQuery,
  AdminPasswordResetRequest,
  AdminTaskPage,
  AdminTaskQuery,
  AdminUserItem,
  AdminUserPage,
  AdminUserQuery,
  AdminUserSaveRequest,
} from '../types/adminTypes'

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') return
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}

export function getAdminDashboardSummary() {
  return request<AdminDashboardSummary>('/admin/dashboard/summary')
}

export function listAdminUsers(params: AdminUserQuery) {
  return request<AdminUserPage>(
    `/admin/users${toQuery({
      keyword: params.keyword?.trim(),
      role: params.role || undefined,
      status: params.status || undefined,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function getAdminUser(userId: number) {
  return request<AdminUserItem>(`/admin/users/${userId}`)
}

export function createAdminUser(payload: AdminUserSaveRequest) {
  return request<AdminUserItem>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminUser(userId: number, payload: AdminUserSaveRequest) {
  return request<AdminUserItem>(`/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteAdminUser(userId: number) {
  return request<void>(`/admin/users/${userId}`, {
    method: 'DELETE',
  })
}

export function enableAdminUser(userId: number) {
  return request<AdminUserItem>(`/admin/users/${userId}/enable`, {
    method: 'POST',
  })
}

export function disableAdminUser(userId: number) {
  return request<AdminUserItem>(`/admin/users/${userId}/disable`, {
    method: 'POST',
  })
}

export function resetAdminUserPassword(userId: number, payload: AdminPasswordResetRequest) {
  return request<void>(`/admin/users/${userId}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getAdminUserCreditAccount(userId: number) {
  return request<AdminCreditAccount>(`/admin/users/${userId}/credits`)
}

export function adjustAdminUserCredits(userId: number, payload: AdminCreditAdjustRequest) {
  return request<AdminCreditAccount>(`/admin/users/${userId}/credits/adjust`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listAdminUserCreditLogs(userId: number, pageNo = 1, pageSize = 20) {
  return request<AdminCreditLogPage>(`/admin/users/${userId}/credit-logs${toQuery({ pageNo, pageSize })}`)
}

export function listAdminModels(params: AdminModelQuery) {
  return request<AdminModelPage>(
    `/admin/models${toQuery({
      modelType: params.modelType?.trim(),
      provider: params.provider?.trim(),
      enabled: params.enabled === '' ? undefined : String(params.enabled),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function createAdminModel(payload: AdminModelSaveRequest) {
  return request<AdminModelItem>('/admin/models', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminModel(modelId: number, payload: AdminModelSaveRequest) {
  return request<AdminModelItem>(`/admin/models/${modelId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function enableAdminModel(modelId: number) {
  return request<AdminModelItem>(`/admin/models/${modelId}/enable`, { method: 'POST' })
}

export function disableAdminModel(modelId: number) {
  return request<AdminModelItem>(`/admin/models/${modelId}/disable`, { method: 'POST' })
}

export function setDefaultAdminModel(modelId: number) {
  return request<AdminModelItem>(`/admin/models/${modelId}/default`, { method: 'POST' })
}

export function listAdminTasks(params: AdminTaskQuery) {
  return request<AdminTaskPage>(
    `/admin/tasks${toQuery({
      ownerUserId: params.ownerUserId,
      taskType: params.taskType?.trim(),
      status: params.status?.trim(),
      modelCode: params.modelCode?.trim(),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function listAdminCreditLogs(params: {
  userId?: number
  changeType?: string
  relatedTaskId?: number
  pageNo?: number
  pageSize?: number
}) {
  return request<AdminCreditLogPage>(
    `/admin/credit-logs${toQuery({
      userId: params.userId,
      changeType: params.changeType?.trim(),
      relatedTaskId: params.relatedTaskId,
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function listAdminOperationLogs(params: AdminOperationLogQuery) {
  return request<AdminOperationLogPage>(
    `/admin/operation-logs${toQuery({
      adminUserId: params.adminUserId,
      operationType: params.operationType?.trim(),
      targetType: params.targetType?.trim(),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}
