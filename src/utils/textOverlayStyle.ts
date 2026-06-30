import type { CSSProperties } from 'vue'

export type TextStrokeMode = 'none' | 'thin' | 'strong'
export type FontLoadState = 'loading' | 'ready' | 'fallback'

type OverlayPreviewInput = {
  fontFamily?: string
  fontSize?: number
  textColor?: string
  outlineColor?: string
  strokeMode?: TextStrokeMode | string
}

export function normalizeTextStrokeMode(value: unknown, fallback: TextStrokeMode = 'thin'): TextStrokeMode {
  return value === 'none' || value === 'thin' || value === 'strong' ? value : fallback
}

export function textStrokeWidth(mode: unknown, kind: 'subtitle' | 'headline' = 'subtitle') {
  const normalized = normalizeTextStrokeMode(mode, kind === 'headline' ? 'strong' : 'thin')
  if (normalized === 'none') return 0
  if (normalized === 'thin') return 1
  return kind === 'headline' ? 2 : 2
}

export function normalizeHexColor(value: string | undefined, fallback: string) {
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

export function overlayPreviewStyle(
  overlay: OverlayPreviewInput,
  kind: 'subtitle' | 'headline',
  options: {
    subtitleFallbackSize?: number
    headlineFallbackSize?: number
    subtitleScale?: number
    headlineScale?: number
    subtitleMin?: number
    subtitleMax?: number
    headlineMin?: number
    headlineMax?: number
    defaultTextColor?: string
    defaultOutlineColor?: string
  } = {},
): CSSProperties {
  const baseSize = Number(overlay.fontSize) || (kind === 'headline'
    ? options.headlineFallbackSize || 64
    : options.subtitleFallbackSize || 36)
  const previewSize = kind === 'headline'
    ? Math.max(options.headlineMin || 22, Math.min(options.headlineMax || 44, Math.round(baseSize * (options.headlineScale || 0.52))))
    : Math.max(options.subtitleMin || 16, Math.min(options.subtitleMax || 30, Math.round(baseSize * (options.subtitleScale || 0.58))))
  const outlineWidth = textStrokeWidth(overlay.strokeMode, kind)
  const outlineColor = normalizeHexColor(overlay.outlineColor, options.defaultOutlineColor || '#111827')
  const style: CSSProperties = {
    color: normalizeHexColor(overlay.textColor, options.defaultTextColor || '#ffffff'),
    fontFamily: overlay.fontFamily,
    fontSize: `${previewSize}px`,
    WebkitTextStroke: outlineWidth > 0 ? `${outlineWidth}px ${outlineColor}` : '0 transparent',
    textShadow: 'none',
  }
  if (outlineWidth > 0) {
    style.textShadow = `0 ${outlineWidth}px 0 ${outlineColor}, 0 -${outlineWidth}px 0 ${outlineColor}, ${outlineWidth}px 0 0 ${outlineColor}, -${outlineWidth}px 0 0 ${outlineColor}`
  }
  return style
}

export function fontPreviewStyle(fontFamily: string | undefined): CSSProperties {
  return {
    fontFamily: fontFamily || 'Microsoft YaHei',
  }
}

export function fontLoadStateLabel(state: FontLoadState) {
  if (state === 'ready') return '字体已加载'
  if (state === 'loading') return '字体加载中'
  return '使用系统回退'
}

export async function loadTextOverlayFont(fontFamily: string | undefined, sampleText: string): Promise<FontLoadState> {
  if (typeof document === 'undefined' || !fontFamily) {
    return 'fallback'
  }
  const fontSet = document.fonts
  if (!fontSet || typeof fontSet.load !== 'function' || typeof fontSet.check !== 'function') {
    return 'fallback'
  }
  const escaped = fontFamily.replace(/"/g, '\\"')
  const declaration = `600 24px "${escaped}"`
  try {
    await fontSet.load(declaration, sampleText)
    return fontSet.check(declaration, sampleText) ? 'ready' : 'fallback'
  } catch {
    return 'fallback'
  }
}
