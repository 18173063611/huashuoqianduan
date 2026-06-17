import { API_BASE_URL, getAuthToken, request } from './request'
import type {
  AdminAssetItem,
  AdminAssetPage,
  AdminAssetQuery,
  AdminBillingStepItem,
  AdminBillingStepPage,
  AdminBillingStepQuery,
  AdminBillingStepSaveRequest,
  AdminCreditAccount,
  AdminCreditAdjustRequest,
  AdminCreditLogPage,
  AdminDashboardSummary,
  AdminModelItem,
  AdminModelPage,
  AdminModelPriceItem,
  AdminModelPricePage,
  AdminModelPriceQuery,
  AdminModelPriceSaveRequest,
  AdminModelQuery,
  AdminModelSaveRequest,
  AdminOperationLogPage,
  AdminOperationLogQuery,
  AdminPasswordResetRequest,
  AdminProviderOpsTicketPage,
  AdminProviderOpsTicketQuery,
  AdminTaskItem,
  AdminTaskManualRetryApplyRequest,
  AdminTaskManualRetryRequest,
  AdminTaskPage,
  AdminTaskProviderOpsUpdateRequest,
  AdminTaskQuery,
  AdminUsageSummaryQuery,
  AdminUsageSummaryResponse,
  AdminUserItem,
  AdminUserPage,
  AdminUserQuery,
  AdminUserSaveRequest,
} from '../types/adminTypes'
import type {
  CustomerFeedbackAdminQuery,
  CustomerFeedbackAdminUpdateRequest,
  CustomerFeedbackItem,
  CustomerFeedbackPage,
} from '../types/feedbackTypes'

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
      providerOpsOnly: params.providerOpsOnly ? 'true' : undefined,
      providerOpsStatus: params.providerOpsStatus?.trim(),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function updateAdminTaskProviderOps(taskId: number, payload: AdminTaskProviderOpsUpdateRequest) {
  return request<AdminTaskItem>(`/admin/tasks/${taskId}/provider-ops`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function requestAdminTaskManualRetry(taskId: number, payload: AdminTaskManualRetryApplyRequest) {
  return request<AdminTaskItem>(`/admin/tasks/${taskId}/provider-ops/manual-retry`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function reviewAdminTaskManualRetry(taskId: number, payload: AdminTaskManualRetryRequest) {
  return request<AdminTaskItem>(`/admin/tasks/${taskId}/provider-ops/manual-retry/review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listAdminProviderOpsTickets(params: AdminProviderOpsTicketQuery) {
  return request<AdminProviderOpsTicketPage>(
    `/admin/provider-ops/tickets${toQuery({
      status: params.status?.trim(),
      priority: params.priority?.trim(),
      assigneeAdminId: params.assigneeAdminId,
      overdueOnly: params.overdueOnly ? 'true' : undefined,
      supplierTicketId: params.supplierTicketId?.trim(),
      providerTaskId: params.providerTaskId?.trim(),
      taskType: params.taskType?.trim(),
      retryApprovalStatus: params.retryApprovalStatus?.trim(),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function updateAdminProviderOpsTicket(ticketId: number, payload: AdminTaskProviderOpsUpdateRequest) {
  return request<AdminProviderOpsTicketPage['records'][number]>(`/admin/provider-ops/tickets/${ticketId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function requestAdminProviderOpsTicketRetry(ticketId: number, payload: AdminTaskManualRetryApplyRequest) {
  return request<AdminProviderOpsTicketPage['records'][number]>(
    `/admin/provider-ops/tickets/${ticketId}/manual-retry`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function reviewAdminProviderOpsTicketRetry(ticketId: number, payload: AdminTaskManualRetryRequest) {
  return request<AdminProviderOpsTicketPage['records'][number]>(
    `/admin/provider-ops/tickets/${ticketId}/manual-retry/review`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  )
}

export function listAdminAssets(params: AdminAssetQuery) {
  return request<AdminAssetPage>(
    `/admin/assets${toQuery({
      ownerUserId: params.ownerUserId,
      visibility: params.visibility?.trim(),
      status: params.status?.trim(),
      assetType: params.assetType?.trim(),
      sourceType: params.sourceType?.trim(),
      assetGroup: params.assetGroup?.trim(),
      keyword: params.keyword?.trim(),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function publishAdminAsset(assetId: number) {
  return request<AdminAssetItem>(`/admin/assets/${assetId}/public`, { method: 'POST' })
}

export function privatizeAdminAsset(assetId: number) {
  return request<AdminAssetItem>(`/admin/assets/${assetId}/private`, { method: 'POST' })
}

export function removeAdminAsset(assetId: number) {
  return request<AdminAssetItem>(`/admin/assets/${assetId}/remove`, { method: 'POST' })
}

export function restoreAdminAsset(assetId: number) {
  return request<AdminAssetItem>(`/admin/assets/${assetId}/restore`, { method: 'POST' })
}

export function deleteAdminAsset(assetId: number) {
  return request<void>(`/admin/assets/${assetId}`, { method: 'DELETE' })
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

export function listAdminBillingSteps(params: AdminBillingStepQuery) {
  return request<AdminBillingStepPage>(
    `/admin/billing/steps${toQuery({
      taskType: params.taskType?.trim(),
      functionModule: params.functionModule?.trim(),
      enabled: params.enabled === '' ? undefined : String(params.enabled),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function createAdminBillingStep(payload: AdminBillingStepSaveRequest) {
  return request<AdminBillingStepItem>('/admin/billing/steps', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminBillingStep(stepId: number, payload: AdminBillingStepSaveRequest) {
  return request<AdminBillingStepItem>(`/admin/billing/steps/${stepId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function enableAdminBillingStep(stepId: number) {
  return request<AdminBillingStepItem>(`/admin/billing/steps/${stepId}/enable`, { method: 'POST' })
}

export function disableAdminBillingStep(stepId: number) {
  return request<AdminBillingStepItem>(`/admin/billing/steps/${stepId}/disable`, { method: 'POST' })
}

export function listAdminModelPrices(params: AdminModelPriceQuery) {
  return request<AdminModelPricePage>(
    `/admin/billing/prices${toQuery({
      provider: params.provider?.trim(),
      taskType: params.taskType?.trim(),
      enabled: params.enabled === '' ? undefined : String(params.enabled),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function createAdminModelPrice(payload: AdminModelPriceSaveRequest) {
  return request<AdminModelPriceItem>('/admin/billing/prices', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminModelPrice(priceId: number, payload: AdminModelPriceSaveRequest) {
  return request<AdminModelPriceItem>(`/admin/billing/prices/${priceId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function enableAdminModelPrice(priceId: number) {
  return request<AdminModelPriceItem>(`/admin/billing/prices/${priceId}/enable`, { method: 'POST' })
}

export function disableAdminModelPrice(priceId: number) {
  return request<AdminModelPriceItem>(`/admin/billing/prices/${priceId}/disable`, { method: 'POST' })
}

function usageSummaryQuery(params: AdminUsageSummaryQuery) {
  return toQuery({
    dimension: params.dimension,
    from: params.from,
    to: params.to,
    taskType: params.taskType?.trim(),
    functionModule: params.functionModule?.trim(),
    provider: params.provider?.trim(),
    modelCode: params.modelCode?.trim(),
    usageUnit: params.usageUnit?.trim(),
  })
}

export function getAdminUsageSummary(params: AdminUsageSummaryQuery) {
  return request<AdminUsageSummaryResponse>(`/admin/billing/usage-summary${usageSummaryQuery(params)}`)
}

/**
 * 触发 CSV 下载：服务端附带 Content-Disposition，所以直接走 fetch+blob+a 标签即可，避免 request 把 text/csv 当 JSON 解析失败。
 */
export async function downloadAdminUsageSummaryCsv(params: AdminUsageSummaryQuery) {
  const url = `${API_BASE_URL}/admin/billing/usage-summary.csv${usageSummaryQuery(params)}`
  const token = getAuthToken('ADMIN_WEB')
  const response = await fetch(url, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) {
    throw new Error(`下载失败：HTTP ${response.status}`)
  }
  const disposition = response.headers.get('Content-Disposition') || ''
  let fileName = 'ai-usage-summary.csv'
  const match = disposition.match(/filename\*?="?([^";]+)"?/i)
  if (match && match[1]) {
    try {
      fileName = decodeURIComponent(match[1].replace(/^UTF-8''/i, ''))
    } catch {
      fileName = match[1]
    }
  }
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
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

export function listAdminFeedback(params: CustomerFeedbackAdminQuery) {
  return request<CustomerFeedbackPage>(
    `/admin/feedback${toQuery({
      ownerUserId: params.ownerUserId,
      category: params.category || undefined,
      status: params.status || undefined,
      priority: params.priority || undefined,
      keyword: params.keyword?.trim(),
      pageNo: params.pageNo,
      pageSize: params.pageSize,
    })}`,
  )
}

export function getAdminFeedback(feedbackId: number) {
  return request<CustomerFeedbackItem>(`/admin/feedback/${feedbackId}`)
}

export function updateAdminFeedback(feedbackId: number, payload: CustomerFeedbackAdminUpdateRequest) {
  return request<CustomerFeedbackItem>(`/admin/feedback/${feedbackId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}
