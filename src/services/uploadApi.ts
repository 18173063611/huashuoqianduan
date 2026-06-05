import { API_BASE_URL, getAuthToken, inferAuthClientType, request } from './request'
import type { ApiResponse, PageResult } from '../types/apiTypes'
import type { UploadedFileItem } from '../types/uploadTypes'

export interface UploadProgress {
  loaded: number
  total: number
  percent: number | null
  phase: 'uploading' | 'processing'
}

interface UploadFileOptions {
  signal?: AbortSignal
  storage?: 'local' | 'tos'
  onProgress?: (progress: UploadProgress) => void
}

export function uploadFile(file: File, options: UploadFileOptions = {}) {
  const formData = new FormData()
  formData.append('file', file)
  const params = new URLSearchParams()
  if (options.storage === 'local') {
    params.set('storage', 'local')
  }
  const query = params.toString()
  const path = `/uploads${query ? `?${query}` : ''}`
  if (options.onProgress) {
    return uploadFileWithProgress(path, formData, file.size, options)
  }
  return request<UploadedFileItem>(path, {
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

function uploadFileWithProgress(
  path: string,
  formData: FormData,
  fallbackTotal: number,
  options: UploadFileOptions,
) {
  return new Promise<UploadedFileItem>((resolve, reject) => {
    if (options.signal?.aborted) {
      reject(new DOMException('Upload aborted', 'AbortError'))
      return
    }

    const xhr = new XMLHttpRequest()
    const token = getAuthToken(inferAuthClientType())
    let settled = false

    const cleanup = () => {
      options.signal?.removeEventListener('abort', abort)
    }
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      fn()
    }
    const abort = () => {
      xhr.abort()
      finish(() => reject(new DOMException('Upload aborted', 'AbortError')))
    }

    options.signal?.addEventListener('abort', abort, { once: true })
    xhr.open('POST', `${API_BASE_URL}${path}`)
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.onprogress = (event) => {
      const total = event.lengthComputable ? event.total : fallbackTotal
      const rawPercent = total > 0 ? Math.round((event.loaded / total) * 100) : null
      const percent = rawPercent == null ? null : Math.min(rawPercent, 98)
      options.onProgress?.({
        loaded: event.loaded,
        total,
        percent,
        phase: percent != null && percent >= 98 ? 'processing' : 'uploading',
      })
    }
    xhr.onload = () => {
      const payload = parseUploadResponse(xhr.responseText)
      if (xhr.status < 200 || xhr.status >= 300) {
        finish(() => reject(new Error(payload?.message || `HTTP ${xhr.status}`)))
        return
      }
      if (!payload) {
        finish(() => reject(new Error(`接口返回的不是 JSON: ${xhr.responseText}`)))
        return
      }
      if (payload.code !== 0) {
        finish(() => reject(new Error(payload.message || '上传失败')))
        return
      }
      options.onProgress?.({
        loaded: fallbackTotal,
        total: fallbackTotal,
        percent: 100,
        phase: 'processing',
      })
      finish(() => resolve(payload.data))
    }
    xhr.onerror = () => {
      finish(() => reject(new Error('上传连接失败，请检查网络后重试')))
    }
    xhr.ontimeout = () => {
      finish(() => reject(new Error('上传超时，请压缩视频或稍后重试')))
    }
    xhr.onabort = () => {
      finish(() => reject(new DOMException('Upload aborted', 'AbortError')))
    }

    xhr.send(formData)
  })
}

function parseUploadResponse(text: string): ApiResponse<UploadedFileItem> | null {
  if (!text) return null
  try {
    return JSON.parse(text) as ApiResponse<UploadedFileItem>
  } catch {
    return null
  }
}
