export interface FwxUploadedFileItem {
  fileId: number
  projectId: number
  originalFileName: string
  storedFileName: string
  filePath: string
  previewUrl: string
  mimeType: string | null
  fileSize: number
  createdAt: string
}
