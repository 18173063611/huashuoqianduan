<template>
  <ModuleSkeletonPage
    title="形象生成"
    :project="project"
    feature="数字人形象管理"
    input="形象参数"
    output="形象资产"
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
