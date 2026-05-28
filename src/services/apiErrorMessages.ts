const CODE_HINTS: Record<number, string> = {
  40100: '请先登录或重新登录。',
  40300: '没有权限执行此操作。',
  40400: '请求的资源不存在或已被删除。',
  40900: '当前操作无法完成。',
  42900: '当前账号进行中的任务已达到上限，请稍后再提交。',
  50100: '第三方 AI 服务调用失败，请稍后重试或检查配置。',
  50202: '解析结果异常，请检查输入链接或稍后重试。',
}

const MESSAGE_HINTS: Record<string, string> = {
  TOKEN_EXPIRED: '登录已过期，请重新登录。',
  TOKEN_INVALID: '登录状态无效，请重新登录。',
  TOKEN_REVOKED: '当前账号已在其他设备登录，请重新登录。',
  PERMISSION_DENIED: '没有权限执行此操作。',
  ACCOUNT_DISABLED: '账号已被禁用或锁定，请联系管理员。',
  TASK_ALREADY_RUNNING: '当前账号进行中的任务已达到上限，请稍后再提交。',
}

export function formatApiBusinessError(code: number, message: string): string {
  const trimmed = (message || '').trim()
  if (trimmed && MESSAGE_HINTS[trimmed]) {
    return MESSAGE_HINTS[trimmed]
  }
  if (code === 40900) {
    if (trimmed.includes('积分余额不足')) {
      return '积分余额不足，无法完成本次操作。请到账户或资产中心查看余额。'
    }
    if (trimmed.includes('积分账户正在更新')) {
      return '积分处理中，请稍后重试。'
    }
  }
  const byCode = CODE_HINTS[code]
  if (byCode) {
    return trimmed && !MESSAGE_HINTS[trimmed] ? `${byCode}（详情：${trimmed}）` : byCode
  }
  return trimmed || '请求失败'
}
