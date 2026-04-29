<template>
  <ModuleSkeletonPage
    title="视频解析"
    :project="project"
    feature="视频链接解析"
    input="projectId、videoUrl"
    output="taskId、解析结果(JSON)"
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
