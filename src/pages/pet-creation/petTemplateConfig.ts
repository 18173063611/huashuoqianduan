import type { PetTemplate } from './petCreationTypes'

export const petTemplateFilters = ['热门玩法', '小猫', '小狗', '宠物对话', '萌宠短剧', '宠物口播', '图生视频', '表情包']

function petAsset(fileName: string) {
  return new URL(`../../assets/pet-creation/${fileName}`, import.meta.url).href
}

export const petTemplates: PetTemplate[] = [
  {
    id: 'cat-dialogue',
    title: '小猫对话',
    description: '双宠物台词互动，适合搞笑剧情和反差梗。',
    coverUrl: petAsset('template-cat-dialogue.png'),
    category: '宠物对话',
    videoType: 'dialogue',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'funny',
    tags: ['小猫', '对话', '字幕'],
  },
  {
    id: 'dog-reaction',
    title: '小狗机智反应',
    description: '突出表情、动作和反应节奏。',
    coverUrl: petAsset('template-dog-reaction.png'),
    category: '萌宠短剧',
    videoType: 'short_drama',
    durationSeconds: 10,
    aspectRatio: '9:16',
    style: 'cute',
    tags: ['小狗', '反应', '剧情'],
  },
  {
    id: 'pet-monologue',
    title: '萌宠独白',
    description: '用第一视角讲述宠物日常和小剧场。',
    coverUrl: petAsset('template-pet-monologue.png'),
    category: '宠物口播',
    videoType: 'monologue',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'healing',
    tags: ['独白', '治愈', '日常'],
  },
  {
    id: 'pet-talking',
    title: '宠物口播种草',
    description: '适合宠物用品介绍、门店活动和知识科普。',
    coverUrl: petAsset('template-pet-talking.png'),
    category: '宠物口播',
    videoType: 'talking',
    durationSeconds: 30,
    aspectRatio: '9:16',
    style: 'realistic',
    tags: ['口播', '种草', '门店'],
  },
  {
    id: 'photo-to-video',
    title: '照片动起来',
    description: '上传单张宠物照片，生成轻剧情动态视频。',
    coverUrl: petAsset('template-photo-to-video.png'),
    category: '图生视频',
    videoType: 'image_to_video',
    durationSeconds: 5,
    aspectRatio: '1:1',
    style: 'cute',
    tags: ['图生视频', '照片', '动态'],
  },
  {
    id: 'pet-sticker',
    title: '宠物表情包',
    description: '生成适合社群传播的宠物表情短片。',
    coverUrl: petAsset('template-pet-sticker.png'),
    category: '表情包',
    videoType: 'sticker',
    durationSeconds: 5,
    aspectRatio: '1:1',
    style: 'funny',
    tags: ['表情包', '搞笑', '社群'],
  },
  {
    id: 'double-pet-dialogue',
    title: '双宠物对话',
    description: '适合两只宠物互相吐槽、争辩或合作完成小剧场。',
    coverUrl: petAsset('template-double-dialogue.png'),
    category: '宠物对话',
    videoType: 'dialogue',
    durationSeconds: 15,
    aspectRatio: '9:16',
    style: 'funny',
    tags: ['双宠物', '对话', '短剧'],
  },
]

export function findPetTemplate(templateId?: string) {
  return petTemplates.find((template) => template.id === templateId)
}
