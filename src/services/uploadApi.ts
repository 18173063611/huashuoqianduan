import { request } from './request'
import type { PageResult } from '../types/apiTypes'
import type { UploadedFileItem } from '../types/uploadTypes'

export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request<UploadedFileItem>('/uploads', {
    method: 'POST',
    body: formData,
  })
}

export function getFiles(pageNo = 1, pageSize = 20) {
  const params = new URLSearchParams()
  params.set('pageNo', String(pageNo))
  params.set('pageSize', String(pageSize))
  return request<PageResult<UploadedFileItem>>(`/uploads?${params.toString()}`)
}
