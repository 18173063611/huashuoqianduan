import type { PetTemplate } from './petCreationTypes'

export const petTemplateFilters = [
  '全部',
  'AI智能创作',
  '爆款对标',
  '宠物表情包',
  '宠物剧情对话',
]

function petAsset(fileName: string) {
  return new URL(`../../assets/pet-creation/${fileName}`, import.meta.url).href
}

export const petTemplates: PetTemplate[] = [
  {
    id: 'multi-pet-dialogue',
    title: '宠物剧情对话',
    description: '统一承载人宠互动与多宠物对话；上传人物图后自动进入人宠模式，否则按多宠物模式生成。',
    coverUrl: petAsset('local-cat-dialogue.jpg'),
    category: '对话口播',
    videoType: 'dialogue',
    generationMode: 'dialogue_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'funny',
    tags: ['自动模式', '人宠互动', '多宠物对话'],
    workflow: 'dialogue',
    promptPreset: '多只宠物在家里因为一件小事互相吐槽，台词短、反应快，结尾有反差笑点。',
    scriptPreset: '主宠先认真解释自己没有闯祸，其他宠物轮流补刀揭穿，最后主宠用撒娇收尾。',
    dialogueLines: [
      { id: 'tpl-cat-dialogue-1', speakerRoleId: 'main-cat', text: '我只是路过，真的没有偷玩。', emotion: '认真解释', speed: 'normal', voiceName: '软萌童声', lipSync: true },
      { id: 'tpl-cat-dialogue-2', speakerRoleId: 'second-dog', text: '那爪子上的证据怎么解释？', emotion: '吐槽', speed: 'normal', voiceName: '机智少年音', lipSync: true },
      { id: 'tpl-cat-dialogue-3', speakerRoleId: 'main-cat', text: '可能是证据自己跑过来的。', emotion: '撒娇', speed: 'normal', voiceName: '软萌童声', lipSync: true },
    ],
    subtitleEnabled: true,
    voiceEnabled: true,
    lipSyncEnabled: true,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'short_drama', expressionIntensity: 78 },
  },
  {
    id: 'double-pet-dialogue',
    title: '多宠物对话',
    description: '旧模板兼容入口：会自动合并到多宠物对话生产页。',
    coverUrl: petAsset('local-double-dialogue.jpg'),
    category: '对话口播',
    videoType: 'dialogue',
    generationMode: 'dialogue_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'funny',
    tags: ['双宠物', '对话', '短剧'],
    workflow: 'dialogue',
    promptPreset: '两只宠物在同一个场景里互相争辩，一个装无辜，一个负责揭穿，节奏像短视频小剧场。',
    scriptPreset: '主宠提出一个离谱解释，第二只宠物指出破绽，最后两只宠物同框用可爱表情收尾。',
    dialogueLines: [
      { id: 'tpl-double-1', speakerRoleId: 'main-cat', text: '今天的沙发不是我弄乱的。', emotion: '认真解释', speed: 'normal', voiceName: '软萌童声', lipSync: true },
      { id: 'tpl-double-2', speakerRoleId: 'second-dog', text: '可是你刚刚还在沙发上开会。', emotion: '吐槽', speed: 'normal', voiceName: '机智少年音', lipSync: true },
      { id: 'tpl-double-3', speakerRoleId: 'main-cat', text: '那是临时会议，不能算。', emotion: '撒娇', speed: 'normal', voiceName: '软萌童声', lipSync: true },
    ],
    subtitleEnabled: true,
    voiceEnabled: true,
    lipSyncEnabled: true,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'short_drama', expressionIntensity: 82 },
  },
  {
    id: 'pet-ai-smart-story',
    title: 'AI智能创作',
    description: '默认创作入口：输入一句自然语言，自动理解意图并补齐剧情、角色、素材、对白、分镜和视频参数。',
    coverUrl: petAsset('local-short-drama.jpg'),
    category: '剧情分镜',
    videoType: 'short_drama',
    generationMode: 'reference_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'cute',
    tags: ['AI文案', '分镜', '一键编排'],
    workflow: 'smart',
    promptPreset: '主宠在家里做了一件小坏事，被发现后露出无辜表情，用轻松可爱的剧情完成反转。',
    scriptPreset: '前 3 秒用反差开场，中段围绕宠物动作和表情递进，结尾用一句可转发的萌点收束。',
    subtitleEnabled: true,
    voiceEnabled: true,
    lipSyncEnabled: false,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'balanced', expressionIntensity: 72 },
  },
  {
    id: 'viral-benchmark-storyboard',
    title: '爆款对标创作',
    description: '使用视频链接、上传视频或参考素材分析爆款结构，再生成相似节奏和风格的宠物视频。',
    coverUrl: petAsset('local-viral-storyboard.jpg'),
    category: '剧情分镜',
    videoType: 'short_drama',
    generationMode: 'reference_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'funny',
    tags: ['爆款对标', '分镜', '节奏'],
    workflow: 'storyboard',
    promptPreset: '参考爆款萌宠短视频结构：前三秒用反差钩子，中段突出宠物表情和动作，结尾用治愈或反转包袱收束。',
    scriptPreset: '钩子：宠物被发现的一瞬间。递进：用眼神、动作和字幕解释。收尾：一个无辜表情或反转台词。',
    shots: [
      { id: 'tpl-viral-shot-1', index: 1, durationSeconds: 3, frameDescription: '开场直接给出反差画面，宠物停住看向镜头', characterAction: '主宠瞬间定格，露出心虚又可爱的表情', cameraMove: '快速推近后稳定', subtitle: '糟糕，被发现了', voiceEmotion: '惊讶' },
      { id: 'tpl-viral-shot-2', index: 2, durationSeconds: 4, frameDescription: '中景展示宠物和现场证据，强化剧情冲突', characterAction: '主宠慢慢坐下，试图装作无事发生', cameraMove: '轻微跟拍', subtitle: '事情不是你想的那样', voiceEmotion: '认真解释' },
      { id: 'tpl-viral-shot-3', index: 3, durationSeconds: 4, frameDescription: '近景突出眼神、爪子或尾巴等萌点细节', characterAction: '主宠歪头、眨眼、尾巴轻轻晃动', cameraMove: '低机位慢推', subtitle: '我只是检查一下', voiceEmotion: '委屈' },
      { id: 'tpl-viral-shot-4', index: 4, durationSeconds: 4, frameDescription: '结尾回到宠物特写，用反转字幕收束', characterAction: '主宠靠近镜头，露出无辜表情', cameraMove: '固定近景', subtitle: '下次我会叫你一起', voiceEmotion: '撒娇' },
    ],
    subtitleEnabled: true,
    voiceEnabled: false,
    lipSyncEnabled: false,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'short_drama', expressionIntensity: 86 },
  },
  {
    id: 'dog-reaction',
    title: '人宠情景视频',
    description: '围绕主人与宠物的日常互动组织情景短剧，适合陪伴、训练、回家和治愈剧情。',
    coverUrl: petAsset('local-dog-reaction.jpg'),
    category: '剧情分镜',
    videoType: 'short_drama',
    generationMode: 'reference_video',
    durationSeconds: 10,
    aspectRatio: '9:16',
    style: 'healing',
    tags: ['人宠', '情景', '剧情'],
    workflow: 'storyboard',
    promptPreset: '主人回家后蹲下和宠物互动，宠物先认真观察，再靠近回应，最后形成温暖治愈的陪伴瞬间。',
    scriptPreset: '开场用主人回家或呼唤宠物建立关系，中段突出宠物观察、靠近和回应，结尾用一个亲密互动或治愈表情收束。',
    shots: [
      { id: 'tpl-human-pet-shot-1', index: 1, durationSeconds: 3, frameDescription: '主人回到家门口或客厅边缘，宠物听到动静看向主人', characterAction: '宠物抬头观察，保持原有毛色和脸型', cameraMove: '稳定中景', subtitle: '你终于回来了', voiceEmotion: '惊讶' },
      { id: 'tpl-human-pet-shot-2', index: 2, durationSeconds: 3, frameDescription: '主人蹲下伸手示意，宠物慢慢靠近', characterAction: '宠物小步靠近或轻轻摇尾，动作自然', cameraMove: '低机位轻微跟拍', subtitle: '今天也等你很久啦', voiceEmotion: '开心' },
      { id: 'tpl-human-pet-shot-3', index: 3, durationSeconds: 4, frameDescription: '宠物和主人同框完成互动，主体宠物清晰突出', characterAction: '宠物贴近主人手边，露出治愈表情', cameraMove: '固定近景', subtitle: '抱一下再开始今天', voiceEmotion: '撒娇' },
    ],
    subtitleEnabled: true,
    voiceEnabled: true,
    lipSyncEnabled: false,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'balanced', expressionIntensity: 68 },
  },
  {
    id: 'photo-to-video',
    title: '照片动起来',
    description: '上传单张宠物照片，生成轻剧情动态视频。',
    coverUrl: petAsset('local-photo-to-video.jpg'),
    category: '图生视频',
    videoType: 'image_to_video',
    generationMode: 'image_to_video',
    durationSeconds: 5,
    aspectRatio: '1:1',
    style: 'cute',
    tags: ['图生视频', '照片', '动态'],
    workflow: 'material',
    promptPreset: '让宠物照片自然动起来：轻轻眨眼、抬头看镜头，动作稳定，表情可爱。',
    subtitleEnabled: false,
    voiceEnabled: false,
    lipSyncEnabled: false,
    bgmEnabled: false,
    visualSettings: { cameraRhythm: 'slow', expressionIntensity: 55 },
  },
  {
    id: 'pet-sticker',
    title: '宠物表情包',
    description: '上传宠物照片并描述动作，让照片自然动起来，可输出 GIF 动图或 MP4 短视频。',
    coverUrl: petAsset('local-pet-sticker.jpg'),
    category: '表情反应',
    videoType: 'sticker',
    generationMode: 'reference_video',
    durationSeconds: 5,
    aspectRatio: '1:1',
    style: 'funny',
    tags: ['照片动起来', 'GIF', 'MP4'],
    workflow: 'sticker',
    promptPreset: '小猫委屈地举爪说我错了',
    subtitleEnabled: false,
    voiceEnabled: false,
    lipSyncEnabled: false,
    bgmEnabled: false,
    visualSettings: { cameraRhythm: 'fast', expressionIntensity: 92 },
  },
  {
    id: 'pet-dance-sing',
    title: '萌宠唱跳',
    description: '参考市面唱歌、跳舞、全身动效玩法，生成轻量动作短视频。',
    coverUrl: petAsset('local-pet-talking.jpg'),
    category: '唱跳动作',
    videoType: 'short_drama',
    generationMode: 'reference_video',
    durationSeconds: 10,
    aspectRatio: '9:16',
    style: 'funny',
    tags: ['唱跳', '动作', '短视频'],
    workflow: 'material',
    promptPreset: '宠物跟随轻快节奏做小幅度可爱动作，保持真实宠物身份和四肢结构，不做夸张变形。',
    subtitleEnabled: false,
    voiceEnabled: false,
    lipSyncEnabled: false,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'fast', expressionIntensity: 75 },
  },
  {
    id: 'pet-talking',
    title: '宠物口播/用品种草',
    description: '适合宠物用品展示、养宠知识科普和轻商业口播，文案可继续 AI 生成。',
    coverUrl: petAsset('local-pet-talking.jpg'),
    category: '商业口播',
    videoType: 'talking',
    generationMode: 'reference_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'realistic',
    tags: ['口播', '用品种草', '科普'],
    workflow: 'dialogue',
    promptPreset: '宠物以轻松口播方式介绍一个宠物用品、零食、玩具或养宠小知识，语气真诚，聚焦养宠场景。',
    scriptPreset: '开场提出一个养宠痛点，中段用宠物视角解释产品或知识点，结尾给出温和提醒或轻种草建议。',
    subtitleEnabled: true,
    voiceEnabled: true,
    lipSyncEnabled: true,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'balanced', expressionIntensity: 65 },
  },
  {
    id: 'pet-product-showcase',
    title: '宠物用品展示',
    description: '上传宠物和产品/道具图，生成宠物用品、零食、玩具或护理工具展示短片。',
    coverUrl: petAsset('local-pet-talking.jpg'),
    category: '商业口播',
    videoType: 'talking',
    generationMode: 'reference_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'realistic',
    tags: ['产品图', '用品展示', '种草'],
    workflow: 'material',
    promptPreset: '主宠自然靠近一个宠物用品或零食道具，画面真实干净，重点展示宠物和产品互动，聚焦养宠场景。',
    scriptPreset: '开场展示主宠真实反应，中段让产品作为道具自然出现，结尾用一句轻松种草或养宠建议收束。',
    subtitleEnabled: true,
    voiceEnabled: false,
    lipSyncEnabled: false,
    bgmEnabled: true,
    visualSettings: {
      cameraRhythm: 'balanced',
      expressionIntensity: 66,
      productPrompt: '产品/道具自然出现在宠物旁边，不遮挡宠物脸部、毛色和主体动作。',
    },
    consistency: { keepAppearance: true, keepFurPattern: true },
  },
  {
    id: 'pet-monologue',
    title: '萌宠独白',
    description: '用第一视角讲述宠物日常和小剧场。',
    coverUrl: petAsset('local-pet-monologue.jpg'),
    category: '对话口播',
    videoType: 'monologue',
    generationMode: 'reference_video',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'healing',
    tags: ['独白', '治愈', '日常'],
    workflow: 'dialogue',
    promptPreset: '主宠用第一视角讲述今天的小心事，画面温柔治愈，动作轻微自然。',
    scriptPreset: '今天我又发现了一个很小但很开心的秘密，想慢慢讲给你听。',
    subtitleEnabled: true,
    voiceEnabled: true,
    lipSyncEnabled: false,
    bgmEnabled: true,
    visualSettings: { cameraRhythm: 'slow', expressionIntensity: 60 },
  },
  {
    id: 'background-scene-edit',
    title: '背景场景编辑',
    description: '为宠物视频补充或替换背景要求，结合场景参考图做稳定生成。',
    coverUrl: petAsset('local-scene-edit.jpg'),
    category: '背景场景',
    videoType: 'short_drama',
    generationMode: 'reference_video',
    durationSeconds: 10,
    aspectRatio: '9:16',
    style: 'realistic',
    tags: ['背景图', '场景', '参考图'],
    workflow: 'background',
    promptPreset: '主宠出现在干净温暖的室内场景中，背景自然统一，主体宠物清晰突出。',
    subtitleEnabled: false,
    voiceEnabled: false,
    lipSyncEnabled: false,
    bgmEnabled: false,
    visualSettings: {
      cameraRhythm: 'slow',
      expressionIntensity: 58,
      backgroundPrompt: '温暖客厅背景，浅景深，干净柔和，宠物主体清晰突出',
    },
    consistency: { keepScene: true },
  },
]

