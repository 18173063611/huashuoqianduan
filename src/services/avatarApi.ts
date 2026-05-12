import { request } from './request'
import { newIdempotencyKey } from './taskApi'
import type {
  AvatarGenerateRequest,
  AvatarGenerateResponse,
  AvatarItem,
  AvatarTaskDetailResponse,
  AvatarUpdateRequest,
} from '../types/avatarTypes'

function idempotencyHeaders(explicitKey?: string | null): Record<string, string> {
  const key =
    explicitKey != null && String(explicitKey).trim().length > 0
      ? String(explicitKey).trim()
      : newIdempotencyKey()
  return { 'Idempotency-Key': key }
}

export function uploadAvatar(avatarName: string, file: File) {
  const formData = new FormData()
  formData.set('avatarName', avatarName)
  formData.set('file', file)
  return request<AvatarItem>('/avatars/upload', {
    method: 'POST',
    body: formData,
  })
}

export function generateAvatar(payload: AvatarGenerateRequest, idempotencyKey?: string | null) {
  return request<AvatarGenerateResponse>('/avatars/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: idempotencyHeaders(idempotencyKey),
  })
}

export function getAvatarGenerateTask(taskId: number) {
  return request<AvatarTaskDetailResponse>(`/avatars/generate/${taskId}`)
}

export function getAvatars() {
  return request<AvatarItem[]>('/avatars')
}

export function updateAvatar(avatarId: number, payload: AvatarUpdateRequest) {
  return request<AvatarItem>(`/avatars/${avatarId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
