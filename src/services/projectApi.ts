import { request } from './request'
import type { PageResult } from '../types/apiTypes'
import type { CreateProjectRequest, ProjectItem, UpdateProjectRequest } from '../types/projectTypes'

export function getProjectList(pageNo = 1, pageSize = 20, keyword = '') {
  const params = new URLSearchParams({
    pageNo: String(pageNo),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) {
    params.set('keyword', keyword.trim())
  }
  return request<PageResult<ProjectItem>>(`/projects?${params.toString()}`)
}

export function createProject(payload: CreateProjectRequest) {
  return request<ProjectItem>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateProject(projectId: number, payload: UpdateProjectRequest) {
  return request<ProjectItem>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteProject(projectId: number) {
  return request<void>(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}
