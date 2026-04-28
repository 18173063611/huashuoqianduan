export interface FwxApiResponse<T> {
  code: number
  message: string
  data: T
  traceId: string
}

export interface FwxPageResult<T> {
  records: T[]
  pageNo: number
  pageSize: number
  total: number
}
