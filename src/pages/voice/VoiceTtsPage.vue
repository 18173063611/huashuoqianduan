<template>
  <ModuleSkeletonPage
    title="声音选择"
    :project="project"
    feature="TTS音频生成"
    input="projectId、scriptVersionId、voiceCode"
    output="taskId、audioAsset"
    status="QUEUED / RUNNING / SUCCESS / FAILED / RETRYABLE"
    hint="该功能待接入AI能力"
  />
</template>

<script setup lang="ts">
import ModuleSkeletonPage from '../../components/business/ModuleSkeletonPage.vue'
import type { ProjectItem } from '../../types/projectTypes'

defineProps<{
  project?: ProjectItem
}>()
</script>
