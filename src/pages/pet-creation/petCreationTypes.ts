export type PetType = 'cat' | 'dog' | 'other'
export type PetVideoType = 'dialogue' | 'short_drama' | 'monologue' | 'talking' | 'image_to_video' | 'sticker'
export type PetAspectRatio = '9:16' | '16:9' | '1:1'
export type PetCreationStyle = 'realistic' | 'cute' | 'anime' | 'anthropomorphic' | 'funny' | 'healing'
export type PetWorkStatus = 'draft' | 'running' | 'completed' | 'failed'
export type PetTaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'canceled'
export type PetGenerationMode = 'reference_video' | 'text_video' | 'dialogue_video' | 'image_to_video'
export type PetDialogueEmotion = '委屈' | '开心' | '吐槽' | '认真解释' | '撒娇' | '惊讶'
export type PetVoiceSpeed = 'slow' | 'normal' | 'fast'
export type PetSubtitlePosition = 'bottom' | 'middle' | 'top'
export type PetCameraRhythm = 'slow' | 'balanced' | 'fast' | 'short_drama'

export interface PetTemplate {
  id: string
  title: string
  description: string
  coverUrl?: string
  category: string
  videoType: PetVideoType
  durationSeconds: 5 | 10 | 15 | 30
  aspectRatio: PetAspectRatio
  style: PetCreationStyle
  tags: string[]
}

export interface PetRole {
  id: string
  name: string
  type: PetType
  breed?: string
  ageFeel?: string
  personalityTags: string[]
  speakingTone?: string
  roleTags: string[]
  anthropomorphic: boolean
  referenceAssetIds: string[]
}

export interface PetReferenceMaterial {
  id: string
  role: 'main_pet' | 'second_pet' | 'prop' | 'scene' | 'audio'
  assetId?: string
  url: string
  label: string
}

export interface PetStoryboardShot {
  id: string
  index: number
  durationSeconds: number
  frameDescription: string
  characterAction: string
  cameraMove: string
  subtitle: string
  voiceEmotion?: string
  firstFrameAssetId?: string
  lastFrameAssetId?: string
}

export interface PetDialogueLine {
  id: string
  speakerRoleId: string
  text: string
  emotion: PetDialogueEmotion
  speed: PetVoiceSpeed
  voiceName: string
  lipSync: boolean
}

export interface PetCreationDraft {
  prompt: string
  templateId?: string
  videoType: PetVideoType
  generationMode: PetGenerationMode
  roles: PetRole[]
  materials: PetReferenceMaterial[]
  dialogueLines: PetDialogueLine[]
  scriptText?: string
  shots: PetStoryboardShot[]
  durationSeconds: 5 | 10 | 15 | 30
  language: 'zh-CN'
  aspectRatio: PetAspectRatio
  style: PetCreationStyle
  subtitleEnabled: boolean
  voiceEnabled: boolean
  lipSyncEnabled: boolean
  bgmEnabled: boolean
  subtitleStyle: {
    position: PetSubtitlePosition
    highlighted: boolean
  }
  visualSettings: {
    expressionIntensity: number
    cameraRhythm: PetCameraRhythm
  }
  consistency: {
    keepAppearance: boolean
    keepFurPattern: boolean
    keepScene: boolean
    allowAnthropomorphic: boolean
    multiShotPriority: boolean
  }
}

export interface PetVideoTask {
  id: string
  title: string
  status: PetTaskStatus
  progress: number
  currentStep: string
  estimatedRemainSeconds: number
  draft: PetCreationDraft
  previewUrl?: string
  workId?: string
  errorCode?: string
  retryable?: boolean
  errorMessage?: string
  createdAt: string
}

export interface PetWork {
  id: string
  title: string
  templateTitle: string
  petType: PetType
  status: PetWorkStatus
  aspectRatio: PetAspectRatio
  durationSeconds: number
  coverUrl?: string
  videoUrl?: string
  downloadUrl?: string
  draft?: PetCreationDraft
  errorCode?: string
  errorMessage?: string
  retryable?: boolean
  createdAt: string
}

export interface PetWorkQuery {
  status?: PetWorkStatus | 'all'
  keyword?: string
  petType?: PetType | 'all'
}

export interface PetWorkDownload {
  fileName: string
  url?: string
  content: string
  mimeType: string
}

export interface PetWorkForkOptions {
  aspectRatio?: PetAspectRatio
}

export interface PetVideoEstimate {
  taskType: string
  generationMode: PetGenerationMode
  estimatedCreditCost: number
  balance: number | null
  enoughBalance: boolean | null
  pricingSource: string
  materialCount: number
  shotCount: number
  warnings: string[]
}

export interface PetVideoPreview {
  dryRun: boolean
  providerSubmitEnabled: boolean
  dryRunEnabled: boolean
  providerSubmitted: boolean
  taskCreated: boolean
  wouldCreateTask: boolean
  errorCode?: string
  message: string
  taskType: string
  generationMode: PetGenerationMode
  estimatedCreditCost: number
  balance: number | null
  enoughBalance: boolean | null
  pricingSource: string
  modelCode: string
  durationSeconds: number
  aspectRatio: PetAspectRatio
  style: PetCreationStyle
  language: string
  promptPreview: string
  negativePrompt: string
  payloadPreview: Record<string, unknown>
  materialSummary: unknown[]
  storyboardShots: unknown[]
  warnings: string[]
}
