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
