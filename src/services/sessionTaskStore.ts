const KEY = 'huashuo_session_task_ids'
const MAX = 60

function safeParse(raw: string | null): number[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw) as unknown
    if (!Array.isArray(v)) return []
    return v
      .map((x) => (typeof x === 'number' ? x : Number(x)))
      .filter((n) => Number.isFinite(n) && n > 0)
  } catch {
    return []
  }
}

export function getSessionTaskIds(): number[] {
  try {
    return safeParse(window.localStorage.getItem(KEY))
  } catch {
    return []
  }
}

export function rememberSessionTaskId(taskId: number) {
  if (!Number.isFinite(taskId) || taskId <= 0) return
  try {
    const ids = getSessionTaskIds()
    const next = [taskId, ...ids.filter((id) => id !== taskId)].slice(0, MAX)
    window.localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function clearSessionTasks() {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

