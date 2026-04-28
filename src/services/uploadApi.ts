import { request } from './request'
import type { UploadedFileItem } from '../types/uploadTypes'

export function uploadProjectFile(projectId: number, file: File) {
  const formData = new FormData()
  formData.append('projectId', String(projectId))
  formData.append('file', file)
  return request<UploadedFileItem>('/files/upload', {
    method: 'POST',
    body: formData,
  })
}

export function getProjectFiles(projectId: number) {
  return request<UploadedFileItem[]>(`/files?projectId=${projectId}`)
}
