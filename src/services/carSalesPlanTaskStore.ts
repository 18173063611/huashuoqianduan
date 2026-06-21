import type { AiPlanPreview, CarSalesPlanDraft, CarSalesPlanSource } from '../pages/render/carSalesPlanDraft'
import type { QuickRenderRequest } from '../types/videoTypes'

const KEY = 'huashuo_pending_car_sales_plan_tasks'
const MAX = 20

export interface PendingCarSalesPlanTask {
  id: string
  source: CarSalesPlanSource
  title: string
  routeName: 'render' | 'asset-reuse' | 'video-parse'
  routeQuery?: Record<string, string>
  createdAt: string
  updatedAt: string
  aspectRatio: '9:16' | '16:9' | 'auto'
  plan: AiPlanPreview
  request?: QuickRenderRequest
  draft?: CarSalesPlanDraft
}

function safeParse(raw: string | null): PendingCarSalesPlanTask[] {
  if (!raw) return []
  try {
    const value = JSON.parse(raw) as unknown
    if (!Array.isArray(value)) return []
    return value.filter(isPendingPlanTask)
  } catch {
    return []
  }
}

function isPendingPlanTask(value: unknown): value is PendingCarSalesPlanTask {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.routeName === 'string' &&
    Boolean(record.plan)
}

export function listPendingCarSalesPlanTasks(): PendingCarSalesPlanTask[] {
  try {
    return safeParse(window.localStorage.getItem(KEY))
  } catch {
    return []
  }
}

export function getPendingCarSalesPlanTask(id: string | null | undefined): PendingCarSalesPlanTask | null {
  const target = String(id || '').trim()
  if (!target) return null
  return listPendingCarSalesPlanTasks().find((item) => item.id === target) || null
}

export function upsertPendingCarSalesPlanTask(task: Omit<PendingCarSalesPlanTask, 'createdAt' | 'updatedAt'> & Partial<Pick<PendingCarSalesPlanTask, 'createdAt' | 'updatedAt'>>) {
  try {
    const now = new Date().toISOString()
    const current = listPendingCarSalesPlanTasks()
    const existing = current.find((item) => item.id === task.id)
    const nextTask: PendingCarSalesPlanTask = {
      ...task,
      createdAt: task.createdAt || existing?.createdAt || now,
      updatedAt: now,
    }
    const next = [nextTask, ...current.filter((item) => item.id !== task.id)].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('huashuo:pending-car-sales-plans-changed'))
  } catch {
    // ignore local draft persistence failures
  }
}

export function removePendingCarSalesPlanTask(id: string | null | undefined) {
  const target = String(id || '').trim()
  if (!target) return
  try {
    const next = listPendingCarSalesPlanTasks().filter((item) => item.id !== target)
    window.localStorage.setItem(KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('huashuo:pending-car-sales-plans-changed'))
  } catch {
    // ignore
  }
}

export function newPendingCarSalesPlanTaskId(source: CarSalesPlanSource) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${source}-${crypto.randomUUID()}`
  }
  return `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
