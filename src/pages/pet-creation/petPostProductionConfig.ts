import type { CSSProperties } from 'vue'
import type { PetSubtitleStyle, PetTextStrokeMode } from './petCreationTypes'

export const PET_TEXT_FONT_OPTIONS = [
  { value: 'Microsoft YaHei', label: '微软雅黑' },
  { value: 'SimHei', label: '黑体' },
  { value: 'SimSun', label: '宋体' },
  { value: 'KaiTi', label: '楷体' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Source Han Sans SC', label: '思源黑体' },
  { value: 'Noto Sans CJK SC', label: 'Noto Sans' },
]

export const PET_TEXT_STROKE_MODE_OPTIONS: Array<{ value: PetTextStrokeMode; label: string; hint: string }> = [
  { value: 'none', label: '关闭描边', hint: '适合纯净浅背景' },
  { value: 'thin', label: '轻描边', hint: '适合大多数宠物视频' },
  { value: 'strong', label: '强描边', hint: '适合复杂背景和户外画面' },
]

export const PET_TEXT_COLOR_PRESETS = [
  { label: '白色', value: '#ffffff' },
  { label: '黑色', value: '#111827' },
  { label: '品牌蓝', value: '#2563eb' },
  { label: '可爱粉', value: '#ec4899' },
  { label: '治愈绿', value: '#16a34a' },
  { label: '暖黄色', value: '#f59e0b' },
]

export const DEFAULT_PET_SUBTITLE_STYLE: Required<Omit<PetSubtitleStyle, 'position' | 'highlighted'>> = {
  fontFamily: 'Microsoft YaHei',
  fontSize: 34,
  textColor: '#ffffff',
  outlineColor: '#111827',
  strokeMode: 'thin',
}

export function normalizePetTextStrokeMode(value: unknown, fallback: PetTextStrokeMode = 'thin'): PetTextStrokeMode {
  return value === 'none' || value === 'thin' || value === 'strong' ? value : fallback
}

export function normalizePetHexColor(value: string | undefined, fallback: string) {
  const clean = (value || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean
  if (/^[0-9a-fA-F]{6}$/.test(clean)) return `#${clean}`
  if (/^#[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean[0]}${clean[0]}${clean[1]}${clean[1]}${clean[2]}${clean[2]}`
  }
  return fallback
}

export function petSubtitlePreviewStyle(style: PetSubtitleStyle): CSSProperties {
  const baseSize = Number(style.fontSize) || DEFAULT_PET_SUBTITLE_STYLE.fontSize
  const previewSize = Math.max(16, Math.min(30, Math.round(baseSize * 0.58)))
  const strokeMode = normalizePetTextStrokeMode(style.strokeMode)
  const strokeWidth = strokeMode === 'none' ? 0 : strokeMode === 'thin' ? 1 : 2
  const outlineColor = normalizePetHexColor(style.outlineColor, DEFAULT_PET_SUBTITLE_STYLE.outlineColor)
  const result: CSSProperties = {
    color: normalizePetHexColor(style.textColor, DEFAULT_PET_SUBTITLE_STYLE.textColor),
    fontFamily: style.fontFamily || DEFAULT_PET_SUBTITLE_STYLE.fontFamily,
    fontSize: `${previewSize}px`,
    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${outlineColor}` : '0 transparent',
    textShadow: 'none',
  }
  if (strokeWidth > 0) {
    result.textShadow = `0 ${strokeWidth}px 0 ${outlineColor}, 0 -${strokeWidth}px 0 ${outlineColor}, ${strokeWidth}px 0 0 ${outlineColor}, -${strokeWidth}px 0 0 ${outlineColor}`
  }
  return result
}
