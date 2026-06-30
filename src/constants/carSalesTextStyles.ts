export const CAR_TEXT_FONT_OPTIONS = [
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimHei', label: '黑体' },
  { value: 'SimSun', label: '宋体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Source Han Sans SC', label: '思源黑体' },
  { value: 'Noto Sans CJK SC', label: 'Noto Sans' },
]

export const CAR_TEXT_FONT_SAMPLE = '字幕示例 ABC 123 中文测试'

export const CAR_TEXT_STROKE_MODE_OPTIONS = [
  { value: 'none', label: '关闭描边', hint: '纯文字，不绘制外描边' },
  { value: 'thin', label: '轻描边', hint: '1px 黑色描边，适合浅色画面' },
  { value: 'strong', label: '强描边', hint: '2-3px 黑色描边，适合复杂背景' },
] as const

export const CAR_TEXT_COLOR_PRESETS = [
  { label: '白色', value: '#ffffff' },
  { label: '黑色', value: '#111827' },
  { label: '品牌蓝', value: '#2563eb' },
  { label: '醒目红', value: '#ef4444' },
  { label: '金色', value: '#f59e0b' },
  { label: '深灰', value: '#374151' },
]
