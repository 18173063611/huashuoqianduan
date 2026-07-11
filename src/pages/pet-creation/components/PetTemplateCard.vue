<template>
  <article class="pet-template-card" :data-workflow="template.workflow">
    <div class="pet-template-cover" :class="{ 'has-image': !!template.coverUrl }" :style="coverStyle">
      <div class="pet-template-status-row">
        <span v-for="badge in statusBadges" :key="badge">{{ badge }}</span>
      </div>
      <span class="pet-template-index">{{ indexLabel }}</span>
      <div class="pet-template-output-row">
        <span v-for="badge in outputBadges" :key="badge">{{ badge }}</span>
      </div>
    </div>

    <div class="pet-template-body">
      <div class="pet-template-title-row">
        <strong :title="template.title">{{ template.title }}</strong>
        <em>{{ workflow.label }}</em>
      </div>
      <p :title="template.description">{{ template.description }}</p>

      <div class="pet-template-card-tags" :title="featureTags.join(' / ')">
        <span v-for="tag in visibleTags" :key="tag">{{ tag }}</span>
        <span v-if="hiddenTagCount > 0">+{{ hiddenTagCount }}</span>
      </div>

      <dl class="pet-template-meta">
        <div>
          <dt>规格</dt>
          <dd>{{ template.aspectRatio }} / {{ template.durationSeconds }}s</dd>
        </div>
        <div>
          <dt>素材</dt>
          <dd>{{ materialRequirement }}</dd>
        </div>
      </dl>

      <small>
        <span>{{ costHint }}</span>
      </small>

      <button class="pet-template-card-action" type="button" @click="$emit('use-template', template)">
        使用模板
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetTemplate } from '../petCreationTypes'
import { petTemplateWorkflowFor } from '../petTemplateWorkflow'

const props = defineProps<{
  template: PetTemplate
  index?: number
}>()

defineEmits<{
  'use-template': [template: PetTemplate]
}>()

const indexLabel = computed(() => String((props.index || 0) + 1).padStart(2, '0'))
const workflow = computed(() => petTemplateWorkflowFor(props.template))

const outputBadges = computed(() => {
  if (props.template.workflow === 'sticker') return ['GIF', 'MP4']
  if (props.template.workflow === 'background') return ['背景', '视频']
  if (props.template.workflow === 'dialogue') return ['视频', '字幕']
  if (props.template.workflow === 'storyboard' || props.template.workflow === 'smart') return ['视频', '分镜']
  return ['视频']
})

const statusBadges = computed(() => {
  const badges: string[] = []
  if (props.index === 0 || props.template.tags.some((tag) => tag.includes('爆款') || tag.includes('AI'))) {
    badges.push('推荐')
  }
  if (props.template.tags.some((tag) => tag.includes('对标') || tag.includes('分镜'))) {
    badges.push('已测试')
  }
  return badges.slice(0, 2)
})

const featureTags = computed(() => {
  const tags = [...props.template.tags]
  tags.unshift('需宠物图')
  if (props.template.subtitleEnabled || props.template.workflow === 'dialogue' || props.template.workflow === 'storyboard') {
    tags.push('支持字幕')
  }
  if (props.template.voiceEnabled || props.template.workflow === 'dialogue') {
    tags.push('支持配音')
  }
  if (props.template.id === 'multi-pet-dialogue' || props.template.tags.some((tag) => tag.includes('人宠'))) {
    tags.push('支持人物')
  }
  if (props.template.tags.some((tag) => tag.includes('多宠') || tag.includes('双宠'))) {
    tags.push('支持多宠物')
  }
  return [...new Set(tags)].filter(Boolean)
})

const visibleTags = computed(() => featureTags.value.slice(0, 4))
const hiddenTagCount = computed(() => Math.max(0, featureTags.value.length - visibleTags.value.length))

