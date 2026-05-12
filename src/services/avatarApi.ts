import { request } from './request'
import type {
  AvatarGenerateRequest,
  AvatarGenerateResponse,
  AvatarItem,
  AvatarUpdateRequest,
} from '../types/avatarTypes'

export function uploadAvatar(avatarName: string, file: File) {
  const formData = new FormData()
  formData.set('avatarName', avatarName)
  formData.set('file', file)
  return request<AvatarItem>('/avatars/upload', {
    method: 'POST',
    body: formData,
  })
}

export function generateAvatar(payload: AvatarGenerateRequest) {
  return request<AvatarGenerateResponse>('/avatars/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
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
