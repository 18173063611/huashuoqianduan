import type { FwxApiResponse } from '../types/fwxApiTypes'

const FWX_API_PREFIX = '/api/v1'

export async function fwxRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const requestInit: RequestInit = { ...init }
  if (!(init?.body instanceof FormData)) {
    requestInit.headers = {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
    }
  }
  const response = await fetch(`${FWX_API_PREFIX}${path}`, {
    ...requestInit,
  })
  const payload = (await response.json()) as FwxApiResponse<T>
  if (!response.ok || payload.code !== 0) {
    throw new Error(`${payload.message || '请求失败'}${payload.traceId ? `，traceId：${payload.traceId}` : ''}`)
  }
  return payload.data
}
