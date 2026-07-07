import { petTemplates } from './petTemplateConfig'
import type { PetAspectRatio, PetCreationDraft, PetVideoTask, PetWork, PetWorkDownload, PetWorkForkOptions, PetWorkQuery } from './petCreationTypes'

const PET_DRAFT_STORAGE_KEY = 'huashuo_pet_creation_draft'
const PET_TASKS_STORAGE_KEY = 'huashuo_pet_creation_tasks'
const PET_WORKS_STORAGE_KEY = 'huashuo_pet_creation_works'

export function clonePetDraft(draft: PetCreationDraft): PetCreationDraft {
  return JSON.parse(JSON.stringify(draft)) as PetCreationDraft
}

function storageAvailable() {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (!storageAvailable()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    window.localStorage.removeItem(key)
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (!storageAvailable()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

function taskTitleForDraft(draft: PetCreationDraft) {
  return draft.prompt?.trim() || draft.scriptText?.trim() || '萌宠视频生成任务'
}

function templateTitleForDraft(draft: PetCreationDraft) {
  return petTemplates.find((template) => template.id === draft.templateId)?.title || '自定义创作'
}

function templateCoverForDraft(draft: PetCreationDraft) {
  return petTemplates.find((template) => template.id === draft.templateId)?.coverUrl || petTemplates[0]?.coverUrl
}

function templateCoverByTitle(title: string) {
  return petTemplates.find((template) => template.title === title)?.coverUrl || petTemplates[0]?.coverUrl
}

function defaultDialogueLines() {
  return [
    {
      id: 'dialogue-1',
      speakerRoleId: 'main-cat',
      text: '我真的只是出去看月亮。',
      emotion: '委屈' as const,
      speed: 'normal' as const,
      voiceName: '软萌童声',
      lipSync: true,
    },
    {
      id: 'dialogue-2',
      speakerRoleId: 'second-dog',
      text: '你嘴边的草叶可不是这么说的。',
      emotion: '吐槽' as const,
      speed: 'normal' as const,
      voiceName: '机智少年音',
      lipSync: true,
    },
  ]
}

export const defaultPetDraft: PetCreationDraft = {
  prompt: '',
  videoType: 'dialogue',
  generationMode: 'dialogue_video',
  roles: [
    {
      id: 'main-cat',
      name: '奶盖',
      type: 'cat',
      breed: '英短',
      ageFeel: '幼年',
      personalityTags: ['好奇', '嘴硬', '爱撒娇'],
      speakingTone: '软萌但理直气壮',
      roleTags: ['主角', '吐槽担当'],
      anthropomorphic: true,
      referenceAssetIds: [],
    },
    {
      id: 'second-dog',
      name: '布丁',
      type: 'dog',
      breed: '柯基',
      ageFeel: '青年',
      personalityTags: ['机智', '吐槽', '护短'],
      speakingTone: '机智但很认真',
      roleTags: ['搭档', '吐槽担当'],
      anthropomorphic: true,
      referenceAssetIds: [],
    },
  ],
  materials: [],
  dialogueLines: defaultDialogueLines(),
  scriptText: '小猫偷偷出门后，被主人发现，努力用撒娇解释自己只是出去看月亮。',
  shots: [
    {
      id: 'shot-1',
      index: 1,
      durationSeconds: 3,
      frameDescription: '客厅地毯上，小猫回头看向门口，表情心虚。',
      characterAction: '小猫眨眼、慢慢后退',
      cameraMove: '轻微推进',
      subtitle: '我真的只是出去看月亮',
      voiceEmotion: '委屈',
    },
    {
      id: 'shot-2',
      index: 2,
      durationSeconds: 4,
      frameDescription: '主人视角靠近，小猫坐下装乖。',
      characterAction: '小猫低头、尾巴轻晃',
      cameraMove: '固定中景',
      subtitle: '顺便检查一下门口有没有风',
      voiceEmotion: '撒娇',
    },
    {
      id: 'shot-3',
      index: 3,
      durationSeconds: 4,
      frameDescription: '小猫抬头看镜头，画面出现可爱字幕。',
      characterAction: '小猫歪头、轻轻叫一声',
      cameraMove: '慢速推近',
      subtitle: '你不会怪我吧？',
      voiceEmotion: '卖萌',
    },
    {
      id: 'shot-4',
      index: 4,
      durationSeconds: 2,
      frameDescription: '小狗在一旁探头，像旁白一样补充真相。',
      characterAction: '小狗看向小猫，再看向镜头',
      cameraMove: '轻微摇移',
      subtitle: '其实它是去追落叶了',
      voiceEmotion: '吐槽',
    },
    {
      id: 'shot-5',
      index: 5,
      durationSeconds: 2,
      frameDescription: '两只宠物同框坐好，字幕收尾，氛围轻松。',
      characterAction: '小猫和小狗一起眨眼',
      cameraMove: '固定近景',
      subtitle: '下次带你一起看月亮',
      voiceEmotion: '开心',
    },
  ],
  durationSeconds: 15,
  language: 'zh-CN',
  aspectRatio: '9:16',
  style: 'cute',
  subtitleEnabled: true,
  voiceEnabled: true,
  lipSyncEnabled: true,
  bgmEnabled: true,
  subtitleStyle: {
    position: 'bottom',
    highlighted: true,
    fontFamily: 'Microsoft YaHei',
    fontSize: 34,
    textColor: '#ffffff',
    outlineColor: '#111827',
    strokeMode: 'thin',
  },
  visualSettings: {
    expressionIntensity: 70,
    cameraRhythm: 'balanced',
    backgroundPrompt: '',
    productPrompt: '',
  },
  consistency: {
    keepAppearance: true,
    keepFurPattern: true,
    keepScene: false,
    allowAnthropomorphic: true,
    multiShotPriority: true,
  },
}

export const mockPetWorks: PetWork[] = [
  {
    id: 'work-1',
    title: '小猫深夜出门解释现场',
    templateTitle: '小猫对话',
    petType: 'cat',
    status: 'completed',
    aspectRatio: '9:16',
    durationSeconds: 15,
    coverUrl: templateCoverByTitle('小猫对话'),
    videoUrl: '#work-1-preview',
    draft: defaultPetDraft,
    createdAt: '2026-07-04 14:20',
  },
  {
    id: 'work-2',
    title: '小狗听见零食袋的反应',
    templateTitle: '小狗机智反应',
    petType: 'dog',
    status: 'running',
    aspectRatio: '9:16',
    durationSeconds: 10,
    coverUrl: templateCoverByTitle('小狗机智反应'),
    videoUrl: '#work-2-preview',
    draft: defaultPetDraft,
    createdAt: '2026-07-04 14:08',
  },
  {
    id: 'work-3',
    title: '宠物用品口播草稿',
    templateTitle: '宠物口播种草',
    petType: 'dog',
    status: 'draft',
    aspectRatio: '9:16',
    durationSeconds: 30,
    coverUrl: templateCoverByTitle('宠物口播种草'),
    draft: defaultPetDraft,
    createdAt: '2026-07-04 13:52',
  },
  {
    id: 'work-4',
    title: '双宠物对话失败样例',
    templateTitle: '双宠物对话',
    petType: 'cat',
    status: 'failed',
    aspectRatio: '1:1',
    durationSeconds: 15,
    coverUrl: templateCoverByTitle('双宠物对话'),
    videoUrl: '#work-4-preview',
    draft: defaultPetDraft,
    createdAt: '2026-07-04 13:30',
  },
]

export function mockListPetTemplates() {
  return Promise.resolve(petTemplates)
}

export function mockGetPetDraft() {
  return Promise.resolve(clonePetDraft(readJson(PET_DRAFT_STORAGE_KEY, defaultPetDraft)))
}

export function mockSavePetDraft(payload: PetCreationDraft) {
  const nextDraft = clonePetDraft(payload)
  writeJson(PET_DRAFT_STORAGE_KEY, nextDraft)
  return Promise.resolve(clonePetDraft(nextDraft))
}

export function mockResetPetDraft() {
  const nextDraft = clonePetDraft(defaultPetDraft)
  writeJson(PET_DRAFT_STORAGE_KEY, nextDraft)
  return Promise.resolve(clonePetDraft(nextDraft))
}

export function mockGeneratePetStoryboard(payload: PetCreationDraft) {
  const prompt = payload.prompt.trim() || '萌宠偷偷做了一件小坏事，被主人发现后努力解释'
  const backgroundHint = payload.visualSettings.backgroundPrompt?.trim()
  const nextDraft = clonePetDraft({
    ...payload,
    scriptText: `${prompt}${backgroundHint ? `，背景设定为${backgroundHint}` : ''}。整体节奏轻松可爱，前 3 秒抛出反差，中段展示宠物表情和动作，结尾用一句撒娇字幕收束。`,
    shots: [
      {
        id: 'shot-generated-1',
        index: 1,
        durationSeconds: 3,
        frameDescription: backgroundHint ? `在${backgroundHint}中开场展示主题：${prompt}` : `开场展示主题：${prompt}`,
        characterAction: '宠物看向镜头，表情带一点心虚和好奇',
        cameraMove: '轻微推进',
        subtitle: '事情不是你想的那样',
        voiceEmotion: '心虚',
      },
      {
        id: 'shot-generated-2',
        index: 2,
        durationSeconds: 5,
        frameDescription: '中景展示宠物与场景互动，突出动作细节',
        characterAction: '宠物坐下、歪头、尾巴轻轻摆动',
        cameraMove: '固定中景',
        subtitle: '我只是顺路检查一下',
        voiceEmotion: '认真解释',
      },
      {
        id: 'shot-generated-3',
        index: 3,
        durationSeconds: 4,
        frameDescription: '结尾特写宠物表情，叠加可爱字幕',
        characterAction: '宠物靠近镜头，做出撒娇表情',
        cameraMove: '慢速推近',
        subtitle: '这次可以原谅我吗？',
        voiceEmotion: '撒娇',
      },
      {
        id: 'shot-generated-4',
        index: 4,
        durationSeconds: 3,
        frameDescription: '切到第二只宠物或道具参考，制造反差笑点',
        characterAction: '第二只宠物短暂停顿后给出反应',
        cameraMove: '轻微摇移',
        subtitle: '等等，好像有证据',
        voiceEmotion: '惊讶',
      },
      {
        id: 'shot-generated-5',
        index: 5,
        durationSeconds: 3,
        frameDescription: '双宠物同框或宠物回到主场景，用治愈画面收尾',
        characterAction: '宠物看向镜头，表情放松',
        cameraMove: '固定近景',
        subtitle: '今天也要假装什么都没发生',
        voiceEmotion: '开心',
      },
    ],
  })
  writeJson(PET_DRAFT_STORAGE_KEY, nextDraft)
  return Promise.resolve(clonePetDraft(nextDraft))
}

export function mockGeneratePetScript(payload: PetCreationDraft) {
  const prompt = payload.prompt.trim() || '宠物日常小剧场'
  const backgroundHint = payload.visualSettings.backgroundPrompt?.trim()
  const nextDraft = clonePetDraft({
    ...payload,
    scriptText: `${prompt}${backgroundHint ? `，画面背景保持${backgroundHint}` : ''}。开头用一句反差字幕吸引注意，中段让宠物用拟人化口吻解释原因，结尾保留一个适合转发的可爱包袱。`,
  })
  writeJson(PET_DRAFT_STORAGE_KEY, nextDraft)
  return Promise.resolve(clonePetDraft(nextDraft))
}

export function mockCreatePetVideoTask(payload: PetCreationDraft): Promise<PetVideoTask> {
  const nextDraft = clonePetDraft(payload)
  const task: PetVideoTask = {
    id: `pet-task-${Date.now()}`,
    title: taskTitleForDraft(nextDraft),
    status: 'running',
    progress: 36,
    currentStep: '角色一致性检查',
    estimatedRemainSeconds: 80,
    draft: nextDraft,
    createdAt: new Date().toISOString(),
  }
  const tasks = readJson<Record<string, PetVideoTask>>(PET_TASKS_STORAGE_KEY, {})
  tasks[task.id] = task
  writeJson(PET_TASKS_STORAGE_KEY, tasks)
  writeJson(PET_DRAFT_STORAGE_KEY, nextDraft)

  const works = readJson<PetWork[]>(PET_WORKS_STORAGE_KEY, mockPetWorks)
  works.unshift({
    id: `work-${task.id}`,
    title: task.title,
    templateTitle: templateTitleForDraft(nextDraft),
    petType: nextDraft.roles[0]?.type || 'other',
    status: 'running',
    aspectRatio: nextDraft.aspectRatio,
    durationSeconds: nextDraft.durationSeconds,
    coverUrl: templateCoverForDraft(nextDraft),
    videoUrl: '#pet-task-preview',
    draft: nextDraft,
    createdAt: formatNow(),
  })
  writeJson(PET_WORKS_STORAGE_KEY, works)

  return Promise.resolve(task)
}

export function mockGetPetVideoTask(taskId = 'pet-task-preview'): Promise<PetVideoTask | null> {
  const tasks = readJson<Record<string, PetVideoTask>>(PET_TASKS_STORAGE_KEY, {})
  const existingTask = taskId ? tasks[taskId] : undefined
  if (existingTask) return Promise.resolve(existingTask)

  return Promise.resolve({
    id: taskId,
    title: '小猫深夜出门解释现场',
    status: 'running',
    progress: 68,
    currentStep: '画面生成',
    estimatedRemainSeconds: 80,
    draft: defaultPetDraft,
    createdAt: new Date().toISOString(),
  })
}

export function mockListPetWorks(params: PetWorkQuery = {}) {
  const keyword = params.keyword?.trim()
  const works = readJson<PetWork[]>(PET_WORKS_STORAGE_KEY, mockPetWorks).filter((work) => {
    const statusMatched = !params.status || params.status === 'all' || work.status === params.status
    const petTypeMatched = !params.petType || params.petType === 'all' || work.petType === params.petType
    const keywordMatched = !keyword || work.title.includes(keyword) || work.templateTitle.includes(keyword)
    return statusMatched && petTypeMatched && keywordMatched
  })
  return Promise.resolve(works)
}

export function mockDeletePetWork(workId: string) {
  const works = readJson<PetWork[]>(PET_WORKS_STORAGE_KEY, mockPetWorks)
  writeJson(PET_WORKS_STORAGE_KEY, works.filter((work) => work.id !== workId))
  return Promise.resolve()
}

export function mockDownloadPetWork(workId: string): Promise<PetWorkDownload> {
  const works = readJson<PetWork[]>(PET_WORKS_STORAGE_KEY, mockPetWorks)
  const work = works.find((item) => item.id === workId)
  const fileName = `${work?.title || 'pet-work'}.json`
  return Promise.resolve({
    fileName,
    mimeType: 'application/json',
    content: JSON.stringify(work || { id: workId, title: 'pet-work' }, null, 2),
  })
}

function normalizeForkAspect(value: PetWorkForkOptions['aspectRatio'], fallback: PetAspectRatio): PetAspectRatio {
  return value === '9:16' || value === '16:9' || value === '1:1' ? value : fallback
}

export function mockForkPetWork(workId: string, options: PetWorkForkOptions = {}) {
  const works = readJson<PetWork[]>(PET_WORKS_STORAGE_KEY, mockPetWorks)
  const sourceWork = works.find((work) => work.id === workId)
  const nextDraft = clonePetDraft(sourceWork?.draft || {
    ...defaultPetDraft,
    prompt: sourceWork?.title || defaultPetDraft.prompt,
    durationSeconds: sourceWork?.durationSeconds === 5 || sourceWork?.durationSeconds === 10 || sourceWork?.durationSeconds === 15 || sourceWork?.durationSeconds === 30
      ? sourceWork.durationSeconds
      : defaultPetDraft.durationSeconds,
    aspectRatio: sourceWork?.aspectRatio || defaultPetDraft.aspectRatio,
  })
  nextDraft.aspectRatio = normalizeForkAspect(options.aspectRatio, nextDraft.aspectRatio)
  writeJson(PET_DRAFT_STORAGE_KEY, nextDraft)
  const ratioSuffix = options.aspectRatio ? ` ${options.aspectRatio}` : ''
  const forkedWork: PetWork = {
    id: `work-fork-${Date.now()}`,
    title: `${sourceWork?.title || '宠物作品'}${ratioSuffix} 副本`,
    templateTitle: sourceWork?.templateTitle || templateTitleForDraft(nextDraft),
    petType: sourceWork?.petType || nextDraft.roles[0]?.type || 'other',
    status: 'draft',
    aspectRatio: nextDraft.aspectRatio,
    durationSeconds: nextDraft.durationSeconds,
    coverUrl: sourceWork?.coverUrl || templateCoverForDraft(nextDraft),
    videoUrl: sourceWork?.videoUrl,
    draft: nextDraft,
    createdAt: formatNow(),
  }
  writeJson(PET_WORKS_STORAGE_KEY, [forkedWork, ...works])
  return Promise.resolve(forkedWork)
}

export async function mockRegeneratePetWork(workId: string) {
  const works = readJson<PetWork[]>(PET_WORKS_STORAGE_KEY, mockPetWorks)
  const sourceWork = works.find((work) => work.id === workId)
  const draft = clonePetDraft(sourceWork?.draft || {
    ...defaultPetDraft,
    prompt: sourceWork?.title || defaultPetDraft.prompt,
  })
  return mockCreatePetVideoTask(draft)
}
