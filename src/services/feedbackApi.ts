import { request } from './request'
import type {
  CustomerFeedbackCreateRequest,
  CustomerFeedbackItem,
  CustomerFeedbackPage,
} from '../types/feedbackTypes'

export function createFeedback(payload: CustomerFeedbackCreateRequest) {
  return request<CustomerFeedbackItem>('/feedback', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function listMyFeedback(pageNo = 1, pageSize = 5) {
  return request<CustomerFeedbackPage>(`/feedback?pageNo=${pageNo}&pageSize=${pageSize}`)
}
