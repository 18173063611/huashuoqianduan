export type SystemFavoriteKind = 'asset' | 'template' | 'avatar' | 'voice'

import {
  DEFAULT_CAR_NATIVE_SPEECH_STYLE,
  DEFAULT_CAR_NATIVE_VOICE_STYLE,
  normalizeCarNativeSpeechStyle,
  normalizeCarNativeVoiceStyle,
} from '../constants/carSalesVoiceStyles'

export interface SystemFavoriteItem {
  kind: SystemFavoriteKind
  id: string
  title: string
  subtitle?: string
  previewUrl?: string | null
  route?: string
  meta?: Record<string, unknown>
  addedAt: string
}

export interface SystemRecentToolItem {
  routeName: string
  path: string
  title: string
  subtitle?: string
  visitedAt: string
}

export type CarSalesPreferenceAspectRatio = '9:16' | '16:9' | 'auto'
export type CarSalesPreferenceDuration = number
export type CarSalesPreferenceLanguage = 'zh-CN' | 'en-US'
export type CarSalesPreferenceSubtitleMode = 'auto' | 'off' | 'upload'
export type CarSalesPreferenceAudioPolicy =
  | 'auto'
  | 'none'
  | 'voiceover'
  | 'bgm'
  | 'EXTERNAL_AUDIO'
  | 'VIDEO_NATIVE_AUDIO'
  | 'external_audio'
  | 'video_native_audio'
export type CarSalesPreferenceVideoStyle = 'realistic' | 'premium' | 'energetic' | 'family' | 'tech'

export interface CarSalesGenerationPreferences {
  aspectRatio: CarSalesPreferenceAspectRatio
  duration: CarSalesPreferenceDuration
  voiceLanguage: CarSalesPreferenceLanguage
  subtitleMode: CarSalesPreferenceSubtitleMode
  burnInSubtitle: boolean
  audioPolicy: CarSalesPreferenceAudioPolicy
  videoStyle: CarSalesPreferenceVideoStyle
  nativeVoiceStyle: string
  nativeSpeechStyle: string
  model: string
  preferredSellingPointIds: string[]
  preferredAvatarId: number | null
  preferredVoiceId: number | null
}

const FAVORITES_KEY = 'huashuo_system_favorites'
const RECENT_TOOLS_KEY = 'huashuo_system_recent_tools'
const CAR_SALES_PREFERENCES_KEY = 'huashuo_car_sales_preferences'
const MAX_RECENT_TOOLS = 12
const DEFAULT_CAR_SALES_MODEL = 'doubao-seedance-2-0-pro-250528'

