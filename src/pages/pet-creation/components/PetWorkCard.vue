<template>
  <article class="pet-work-card">
    <div class="pet-work-card-cover" :class="{ 'has-image': !!work.coverUrl }" :style="coverStyle">
      <button v-if="work.videoUrl" type="button" class="pet-work-card-play" aria-label="预览视频" @click.stop="$emit('preview', work)">
        ▶
      </button>
      <span>{{ statusText }}</span>
    </div>
    <div class="pet-work-card-main">
      <strong>{{ work.title }}</strong>
      <p>{{ petTypeText }} · {{ work.templateTitle }} · {{ work.aspectRatio }} · {{ work.durationSeconds }} 秒</p>
      <p v-if="work.status === 'failed'" class="pet-work-card-error">{{ failureText }}</p>
      <small>{{ work.createdAt }}</small>
    </div>
    <div class="pet-work-card-actions">
      <button type="button" @click="$emit('preview', work)">预览</button>
      <button v-if="canRegenerate" type="button" @click="$emit('regenerate', work)">重新生成</button>
      <button type="button" @click="$emit('fork', work)">复制项目</button>
      <button type="button" @click="$emit('download', work)">下载视频</button>
      <button class="danger" type="button" @click="$emit('delete', work)">删除</button>
    </div>
    <div class="pet-work-card-ratios">
      <button type="button" @click="$emit('fork-aspect', work, '9:16')">复制 9:16</button>
      <button type="button" @click="$emit('fork-aspect', work, '1:1')">复制 1:1</button>
      <button type="button" @click="$emit('fork-aspect', work, '16:9')">复制 16:9</button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetAspectRatio, PetWork } from '../petCreationTypes'
import { petFailureMessage } from '../petCreationValidation'

const props = defineProps<{
  work: PetWork
}>()

defineEmits<{
  preview: [work: PetWork]
  fork: [work: PetWork]
  regenerate: [work: PetWork]
  download: [work: PetWork]
  delete: [work: PetWork]
  'fork-aspect': [work: PetWork, aspectRatio: PetAspectRatio]
}>()

const statusText = computed(() => {
  if (props.work.status === 'completed') return '已完成'
  if (props.work.status === 'running') return '生成中'
  if (props.work.status === 'failed') return '生成失败'
  return '草稿'
})

const petTypeText = computed(() => {
  if (props.work.petType === 'cat') return '小猫'
  if (props.work.petType === 'dog') return '小狗'
  return '其他宠物'
})

const failureText = computed(() => petFailureMessage(props.work.errorCode, props.work.errorMessage))
const canRegenerate = computed(() => props.work.status === 'failed' && props.work.retryable === true)

const coverStyle = computed(() => {
  if (!props.work.coverUrl) return undefined
  return {
    backgroundImage: `linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(20, 184, 166, 0.12)), url("${props.work.coverUrl.replace(/"/g, '\\"')}")`,
  }
})
</script>

<style scoped>
.pet-work-card {
  display: grid;
  overflow: hidden;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);
}

.pet-work-card-cover {
  position: relative;
  display: grid;
  min-height: 132px;
  place-items: center;
  background:
    linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(20, 184, 166, 0.14)),
    #f8fafc;
  background-position: center;
  background-size: cover;
}

.pet-work-card-cover.has-image {
  min-height: 152px;
}

.pet-work-card-cover span {
  position: absolute;
  top: 12px;
  right: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.9);
  color: #2563eb;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 850;
}

.pet-work-card-play {
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.64);
  color: #ffffff;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding-left: 3px;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.18);
}

.pet-work-card-main {
  display: grid;
  gap: 6px;
  padding: 14px;
}

.pet-work-card-main strong {
  color: #172033;
  font-size: 15px;
  font-weight: 900;
}

.pet-work-card-main p,
.pet-work-card-main small {
  margin: 0;
  color: #667085;
  font-size: 12px;
}

.pet-work-card-main .pet-work-card-error {
  color: #b91c1c;
  font-weight: 750;
  line-height: 1.5;
}

.pet-work-card-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(76px, 1fr));
  gap: 8px;
  padding: 0 14px 14px;
}

.pet-work-card-ratios {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 14px 14px;
}

.pet-work-card-actions button,
.pet-work-card-ratios button {
  min-height: 32px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
}

.pet-work-card-ratios button {
  min-height: 28px;
  background: #fbfdff;
  color: #475467;
  padding: 0 9px;
}

.pet-work-card-actions button.danger {
  color: #dc2626;
}
</style>
