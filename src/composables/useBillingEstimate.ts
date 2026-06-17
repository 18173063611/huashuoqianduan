import { computed, ref, watch, type Ref, type WatchSource } from 'vue'
import { getBillingEstimate } from '../services/creditApi'
import { getAuthToken } from '../services/request'
import type { BillingEstimateRequest, BillingEstimateResponse } from '../types/creditTypes'

export interface UseBillingEstimateOptions {
  /**
   * 必填：任务类型代码，对应后端 TaskTypeCode。
   * 既可以是常量字符串，也可以是 getter 函数（用于多 Tab 页面随选项变化重新预估）。
   */
  taskType: string | (() => string)
  /** 当本响应字段变化时自动重取（如表单参数变化）。 */
  watchKeys?: () => unknown
  /** 构造请求参数；返回 null 表示当前不发起请求。 */
  buildRequest?: () => Partial<BillingEstimateRequest> | null
  /** 是否在挂载后立即触发（默认 true）。 */
  immediate?: boolean
}

/**
 * 统一的"预计消耗"组合式：保证前端展示金额 == 后端实际预扣金额。
 *
 * <p>所有业务页面（八个 AI 功能）必须用本 composable 拿 estimated / balance / enoughBalance，
 * 不允许在页面里再写死任何金额；满足"页面显示金额必须与任务中心一致"。</p>
 */
export function useBillingEstimate(opts: UseBillingEstimateOptions) {
  const data = ref<BillingEstimateResponse | null>(null)
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)

  // 派生展示字段，便于模板直接绑定。
  const estimatedCreditCost = computed(() => data.value?.estimatedCreditCost ?? 0)
  const balance = computed<number | null>(() => data.value?.balance ?? null)
  const enoughBalance = computed<boolean>(() => {
    const v = data.value?.enoughBalance
    // 未登录或没拿到 balance 时不算"余额不足"——避免出现 token 失效后所有按钮被错误禁用。
    if (v == null) return true
    return v
  })
  const pricingSource = computed(() => data.value?.pricingSource ?? '')
  const steps = computed(() => data.value?.steps ?? [])

  function resolveTaskType(): string {
    return typeof opts.taskType === 'function' ? opts.taskType() : opts.taskType
  }

  async function refresh() {
    if (!getAuthToken()) {
      data.value = null
      errorMessage.value = null
      loading.value = false
      return
    }
    const partial = opts.buildRequest ? opts.buildRequest() : null
    if (partial == null && opts.buildRequest) {
      return
    }
    const taskType = resolveTaskType()
    if (!taskType) {
      return
    }
    const req: BillingEstimateRequest = {
      taskType,
      ...(partial ?? {}),
    }
    loading.value = true
    errorMessage.value = null
    try {
      data.value = await getBillingEstimate(req)
    } catch (e: unknown) {
      errorMessage.value = e instanceof Error ? e.message : String(e)
      // 失败时不抹掉旧值，避免 UI 抖动；只让 enoughBalance 默认放行（见 computed）。
    } finally {
      loading.value = false
    }
  }

  if (typeof opts.taskType === 'function') {
    watch(opts.taskType as WatchSource, () => { void refresh() })
  }
  if (opts.watchKeys) {
    watch(opts.watchKeys as WatchSource, () => { void refresh() }, { deep: true })
  }
  if (opts.immediate !== false) {
    void refresh()
  }

  /**
   * 页面提交按钮的禁用条件：
   *   - 当前余额已知且不足 → 禁用并提示充值
   *   - estimatedCreditCost <= 0 → 不禁用（免费/未配置场景）
   */
  function buttonDisabledReason(): string | null {
    if (!getAuthToken()) return null // 未登录另有登录拦截，不在此报错
    if (estimatedCreditCost.value <= 0) return null
    if (balance.value == null) return null
    if (balance.value < estimatedCreditCost.value) {
      return '当前积分不足，请充值或降低生成配置'
    }
    return null
  }

  const insufficientHint: Ref<string | null> = ref(null)
  watch([estimatedCreditCost, balance], () => {
    insufficientHint.value = buttonDisabledReason()
  }, { immediate: true })

  return {
    data,
    loading,
    errorMessage,
    estimatedCreditCost,
    balance,
    enoughBalance,
    pricingSource,
    steps,
    insufficientHint,
    refresh,
  }
}
