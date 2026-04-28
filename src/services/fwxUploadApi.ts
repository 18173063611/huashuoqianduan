import { fwxRequest } from './fwxRequest'
import type { FwxUploadedFileItem } from '../types/fwxUploadTypes'

export function fwxUploadProjectFile(projectId: number, file: File) {
  const formData = new FormData()
  formData.append('projectId', String(projectId))
  formData.append('file', file)
  return fwxRequest<FwxUploadedFileItem>('/files/upload', {
    method: 'POST',
    body: formData,
  })
}

export function fwxGetProjectFiles(projectId: number) {
  return fwxRequest<FwxUploadedFileItem[]>(`/files?projectId=${projectId}`)
}
