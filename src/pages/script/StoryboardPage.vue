<template>
  <ModuleSkeletonPage
    title="分镜脚本"
    :project="project"
    feature="分镜脚本生成"
    input="projectId、scriptVersionId"
    output="taskId、storyboard(JSON)"
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
