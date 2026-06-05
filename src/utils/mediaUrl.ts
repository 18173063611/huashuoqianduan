import { API_ORIGIN } from '../services/request'

export function normalizePublicMediaUrl(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const origin = API_ORIGIN || (typeof window !== 'undefined' ? window.location.origin : '')
  return trimmed.startsWith('/') ? `${origin}${trimmed}` : `${origin}/${trimmed}`
}
