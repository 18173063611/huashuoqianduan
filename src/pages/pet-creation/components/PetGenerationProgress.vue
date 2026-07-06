<template>
  <div class="pet-generation-progress" :class="`pet-generation-progress--${task.status}`">
    <div class="pet-generation-progress-head">
      <strong>{{ statusTitle }}</strong>
      <span>{{ progressPercent }}%</span>
    </div>
    <div class="pet-generation-progress-bar" aria-hidden="true">
      <i :style="{ width: `${progressPercent}%` }" />
    </div>
    <p>{{ statusDescription }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PetVideoTask } from '../petCreationTypes'

const props = defineProps<{
  task: PetVideoTask
}>()

const progressPercent = computed(() => Math.min(100, Math.max(0, props.task.progress)))

const statusTitle = computed(() => {
  if (props.task.status === 'queued') return '等待生成'
  if (props.task.status === 'completed') return '生成完成'
  if (props.task.status === 'failed') return '生成失败'
  if (props.task.status === 'canceled') return '任务已取消'
  return props.task.currentStep || '生成中'
})

const statusDescription = computed(() => {
  if (props.task.status === 'queued') return `任务已进入队列，任务编号：${props.task.id}`
  if (props.task.status === 'completed') return `视频已生成完成，任务编号：${props.task.id}`
  if (props.task.status === 'failed') return props.task.errorMessage || `生成失败，可返回编辑或发起重试，任务编号：${props.task.id}`
  if (props.task.status === 'canceled') return `任务已取消，可返回编辑重新提交，任务编号：${props.task.id}`
  return `预计还需 ${props.task.estimatedRemainSeconds} 秒，任务编号：${props.task.id}`
})
</script>

<style scoped>
.pet-generation-progress {
  display: grid;
  gap: 12px;
  border: 1px solid #dfe7f5;
  border-radius: 8px;
  background: #ffffff;
  padding: 18px;
}

.pet-generation-progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.pet-generation-progress-head strong {
  color: #172033;
  font-size: 16px;
  font-weight: 900;
}

.pet-generation-progress-head span {
  color: #2563eb;
  font-size: 18px;
  font-weight: 900;
}

.pet-generation-progress-bar {
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  background: #eaf1ff;
}

.pet-generation-progress-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #14b8a6);
}

.pet-generation-progress--completed .pet-generation-progress-bar i {
  background: linear-gradient(90deg, #16a34a, #14b8a6);
}

.pet-generation-progress--failed .pet-generation-progress-bar i,
.pet-generation-progress--canceled .pet-generation-progress-bar i {
  background: linear-gradient(90deg, #dc2626, #f97316);
}

.pet-generation-progress p {
  margin: 0;
  color: #667085;
  font-size: 13px;
}
</style>
