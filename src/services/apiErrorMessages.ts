/**
 * 将后端业务码转为前端友好提示（与后端 message 并存时优先可读性；未知码保留原 message）。
 * 与《待完成的项目》5 对齐时可按码表扩展。
 */

const CODE_HINTS: Record<number, string> = {
  40100: '请先登录或重新登录。若账号被禁用，也会出现此提示。',
  40300: '没有权限执行此操作，或账号已被禁用/锁定。',
  40400: '请求的资源不存在或已删除。',
  40900: '当前操作无法完成（如状态冲突或业务规则限制）。',
  50100: '第三方 AI 服务调用失败，请稍后重试或检查密钥配置。',
  50202: '解析结果异常，请检查输入链接或稍后重试。',
}

export function formatApiBusinessError(code: number, message: string): string {
  const trimmed = (message || '').trim()
  if (code === 40900) {
    if (trimmed.includes('积分余额不足')) {
      return '积分余额不足，无法完成本次操作。请到资产中心查看余额或联系管理员。'
    }
    if (trimmed.includes('积分账户正在更新')) {
      return '积分处理中，请稍后重试。'
    }
  }
  if (code === 40300 && trimmed.includes('禁用')) {
    return '账号已被禁用或锁定，请联系管理员。'
  }
  const byCode = CODE_HINTS[code]
  if (byCode) {
    return trimmed ? `${byCode}（详情：${trimmed}）` : byCode
  }
  return trimmed || '请求失败'
}