export const featuredPetTemplateIds = [
  'pet-ai-smart-story',
  'viral-benchmark-storyboard',
  'pet-sticker',
  'multi-pet-dialogue',
]

const petTemplateAliases: Record<string, string> = {
  'cat-dialogue': 'multi-pet-dialogue',
  'double-pet-dialogue': 'multi-pet-dialogue',
  'pet-monologue': 'multi-pet-dialogue',
  'dog-reaction': 'multi-pet-dialogue',
  'photo-to-video': 'pet-sticker',
  'pet-product-showcase': 'pet-talking',
}

function canonicalTemplateId(templateId?: string) {
  if (!templateId) return ''
  return petTemplateAliases[templateId] || templateId
}

export function findPetTemplate(templateId?: string, source: PetTemplate[] = petTemplates) {
  const canonicalId = canonicalTemplateId(templateId)
  if (!canonicalId) return undefined
  return source.find((template) => template.id === canonicalId) || petTemplates.find((template) => template.id === canonicalId)
}

export function getVisiblePetTemplates(source: PetTemplate[] = petTemplates) {
  const seen = new Set<string>()
  return source
    .map((template) => findPetTemplate(template.id, source) || template)
    .filter((template) => {
      const id = canonicalTemplateId(template.id)
      if (!featuredPetTemplateIds.includes(id)) return false
      if (seen.has(id)) return false
      seen.add(id)
      return true
    })
}

