export const CAR_SALES_LANGUAGE_OPTIONS = [
  { value: 'zh-CN', label: '中文讲述', writerTarget: '中文', spokenName: '中文普通话' },
  { value: 'en-US', label: '英语讲述', writerTarget: '英文', spokenName: '英语' },
  { value: 'fr-FR', label: '法语讲述', writerTarget: '法语', spokenName: '法语' },
  { value: 'es-ES', label: '西班牙语讲述', writerTarget: '西班牙语', spokenName: '西班牙语' },
  { value: 'ar-SA', label: '阿拉伯语讲述', writerTarget: '阿拉伯语', spokenName: '阿拉伯语' },
  { value: 'fa-IR', label: '波斯语讲述', writerTarget: '波斯语', spokenName: '波斯语' },
] as const

export type CarSalesLanguageCode = typeof CAR_SALES_LANGUAGE_OPTIONS[number]['value']

export const CAR_SALES_LANGUAGE_CODES = CAR_SALES_LANGUAGE_OPTIONS.map((item) => item.value) as CarSalesLanguageCode[]

export function normalizeCarSalesLanguage(value: unknown, fallback: CarSalesLanguageCode = 'zh-CN'): CarSalesLanguageCode {
  return CAR_SALES_LANGUAGE_CODES.includes(value as CarSalesLanguageCode)
    ? value as CarSalesLanguageCode
    : fallback
}

export function carSalesLanguageLabel(value: unknown) {
  const language = normalizeCarSalesLanguage(value)
  return CAR_SALES_LANGUAGE_OPTIONS.find((item) => item.value === language)?.label || '中文讲述'
}

export function carSalesWriterTargetLanguage(value: unknown) {
  const language = normalizeCarSalesLanguage(value)
  return CAR_SALES_LANGUAGE_OPTIONS.find((item) => item.value === language)?.writerTarget || '中文'
}

export function carSalesLanguageFromWriterTarget(value: unknown, fallback: CarSalesLanguageCode = 'zh-CN'): CarSalesLanguageCode {
  const target = String(value || '').trim()
  return CAR_SALES_LANGUAGE_OPTIONS.find((item) => item.writerTarget === target)?.value || fallback
}

export function carSalesSpokenLanguageName(value: unknown) {
  const language = normalizeCarSalesLanguage(value)
  return CAR_SALES_LANGUAGE_OPTIONS.find((item) => item.value === language)?.spokenName || '中文普通话'
}

export function carSalesNarrationRewriteStyle(value: unknown) {
  return `自然${carSalesSpokenLanguageName(value)}口播翻译`
}

export function carSalesNarrationRewriteInstruction(value: unknown) {
  const target = carSalesSpokenLanguageName(value)
  const output = carSalesWriterTargetLanguage(value)
  return `将原文改写式翻译成自然、简洁、可直接讲述的${target}汽车销售口播。保留品牌、车型、价格、数字和单位，不添加不存在的卖点，不要生硬直译，只输出${output}文案。`
}
