import { request } from './request'
import type { UploadedFileItem } from '../types/uploadTypes'

export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<UploadedFileItem>('/uploads', {
    method: 'POST',
    body: formData,
  })
}

export function getFiles() {
  return request<UploadedFileItem[]>('/uploads')
}
