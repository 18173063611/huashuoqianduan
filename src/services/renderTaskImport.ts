export interface RenderTaskImportRecord {
  taskId: number
  taskType: string
  input: unknown
  savedAt: number
  source: 'submit' | 'task-center'
}

const PENDING_IMPORT_KEY = 'huashuo:render-task-import:v1'
const TASK_SNAPSHOTS_KEY = 'huashuo:render-task-snapshots:v1'
const MAX_SNAPSHOT_COUNT = 30

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeTaskId(taskId: number | string | null | undefined) {
  const value = Number(taskId)
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : null
}

function readSnapshotMap(): Record<string, RenderTaskImportRecord> {
  if (!canUseStorage()) {
    return {}
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_SNAPSHOTS_KEY) || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, RenderTaskImportRecord>)
      : {}
  } catch {
    return {}
  }
}

function writeSnapshotMap(records: Record<string, RenderTaskImportRecord>) {
  if (!canUseStorage()) {
    return
  }
  const limited = Object.values(records)
    .filter((item) => normalizeTaskId(item.taskId) != null)
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, MAX_SNAPSHOT_COUNT)
    .reduce<Record<string, RenderTaskImportRecord>>((acc, item) => {
      acc[String(item.taskId)] = item
      return acc
    }, {})
  window.localStorage.setItem(TASK_SNAPSHOTS_KEY, JSON.stringify(limited))
}

export function saveRenderTaskSnapshot(taskId: number, taskType: string, input: unknown) {
  const normalizedTaskId = normalizeTaskId(taskId)
  if (!normalizedTaskId || !taskType || input == null) {
    return
  }
  const records = readSnapshotMap()
  records[String(normalizedTaskId)] = {
    taskId: normalizedTaskId,
    taskType,
    input,
    savedAt: Date.now(),
    source: 'submit',
  }
  writeSnapshotMap(records)
}

export function readRenderTaskSnapshot(taskId: number | string | null | undefined) {
  const normalizedTaskId = normalizeTaskId(taskId)
  if (!normalizedTaskId) {
    return null
  }
  return readSnapshotMap()[String(normalizedTaskId)] || null
}

export function savePendingRenderTaskImport(record: RenderTaskImportRecord) {
  const normalizedTaskId = normalizeTaskId(record.taskId)
  if (!canUseStorage() || !normalizedTaskId || !record.taskType || record.input == null) {
    return
  }
  window.localStorage.setItem(
    PENDING_IMPORT_KEY,
    JSON.stringify({
      ...record,
      taskId: normalizedTaskId,
      savedAt: record.savedAt || Date.now(),
    }),
  )
}

export function consumePendingRenderTaskImport(taskId?: number | string | null) {
  if (!canUseStorage()) {
    return null
  }
  try {
    const raw = window.localStorage.getItem(PENDING_IMPORT_KEY)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw) as RenderTaskImportRecord
    const normalizedTaskId = normalizeTaskId(parsed?.taskId)
    const expectedTaskId = normalizeTaskId(taskId)
    if (!normalizedTaskId || (expectedTaskId && expectedTaskId !== normalizedTaskId)) {
      return null
    }
    window.localStorage.removeItem(PENDING_IMPORT_KEY)
    return {
      ...parsed,
      taskId: normalizedTaskId,
    }
  } catch {
    window.localStorage.removeItem(PENDING_IMPORT_KEY)
    return null
  }
}
