import { request } from './request'
import type { PageResult } from '../types/apiTypes'
import type { CreateProjectRequest, ProjectItem } from '../types/projectTypes'

export function getProjectList() {
  return request<PageResult<ProjectItem>>('/projects?pageNo=1&pageSize=20')
}

export function createProject(payload: CreateProjectRequest) {
  return request<ProjectItem>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