export function getFeaturedPetTemplates(source: PetTemplate[] = petTemplates) {
  const visibleTemplates = getVisiblePetTemplates(source)
  return featuredPetTemplateIds
    .map((id) => visibleTemplates.find((template) => template.id === id))
    .filter((template): template is PetTemplate => Boolean(template))
}

export function getPetTemplatesForFilter(filter: string, source: PetTemplate[] = petTemplates) {
  const visibleTemplates = getVisiblePetTemplates(source)
  if (filter === '全部') return visibleTemplates
  if (filter === 'AI智能创作') return visibleTemplates.filter((template) => template.id === 'pet-ai-smart-story')
  if (filter === '爆款对标') return visibleTemplates.filter((template) => template.id === 'viral-benchmark-storyboard')
  if (filter === '宠物表情包') return visibleTemplates.filter((template) => template.id === 'pet-sticker')
  if (filter === '宠物剧情对话') return visibleTemplates.filter((template) => template.id === 'multi-pet-dialogue')
  return visibleTemplates.filter((template) => template.category === filter || template.tags.includes(filter))
}

function hasAnyKeyword(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword))
}

function hasExplicitBenchmarkIntent(value: string) {
  if (/https?:\/\//.test(value)) return true
  return hasAnyKeyword(value, [
    '对标', '仿拍', '同款视频', '视频链接', '上传视频', '参考素材', '参考这个视频', '参考该视频',
    '参考这条视频', '参考以下视频', '按这个视频', '照着这个视频', '拆解这个视频', '分析这个视频',
    'benchmark', 'reference video', 'video link', 'remake this video',
  ]) || /参考.{0,8}(爆款|热门|短)?视频/.test(value)
}

function hasStickerIntent(value: string) {
  return hasAnyKeyword(value, [
    '表情包', '贴纸', '聊天表情', '宠物表情', '表情图', '做鬼脸', '照片动起来', '动起来', '图生视频', '单张图',
    'gif', '动图', 'animate', 'image to video',
  ])
}

function hasHumanParticipant(value: string) {
  const withoutPetFamilyRoles = value.replace(/(?:猫|狗|宠物)(?:爸爸|妈妈|爷爷|奶奶)/g, '')
  return hasAnyKeyword(withoutPetFamilyRoles, [
    '人宠', '主人', '铲屎官', '人物', '人类', '男孩', '女孩', '小朋友', '爸爸', '妈妈', '爷爷', '奶奶',
    'human pet', 'owner',
  ])
}

function hasDialogueAction(value: string) {
  return hasAnyKeyword(value, [
    '对话', '对白', '吵架', '争吵', '争论', '斗嘴', '吐槽', '聊天', '台词', '问答', '轮流说', '互相说',
    '讨论', '商量', '采访', '辩论', '解释', '回应', '回答', 'conversation', 'dialogue', 'chat', 'talk', 'lines',
  ]) || /(?:说|问|喊|叫)[：:“”"「『]/.test(value)
}

function hasMultipleParticipants(value: string) {
  if (hasAnyKeyword(value, [
    '多宠物', '多只宠物', '多只', '两只', '三只', '四只', '五只', '六只', '双宠', '多个宠物',
    '多个角色', '多角色', '两个角色', '三个角色', '多个人物', '多人物', '两个人', '三个人', '一群宠物',
    '猫狗', '狗猫',
    'multiple pets', 'two pets', 'three pets', 'multiple characters',
  ])) return true

  const participant = '(?:小?猫(?:咪)?|小?狗(?:狗)?|兔子|鹦鹉|仓鼠|宠物|主人|铲屎官|男孩|女孩|小朋友)'
  const pairPattern = new RegExp(`${participant}.{0,8}(?:和|与|跟|及|、|还有|加上|一起).{0,8}${participant}`)
  return pairPattern.test(value)
}

export function selectPetTemplateForPrompt(prompt: string, source: PetTemplate[] = petTemplates) {
  const value = prompt.trim().toLowerCase()
  let templateId = 'pet-ai-smart-story'

  if (hasExplicitBenchmarkIntent(value)) {
    templateId = 'viral-benchmark-storyboard'
  } else if (hasStickerIntent(value)) {
    templateId = 'pet-sticker'
  } else if (hasHumanParticipant(value) || hasDialogueAction(value) || hasMultipleParticipants(value)) {
    templateId = 'multi-pet-dialogue'
  }
  return findPetTemplate(templateId, source) || findPetTemplate('pet-ai-smart-story', source) || petTemplates[0]
}

export function inferPetStoryIntentMode(prompt: string): 'human-pet' | 'multi-pet' {
  const value = prompt.trim().toLowerCase()
  return hasHumanParticipant(value)
    ? 'human-pet'
    : 'multi-pet'
}

export function extractPetPromptVideoUrl(prompt: string) {
  return prompt.match(/https?:\/\/[^\s，。；、]+/i)?.[0] || ''
}
