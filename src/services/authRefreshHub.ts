/** 登录用户积分/资料变更后通知工作台刷新（如任务提交、TTS 等）。 */

type AuthRefreshListener = () => void

const listeners = new Set<AuthRefreshListener>()

export function subscribeAuthRefresh(listener: AuthRefreshListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyAuthRefresh(): void {
  for (const l of listeners) {
    try {
      l()
    } catch {
      // 单个监听失败不影响其它订阅方
    }
  }
}
