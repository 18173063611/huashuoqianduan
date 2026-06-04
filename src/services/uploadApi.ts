import { request } from './request'
import type { PageResult } from '../types/apiTypes'
import type { UploadedFileItem } from '../types/uploadTypes'

export function uploadFile(file: File, options: { signal?: AbortSignal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  return request<UploadedFileItem>('/uploads', {
    method: 'POST',
    body: formData,
    signal: options.signal,
  })
}

export function getFiles(pageNo = 1, pageSize = 20) {
  const params = new URLSearchParams()
  params.set('pageNo', String(pageNo))
  params.set('pageSize', String(pageSize))
  return request<PageResult<UploadedFileItem>>(`/uploads?${params.toString()}`)
}