const materialRequirement = computed(() => {
  if (props.template.workflow === 'dialogue') return '角色/场景'
  if (props.template.workflow === 'storyboard' || props.template.workflow === 'smart') return '宠物/分镜'
  if (props.template.workflow === 'background') return '场景参考'
  if (props.template.workflow === 'sticker') return '宠物照片'
  return '宠物素材'
})

const costHint = computed(() => {
  if (props.template.workflow === 'background') return '积分以预检估算为准'
  if (props.template.workflow === 'sticker') return '沿用视频预检，GIF 完成后自动转换'
  return '生成前预检积分'
})

const coverStyle = computed(() => {
  if (!props.template.coverUrl) return undefined
  return {
    backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.18)), url("${props.template.coverUrl.replace(/"/g, '\\"')}")`,
  }
})
</script>

<style scoped>
.pet-template-card {
  display: flex;
  min-width: 0;
  min-height: 386px;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #dfe7f5;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.pet-template-card:hover {
  border-color: #93c5fd;
  box-shadow: 0 18px 42px rgba(37, 99, 235, 0.1);
  transform: translateY(-2px);
}

.pet-template-cover {
  position: relative;
  flex: 0 0 auto;
  aspect-ratio: 16 / 9;
  min-height: 154px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(20, 184, 166, 0.14)),
    #f8fafc;
  background-position: center;
  background-size: cover;
}

.pet-template-status-row,
.pet-template-output-row {
  position: absolute;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pet-template-status-row {
  top: 10px;
  left: 10px;
  right: 52px;
}

.pet-template-output-row {
  right: 10px;
  bottom: 10px;
  justify-content: flex-end;
}

.pet-template-status-row span,
.pet-template-output-row span,
.pet-template-index {
  display: inline-grid;
  min-height: 26px;
  place-items: center;
  border: 1px solid rgba(191, 219, 254, 0.8);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #2563eb;
  padding: 0 9px;
  font-size: 11px;
  font-weight: 900;
  backdrop-filter: blur(8px);
}

.pet-template-output-row span {
  color: #0f766e;
}

.pet-template-index {
  position: absolute;
  top: 10px;
  right: 10px;
  min-width: 34px;
  padding: 0;
}

.pet-template-body {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.pet-template-title-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: start;
}

.pet-template-title-row strong {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  color: #172033;
  font-size: 15px;
  font-weight: 900;
  line-height: 1.35;
}

.pet-template-title-row em {
  max-width: 92px;
  overflow: hidden;
  border-radius: 999px;
  background: #f3f7ff;
  color: #2563eb;
  padding: 4px 8px;
  font-style: normal;
  font-size: 11px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-template-card p {
  display: -webkit-box;
  overflow: hidden;
  min-height: 42px;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: #667085;
  font-size: 13px;
  line-height: 1.6;
}

.pet-template-card-tags {
  display: flex;
  overflow: hidden;
  min-height: 54px;
  max-height: 54px;
  flex-wrap: wrap;
  gap: 6px;
  align-content: flex-start;
}

.pet-template-card-tags span {
  max-width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-template-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.pet-template-meta div {
  min-width: 0;
  border: 1px solid #e4ebf7;
  border-radius: 8px;
  background: #fbfdff;
  padding: 8px 9px;
}

.pet-template-meta dt,
.pet-template-meta dd {
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-template-meta dt {
  color: #7f8aaa;
  font-size: 11px;
  font-weight: 850;
}

.pet-template-meta dd {
  margin-top: 3px;
  color: #172033;
  font-size: 12px;
  font-weight: 900;
}

.pet-template-card small {
  display: block;
  overflow: hidden;
  color: #7f8aaa;
  font-size: 12px;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pet-template-card-action {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  margin-top: auto;
  border: 0;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;
  cursor: pointer;
}

.pet-template-card-action:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
}

@media (max-width: 640px) {
  .pet-template-card {
    min-height: 0;
  }
}
</style>
