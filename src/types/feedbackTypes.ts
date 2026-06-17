import type { PageResult } from './apiTypes'

export type CustomerFeedbackCategory =
  | 'BUG'
  | 'TASK_EXCEPTION'
  | 'FEATURE_REQUEST'
  | 'CONSULT'
  | 'CONTENT_COMPLAINT'
  | 'REFUND'
  | 'OTHER'

export type CustomerFeedbackPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export type CustomerFeedbackStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED'

export interface CustomerFeedbackAttachmentItem {
  fileId: number
  originalFileName: string
  previewUrl: string
  mimeType?: string | null
  fileSize?: number | null
  createdAt?: string
}

export interface CustomerFeedbackItem {
  feedbackId: number
  ownerUserId: number
  username?: string | null
  displayName?: string | null
  category: CustomerFeedbackCategory
  priority: CustomerFeedbackPriority
  status: CustomerFeedbackStatus
  title: string
  content: string
  contact?: string | null
  relatedTaskId?: number | null
  projectId?: number | null
  pageUrl?: string | null
  sourcePath?: string | null
  userAgent?: string | null
  attachmentFileIds: number[]
  attachments: CustomerFeedbackAttachmentItem[]
  adminReply?: string | null
  adminNote?: string | null
  assigneeAdminId?: number | null
  firstResponseAt?: string | null
  resolvedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface CustomerFeedbackCreateRequest {
  category?: CustomerFeedbackCategory | ''
  priority?: CustomerFeedbackPriority | ''
  title?: string
  content?: string
  contact?: string
  relatedTaskId?: number
  projectId?: number
  pageUrl?: string
  sourcePath?: string
  userAgent?: string
  attachmentFileIds?: number[]
}

export interface CustomerFeedbackAdminUpdateRequest {
  status?: CustomerFeedbackStatus | ''
  priority?: CustomerFeedbackPriority | ''
  adminReply?: string
  adminNote?: string
}

export interface CustomerFeedbackAdminQuery {
  ownerUserId?: number
  category?: CustomerFeedbackCategory | ''
  status?: CustomerFeedbackStatus | ''
  priority?: CustomerFeedbackPriority | ''
  keyword?: string
  pageNo?: number
  pageSize?: number
}

export type CustomerFeedbackPage = PageResult<CustomerFeedbackItem>
