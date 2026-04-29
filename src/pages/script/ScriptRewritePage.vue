<template>
  <ModuleSkeletonPage
    title="文案改写"
    :project="project"
    feature="文案改写与版本管理"
    input="projectId、sourceText、style、targetLength"
    output="taskId、rewrittenText、scriptVersionId"
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
