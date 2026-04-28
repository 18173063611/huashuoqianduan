import { fwxRequest } from './fwxRequest'
import type { FwxPageResult } from '../types/fwxApiTypes'
import type { FwxCreateProjectRequest, FwxProjectItem } from '../types/fwxProjectTypes'

export function fwxGetProjectList() {
  return fwxRequest<FwxPageResult<FwxProjectItem>>('/projects?pageNo=1&pageSize=20')
}

export function fwxCreateProject(request: FwxCreateProjectRequest) {
  return fwxRequest<FwxProjectItem>('/projects', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}
