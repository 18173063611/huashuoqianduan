import type { TaskItem } from '../../types/taskTypes'

export function formatCreditDelta(n: number) {
  if (n > 0) return `+${n}`
  return String(n)
}

export function taskCreditSummary(t: TaskItem): string {
  const est = t.estimatedCreditCost ?? t.creditCost ?? 0
  const act = t.actualCreditCost
  const st = (t.settlementStatus || '').trim()
  const lines: string[] = [`预扣 ${est}`]
  if (act != null && act > 0) {
    lines.push(`实际 ${act}`)
  }
  if (st === 'PARTIAL_REFUNDED') {
    const refund = est - (act ?? 0)
    if (refund > 0) lines.push(`退差 ${refund}`)
  }
  if (st === 'SETTLED' && act != null && act > est) {
    lines.push(`补扣 ${act - est}`)
  }
  if (st === 'REFUNDED') {
    lines.push('已全额退款')
  }
  if (st === 'PARTIAL_SETTLED') {
    lines.push('部分结算·欠费')
  }
  if (st === 'PRECHARGED') {
    lines.push('待结算')
  }
  return lines.join('\n')
}

export function settlementLabel(code: string) {
  const m: Record<string, string> = {
    NONE: '无预扣',
    PRECHARGED: '已预扣',
    SETTLED: '已结算',
    REFUNDED: '已退款',
    PARTIAL_REFUNDED: '部分退款',
    PARTIAL_SETTLED: '部分结算',
    SETTLE_FAILED: '结算异常',
  }
  return m[code] || code
}

export function settlementTagType(code: string) {
  if (code === 'PARTIAL_SETTLED') return 'warning'
  if (code === 'SETTLE_FAILED') return 'danger'
  if (code === 'REFUNDED' || code === 'PARTIAL_REFUNDED') return 'success'
  if (code === 'SETTLED') return 'success'
  if (code === 'PRECHARGED') return 'info'
  return 'info'
}

export function taskStatusTagType(s: string) {
  if (s === 'SUCCESS') return 'success'
  if (s === 'FAILED') return 'danger'
  if (s === 'RUNNING' || s === 'QUEUED') return 'primary'
  return 'info'
}
