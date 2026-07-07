import type { RouteLocationRaw } from 'vue-router'
import type { PetTemplate, PetTemplateWorkflow } from './petCreationTypes'

export const petTemplateWorkflowMeta: Record<PetTemplateWorkflow, {
  label: string
  actionLabel: string
  description: string
  routeName: string
}> = {
  smart: {
    label: 'AI智能编排',
    actionLabel: '进入智能创作',
    description: '先由 AI 生成文案和分镜，再进入脚本分镜页精修。',
    routeName: 'pet-storyboard',
  },
  dialogue: {
    label: '对话/口播编辑',
    actionLabel: '进入对话页',
    description: '进入角色、台词、配音、字幕和口型同步的对话生产页。',
    routeName: 'pet-dialogue-create',
  },
  storyboard: {
    label: '剧情分镜编辑',
    actionLabel: '进入分镜页',
    description: '进入脚本、镜头、运镜、字幕和首尾帧参考的分镜生产页。',
    routeName: 'pet-storyboard',
  },
  material: {
    label: '素材/动作编辑',
    actionLabel: '进入素材页',
    description: '先补齐主宠物、动作参考和一致性设置，再生成视频。',
    routeName: 'pet-role-setup',
  },
  background: {
    label: '背景场景编辑',
    actionLabel: '编辑背景图',
    description: '进入素材角色页，重点补充场景参考图和背景生成要求。',
    routeName: 'pet-role-setup',
  },
}

export function petTemplateWorkflowFor(template: PetTemplate) {
  return petTemplateWorkflowMeta[template.workflow]
}

export function routeForPetTemplate(template: PetTemplate): RouteLocationRaw {
  const meta = petTemplateWorkflowFor(template)
  return {
    name: meta.routeName,
    query: {
      templateId: template.id,
      ...(template.workflow === 'background' ? { focus: 'scene' } : {}),
    },
  }
}

export const petTemplateGuideByWorkflow: Record<PetTemplateWorkflow, Array<{ index: string; title: string; text: string }>> = {
  smart: [
    { index: '01', title: '输入创意', text: '写一句宠物剧情主题，AI 会补齐文案、钩子和情绪递进。' },
    { index: '02', title: '生成脚本', text: '先生成可编辑脚本，避免直接裸提交提示词。' },
    { index: '03', title: '生成分镜', text: '拆成镜头、动作、字幕、运镜和配音情绪。' },
    { index: '04', title: '确认生成', text: '在确认抽屉核对积分、素材和 provider payload 后提交。' },
  ],
  dialogue: [
    { index: '01', title: '设置角色', text: '主宠物和第二只宠物分别设置名称、性格、口吻和头像。' },
    { index: '02', title: '编辑台词', text: '按角色填写或导入台词，控制情绪、语速和音色。' },
    { index: '03', title: '口型/字幕', text: '按台词决定是否开启配音、字幕和口型同步。' },
    { index: '04', title: '生成视频', text: '确认对话脚本和素材一致性后生成。' },
  ],
  storyboard: [
    { index: '01', title: '生成脚本', text: '根据模板和提示词生成短视频脚本。' },
    { index: '02', title: '拆分镜头', text: '把剧情拆成镜头、动作、运镜、字幕和情绪。' },
    { index: '03', title: '补参考图', text: '为关键镜头补充首帧、尾帧或场景参考。' },
    { index: '04', title: '确认生成', text: '确认分镜数量、时长、积分和素材后提交。' },
  ],
  material: [
    { index: '01', title: '上传主宠', text: '先选择或上传主宠物素材，保证参考图清晰。' },
    { index: '02', title: '补参考', text: '按玩法补第二只宠物、产品/道具、音频、动作或场景参考。' },
    { index: '03', title: '设一致性', text: '控制外观、毛色、花纹、场景和多镜头一致性。' },
    { index: '04', title: '进入生成', text: '回到分镜或确认抽屉完成生成。' },
  ],
  background: [
    { index: '01', title: '选主宠', text: '先固定主宠物身份，避免换背景时漂移。' },
    { index: '02', title: '加场景图', text: '上传或选择客厅、草地、宠物店等背景参考。' },
    { index: '03', title: '写背景要求', text: '描述光线、景深、干净程度和主体突出方式。' },
    { index: '04', title: '生成视频', text: '背景只作为场景约束，不替换宠物身份。' },
  ],
}
