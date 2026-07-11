import { request } from './request'
import { newIdempotencyKey } from './taskApi'
import type {
  AvatarGenerateRequest,
  AvatarGenerateResponse,
  AvatarItem,
  AvatarUpdateRequest,
} from '../types/avatarTypes'

interface AvatarBusinessDomainOptions {
  businessDomain?: 'pet'
}

function idempotencyHeaders(explicitKey?: string | null): Record<string, string> {
  const key =
    explicitKey != null && String(explicitKey).trim().length > 0
      ? String(explicitKey).trim()
      : newIdempotencyKey()
  return { 'Idempotency-Key': key }
}

export function uploadAvatar(avatarName: string, file: File, options?: AvatarBusinessDomainOptions) {
  const formData = new FormData()
  formData.set('avatarName', avatarName)
  formData.set('file', file)
  if (options?.businessDomain) {
    formData.set('businessDomain', options.businessDomain)
  }
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

export function getAvatars(params?: AvatarBusinessDomainOptions) {
  const search = new URLSearchParams()
  if (params?.businessDomain) {
    search.set('businessDomain', params.businessDomain)
  }
  const query = search.toString()
  return request<AvatarItem[]>(query ? `/avatars?${query}` : '/avatars')
}

export function updateAvatar(avatarId: number, payload: AvatarUpdateRequest) {
  return request<AvatarItem>(`/avatars/${avatarId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function deleteAvatar(avatarId: number) {
  return request<void>(`/avatars/${avatarId}`, {
    method: 'DELETE',
  })
}
