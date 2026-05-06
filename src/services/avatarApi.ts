import { request } from './request'
import type {
  AvatarGenerateRequest,
  AvatarGenerateResponse,
  AvatarItem,
  AvatarTaskDetailResponse,
  AvatarUpdateRequest,
} from '../types/avatarTypes'

export function uploadAvatar(projectId: number, avatarName: string, file: File) {
  const formData = new FormData()
  formData.set('projectId', String(projectId))
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

export function getAvatarGenerateTask(taskId: number) {
  return request<AvatarTaskDetailResponse>(`/avatars/generate/${taskId}`)
}

export function getProjectAvatars(projectId: number) {
  return request<AvatarItem[]>(`/avatars?projectId=${projectId}`)
}

export function updateAvatar(avatarId: number, payload: AvatarUpdateRequest) {
  return request<AvatarItem>(`/avatars/${avatarId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
