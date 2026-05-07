import { request } from './request'
import type { TemplateCreateRequest, TemplateItem } from '../types/templateTypes'

export type TemplateListScope = 'public' | 'private' | 'all'

export type TemplateListSort = 'publishedAtDesc' | 'createdAtDesc' | 'createdAtAsc'

export interface ListTemplatesParams {
  scope?: TemplateListScope
  keyword?: string
  tag?: string
  sort?: TemplateListSort
}

export async function getTemplates(params?: ListTemplatesParams) {
  const search = new URLSearchParams()
  if (params?.keyword && params.keyword.trim()) {
    search.set('keyword', params.keyword.trim())
  }
  if (params?.tag && params.tag.trim()) {
    search.set('tag', params.tag.trim())
  }
  if (params?.sort) {
    search.set('sort', params.sort)
  }
  if (params?.scope && params.scope !== 'all') {
    search.set('scope', params.scope)
  }
  const query = search.toString()
  return request<TemplateItem[]>(query ? `/templates?${query}` : '/templates')
}

export function getTemplateDetail(templateId: number) {
  return request<TemplateItem>(`/templates/${templateId}`)
}

export function createTemplate(payload: TemplateCreateRequest) {
  return request<TemplateItem>('/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function publishTemplate(templateId: number) {
  return request<TemplateItem>(`/templates/${templateId}/publish`, {
    method: 'POST',
  })
}

export function forkTemplate(templateId: number) {
  return request<TemplateItem>(`/templates/${templateId}/fork`, {
    method: 'POST',
  })
}

