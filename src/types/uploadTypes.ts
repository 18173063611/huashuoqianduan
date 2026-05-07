export interface UploadedFileItem {
  fileId: number
  projectId: number | null
  ownerUserId?: number | null
  originalFileName: string
  storedFileName: string
  filePath: string
  previewUrl: string
  mimeType: string | null
  fileSize: number
  createdAt: string
}
