/** GET /api/v1/credits/me */
export interface UserCreditMeResponse {
  userId: number
  balance: number
  frozenBalance: number
  totalRecharged: number
  totalConsumed: number
}

/** GET /api/v1/credits/task-quote */
export interface TaskCreditQuoteResponse {
  taskType: string
  creditCost: number
  modelCode: string | null
}

/** GET /api/v1/billing/estimate 步骤明细 */
export interface BillingEstimateStep {
  stepName: string | null
  functionModule: string | null
  creditCost: number
  enabled: boolean
  usageUnit: string | null
  modelCode: string | null
  provider: string | null
  costText: string | null
}

/** GET /api/v1/billing/estimate */
export interface BillingEstimateResponse {
  taskType: string
  estimatedCreditCost: number
  usageUnit: string | null
  modelCode: string | null
  provider: string | null
  /** BILLING_STEP_CONFIG / TASK_CREDIT_PROPERTIES / OVERRIDE */
  pricingSource: string
  /** 当前用户余额；未登录时为 null */
  balance: number | null
  /** 余额是否够本次预扣；未登录时为 null */
  enoughBalance: boolean | null
  steps: BillingEstimateStep[]
}

/** GET /api/v1/billing/estimate 的可选请求参数 */
export interface BillingEstimateRequest {
  taskType: string
  modelCode?: string
  usageUnit?: string
  inputTextLength?: number
  imageCount?: number
  segmentCount?: number
  durationSeconds?: number
  providerCredits?: number
}
