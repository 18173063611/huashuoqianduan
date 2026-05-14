/**
 * 用户端时间展示：避免直接渲染 LocalDateTime.toString() 长串。
 */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function parseBackendDate(iso: string | null | undefined): Date | null {
  if (iso == null) return null
  const s = String(iso).trim()
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** 固定格式：2026-05-14 09:49 */
export function formatAbsoluteDateTime(iso: string | null | undefined): string {
  const d = parseBackendDate(iso)
  if (!d) return '—'
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/**
 * 友好展示：较近用相对（几分钟前 / 几小时前 / 昨天 HH:mm），否则绝对日期时间。
 */
export function formatFriendlyDateTime(iso: string | null | undefined, now = new Date()): string {
  const d = parseBackendDate(iso)
  if (!d) return '—'
  const diffMs = now.getTime() - d.getTime()
  if (diffMs < 0) return formatAbsoluteDateTime(iso)

  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return '刚刚'

  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}分钟前`

  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}小时前`

  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate())
  const today0 = startOf(now)
  const y0 = new Date(today0)
  y0.setDate(y0.getDate() - 1)
  const d0 = startOf(d)
  if (d0.getTime() === y0.getTime()) {
    return `昨天 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }

  if (d.getFullYear() === now.getFullYear()) {
    return `${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  }

  return formatAbsoluteDateTime(iso)
}
