export interface CarSalesVoiceStyleOption {
  value: string
  label: string
  hint: string
  gender: 'female' | 'male'
}

export interface CarSalesSpeechStyleOption {
  value: string
  label: string
  hint: string
}

export const DEFAULT_CAR_NATIVE_VOICE_STYLE = 'female_natural_explain'
export const DEFAULT_CAR_NATIVE_SPEECH_STYLE = 'natural'

export const CAR_NATIVE_VOICE_STYLE_OPTIONS: CarSalesVoiceStyleOption[] = [
  { value: 'female_natural_explain', label: '女声自然讲解', hint: '女性销售顾问声线，普通话清晰亲和', gender: 'female' },
  { value: 'female_clear', label: '清亮女销售', hint: '青年女性声线，干净亲和不尖锐', gender: 'female' },
  { value: 'female_steady', label: '沉稳女顾问', hint: '成年女性中低音，稳重可信', gender: 'female' },
  { value: 'female_live', label: '女声直播带看', hint: '女性门店主播，轻快有互动感', gender: 'female' },
  { value: 'female_energetic_promo', label: '女声促销强节奏', hint: '女性促销口吻，突出权益和转化', gender: 'female' },
  { value: 'female_review', label: '专业女评测', hint: '女性媒体评测感，理性清晰', gender: 'female' },
  { value: 'female_luxury_calm', label: '女声高级质感', hint: '成熟女性声线，沉稳有高端车广告质感', gender: 'female' },
  { value: 'female_young_tech', label: '女声年轻科技感', hint: '年轻女性声线，清爽利落讲智能配置', gender: 'female' },
  { value: 'female_family_warm', label: '女声家庭温和', hint: '女性生活化口吻，适合家用场景', gender: 'female' },
  { value: 'female_soft_story', label: '女声温柔叙事', hint: '女性柔和叙事，适合生活方式广告', gender: 'female' },
  { value: 'female_local_friendly', label: '女声本地亲和', hint: '女性本地亲和口吻，真实接地气', gender: 'female' },
  { value: 'male_natural_explain', label: '男声自然讲解', hint: '男性销售顾问声线，普通话清晰稳健', gender: 'male' },
  { value: 'male_clear', label: '清朗男销售', hint: '青年男性声线，清爽亲和不油腻', gender: 'male' },
  { value: 'male_steady', label: '沉稳男顾问', hint: '成年男性低中音，稳重可信', gender: 'male' },
  { value: 'male_live', label: '男声直播带看', hint: '男性门店主播，直接有互动感', gender: 'male' },
  { value: 'male_energetic_promo', label: '男声促销强节奏', hint: '男性促销口吻，突出权益和转化', gender: 'male' },
  { value: 'male_review', label: '专业男评测', hint: '男性媒体评测感，卖点表达清楚', gender: 'male' },
  { value: 'male_luxury_calm', label: '男声高级质感', hint: '成熟男性声线，沉稳有高端车广告质感', gender: 'male' },
  { value: 'male_young_tech', label: '男声年轻科技感', hint: '年轻男性声线，清爽利落讲智能配置', gender: 'male' },
  { value: 'male_family_warm', label: '男声家庭温和', hint: '男性生活化口吻，适合家用场景', gender: 'male' },
  { value: 'male_soft_story', label: '男声温柔叙事', hint: '男性柔和叙事，适合生活方式广告', gender: 'male' },
  { value: 'male_local_friendly', label: '男声本地亲和', hint: '男性本地亲和口吻，真实接地气', gender: 'male' },
]

export const CAR_NATIVE_SPEECH_STYLE_OPTIONS: CarSalesSpeechStyleOption[] = [
  { value: 'natural', label: '自然语速', hint: '按正常口播节奏生成' },
  { value: 'concise', label: '短促利落', hint: '少废话、信息密度更高' },
  { value: 'emotional', label: '情绪递进', hint: '先吸引，再卖点，最后引导咨询' },
  { value: 'slow_detail', label: '细节讲解', hint: '更慢一些，适合配置说明' },
  { value: 'fast_hook', label: '开场抓人', hint: '前 2 秒更有吸引力，后面回到清晰表达' },
  { value: 'review_steady', label: '评测节奏', hint: '稳扎稳打，适合对比和配置说明' },
  { value: 'soft_story', label: '故事节奏', hint: '停顿更自然，适合生活化叙事' },
]

const LEGACY_CAR_NATIVE_VOICE_STYLE_ALIASES: Record<string, string> = {
  natural_sales: DEFAULT_CAR_NATIVE_VOICE_STYLE,
  natural_explain: DEFAULT_CAR_NATIVE_VOICE_STYLE,
  warm_female: 'female_family_warm',
  steady_male: 'male_steady',
  energetic: 'female_energetic_promo',
  live_seller: 'male_live',
  energetic_promo: 'female_energetic_promo',
  luxury_calm: 'male_luxury_calm',
  young_tech: 'male_young_tech',
  family_warm: 'female_family_warm',
  soft_story: 'female_soft_story',
  local_friendly: 'female_local_friendly',
}

const LEGACY_CAR_NATIVE_SPEECH_STYLE_ALIASES: Record<string, string> = {
  balanced: DEFAULT_CAR_NATIVE_SPEECH_STYLE,
  fast: 'fast_hook',
  calm: 'slow_detail',
}

export function normalizeCarNativeVoiceStyle(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return DEFAULT_CAR_NATIVE_VOICE_STYLE
  if (CAR_NATIVE_VOICE_STYLE_OPTIONS.some((item) => item.value === raw)) return raw
  return LEGACY_CAR_NATIVE_VOICE_STYLE_ALIASES[raw] || DEFAULT_CAR_NATIVE_VOICE_STYLE
}

export function normalizeCarNativeSpeechStyle(value?: string | null) {
  const raw = (value || '').trim()
  if (!raw) return DEFAULT_CAR_NATIVE_SPEECH_STYLE
  if (CAR_NATIVE_SPEECH_STYLE_OPTIONS.some((item) => item.value === raw)) return raw
  return LEGACY_CAR_NATIVE_SPEECH_STYLE_ALIASES[raw] || DEFAULT_CAR_NATIVE_SPEECH_STYLE
}

export function carNativeVoiceStyleLabel(value?: string | null) {
  const normalized = normalizeCarNativeVoiceStyle(value)
  return CAR_NATIVE_VOICE_STYLE_OPTIONS.find((item) => item.value === normalized)?.label || '女声自然讲解'
}