export const defaultCarSalesPreferences: CarSalesGenerationPreferences = {
  aspectRatio: '9:16',
  duration: 15,
  voiceLanguage: 'zh-CN',
  subtitleMode: 'auto',
  burnInSubtitle: true,
  audioPolicy: 'auto',
  videoStyle: 'realistic',
  nativeVoiceStyle: DEFAULT_CAR_NATIVE_VOICE_STYLE,
  nativeSpeechStyle: DEFAULT_CAR_NATIVE_SPEECH_STYLE,
  model: DEFAULT_CAR_SALES_MODEL,
  preferredSellingPointIds: [],
  preferredAvatarId: null,
  preferredVoiceId: null,
}

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readJson<T>(key: string, fallback: T): T {
  if (!storageAvailable()) {
    return fallback
  }
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (!storageAvailable()) {
    return
  }
  window.localStorage.setItem(key, JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function normalizeFavorite(item: SystemFavoriteItem): SystemFavoriteItem {
  return {
    ...item,
    id: String(item.id),
    addedAt: item.addedAt || nowIso(),
  }
}

export function loadSystemFavorites(): SystemFavoriteItem[] {
  const items = readJson<SystemFavoriteItem[]>(FAVORITES_KEY, [])
  return Array.isArray(items) ? items.map(normalizeFavorite).filter((item) => item.kind && item.id) : []
}

export function saveSystemFavorites(items: SystemFavoriteItem[]) {
  writeJson(FAVORITES_KEY, items.map(normalizeFavorite))
}

export function isSystemFavorite(kind: SystemFavoriteKind, id: string | number) {
  const targetId = String(id)
  return loadSystemFavorites().some((item) => item.kind === kind && item.id === targetId)
}

export function toggleSystemFavorite(item: Omit<SystemFavoriteItem, 'addedAt'> & { addedAt?: string }) {
  const normalized = normalizeFavorite({ ...item, addedAt: item.addedAt || nowIso() })
  const existing = loadSystemFavorites()
  const exists = existing.some((entry) => entry.kind === normalized.kind && entry.id === normalized.id)
  const next = exists
    ? existing.filter((entry) => !(entry.kind === normalized.kind && entry.id === normalized.id))
    : [normalized, ...existing]
  saveSystemFavorites(next)
  return !exists
}

export function clearSystemFavorites(kind?: SystemFavoriteKind) {
  if (!kind) {
    saveSystemFavorites([])
    return
  }
  saveSystemFavorites(loadSystemFavorites().filter((item) => item.kind !== kind))
}

export function loadRecentTools(): SystemRecentToolItem[] {
  const items = readJson<SystemRecentToolItem[]>(RECENT_TOOLS_KEY, [])
  return Array.isArray(items)
    ? items.filter((item) => item.routeName && item.path && item.title).slice(0, MAX_RECENT_TOOLS)
    : []
}

export function recordRecentTool(item: Omit<SystemRecentToolItem, 'visitedAt'> & { visitedAt?: string }) {
  if (!item.routeName || !item.path || !item.title) {
    return
  }
  const normalized: SystemRecentToolItem = {
    ...item,
    visitedAt: item.visitedAt || nowIso(),
  }
  const next = [
    normalized,
    ...loadRecentTools().filter((entry) => entry.routeName !== normalized.routeName),
  ].slice(0, MAX_RECENT_TOOLS)
  writeJson(RECENT_TOOLS_KEY, next)
}

export function clearRecentTools() {
  writeJson(RECENT_TOOLS_KEY, [])
}

function literalIn<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? value as T : fallback
}

function durationValue(value: unknown): CarSalesPreferenceDuration {
  const num = Number(value)
  if (!Number.isFinite(num)) {
    return defaultCarSalesPreferences.duration
  }
  return Math.max(8, Math.min(120, Math.round(num)))
}

function numberOrNull(value: unknown) {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? Math.round(num) : null
}

export function loadCarSalesPreferences(): CarSalesGenerationPreferences {
  const raw = readJson<Partial<CarSalesGenerationPreferences>>(CAR_SALES_PREFERENCES_KEY, {})
  const preferredSellingPointIds = Array.isArray(raw.preferredSellingPointIds)
    ? raw.preferredSellingPointIds.map((item) => String(item)).filter(Boolean).slice(0, 6)
    : []
  return {
    ...defaultCarSalesPreferences,
    aspectRatio: literalIn(raw.aspectRatio, ['9:16', '16:9', 'auto'] as const, defaultCarSalesPreferences.aspectRatio),
    duration: durationValue(raw.duration),
    voiceLanguage: literalIn(raw.voiceLanguage, ['zh-CN', 'en-US'] as const, defaultCarSalesPreferences.voiceLanguage),
    subtitleMode: literalIn(raw.subtitleMode, ['auto', 'off', 'upload'] as const, defaultCarSalesPreferences.subtitleMode),
    burnInSubtitle: typeof raw.burnInSubtitle === 'boolean' ? raw.burnInSubtitle : defaultCarSalesPreferences.burnInSubtitle,
    audioPolicy: literalIn(raw.audioPolicy, ['auto', 'none', 'voiceover', 'bgm', 'EXTERNAL_AUDIO', 'VIDEO_NATIVE_AUDIO', 'external_audio', 'video_native_audio'] as const, defaultCarSalesPreferences.audioPolicy),
    videoStyle: literalIn(raw.videoStyle, ['realistic', 'premium', 'energetic', 'family', 'tech'] as const, defaultCarSalesPreferences.videoStyle),
    nativeVoiceStyle: normalizeCarNativeVoiceStyle(raw.nativeVoiceStyle),
    nativeSpeechStyle: normalizeCarNativeSpeechStyle(raw.nativeSpeechStyle),
    model: typeof raw.model === 'string' && raw.model && raw.model !== 'auto'
      ? raw.model
      : defaultCarSalesPreferences.model,
    preferredSellingPointIds,
    preferredAvatarId: numberOrNull(raw.preferredAvatarId),
    preferredVoiceId: numberOrNull(raw.preferredVoiceId),
  }
}

export function saveCarSalesPreferences(preferences: CarSalesGenerationPreferences) {
  writeJson(CAR_SALES_PREFERENCES_KEY, loadablePreferences(preferences))
}

export function resetCarSalesPreferences() {
  saveCarSalesPreferences(defaultCarSalesPreferences)
  return loadCarSalesPreferences()
}

function loadablePreferences(preferences: CarSalesGenerationPreferences): CarSalesGenerationPreferences {
  return {
    ...loadCarSalesPreferences(),
    ...preferences,
    nativeVoiceStyle: normalizeCarNativeVoiceStyle(preferences.nativeVoiceStyle),
    nativeSpeechStyle: normalizeCarNativeSpeechStyle(preferences.nativeSpeechStyle),
    preferredSellingPointIds: preferences.preferredSellingPointIds.slice(0, 6),
    preferredAvatarId: numberOrNull(preferences.preferredAvatarId),
    preferredVoiceId: numberOrNull(preferences.preferredVoiceId),
  }
}
