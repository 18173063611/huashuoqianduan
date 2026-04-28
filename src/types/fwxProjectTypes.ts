export interface FwxProjectItem {
  projectId: number
  projectName: string
  description: string | null
  status: 'DRAFT' | 'MAKING' | 'DONE'
  createdAt: string
  updatedAt: string
}

export interface FwxCreateProjectRequest {
  projectName: string
  description?: string
}
