<template>
  <ModuleSkeletonPage
    title="标题封面"
    :project="project"
    feature="发布素材生成"
    input="projectId、视频主题、发布平台"
    output="标题、简介、话题、封面资产"
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
