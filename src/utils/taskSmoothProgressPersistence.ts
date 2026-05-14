/**
 * 任务中心行内虚拟进度：localStorage 持久化，关闭面板后按时间补算增量。
 * 与 TaskRowSmoothProgress 内 tick 公式保持一致。
 */

export const TASK_SMOOTH_PROGRESS_STORAGE_KEY = 'huashuo_task_smooth_progress_v1'

/** 与需求一致：RUNNING/QUEUED 虚拟进度上限（真实后端 progress 仍可更高并优先） */
export const SMOOTH_PROGRESS_CEIL = 95
export const SMOOTH_TICK_MS = 280

export interface TaskSmoothProgressRecord {
  taskId: number
  progress: number
  status: string
  updatedAt: string
  lastTickAt: number
}

type StoreShape = Record<string, TaskSmoothProgressRecord>

function readAll(): StoreShape {
  try {
    const raw = localStorage.getItem(TASK_SMOOTH_PROGRESS_STORAGE_KEY)
    if (!raw) return {}
    const o = JSON.parse(raw) as unknown
    return o && typeof o === 'object' ? (o as StoreShape) : {}
  } catch {
    return {}
  }
}

function writeAll(map: StoreShape) {
  try {
    localStorage.setItem(TASK_SMOOTH_PROGRESS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    /* 配额或隐私模式 */
  }
}

export function loadTaskSmoothProgressRecord(taskId: number): TaskSmoothProgressRecord | null {
  const row = readAll()[String(taskId)]
  return row && typeof row.taskId === 'number' ? row : null
}

export function saveTaskSmoothProgressRecord(row: TaskSmoothProgressRecord) {
  const map = readAll()
  map[String(row.taskId)] = row
  writeAll(map)
}

export function removeTaskSmoothProgressRecord(taskId: number) {
  const map = readAll()
  delete map[String(taskId)]
  writeAll(map)
}

/** 单次 tick：与 TaskRowSmoothProgress 原逻辑一致（ceil 用参数便于测试） */
export function advanceSmoothOneStep(virtualProgress: number, serverProgress: number, ceil = SMOOTH_PROGRESS_CEIL): number {
  let v = Math.max(virtualProgress, serverProgress)
  if (v < ceil) {
    const room = ceil - v
    v += Math.max(0.22, room * 0.038)
  }
  return Math.min(ceil, Math.round(v * 100) / 100)
}

/**
 * 按关闭经过的时间补算虚拟进度（假定关闭期间仍以相同 tick 间隔推进）。
 */
export function catchUpSmoothProgress(
  savedVirtual: number,
  lastTickAt: number,
  serverProgress: number,
  nowMs = Date.now(),
  tickMs = SMOOTH_TICK_MS,
  ceil = SMOOTH_PROGRESS_CEIL,
): number {
  const elapsed = Math.max(0, nowMs - lastTickAt)
  let steps = Math.floor(elapsed / tickMs)
  const maxSteps = 200_000
  if (steps > maxSteps) steps = maxSteps

  let v = savedVirtual
  for (let i = 0; i < steps; i++) {
    const next = advanceSmoothOneStep(v, serverProgress, ceil)
    if (next >= ceil && v >= ceil) break
    v = next
    if (v >= ceil) break
  }
  return Math.max(serverProgress, v)
}
