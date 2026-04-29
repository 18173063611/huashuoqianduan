<template>
  <ModuleSkeletonPage
    title="视频合成"
    :project="project"
    feature="数字人视频合成"
    input="脚本、音频、形象、渲染参数"
    output="视频资产"
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
